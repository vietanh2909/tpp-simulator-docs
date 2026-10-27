'use strict';
// Dashboard CHỈ ĐỌC cho AI-DLC. Chỉ dùng module built-in (http, fs, path).
// Lắng nghe duy nhất 127.0.0.1, không xác thực. Không ghi bất kỳ tệp nào.

const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const PORT = Number.parseInt(process.env.PORT || '4777', 10);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error('PORT không hợp lệ: ' + process.env.PORT);
  process.exit(1);
}

// tools/aidlc-dashboard -> workspace root là hai cấp trên.
const WORKSPACE = path.resolve(__dirname, '..', '..');
const INTENTS_ROOT = path.join(WORKSPACE, 'aidlc', 'spaces', 'default', 'intents');
const FALLBACK_INTENT = '261018-tpp-callback-simulator';
const INDEX_FILE = path.join(__dirname, 'public', 'index.html');
const NAME_RE = /^[A-Za-z0-9_-]+$/;
const RECENT_LIMIT = 50;
const MAX_WALK_ENTRIES = 3000;
const MAX_WALK_DEPTH = 8;
const MAX_LIST = 300;
const SKIP_TOP = new Set(['audit', '.aidlc-engine']);

// ---------- Tiện ích ----------

function errMsg(e) {
  if (e && e.code === 'ENOENT') return 'Không tìm thấy tệp/thư mục';
  if (e && (e.code === 'EACCES' || e.code === 'EPERM')) return 'Không có quyền đọc';
  return String((e && e.message) || e).slice(0, 300);
}

function clip(s, n) {
  s = String(s == null ? '' : s);
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function isoOrNull(ms) {
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

// Cache theo (đường dẫn, mtime, size): chỉ parse lại khi tệp đổi.
const cache = new Map();
function cachedRead(file, parse) {
  const st = fs.statSync(file);
  const hit = cache.get(file);
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit.value;
  const value = parse(fs.readFileSync(file, 'utf8'), st);
  cache.set(file, { mtimeMs: st.mtimeMs, size: st.size, value });
  return value;
}

// ---------- Chọn intent (chống path traversal) ----------

function listIntents() {
  try {
    return fs
      .readdirSync(INTENTS_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory() && NAME_RE.test(d.name))
      .map((d) => d.name)
      .sort();
  } catch (e) {
    return [];
  }
}

function activeIntentName() {
  try {
    const v = fs.readFileSync(path.join(INTENTS_ROOT, 'active-intent'), 'utf8').trim();
    if (NAME_RE.test(v)) return v;
  } catch (e) {
    /* dùng giá trị dự phòng */
  }
  return FALLBACK_INTENT;
}

// Trả về { name, dir } hoặc { status, error }.
function resolveIntent(requested) {
  const name = requested == null || requested === '' ? activeIntentName() : requested;
  if (!NAME_RE.test(name)) {
    return { status: 400, error: 'Tên intent không hợp lệ (chỉ gồm chữ, số, dấu - và _)' };
  }
  const dir = path.join(INTENTS_ROOT, name);
  if (path.dirname(dir) !== INTENTS_ROOT) {
    return { status: 400, error: 'Tên intent không hợp lệ' };
  }
  try {
    if (!fs.statSync(dir).isDirectory()) throw new Error('not dir');
  } catch (e) {
    return { status: 404, error: 'Không tìm thấy intent: ' + name };
  }
  return { name, dir };
}

// ---------- Parser aidlc-state.md ----------

function parseState(text) {
  const sections = {};
  const stages = [];
  let section = '';
  let phase = '';
  for (const line of text.split(/\r?\n/)) {
    let m = /^##\s+(.+?)\s*$/.exec(line);
    if (m && !line.startsWith('###')) {
      section = m[1];
      sections[section] = sections[section] || {};
      continue;
    }
    m = /^###\s+(.+?)\s*$/.exec(line);
    if (m) {
      phase = m[1].replace(/\s+PHASE\s*$/i, '').toLowerCase();
      continue;
    }
    m = /^- \[(.)\]\s+(\S+)\s+[—–-]+\s+(EXECUTE|SKIP)\b/.exec(line);
    if (m) {
      stages.push({ phase, slug: m[2], mark: m[1], plan: m[3] });
      continue;
    }
    m = /^- \*\*([^*]+)\*\*:\s*(.*)$/.exec(line);
    if (m && section) {
      const k = m[1].trim();
      if (!(k in sections[section])) sections[section][k] = m[2].trim();
    }
  }
  return { sections, stages };
}

function readState(dir) {
  const file = path.join(dir, 'aidlc-state.md');
  return cachedRead(file, (text) => parseState(text));
}

// ---------- Parser runtime-graph.json ----------

function readGraph(dir) {
  const file = path.join(dir, 'runtime-graph.json');
  return cachedRead(file, (text) => {
    const g = JSON.parse(text);
    const stages = (Array.isArray(g.stages) ? g.stages : []).map((s) => {
      const firings = Array.isArray(s.sensor_firings) ? s.sensor_firings : [];
      return {
        slug: s.stage_slug,
        startedAt: s.started_at || null,
        completedAt: s.completed_at || null,
        agent: s.agent || null,
        outcome: s.outcome || null,
        sensorFirings: firings.length,
        sensorFailed: firings.filter((f) => f && f.result === 'failed').length,
      };
    });
    const units = g.bolt_dag && Array.isArray(g.bolt_dag.units) ? g.bolt_dag.units : [];
    return {
      workflowId: g.workflow_id || null,
      scope: g.scope || null,
      startedAt: g.started_at || null,
      stages,
      units: units.map((u) => ({
        name: u.name,
        kind: u.kind || null,
        dependsOn: Array.isArray(u.depends_on) ? u.depends_on : [],
      })),
    };
  });
}

// ---------- Parser audit shard ----------
// Định dạng đã xác nhận: mỗi sự kiện là một khối bắt đầu bằng "## <Tiêu đề>",
// theo sau là các dòng "**Khóa**: giá trị"; các khối cách nhau bằng "---".

function parseAudit(text) {
  const events = [];
  let unparsed = 0;
  let cur = null;
  let inFence = false;
  const lines = text.split(/\r?\n/);
  const flush = () => {
    if (!cur) return;
    if (cur.fields.Event) events.push(cur);
    else unparsed++;
    cur = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h && !line.startsWith('###')) {
      flush();
      cur = { title: h[1], line: i + 1, fields: {} };
      continue;
    }
    if (!cur) continue;
    const f = /^\*\*([^*]+)\*\*:\s?(.*)$/.exec(line);
    if (f) {
      const k = f[1].trim();
      if (!(k in cur.fields)) cur.fields[k] = f[2].trim();
    }
  }
  flush();
  const out = events.map((b) => {
    const f = b.fields;
    const ts = f.Timestamp || null;
    const tms = ts ? Date.parse(ts) : NaN;
    return {
      line: b.line,
      ts,
      tms: Number.isFinite(tms) ? tms : null,
      event: f.Event,
      stage: f.Stage || f['Stage slug'] || '',
      unit: f.Unit || '',
      agent: f.Agent || f.Reviewer || '',
      summary: clip(f.Decision || f.Details || f.Reason || f.Verdict || f.Request || f['User Input'] || b.title, 240),
    };
  });
  return { events: out, unparsed };
}

function readAudit(dir) {
  const auditDir = path.join(dir, 'audit');
  const files = fs
    .readdirSync(auditDir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.toLowerCase().endsWith('.md'))
    .map((d) => d.name)
    .sort();
  if (files.length === 0) throw new Error('Thư mục audit không có tệp .md');
  let events = [];
  let unparsed = 0;
  const shards = [];
  files.forEach((name, si) => {
    const file = path.join(auditDir, name);
    const st = fs.statSync(file);
    const p = cachedRead(file, (text) => parseAudit(text));
    shards.push({ name, size: st.size, mtime: isoOrNull(st.mtimeMs), events: p.events.length });
    unparsed += p.unparsed;
    for (const e of p.events) events.push(Object.assign({ shard: si }, e));
  });
  if (files.length > 1) {
    events = events
      .map((e, i) => [e, i])
      .sort((a, b) => (a[0].tms ?? 0) - (b[0].tms ?? 0) || a[1] - b[1])
      .map((x) => x[0]);
  }
  return { events, shards, unparsed };
}

function bump(map, key, ts) {
  let r = map.get(key);
  if (!r) {
    r = { count: 0, firstMs: null, lastMs: null };
    map.set(key, r);
  }
  r.count++;
  if (ts != null) {
    if (r.firstMs == null || ts < r.firstMs) r.firstMs = ts;
    if (r.lastMs == null || ts > r.lastMs) r.lastMs = ts;
  }
}

function computeAuditStats(audit) {
  const byEvent = new Map();
  const byStage = new Map();
  let firstMs = null;
  let lastMs = null;
  for (const e of audit.events) {
    bump(byEvent, e.event, e.tms);
    bump(byStage, e.stage, e.tms);
    if (e.tms != null) {
      if (firstMs == null || e.tms < firstMs) firstMs = e.tms;
      if (lastMs == null || e.tms > lastMs) lastMs = e.tms;
    }
  }
  const stageRows = [...byStage.entries()].map(([name, r]) => ({
    name,
    count: r.count,
    first: isoOrNull(r.firstMs),
    last: isoOrNull(r.lastMs),
    spanSeconds: r.firstMs != null && r.lastMs != null ? Math.round((r.lastMs - r.firstMs) / 1000) : null,
  }));
  return {
    total: audit.events.length,
    unparsedBlocks: audit.unparsed,
    shards: audit.shards,
    first: isoOrNull(firstMs),
    last: isoOrNull(lastMs),
    byEvent: [...byEvent.entries()]
      .map(([name, r]) => ({ name, count: r.count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    byStage: stageRows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    durationNote:
      'Thời lượng ước tính = từ sự kiện đầu đến sự kiện cuối có gắn stage đó (gồm cả thời gian chờ người duyệt).',
  };
}

// Ma trận unit × stage dựa trên sự kiện UNIT_STARTED/COMPLETED/SKIPPED.
function computeUnitMatrix(audit) {
  const units = new Map();
  let current = null;
  const map = { UNIT_STARTED: 'running', UNIT_COMPLETED: 'done', UNIT_SKIPPED: 'skipped' };
  for (const e of audit.events) {
    const s = map[e.event];
    if (!s || !e.unit) continue;
    if (!units.has(e.unit)) units.set(e.unit, new Map());
    units.get(e.unit).set(e.stage, { status: s, ts: e.ts });
    if (s === 'running') current = { unit: e.unit, stage: e.stage };
    else if (current && current.unit === e.unit && current.stage === e.stage) current = null;
  }
  const lastWithUnit = [...audit.events].reverse().find((e) => e.unit);
  return {
    units: [...units.entries()].map(([name, st]) => ({
      name,
      stages: [...st.entries()].map(([stage, v]) => ({ stage, status: v.status, ts: v.ts })),
    })),
    current,
    lastUnitSeen: lastWithUnit ? { unit: lastWithUnit.unit, stage: lastWithUnit.stage, ts: lastWithUnit.ts } : null,
  };
}

// ---------- Duyệt thư mục artefact (chỉ đọc, không theo symlink) ----------

function walk(base, startRel, out, depth) {
  if (out.length >= MAX_WALK_ENTRIES || depth > MAX_WALK_DEPTH) return;
  let entries;
  try {
    entries = fs.readdirSync(path.join(base, startRel), { withFileTypes: true });
  } catch (e) {
    if (depth === 0) throw e;
    return;
  }
  for (const d of entries) {
    if (d.isSymbolicLink()) continue;
    const rel = startRel ? startRel + '/' + d.name : d.name;
    if (d.isDirectory()) {
      walk(base, rel, out, depth + 1);
    } else if (d.isFile()) {
      try {
        const st = fs.statSync(path.join(base, rel));
        out.push({ path: rel, size: st.size, mtimeMs: st.mtimeMs });
      } catch (e) {
        /* bỏ qua tệp không đọc được */
      }
      if (out.length >= MAX_WALK_ENTRIES) return;
    }
  }
}

function finishList(list) {
  const sorted = list.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return {
    total: sorted.length,
    items: sorted.slice(0, MAX_LIST).map((x) => ({ path: x.path, size: x.size, mtime: isoOrNull(x.mtimeMs) })),
  };
}

function readArtifacts(dir) {
  const list = [];
  const top = fs.readdirSync(dir, { withFileTypes: true });
  for (const d of top) {
    if (d.isSymbolicLink() || SKIP_TOP.has(d.name)) continue;
    if (d.name === 'verification' || d.name === '.aidlc-construction-checkpoints') continue;
    if (d.isDirectory()) {
      walk(dir, d.name, list, 1);
    } else if (d.isFile()) {
      try {
        const st = fs.statSync(path.join(dir, d.name));
        list.push({ path: d.name, size: st.size, mtimeMs: st.mtimeMs });
      } catch (e) {
        /* bỏ qua */
      }
    }
  }
  return finishList(list);
}

function readFolder(dir, name) {
  const full = path.join(dir, name);
  try {
    if (!fs.statSync(full).isDirectory()) return { total: 0, items: [], exists: false };
  } catch (e) {
    if (e.code === 'ENOENT') return { total: 0, items: [], exists: false };
    throw e;
  }
  const list = [];
  walk(dir, name, list, 1);
  const r = finishList(list);
  r.exists = true;
  return r;
}

// ---------- Ghép tổng quan ----------

const STATUS_BY_MARK = { x: 'done', '-': 'active', '?': 'awaiting', R: 'revising', S: 'skipped', ' ': 'pending' };

function guarded(errors, key, fn, fallback) {
  try {
    return fn();
  } catch (e) {
    errors[key] = errMsg(e) + (e instanceof SyntaxError ? ' (JSON lỗi)' : '');
    return fallback;
  }
}

function buildStageRows(state, graph, audit, auditStats, matrix) {
  const sources = [];
  const stageAudit = new Map();
  if (auditStats) for (const s of auditStats.byStage) stageAudit.set(s.name, s);
  const graphBySlug = new Map();
  if (graph) for (const g of graph.stages) graphBySlug.set(g.slug, g);

  let rows = [];
  if (state && state.stages.length) {
    sources.push('aidlc-state.md (trạng thái)');
    rows = state.stages.map((s) => {
      let status = STATUS_BY_MARK[s.mark] || 'pending';
      if (s.plan === 'SKIP' && status === 'pending') status = 'skipped';
      return { phase: s.phase, slug: s.slug, plan: s.plan, status };
    });
  } else if (graph && graph.stages.length) {
    sources.push('runtime-graph.json (suy ra: outcome pending = đang chạy)');
    rows = graph.stages.map((g) => ({
      phase: '',
      slug: g.slug,
      plan: 'EXECUTE',
      status: g.completedAt ? 'done' : 'active',
    }));
  } else if (audit) {
    sources.push('audit (suy ra từ STAGE_STARTED/STAGE_COMPLETED)');
    const seen = new Map();
    for (const e of audit.events) {
      if (e.event === 'STAGE_STARTED' && !seen.has(e.stage)) seen.set(e.stage, 'active');
      if (e.event === 'STAGE_COMPLETED') seen.set(e.stage, 'done');
    }
    rows = [...seen.entries()].map(([slug, status]) => ({ phase: '', slug, plan: 'EXECUTE', status }));
  }
  if (graph && sources.length && !sources[0].startsWith('runtime-graph')) sources.push('runtime-graph.json (giờ bắt đầu/kết thúc, agent, sensor)');
  if (auditStats) sources.push('audit (số sự kiện, thời lượng ước tính)');

  // Construction chạy theo unit: lấy tiến độ từng unit từ audit để bổ sung.
  const perUnit = new Map();
  if (matrix) {
    for (const u of matrix.units) for (const s of u.stages) {
      if (!perUnit.has(s.stage)) perUnit.set(s.stage, []);
      perUnit.get(s.stage).push({ unit: u.name, status: s.status });
    }
  }
  rows = rows.map((r) => {
    const g = graphBySlug.get(r.slug);
    const a = stageAudit.get(r.slug);
    return Object.assign(r, {
      startedAt: g ? g.startedAt : null,
      completedAt: g ? g.completedAt : null,
      agent: g ? g.agent : null,
      outcome: g ? g.outcome : null,
      sensorFirings: g ? g.sensorFirings : 0,
      sensorFailed: g ? g.sensorFailed : 0,
      auditEvents: a ? a.count : 0,
      auditFirst: a ? a.first : null,
      auditLast: a ? a.last : null,
      spanSeconds: a ? a.spanSeconds : null,
      units: perUnit.get(r.slug) || [],
    });
  });
  return { rows, sources };
}

function buildOverview(query) {
  const sel = resolveIntent(query.intent);
  if (sel.error) return { status: sel.status, body: { error: sel.error } };
  const dir = sel.dir;
  const errors = {};

  const parsedState = guarded(errors, 'state', () => readState(dir), null);
  const graph = guarded(errors, 'runtimeGraph', () => readGraph(dir), null);
  const audit = guarded(errors, 'audit', () => readAudit(dir), null);
  const auditStats = audit ? computeAuditStats(audit) : null;
  const matrix = audit ? computeUnitMatrix(audit) : null;

  const sec = (n) => (parsedState && parsedState.sections[n]) || {};
  const cs = sec('Current Status');
  const resume = sec('Session Resume Point');
  const info = sec('Project Information');
  const plan = sec('Execution Plan Summary');
  const cfg = sec('Scope Configuration');

  let unit = null;
  let unitSource = null;
  if (matrix && matrix.current) {
    unit = matrix.current.unit + ' (stage ' + matrix.current.stage + ')';
    unitSource = 'audit: UNIT_STARTED chưa có UNIT_COMPLETED/SKIPPED';
  } else if (matrix && matrix.lastUnitSeen) {
    unit = matrix.lastUnitSeen.unit + ' (stage ' + matrix.lastUnitSeen.stage + ')';
    unitSource = 'audit: sự kiện gần nhất có trường Unit';
  }

  const state = parsedState
    ? {
        scope: info.Scope || cfg.Scope || (graph && graph.scope) || null,
        phase: cs['Lifecycle Phase'] || null,
        currentStage: cs['Current Stage'] || null,
        nextStage: cs['Next Stage'] || null,
        status: cs.Status || null,
        agent: info['Active Agent'] || null,
        unit,
        unitSource,
        lastCompleted: resume['Last Completed Stage'] || null,
        nextAction: resume['Next Action'] || null,
        pendingArtifacts: resume['Pending Artifacts'] || null,
        lastUpdated: cs['Last Updated'] || null,
        startDate: info['Start Date'] || null,
        depth: cfg.Depth || null,
        completedStages: plan.Completed || null,
        totalStages: plan['Total Stages'] || null,
        phaseProgress: sec('Phase Progress'),
        project: clip(info.Project || '', 200),
      }
    : null;

  const built = buildStageRows(parsedState, graph, audit, auditStats, matrix);

  // Lọc cho bảng sự kiện gần nhất (lọc phía server để không giới hạn trong 50 dòng cuối).
  const fEvent = clip(query.event || '', 120);
  const fStage = query.stage == null ? null : clip(query.stage, 120);
  let recent = [];
  if (audit) {
    let list = audit.events;
    if (fEvent) list = list.filter((e) => e.event === fEvent);
    if (fStage != null && fStage !== '') list = list.filter((e) => (fStage === '(none)' ? !e.stage : e.stage === fStage));
    recent = list
      .slice(-RECENT_LIMIT)
      .reverse()
      .map((e) => ({
        ts: e.ts,
        event: e.event,
        stage: e.stage,
        unit: e.unit,
        agent: e.agent,
        summary: e.summary,
        line: e.line,
        shard: audit.shards[e.shard] ? audit.shards[e.shard].name : '',
      }));
  }

  const artifacts = guarded(errors, 'artifacts', () => readArtifacts(dir), { total: 0, items: [] });
  const verification = guarded(errors, 'verification', () => readFolder(dir, 'verification'), { total: 0, items: [] });
  const checkpoints = guarded(errors, 'checkpoints', () => readFolder(dir, '.aidlc-construction-checkpoints'), {
    total: 0,
    items: [],
  });

  return {
    status: 200,
    body: {
      generatedAt: new Date().toISOString(),
      intent: sel.name,
      activeIntent: activeIntentName(),
      intents: listIntents(),
      errors,
      state,
      stages: built.rows,
      stageSources: built.sources,
      units: {
        dag: graph ? graph.units : [],
        progress: matrix ? matrix.units : [],
      },
      auditStats,
      recentEvents: recent,
      recentFilter: { event: fEvent, stage: fStage },
      artifacts,
      verification,
      checkpoints,
    },
  };
}

// ---------- HTTP ----------

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

function send(res, status, type, body) {
  res.writeHead(status, Object.assign({ 'Content-Type': type }, SECURITY_HEADERS));
  res.end(body);
}

function sendJson(res, status, obj) {
  send(res, status, 'application/json; charset=utf-8', JSON.stringify(obj));
}

const ALLOWED_HOSTS = new Set([HOST + ':' + PORT, 'localhost:' + PORT]);

const server = http.createServer((req, res) => {
  try {
    // Chặn DNS rebinding: chỉ nhận Host là localhost/127.0.0.1 đúng cổng.
    if (!ALLOWED_HOSTS.has(String(req.headers.host || '').toLowerCase())) {
      return sendJson(res, 403, { error: 'Host không được phép' });
    }
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return sendJson(res, 405, { error: 'Chỉ hỗ trợ GET' });
    }
    const url = new URL(req.url, 'http://' + HOST);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      let html;
      try {
        html = fs.readFileSync(INDEX_FILE);
      } catch (e) {
        return send(res, 500, 'text/plain; charset=utf-8', 'Không đọc được public/index.html: ' + errMsg(e));
      }
      return send(res, 200, 'text/html; charset=utf-8', html);
    }
    if (url.pathname === '/api/overview') {
      const q = {
        intent: url.searchParams.get('intent'),
        event: url.searchParams.get('event'),
        stage: url.searchParams.get('stage'),
      };
      const r = buildOverview(q);
      return sendJson(res, r.status, r.body);
    }
    return sendJson(res, 404, { error: 'Không tìm thấy' });
  } catch (e) {
    return sendJson(res, 500, { error: 'Lỗi máy chủ: ' + errMsg(e) });
  }
});

server.on('error', (e) => {
  console.error(e.code === 'EADDRINUSE' ? 'Cổng ' + PORT + ' đang được dùng. Đặt PORT khác.' : 'Lỗi máy chủ: ' + e.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log('AI-DLC dashboard (chỉ đọc) chạy tại http://' + HOST + ':' + PORT + '/');
  console.log('Intents: ' + INTENTS_ROOT);
});
