# Kiểm chứng toàn bộ: backend rồi frontend (nếu đã có).
# Chạy từ thư mục gốc d:\pet-pj-dlc. Dừng ở lỗi đầu tiên.
#   -FrontendOnly : chỉ chạy các bước của portal (npm ci, lint, format:check, test, build), bỏ qua backend (~20 phút).
#                   Hành vi mặc định (không tham số) giữ nguyên: backend rồi frontend.
# Trước khi chạy hãy ĐÓNG `npm run dev`: máy chủ Vite khóa tệp .node của lightningcss và làm `npm ci` lỗi EPERM.
param([switch]$FrontendOnly)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Invoke-Step([string]$name, [scriptblock]$body) {
    Write-Host "== $name =="
    & $body
    if ($LASTEXITCODE -ne 0) { throw "$name that bai (exit $LASTEXITCODE)" }
}

$backend = Join-Path $root 'tpp-simulator-app'
if ((-not $FrontendOnly) -and (Test-Path (Join-Path $backend 'pom.xml'))) {
    $mvn = if (Test-Path (Join-Path $backend 'mvnw.cmd')) { Join-Path $backend 'mvnw.cmd' } else { 'mvn' }
    Invoke-Step 'Backend: mvn verify (gom Spotless, kiem thu tich hop Testcontainers, JaCoCo 80%)' {
        & $mvn -B -f (Join-Path $backend 'pom.xml') verify
    }
}

$frontend = Join-Path $root 'tpp-simulator-portal'
if (Test-Path (Join-Path $frontend 'package.json')) {
    Push-Location $frontend
    try {
        # Chỉ bỏ qua script CHƯA được định nghĩa trong package.json (portal đang xây dần ở U3/U4);
        # script đã định nghĩa thì luôn chạy và lỗi thì dừng.
        $pkgScripts = (Get-Content (Join-Path $frontend 'package.json') -Raw | ConvertFrom-Json).scripts
        function Test-FrontendScript([string]$name) {
            if ($null -ne $pkgScripts -and $null -ne $pkgScripts.PSObject.Properties[$name]) { return $true }
            Write-Host "== Frontend: bo qua '$name' (chua dinh nghia trong package.json) =="
            return $false
        }
        Invoke-Step 'Frontend: npm ci' { npm ci }
        if (Test-FrontendScript 'lint') { Invoke-Step 'Frontend: lint' { npm run lint } }
        if (Test-FrontendScript 'format:check') { Invoke-Step 'Frontend: format:check' { npm run format:check } }
        if (Test-FrontendScript 'test') { Invoke-Step 'Frontend: test' { npm test } }
        if (Test-FrontendScript 'build') { Invoke-Step 'Frontend: build' { npm run build } }
    } finally { Pop-Location }
}

Write-Host 'VERIFY OK'
