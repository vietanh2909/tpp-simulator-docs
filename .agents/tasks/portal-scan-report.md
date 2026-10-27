# Báo cáo quét portal `tpp-simulator-portal` trước khi vào U3/U4

Phạm vi: chỉ đọc. Không chạy `npm`, build, test, dev server, `mvn`, `aidlc`; không chạm cơ sở dữ liệu. Mọi đường dẫn portal dưới đây tính từ `D:\pet-pj-dlc\tpp-simulator-portal\` (viết tắt `P:`). Hợp đồng nguồn: `D:\pet-pj-dlc\tpp-simulator-app\docs\api\openapi.yaml` (viết tắt `OA`).

---

## 0. Trả lời ngắn (đọc phần này trước)

1. **UI của bạn rất đầy đủ và bám Stitch** (năm màn hình, token màu khớp từng giá trị với `DESIGN.md`). Phần lớn thời gian code còn lại **không** nằm ở giao diện mà ở lớp dữ liệu.
2. **Portal chưa nói chuyện được với backend thật.** Chế độ `api` có sẵn nhưng dựa trên một contract "đề xuất" mà backend thật không theo: sai tên trường, sai dạng phân trang, sai dạng lỗi, sai method (`PATCH` thay vì `PUT`), sai đường dẫn chi tiết giao dịch, có hai endpoint không tồn tại (`/api/callbacks/stats`, tìm kiếm/lọc phía server của danh sách dịch vụ). Mapping và timestamp đang chạy **trong trình duyệt**, trong khi backend đã làm việc đó.
3. **Chặn cứng #1: không có Vite proxy.** `P:vite.config.ts` không có `server.proxy`. Backend cấm CORS (`SourceRulesTest.java` có quy tắc cấm `CorsRegistry`, `@CrossOrigin`) và chỉ nghe `127.0.0.1:8080`. Hướng dẫn trong `P:README.md` ("`VITE_API_BASE_URL=http://localhost:8080`") sẽ **thất bại vì CORS**. Phải dùng proxy và để `VITE_API_BASE_URL` rỗng.
4. **Chặn cứng #2: xung đột đường dẫn `/callbacks`.** Route SPA `callbacks/:callbackId` (`P:src/app/router/routes.tsx`) trùng tiền tố với endpoint backend `POST /callbacks/{serviceCode}` mà proxy phải chuyển tiếp. Cần proxy chỉ chuyển `POST` (GET trình duyệt trả về `index.html`) hoặc đổi route SPA.
5. **Cả 45 test hiện có kiểm thử logic chỉ tồn tại cho chế độ mock** (mapping, timestamp, mô phỏng endpoint nhận callback, gom giao dịch). Sau khi nối backend, chúng bảo vệ code chết. Chưa có test nào cho form, API client, bộ lọc, polling, truy cập.
6. **Có lệch giữa UI bạn dựng và tài liệu đã duyệt** (nhất là chi tiết dạng trang thay vì bảng trượt, thiếu xóa dịch vụ, bộ lọc "Kết quả xử lý", kích thước trang 20/50/100, thẻ thống kê thuộc Won't Have). Danh sách ở mục 2 và mục 3.
7. **Đề xuất stage:** với cả U3 và U4, bỏ `functional-design`, `nfr-requirements`, `nfr-design`, `infrastructure-design`; giữ `code-generation` (rút gọn câu hỏi, dùng báo cáo này làm đầu vào), rồi `build-and-test` và `ci-pipeline` một lần ở cuối. **Không gộp U3 và U4** (mục 5.4).
8. **Ước lượng:** U3 khoảng 11 việc, U4 khoảng 6 việc (mục 5.3). Con số thời gian chỉ là ước lượng thô, tôi không đo.

Những gì tôi **không** kiểm chứng: xem mục 6.

---

## 1. Kiểm kê portal

### 1.1 Cấu trúc và công cụ

| Mục | Hiện trạng | Bằng chứng |
|---|---|---|
| Stack | React 19.3.1, TypeScript 6.0.3 (strict), Vite 8.3.4, Tailwind 4.3.3 (`@tailwindcss/vite`), React Router 7.18.4, Vitest 5.0.5, ESLint 10 | `P:package.json` |
| Scripts | `dev`, `build` (`tsc --noEmit && vite build`), `typecheck`, `lint`, `test` (`vitest run`), `preview`. **Không có** `format:check` / Prettier | `P:package.json` |
| Vitest | `environment: 'node'`, `include: ['src/**/*.test.ts']`. Không chạy được `.tsx`, không có DOM | `P:vite.config.ts` |
| ESLint | `typescript-eslint` recommended + `react-hooks`. Không có `jsx-a11y`. Bỏ qua `dist`, `design`, `_*` | `P:eslint.config.js` |
| Thư viện thiếu so với kế hoạch | Không có `jsdom`, `@testing-library/*`, `vitest-axe`, `prettier`, `eslint-plugin-jsx-a11y`, `@headlessui/react`. `_versions.txt` cho thấy bạn đã dò các gói này nhưng chưa thêm vào `package.json` | `P:_versions.txt`, `P:package.json` |
| Alias | `@` → `src` (cả Vite lẫn `tsconfig`) | `P:vite.config.ts`, `P:tsconfig.json` |
| Style | Tailwind + token trong `@theme` | `P:src/styles/globals.css` |
| Git | Kho chỉ có 1 commit (`abba973 first commit`, chỉ sửa `README.md`). **Toàn bộ code còn là untracked**, gồm cả các tệp rác `_inspect.ps1`, `_peers.txt`, `_probe.txt`, `_p1.txt`, `_versions.*` (không nằm trong `.gitignore`). Chưa có `.github/` (chưa có CI) | `git status` của `P:` |
| Thư mục | `src/` khoảng 110 tệp, `design/` (bản sao Stitch), `dist/`, `node_modules/` | liệt kê thư mục |

### 1.2 Cấu trúc mã

```
src/app/{config,providers,router}        cấu hình, router (lazy page), error view
src/components/{common,ui}               Button, Card, Field, Badge, Tabs, Pagination, JsonEditor, JsonViewer, Toast, Switch...
src/features/callback-services/          api, components (ServiceFormView, form/*), types, utils (jsonpath, mapping, timestamp)
src/features/callbacks/                  api, components (SelfTestPanel, CallbackDetailPanel, CallbackTable...), utils (receive-callback, mask-headers)
src/features/transactions/               api, components (MonitoringFilters, TransactionTable/Detail/Timeline), hooks/useMonitoringQuery, utils (group-transactions, range)
src/hooks/useAsyncData.ts                tải dữ liệu + polling
src/layouts/SimulatorLayout/*            sidebar, header, footer
src/mocks/*                              demo-store (localStorage), demo-http, latency, dữ liệu mẫu
src/pages/*                              Services, ServiceCreate, ServiceEdit, ServiceTest, Monitoring, TransactionDetail, NotFound
src/services/http/{client,error-handler}.ts
```

Router (`P:src/app/router/routes.tsx`): `/services`, `/services/new`, `/services/:code/edit`, `/services/:code/test`, `/transactions`, `/transactions/:serviceCode/:transactionId`, `/callbacks/:callbackId`. Bộ lọc, tab, trang của màn hình theo dõi nằm trong query string (`P:src/features/transactions/hooks/useMonitoringQuery.ts`), đây là điểm tốt.

### 1.3 Dữ liệu đang được tạo ra từ đâu

- **Chọn mock/real** nằm ở `P:src/app/config/env.ts` (`VITE_DATA_MODE`, mặc định `mock`) và dòng cuối mỗi tệp `features/*/api/*.api.ts` (`appConfig.isMock ? mockApi : httpApi`).
- **Mock** = `P:src/mocks/demo-store.ts` (localStorage, khóa `tpp-simulator:demo-data`), `P:src/mocks/demo-http.ts`, dữ liệu mẫu `P:src/mocks/data/services.ts`, `callbacks.ts`.
- **Logic nghiệp vụ chạy ở trình duyệt:** `P:src/features/callback-services/utils/mapping.ts`, `timestamp.ts`, `jsonpath.ts`; `P:src/features/callbacks/utils/receive-callback.ts` (mô phỏng đúng thứ tự 404 → 503 → 401 → 400 của backend); `P:src/features/transactions/utils/group-transactions.ts` (gom giao dịch và `statusFacets`).
- `P:src/features/callback-services/components/form/MappingTester.tsx` gọi thẳng `applyMapping` trong trình duyệt, **không gọi API**, kể cả ở chế độ `api`.
- `httpApi` ở mỗi `*.api.ts` đã viết nhưng theo contract tự đề xuất (README ghi rõ "dự kiến, chưa được backend xác nhận").
- Ngoài mock còn có giá trị cứng: `callbackBaseUrl` mặc định `https://tpp-uat.example.com` (`P:src/app/config/env.ts`), `defaultPageSize: 10`, `pollIntervalMs: 5000` (`P:src/app/config/app.config.ts`), `DEFAULT_RESPONSE_BODY = {code:'00',message:'Received'}`.

### 1.4 Kiểu dữ liệu

`P:src/features/*/types/*.types.ts`. Mô hình của portal khác mô hình backend ở nhiều chỗ nền tảng (id chuỗi `CB-00001`, header là mảng, kết quả mapping `SUCCESS/PARTIAL/FAILED`, `source`, `processingMs`, `configSnapshot`). Chi tiết ở mục 3.

### 1.5 45 test hiện có bao phủ gì và không bao phủ gì

Số 45 là số bạn nêu; tôi chỉ đếm bằng `grep` (không chạy). Bốn tệp:

| Tệp | Kiểm thử | Còn giá trị sau khi nối backend? |
|---|---|---|
| `features/callback-services/utils/mapping.test.ts` | cú pháp JSON path, `applyMapping` (lồng nhau, lỗi một phần, null/rỗng, không `eval`, `__proto__`) | Thấp. Backend (`MappingEngine`) đã làm việc này và có 161 test riêng. Chỉ còn ý nghĩa nếu giữ kiểm tra cú pháp ở form |
| `features/callback-services/utils/timestamp.test.ts` | ISO, Unix, mẫu tùy chỉnh theo múi giờ | Thấp, như trên. Định dạng `CUSTOM` của portal khác `PATTERN` (cú pháp `DateTimeFormatter` của Java) của backend |
| `features/callbacks/utils/receive-callback.test.ts` | mô phỏng endpoint nhận callback, che header, snapshot | Không còn (mô phỏng sẽ bị xóa) |
| `features/transactions/utils/group-transactions.test.ts` | gom giao dịch, facet, lọc | Không còn (backend gom giao dịch) |

**Không có test cho:** form dịch vụ và hiển thị lỗi từng ô; API client và phân tích lỗi; chuyển đổi DTO; bộ lọc và tham số truy vấn; `useAsyncData` và polling; trạng thái trống/lỗi/đang tải; truy cập (NFR4). Nguyên nhân kỹ thuật: Vitest đang `node` và chỉ nhận `*.test.ts`.

### 1.6 Truy cập cơ bản (NFR4), quan sát từ mã

Có: `<label>` cho ô nhập (qua `Field`), `role="switch"` + `aria-checked` + `aria-label` (`Switch.tsx`), `role="tablist"`/`tab`/`aria-selected` (`Tabs.tsx`), `aria-current="page"` và `<nav aria-label>` ở sidebar, `aria-live` ở Toast, lỗi có chữ chứ không chỉ màu (ví dụ `BusinessStatusBadge` "Thiếu status", `MappingBadge` có ký hiệu).

Thiếu so với `inception/refined-mockups/accessibility-checklist.md` và `interaction-spec.md`:
- Tabs không có phím mũi tên, không roving `tabindex`, không `aria-controls`/`tabpanel`.
- Không có skip link, không có banner dưới 1024px (D15).
- Header có đồng hồ chạy từng giây (`SimulatorHeader.tsx`, `EnvironmentClock`); quyết định D1 đã bỏ đồng hồ này.
- Chi tiết là trang, không phải ngăn trượt nên chưa có bẫy tiêu điểm, Esc, trả tiêu điểm (AC3.4.4).
- Dòng bảng bấm được bằng `onClick`, nhưng cột cuối có liên kết "Xem chi tiết" nên vẫn vào được bằng bàn phím.
- Chưa có `eslint-plugin-jsx-a11y`, `vitest-axe`.

---

## 2. So sánh với thiết kế và story

### 2.1 Stitch (bố cục, phong cách) và tài liệu đã duyệt

Quy tắc nguồn: Stitch chỉ cho bố cục và phong cách; chức năng theo `docs/brief.md`; hành vi chi tiết theo `mockups.md`/`interaction-spec.md` đã duyệt (memory `project.md`, mục Corrections).

| Màn hình Stitch | Portal | Nhận xét |
|---|---|---|
| `dich_vu_danh_sach` | `pages/Services` | Khớp bố cục. Thừa: 4 thẻ thống kê và nút "Nhật ký nhận" (Won't Have US4.9). Thiếu: nút xóa |
| `dich_vu_cau_hinh` | `ServiceFormView` + `form/*` | Khớp 5 khối A–E. Thiếu: ô khóa "Đã cấu hình khóa" khi sửa; D3 (khóa định dạng khi không có timestamp) |
| `dich_vu_thu_nghiem_gui_callback` | `SelfTestPanel` | Khớp. Câu chữ sai với backend (xem 3.5) |
| `giao_dich_theo_doi_danh_sach` | `pages/Monitoring` | Khớp bố cục. Bộ lọc khác đặc tả D6/D7 |
| `giao_dich_chi_tiet` | `pages/TransactionDetail` | **Lệch:** Stitch và đặc tả đều là ngăn trượt phải (62% chiều rộng). Portal làm trang riêng |

Token màu và font khớp `DESIGN.md` (kiểm tra `P:src/styles/globals.css` với `docs/design/stitch/.../DESIGN.md`). Tôi **chưa xem ảnh** `screen.png`, chỉ đọc HTML, DESIGN.md và tài liệu mockup; không kết luận được độ khớp hình ảnh từng điểm ảnh.

Các điểm UI của bạn khác quyết định đã duyệt trong `refined-mockups/mockups.md` (D1–D15):

| Quyết định | Đặc tả | Portal |
|---|---|---|
| D1 | Header chỉ nhãn UAT và múi giờ, bỏ đồng hồ | Còn đồng hồ chạy từng giây |
| D6 | Lọc thời gian chính xác tới giây, giờ VN, gồm hai đầu | Có preset (15 phút, 1 giờ, 24 giờ, 7 ngày) và `datetime-local` chính xác tới phút, cộng `+59,999 s` ở đầu "đến" (`range.ts`) |
| D7 | Tab "Tất cả callback": lọc "Kết quả xử lý" (Thành công/Lỗi mapping/Bị từ chối) + "Lý do". Ô Status chỉ ở tab Giao dịch, là **ô chữ** (chứa chuỗi) | Chip `SUCCESS/PARTIAL/FAILED` cho callback; chip theo `statusFacets` cho giao dịch |
| D9 | Mỗi tab giữ bộ lọc và trang riêng | Dùng chung một bộ tham số URL, đổi tab thì xóa `status`/`mapping` |
| D11 | Có N callback mới trong lúc ngăn chi tiết mở | Chưa có |
| D12 | Vùng `aria-live` chỉ đọc khi cần | Chưa có |
| D13 | Mặc định body response `{}` | `{code:'00',message:'Received'}` |
| D8 | URL callback lấy gốc từ cấu hình, mặc định địa chỉ trang đang mở | Mặc định `https://tpp-uat.example.com` |

### 2.2 Story U3 (US2.1 đến US2.10)

Ký hiệu: **Có+nối** = UI đã có, chỉ cần nối API/sửa nhỏ; **Sửa** = UI có nhưng logic sai so với AC; **Thiếu** = chưa có.

| Story | Tình trạng | Ghi chú đến từng AC |
|---|---|---|
| US2.1 danh sách | Có+nối | AC2.1.1 đủ cột; URL phải ghép từ `callbackPath` và gốc cấu hình. AC2.1.2 `CopyButton` có. AC2.1.3 mặc định backend không trả dịch vụ đã xóa (đúng). AC2.1.4 có `EmptyState` kèm nút tạo, tách khỏi `ErrorPanel` (tốt). Tìm theo mã/tên và lọc bật/tắt phải làm **phía client** vì `GET /api/services` không có tham số `search`/`status` |
| US2.2 tạo | Sửa | `SERVICE_CODE_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/` (`service-form.ts`) chặn chữ hoa và `_`, trong khi AC2.2.2/2.2.3 và backend là `^[A-Za-z0-9_-]{1,50}$` (ví dụ `THU_HO`). Trùng mã (409 `SERVICE_CODE_DUPLICATE`, không phân biệt hoa thường) phải gắn vào ô mã |
| US2.3 sửa | Có+nối | Ô mã bị khóa khi sửa (`GeneralSection`, `disabled={!isNew}`). Cần ánh xạ `fieldErrors` về từng ô (AC2.3.3) |
| US2.4 khóa API | **Sửa** | `validateServiceForm` luôn bắt nhập giá trị khóa khi chọn `API_KEY` → không thể sửa dịch vụ mà để trống khóa (AC2.4.3). `toFormValues` đọc `service.apiKeyValue`, trường không tồn tại ở backend (`Service` chỉ có `apiKeyConfigured`). Phải đổi sang `apiKeySecret` chỉ-ghi và chữ "Đã cấu hình khóa / Để trống để giữ khóa hiện tại" |
| US2.5 mapping | Sửa | Portal chấp nhận `$` trơn và `$` trong tên đoạn, không giới hạn số đoạn; backend: `$.` + 1 đến 10 đoạn `[A-Za-z0-9_-]`, tối đa 200 ký tự. Định dạng `CUSTOM` ↔ `PATTERN`. Mẫu thời gian do server kiểm theo cú pháp Java |
| US2.6 response | Sửa | Portal cho 100–599 (`service-form.ts`); backend 200–599 và cấm 204/205/304. `responseBody` gửi dạng **giá trị JSON**, không phải chuỗi; tối đa 64 KB |
| US2.7 bật/tắt | Có+nối | Đổi `PATCH` → `PUT /api/services/{code}/enabled`. Trạng thái không đổi khi lỗi (AC2.7.3): đã đúng vì chỉ `reload` sau khi thành công |
| US2.8 xóa mềm | **Thiếu** | Không có nút xóa, không có hộp thoại xác nhận. Lưu ý mâu thuẫn: `USER_REQUIREMENT.md` của bạn ghi "không cần xóa", nhưng stories (Must Have) và `rough-mockups` Q6 đã "bổ sung xóa dịch vụ" |
| US2.9 thử mapping | **Sửa** | Phải gọi `POST /api/mapping-tests` thay vì `applyMapping` cục bộ (kết quả khác nhau về micro giây, `PATTERN`, `errorCode`). AC2.9.4/2.9.5 vẫn thỏa |
| US2.10 gửi thử | Có+nối | Đã gọi `fetch /callbacks/{code}` đúng ý (không có endpoint riêng). Cần: không điền sẵn khóa (AC2.10.4), sửa câu chữ "request bị từ chối sẽ không được lưu" (sai: backend lưu thành `REJECTED`, AC2.10.5), liên kết tới callback vừa gửi (xem 3.5) |
| US2.11 mẫu | Không thuộc UI | Backend U2 đã làm (`docs/samples/`, script) |

### 2.3 Story U4 (US3.1 đến US3.9)

| Story | Tình trạng | Ghi chú |
|---|---|---|
| US3.1 danh sách giao dịch | Có+nối | Cột đủ; status trung tính; "Thiếu status" có chữ. Dữ liệu từ `TransactionSummary` của backend |
| US3.2 lọc giao dịch | **Sửa** | Status phải là **ô chữ** "chứa chuỗi" (AC3.2.2). Chip theo facet và sentinel `MISSING_STATUS_FILTER` không có API tương ứng. Nhãn "(đã xóa)" ở bộ lọc dịch vụ (AC3.2.3) cần `includeDeleted=true` và cờ `deleted`. Thời gian: xem D6 |
| US3.3 phân trang | **Sửa** | Cỡ trang cố định 10; backend chỉ nhận `size` ∈ {20, 50, 100} (mặc định 20), gửi 10 sẽ bị 400. Không có ô chọn cỡ trang (AC3.3.2). Tên trường: `page`, `size`, `totalItems`, `totalPages` |
| US3.4 chi tiết giao dịch | **Lệch** | Trang riêng thay cho ngăn trượt (AC3.4.1, AC3.4.4). AC3.4.2/3.4.3 làm được với cả hai kiểu. **Cần bạn quyết** (mục 7) |
| US3.5 tất cả callback | Sửa | Phải hiển thị cả callback `REJECTED` với cột "Kết quả xử lý" và lý do (AC3.5.3) |
| US3.6 lọc callback | **Sửa** | Thay chip mapping bằng `outcome` (`SUCCESS`/`MAPPING_ERROR`/`REJECTED`) và `rejectionReason` |
| US3.7 chi tiết callback | Sửa | Hiển thị `payloadRawText` khi không phải JSON, lý do từ chối, header dạng object, giá trị gốc của timestamp (backend không trả; suy ra từ `payloadJson`) |
| US3.8 tự cập nhật | Có+nối | Polling 5 giây, bật/tắt, tải lại, giờ cập nhật đều có. Giữ bộ lọc/trang qua URL |
| US3.9 chậm hoặc lỗi | Sửa | Giữ dữ liệu cũ khi lỗi và xóa lỗi khi thành công: đã đúng (`useAsyncData`). **Thiếu AC3.9.3:** `setInterval` vẫn bắn request mới khi request cũ chưa xong (chỉ bỏ kết quả cũ chứ không bỏ qua nhịp) |

### 2.4 Phần UI thuộc Won't Have / ngoài phạm vi (US4.x)

| Phần | Tệp | Hành động đề xuất |
|---|---|---|
| 4 thẻ thống kê (24h, tỉ lệ mapping, trung bình, p95) | `ServiceStats.tsx`, `pages/Services/index.tsx` | Bỏ phần số liệu callback (US4.9 "số liệu thống kê"). Có thể giữ "Tổng dịch vụ" và "Đang bật" tính từ danh sách (không cần API) |
| Dải "callback 24h / mapping tốt / lỗi mapping" | `pages/Monitoring/index.tsx` | Bỏ |
| `callbacksApi.getStats` và `/api/callbacks/stats` | `callbacks.api.ts` | Bỏ; backend **không có** endpoint này |
| Nút "Nhật ký nhận" | `pages/Services/index.tsx` | Bỏ (US4.9 liệt kê "Nhật ký nhận") |
| Đồng hồ chạy giây, avatar giả, breadcrumb "Ngân hàng Sandbox" | `SimulatorHeader.tsx` | Bỏ đồng hồ (D1); phần còn lại là trang trí, tùy bạn |
| Retry policy, IP whitelist, mTLS, nút Replay | — | `grep` không thấy trong `src/`; đã được bạn lược bỏ |

---

## 3. Khoảng trống tích hợp API (đối chiếu `OA`)

### 3.1 Bảng endpoint

| Nhu cầu UI | Portal đang gọi (`httpApi`) | Backend thật | Việc cần làm |
|---|---|---|---|
| Danh sách dịch vụ | `GET /api/services?search&status` → `{items,total,enabledTotal}` | `GET /api/services?includeDeleted` → **mảng** `Service[]` | Lọc/tìm và tính tổng ở client |
| Đọc một dịch vụ | `GET /api/services/{code}` | cùng, nhưng **trả cả dịch vụ đã xóa** (`deleted:true`) | Xử lý `deleted` (coi như không tìm thấy hoặc chỉ đọc) |
| Tạo | `POST /api/services` | `POST /api/services` → 201 | Đổi DTO (3.2) |
| Sửa | `PUT /api/services/{code}` | cùng | Đổi DTO; `apiKeySecret` vắng/rỗng = giữ khóa |
| Bật/tắt | **`PATCH`** `/enabled` | **`PUT`** `/enabled` | Đổi method |
| Xóa | không có | `DELETE /api/services/{code}` → 204 | Thêm (nếu giữ US2.8) |
| Thử mapping | không gọi | `POST /api/mapping-tests` | Thêm |
| Nhận callback / gửi thử | `fetch(base + /callbacks/{code})` | `POST /callbacks/{serviceCode}` | Giữ, bỏ giả định `X-Callback-Id` |
| Danh sách giao dịch | `GET /api/transactions?...&pageSize` → `{items,total,page,pageSize,statusFacets}` | `...&size` → `{items,page,size,totalItems,totalPages}` | Đổi tên tham số/trường, bỏ facet |
| Chi tiết giao dịch | `GET /api/transactions/{svc}/{txn}` → `{summary,callbacks}` | **`GET /api/transactions/detail?serviceCode&transactionId`** → `{transaction,callbacks}` | Đổi đường dẫn và tên trường |
| Danh sách callback | `GET /api/callbacks?mapping&pageSize` | `...?outcome&rejectionReason&size` | Đổi bộ lọc |
| Chi tiết callback | `GET /api/callbacks/{id}` (id chuỗi `CB-xxxxx`) | `recordId` số nguyên int64 | Đổi kiểu id; URL `callbacks/:callbackId` giữ chuỗi số |
| Thống kê | `GET /api/callbacks/stats` | **không tồn tại** | Bỏ |

### 3.2 Dịch vụ: ánh xạ trường

| Portal (`ServiceSettings`/`ServiceFormValues`) | Backend (`ServiceConfig`/`Service`) |
|---|---|
| `code` | `serviceCode` |
| `apiKeyHeader` | `apiKeyHeaderName` |
| `apiKeyValue` (đọc và ghi) | `apiKeySecret` (**chỉ ghi**); đọc: `apiKeyConfigured: boolean` |
| `mapping.transactionId/status/timestamp` | `transactionIdPath`, `statusPath`, `timestampPath` (null hoặc vắng = không đọc) |
| `timestampFormat: 'CUSTOM'` | `'PATTERN'` |
| `timestampPattern` | `timestampPattern` (chỉ có nghĩa khi `PATTERN`) |
| `timezone` | `defaultTimeZone` |
| `responseStatus` (số) | `responseHttpStatus` |
| `responseBody` (chuỗi JSON) | `responseBody` (giá trị JSON) |
| `description: string` | `description` nullable |
| `version` | `currentVersionNumber` (chỉ tăng khi cấu hình thật sự đổi; tên, mô tả, auth, khóa, bật/tắt **không** tăng) |
| không có | `deleted`, `callbackPath`, `createdAt`, `updatedAt` |

### 3.3 Lỗi: định dạng và mã

| Hạng mục | Portal | Backend |
|---|---|---|
| Thân lỗi | `{code, message, fieldErrors: Record<string,string>}` (`types/api.ts`) | `{error, message, fieldErrors: [{field,message}]}` |
| Mã lỗi | `NOT_FOUND`, `DUPLICATE_CODE`, `VALIDATION`, `NETWORK`, `UNKNOWN` (`constants/error-codes.ts`) | `VALIDATION_FAILED`, `SERVICE_CODE_DUPLICATE`, `SERVICE_NOT_FOUND`, `TRANSACTION_NOT_FOUND`, `CALLBACK_NOT_FOUND`, `UNSUPPORTED_MEDIA_TYPE`, `INTERNAL_ERROR`, v.v. |
| Header `X-Simulator-Error` | không đọc | có trên mọi lỗi do ứng dụng sinh; **không** có trên response đã cấu hình của dịch vụ (kể cả khi trùng mã HTTP) |
| `X-Simulator-Record-Failed` | không đọc | có trên 400/401/404/503 của đường nhận khi lần từ chối cũng không ghi được |
| Ánh xạ field | chỉ xử lý `fieldErrors.code` (`ServiceFormView.tsx`) | cần bảng `serviceCode→code`, `apiKeyHeaderName→apiKeyHeader`, `apiKeySecret→apiKeyValue`, `transactionIdPath→mapping.transactionId`, `statusPath→mapping.status`, `timestampPath→mapping.timestamp`, `timestampPattern`, `defaultTimeZone`, `responseHttpStatus→responseStatus`, `responseBody`, `name` |
| Timeout | không có | contract C5 ghi 30 giây, không tự thử lại |

Hệ quả hiện tại: mọi lỗi từ backend thật sẽ bị phân loại `UNKNOWN`, và lỗi từng ô không hiện (chỉ có toast).

### 3.4 Thời gian, phân trang, lọc

- Backend trả ISO 8601 UTC, có thể có phần thập phân **tới micro giây** (`2026-10-19T03:00:00.123456Z`). `Date.parse` trong V8 chấp nhận, nhưng tiêu chuẩn chỉ nói tới mili giây; nên cắt về mili giây trong lớp ánh xạ DTO để khỏi phụ thuộc trình duyệt (chưa kiểm chứng trên trình duyệt thật).
- `receivedFrom`/`receivedTo`: ISO 8601 **có múi giờ**, gồm hai đầu. Không có phần thập phân: `from` = đầu giây, `to` = hết giây (`TimeBounds.java`, BR19.1). `resolveRange` hiện gửi `…:59.999Z` cho đầu "đến" (tuỳ chọn) và `….000Z` cho các preset. Nên gửi **không có phần thập phân** để đúng ngữ nghĩa "đến hết giây" (D6). Dấu `+` của múi giờ phải thành `%2B`; `URLSearchParams` trong `client.ts` đã làm đúng, và dùng `Z` thì không phát sinh vấn đề.
- Giá trị rỗng (`receivedFrom=`) backend coi như vắng; `buildUrl` đã bỏ qua chuỗi rỗng.
- Sắp xếp và hòa nhau do backend quyết định (mới nhất trước, hòa theo id lớn hơn).
- Bộ lọc `status` backend **chỉ khớp chuỗi chứa**, giao dịch có `latestStatus` null **không** khớp; không có cách lọc "thiếu status".
- Bộ lọc `serviceCode` backend khớp không phân biệt hoa thường; `serviceCode` trả về giữ chữ gốc.

### 3.5 Chi tiết callback và gửi thử

| Portal (`CallbackRecord`) | Backend (`CallbackDetail`) |
|---|---|
| `id: 'CB-00001'`, `sequence` | `recordId: int64` |
| `requestHeaders: StoredHeader[]{name,value,masked}` | `requestHeaders: object`; giá trị `***` là đã che |
| `rawBody: string` | `payloadJson` (JSON đã chuẩn hóa jsonb) **hoặc** `payloadRawText` (đúng một trong hai) |
| `mappingResult.fields[k]{state,path,value,rawValue,error}`, `overall: SUCCESS/PARTIAL/FAILED` | `mappingFieldResults[k]{value,errorCode,error,warning}`; `outcome: SUCCESS/MAPPING_ERROR/REJECTED`; `{}` khi `REJECTED` |
| `source: SELF_TEST/EXTERNAL`, `processingMs` | **không có** (bỏ; `processingMs` chỉ đo được ở trình duyệt khi gửi thử) |
| `configSnapshot{...}` | chỉ `configVersionNumber` (số phiên bản) |
| `responseStatus`, `responseBody` (chuỗi) | `responseStatusReturned`, `responseBodyReturned` (JSON, vắng khi lỗi ghi) |
| không có | `rejectionReason`, `httpStatusReturned`, `serviceDeleted` |

Gửi thử (`callbacks.api.ts`, `SelfTestPanel.tsx`):
- `callbackId` lấy từ header `X-Callback-Id`. Backend **không** phát header này (grep không thấy trong `tpp-simulator-app`). Cần một cách khác để liên kết tới callback vừa gửi: (a) truy vấn `GET /api/callbacks?serviceCode=…` ngay sau khi gửi và lấy bản ghi mới nhất có `receivedAt ≥ sentAt` (heuristic, có thể nhầm khi có callback khác đến cùng lúc), hoặc (b) chỉ liên kết sang màn hình theo dõi đã lọc theo dịch vụ. AC2.10.3 chỉ yêu cầu "callback có mặt như bình thường", nên (b) đủ và đơn giản hơn.
- `buildHeaders` điền sẵn `service.apiKeyValue` (không tồn tại ở backend): phải để trống (AC2.10.4).
- Câu chữ cần sửa: "Request bị từ chối sẽ không được lưu" (`AuthSection.tsx`, `SelfTestPanel.tsx`, `receive-callback.ts` doc) trong khi backend lưu lần từ chối thành `REJECTED`, trừ `413` và mã dịch vụ chưa từng có.
- Hiển thị header `X-Simulator-Error` để phân biệt "do simulator từ chối" và "response đã cấu hình": nên làm.
- Thêm giải thích cho `413` (mockups S3).

### 3.6 Masking và bí mật

- Backend không bao giờ trả khóa (`Service` không có `apiKeySecret`). Portal hiện **đọc** `apiKeyValue` ở `toFormValues`, `SelfTestPanel.buildHeaders`, `mock`. Sau khi nối, các chỗ đó phải đổi, và NFR3 cần một test: "form sửa không chứa giá trị khóa".
- `mask-headers.ts` (che phía trình duyệt) trở thành thừa; backend đã che `Authorization`, `Proxy-Authorization`, `Cookie`, header khóa API.

### 3.7 Trạng thái tải / rỗng / lỗi, polling

- `useAsyncData` tốt về giữ dữ liệu cũ, hủy kết quả cũ (race), nhưng: (a) không có in-flight guard (AC3.9.3), (b) cả hai hook `transactions` và `callbacks` ở `Monitoring/index.tsx` đều poll dù tab không hoạt động (trả `null` nên rẻ, nhưng vẫn kích hoạt `useEffect`), (c) không `AbortController` nên request cũ vẫn chạy.
- `ErrorPanel` có "Thử lại" và dạng `compact` khi còn dữ liệu cũ: phù hợp AC3.9.1.

### 3.8 Vite proxy

`P:vite.config.ts` **không có** `server.proxy`. Phạm vi U3 trong `unit-of-work.md` và `bolt-plan.md` đòi rõ "Vite proxy `/api` và `/callbacks`". Gợi ý cấu hình (chưa chạy thử):
- target `http://127.0.0.1:8080` (không dùng `localhost`: Node mới có thể phân giải sang `::1`, trong khi backend chỉ bind `127.0.0.1`; đây là suy luận, chưa kiểm chứng trên máy bạn).
- `/api`: chuyển tiếp mọi method.
- `/callbacks`: dùng `bypass` để chỉ chuyển tiếp `POST`; `GET` của trình duyệt (tải lại trang `/callbacks/12`) trả `/index.html`. Hoặc đổi route SPA.
- `.env.example`: `VITE_API_BASE_URL` rỗng; `VITE_CALLBACK_BASE_URL` rỗng = dùng `window.location.origin` (D8). Hiện mặc định là `https://tpp-uat.example.com`.
- `vite preview` cần `preview.proxy` riêng nếu muốn dùng; không cần cho MVP chạy local qua `npm run dev`.

---

## 4. Rủi ro và vấn đề chặn

| # | Rủi ro | Mức | Bằng chứng / ghi chú |
|---|---|---|---|
| R1 | Không có proxy; README chỉ cấu hình cross-origin | Cao | 3.8; backend cấm CORS |
| R2 | Xung đột `/callbacks` giữa SPA và backend | Cao | `routes.tsx` vs `OA /callbacks/{serviceCode}` |
| R3 | Contract giả → phải viết lại tầng API và các kiểu | Cao (khối lượng) | Mục 3 |
| R4 | Test hiện có không bảo vệ sản phẩm sau khi nối | Trung bình | 1.5 |
| R5 | `verify.ps1`: bước `npm ci` sẽ **EPERM** nếu dev server Vite của bạn còn chạy (đã gặp ở U2: `lightningcss.win32-x64-msvc.node` bị khóa) | Cao nếu quên | `u2-backend-core/code-generation/code-summary.md`, mục 4 điểm 12 |
| R6 | `verify.ps1` chạy cả backend (~25 phút theo ghi chú U2) dù chỉ sửa frontend | Trung bình (thời gian) | `scripts/verify.ps1` không có tham số bỏ backend |
| R7 | `format:check` chưa tồn tại: `verify.ps1` sẽ **bỏ qua** (script không định nghĩa thì bỏ qua) nhưng Definition of Done của B3 ghi `format:check` xanh (`bolt-plan.md`) và team practices yêu cầu Prettier | Trung bình | `scripts/verify.ps1`, `bolt-plan.md` |
| R8 | Kho `tpp-simulator-portal` chưa commit gì ngoài README; tệp rác `_*` chưa bị loại; chưa có remote/CI | Trung bình | 1.1 |
| R9 | Lệch kiến trúc với `contract-summary.md` C5 (`src/shell`, `src/api/types.ts`, `apiClient`, `DataTable`, `FilterBar`, `SlideOver`, `ConfirmDialog`): portal dùng `layouts/`, `components/ui`, `features/*/types`. Reviewer kiến trúc có thể ghi nhận | Thấp–Trung bình | `contract-summary.md` mục C5 |
| R10 | Lint/test/build chưa được kiểm lại sau lần UI gần nhất của bạn | Chưa biết | Tôi không chạy. Lượt `verify.ps1` đầy đủ trước đó ghi frontend đạt (U2 code-summary), nhưng đó là trước các thay đổi UI sau này (nếu có) |
| R11 | Phiên bản gói rất mới (TS 6.0.3, ESLint 10, Vitest 5, Vite 8, React 19.3.1) | Thấp | `package.json` khớp lockfile; Vitest 5 yêu cầu Node `^22.12 || ^24 || >=26` (`_peers.txt`), trong khi README ghi Node `^20.19`. Nếu máy bạn chạy Node 20 thì `npm test` có thể không chạy được. Chưa kiểm chứng phiên bản Node thực tế |
| R12 | Thêm thư viện kiểm thử (jsdom, RTL, vitest-axe, prettier, jsx-a11y) là thay đổi dependency, nên cần bạn đồng ý và ghim phiên bản | Thấp | quy tắc ghim phiên bản |
| R13 | `README.md` của portal nói "Backend chưa được xây" và hướng dẫn cấu hình sai | Thấp | 1.1 |

---

## 5. Đề xuất

### 5.1 Stage nên bỏ, rút gọn, giữ

Bằng chứng về điều kiện stage nằm trong `.kiro/aidlc-common/stages/construction/*.md` (tôi đọc `functional-design`, và phần frontmatter các stage còn lại). Lệnh bỏ qua là `aidlc engine orchestrate report --stage <slug> --result skipped --reason "<lý do>"` (theo `.kiro/aidlc-common/conductor.md`); **người điều phối chạy lệnh này, không sửa tay `aidlc-state.md`**. Tôi không chạy `aidlc` nên chưa xác nhận engine có yêu cầu thêm bước xác nhận nào.

Trạng thái hiện tại: `functional-design` đang `[-]` (đang chạy) cho đơn vị kế tiếp; chưa có câu hỏi nào được trả lời cho U3 trong thư mục `construction/` (chỉ có `u1` và `u2`).

| Stage | Điều kiện trong stage | U3 | U4 | Lý do bỏ / giữ (viết sẵn để dùng làm `--reason`) |
|---|---|---|---|---|
| `functional-design` | CONDITIONAL: "Skip if simple logic changes with no new business logic" | **BỎ** | **BỎ** | "Unit loại ui; không có thực thể hay quy tắc nghiệp vụ mới (backend đã có `entities.md`, `rules.md` ở U2). Hành vi màn hình đã được đặc tả bởi US2.x/US3.x (AC), `mockups.md`, `interaction-spec.md` và `openapi.yaml`. Các quyết định tích hợp còn mở được hỏi trong `code-generation-questions.md`." |
| `nfr-requirements` | CONDITIONAL: "Skip if no NFR requirements and tech stack already determined" | **BỎ** (phương án B: rút gọn, xem dưới) | **BỎ** | "NFR3, NFR4 đã có trong `requirements.md` và `accessibility-checklist.md`; stack đã chốt (React/Vite/Tailwind) và đã dựng; không có yêu cầu hiệu năng/bảo mật mới ở lớp giao diện." Cảnh báo: `unit-of-work.md` giao NFR4 cho U3 và U4; để không mất, đưa các mục NFR4 thành bước và test có tên trong kế hoạch code-generation và trong build-and-test |
| `nfr-design` | CONDITIONAL: "Skip if NFR Requirements was skipped" | **BỎ** | **BỎ** | Điều kiện của chính stage khi `nfr-requirements` đã bỏ |
| `infrastructure-design` | CONDITIONAL: "Skip if no infrastructure changes and infrastructure already defined" | **BỎ** | **BỎ** | "Chỉ chạy local (feasibility, `team.md` mục Deployment); không dịch vụ đám mây; cấu hình Vite proxy và CI là cấu hình dự án, không phải hạ tầng." |
| `code-generation` | ALWAYS, `for_each` Unit, có câu hỏi + kế hoạch + reviewer kiến trúc (tối đa 2 vòng) | **GIỮ, RÚT GỌN** | **GIỮ, RÚT GỌN** | Rút gọn: file câu hỏi chỉ gồm các quyết định ở mục 7 (đã có sẵn đáp án đề xuất); kế hoạch dựng sẵn từ mục 5.3; U4 chỉ hỏi phần mới. Có thể thử `/aidlc --review advisory` cho U4 (onboarding ghi `--review <class>` giới hạn mức rà soát; tôi chưa xác nhận hiệu lực cụ thể, nên chạy `/aidlc --help` trước) |
| `build-and-test` | ALWAYS, chạy **một lần** sau khi mọi Unit xong | GIỮ | (một lần) | Gồm `verify.ps1`, đi tay theo `accessibility-checklist.md`, và chạy E2E thật với backend. Phần đo NFR1/NFR2 của backend (mục 4 điểm 6 của U2 code-summary: chưa đo) cũng nằm ở đây |
| `ci-pipeline` | CONDITIONAL: "Skip if CI already exists and is adequate" | — | GIỮ (cuối cùng) | Portal chưa có `.github/`, backend cũng chưa (chưa xác nhận); team practices yêu cầu GitHub Actions cho mỗi kho. Là việc nhỏ |

**Phương án B (nếu bạn muốn có giấy tờ cho NFR4):** giữ `nfr-requirements` cho U3 ở dạng ngắn (khoảng 5 câu: mức truy cập, công cụ kiểm thử, thời gian chờ, thư viện mới) và bỏ cho U4; vẫn bỏ `nfr-design`. Tôi không khuyến nghị vì cùng các câu hỏi đó được hỏi trong `code-generation-questions.md` với chi phí thấp hơn.

**Tiết kiệm ước tính:** ở U2, mỗi stage thiết kế có file câu hỏi, 2 bản rà soát (`reviews/review-01.md`, `review-02.md`) và một cổng duyệt. Bỏ 4 stage × 2 Unit tức khoảng 8 lượt câu hỏi, khoảng 14 lượt rà soát và khoảng 8 cổng duyệt. Đó là suy luận từ cấu trúc thư mục U2, không phải số đo.

### 5.2 Điều **không** nên bỏ

- `code-generation`: là nơi viết mã, kế hoạch và rà soát; stage `ALWAYS`.
- Kiểm chứng thật với backend: Definition of Done B3 ghi rõ "đạt khi chạy với backend thật".
- Kiểm tra NFR4 (bàn phím, nhãn, lỗi không chỉ bằng màu) và NFR3 (không lộ khóa) ở lớp giao diện.

### 5.3 Danh sách việc cho Code Generation (thứ tự, cỡ)

Cỡ: S dưới khoảng 1 giờ, M khoảng 1–3 giờ, L khoảng 3–6 giờ công của một worker. **Chỉ là ước lượng thô, chưa đo.**

**U3, `u3-frontend-services`** (gồm nền tảng dùng chung vì AppShell thuộc U3)

| # | Việc | Cỡ | Tệp chính |
|---|---|---|---|
| U3-1 | Chuẩn bị kho: commit hiện trạng UI làm baseline lên `main` (có sự đồng ý của bạn), xóa/ignore `_*`, tạo nhánh `u3-frontend-services` | S | `.gitignore`, kho `P:` |
| U3-2 | Vite proxy `/api` + `/callbacks` (POST-only), cập nhật `.env.example`, bỏ mặc định `tpp-uat.example.com`, sửa README | S | `vite.config.ts`, `.env.example`, `README.md`, `callback-url.ts` |
| U3-3 | Nền tảng API: client (timeout 30 s, `AbortSignal`, đọc `X-Simulator-Error`), kiểu `ErrorResponse`/`Page`, `ApiError` có `fieldErrors[]`, bảng mã lỗi mới | M | `services/http/*`, `types/api.ts`, `constants/error-codes.ts` |
| U3-4 | Dịch vụ: DTO và hàm ánh xạ hai chiều (mục 3.2), `callbackServicesApi` thật (list/get/create/update/enable/delete), lọc/tìm phía client, bỏ `apiKeyValue`, thêm `apiKeyConfigured` | M | `callback-services.types.ts`, `.api.ts`, `useServiceList.ts` |
| U3-5 | Form: sửa regex mã dịch vụ, khoảng 200–599, quy tắc khóa (để trống = giữ), ánh xạ `fieldErrors`→ô, lỗi 409 vào ô mã, `deleted`, D3/D13 nếu chấp nhận | M | `service-form.ts`, `ServiceFormView.tsx`, `AuthSection.tsx`, `ResponseSection.tsx` |
| U3-6 | Xóa mềm: nút, `ConfirmDialog` (cần dựng; hiện chưa có), cập nhật danh sách | M | mới `components/ui/ConfirmDialog`, `ServiceTable.tsx` |
| U3-7 | Thử mapping gọi `POST /api/mapping-tests`; xử lý `sampleJsonValid=false`, `errorCode`, `warning`; bỏ `applyMapping` cục bộ | M | `MappingTester.tsx`, mới `mapping-tests.api.ts` |
| U3-8 | Gửi thử: header khóa để trống, bỏ `X-Callback-Id`, sửa câu chữ, hiển thị `X-Simulator-Error`, giải thích 413, liên kết sang theo dõi | M | `SelfTestPanel.tsx`, `callbacks.api.ts`, `ServiceTest/index.tsx` |
| U3-9 | Dọn: bỏ thẻ thống kê và "Nhật ký nhận", đồng hồ giây (D1), cờ mock; quyết định xóa lớp mock và 4 tệp test mock (mục 7, câu 6) | S–M | `Services/index.tsx`, `ServiceStats.tsx`, `SimulatorHeader.tsx`, `mocks/*` |
| U3-10 | Công cụ và test: Prettier + `format:check`, `jsx-a11y`, jsdom + RTL + user-event (+ `vitest-axe`), Vitest nhận `.tsx`; test: ánh xạ DTO, form (lỗi từng ô, khóa để trống), thử mapping, danh sách (rỗng/lỗi), truy cập cơ bản | L | `package.json`, `vite.config.ts`, `eslint.config.js`, `*.test.tsx` |
| U3-11 | Kiểm chứng: chạy backend + PostgreSQL + `docs/samples` script, đi tay US2.1–2.10, Tabs phím mũi tên, skip link; `lint`, `format:check`, `test`, `build` | M | — |

**U4, `u4-frontend-monitoring`** (dựa trên nền tảng của U3)

| # | Việc | Cỡ | Tệp chính |
|---|---|---|---|
| U4-1 | DTO và API giao dịch/callback (mục 3.1, 3.4, 3.5): phân trang `page/size/totalItems`, chi tiết giao dịch bằng query, bỏ facet và stats, id số | M | `transactions.types.ts`, `callbacks.types.ts`, `*.api.ts` |
| U4-2 | Màn hình theo dõi: cỡ trang 20/50/100, ô Status (chữ), "Kết quả xử lý" + "Lý do", bộ lọc thời gian chính xác giây và không gửi phần thập phân, bộ lọc dịch vụ có "(đã xóa)", D9 | M | `Monitoring/index.tsx`, `MonitoringFilters.tsx`, `useMonitoringQuery.ts`, `range.ts` |
| U4-3 | Bảng callback có cột kết quả xử lý/lý do; huy hiệu mới thay `MappingBadge` | S–M | `CallbackTable.tsx`, `StatusBadges.tsx` |
| U4-4 | Chi tiết: thích ứng `CallbackDetailPanel` với DTO (header object, `payloadRawText`, `REJECTED`, `configVersionNumber`, giá trị gốc timestamp); quyết định trang hay ngăn trượt; nếu ngăn trượt thì dựng `SlideOver` (bẫy tiêu điểm, Esc, trả tiêu điểm) | M (trang) hoặc L (ngăn trượt) | `CallbackDetailPanel.tsx`, `TransactionDetailView.tsx`, `pages/TransactionDetail`, mới `SlideOver` |
| U4-5 | Polling: bỏ qua nhịp khi đang tải (AC3.9.3), hủy request bằng `AbortController`, chỉ poll tab hoạt động, D11/D12 nếu chấp nhận | M | `useAsyncData.ts`, `Monitoring/index.tsx` |
| U4-6 | Test (bộ xây tham số lọc, hook polling với fake timers, chi tiết `REJECTED`/văn bản gốc, axe) và kiểm chứng thật US3.1–3.9 với dữ liệu từ gửi thử và script mẫu | M–L | `*.test.tsx` |

Tổng thô: U3 khoảng 1 đến 2 ngày làm việc kèm rà soát, U4 khoảng 1 ngày. Không đo, chỉ dùng để thấy thứ tự độ lớn.

### 5.4 Cách chạy: một worker mỗi Unit; có gộp U3 và U4 không?

**Khuyến nghị: giữ hai Unit, chạy tuần tự, mỗi Unit một coder worker.**

Lý do không gộp (trung thực về độ chắc chắn):
1. Gộp đồng nghĩa sửa `unit-of-work.md` và `delivery-planning` đã duyệt (DAG: U4 phụ thuộc U2 và U3; "Mỗi Bolt đúng một Unit"). Stage `code-generation` lặp theo `for_each: unit-of-work`. Gộp cần mở lại stage `units-generation` (nhảy lùi), kéo theo story map. Chi phí lớn hơn phần tiết kiệm được. Tôi **không** khẳng định engine cấm tuyệt đối; tôi khẳng định nó không phải đường đi bình thường và đi ngược quy trình đã duyệt.
2. `team.md`/brief mục 9: "hoàn thành và kiểm chứng phần nào mới chuyển phần đó".
3. Lợi ích gộp (dùng chung AppShell, API client, kiểu) đã đạt được vì U3 sở hữu AppShell và nền tảng API; U4 chỉ thêm lên trên. Tức là nhồi nền tảng vào U3-3 đến U3-5 là đủ.
4. Không chạy song song hai worker: cùng một kho, cùng các tệp dùng chung (`package.json`, `vite.config.ts`, `types/api.ts`, `routes.tsx`); và `external-dependency-map.md` ghi: hook của AI-DLC chặn lệnh shell khi một cổng duyệt đang mở, nên các Bolt không chạy song song với một cổng duyệt.

Cách tiết kiệm công người duyệt thật sự: **trả lời trước một lượt tất cả quyết định ở mục 7**, để file câu hỏi của U3 và U4 gần như điền sẵn.

Tùy chọn giảm thời gian chờ (cần bạn đồng ý vì đụng script dự án): thêm tham số `-FrontendOnly` cho `scripts/verify.ps1` (bỏ bước `mvn verify` khoảng 25 phút khi chỉ sửa frontend). Lượt `verify.ps1` đầy đủ chạy một lần ở build-and-test.

---

## 6. Những điều tôi chưa kiểm chứng

- Không chạy `npm`, lint, test, build, dev server; không mở trình duyệt. Tình trạng xanh/đỏ hiện tại của portal **chưa biết**.
- Số 45 test là số bạn nêu; tôi đếm gần đúng bằng `grep`.
- Chưa xem ảnh `screen.png`; so sánh Stitch dựa trên HTML, `DESIGN.md` và tài liệu mockup đã duyệt.
- Chưa đọc hết mọi tệp: `Field.tsx`, `JsonEditor.tsx`, `JsonViewer.tsx`, `HeadersEditor.tsx`, `MappingResultTable.tsx`, `HeadersTable.tsx`, `TransactionTimeline.tsx`, `sample-payload.ts`, phần sau của `timestamp.ts`, `group-transactions.ts`.
- Hành vi backend lấy từ `openapi.yaml`, `functional-spec.md`, `rules.md` và vài tệp Java (`ServiceValidator`, `TimeBounds`); chưa chạy backend. Chưa xác nhận backend có trả giá trị gốc của timestamp khi lỗi (`FieldResult` không có trường này theo `OA`).
- Cấu hình proxy ở 3.8 là đề xuất chưa chạy thử; chưa kiểm chứng IPv6/`localhost`.
- Hiệu lực của `/aidlc --review advisory` và việc engine có đòi thêm xác nhận khi `skipped` chưa được kiểm chứng (không chạy `aidlc`).
- Phiên bản Node thực tế trên máy bạn chưa biết (liên quan Vitest 5).

---

## 7. Quyết định bạn cần đưa ra

Mỗi dòng có phương án khuyến nghị (K) để bạn chỉ cần "đồng ý" hoặc đổi.

1. **Bỏ 4 stage thiết kế cho cả U3 và U4** (`functional-design`, `nfr-requirements`, `nfr-design`, `infrastructure-design`) với các lý do ở 5.1? (K: đồng ý). Hoặc phương án B (giữ `nfr-requirements` ngắn cho U3).
2. **Không gộp U3 và U4**, chạy tuần tự, U3 sở hữu nền tảng API dùng chung? (K: đồng ý).
3. **Chi tiết giao dịch/callback:** giữ trang riêng như bạn đã dựng (nhanh hơn, lệch AC3.4.1/3.4.4 và `mockups S5`, cần sửa tài liệu/ghi lệch có chủ ý) hay dựng ngăn trượt đúng đặc tả (thêm việc L)? (K: ngăn trượt nếu bạn muốn khớp tài liệu đã duyệt; trang riêng nếu ưu tiên xong sớm và chấp nhận ghi lệch).
4. **Xóa mềm dịch vụ (US2.8, Must Have):** làm (K) hay bỏ khỏi MVP (cần sửa requirements/stories vì đã Must Have)? Lưu ý prompt cũ của bạn ghi "không cần xóa".
5. **Thẻ thống kê và "Nhật ký nhận":** bỏ hết (K, theo US4.9), hay giữ "Tổng dịch vụ / Đang bật" tính từ danh sách?
6. **Lớp mock:** xóa `src/mocks`, logic mapping/timestamp/receive/group ở trình duyệt và 4 tệp test tương ứng (K, giảm code chết, giảm hai nguồn sự thật), hay giữ để phát triển UI không cần backend (tốn công đồng bộ)?
7. **Bộ lọc:** chấp nhận chuẩn D6/D7 (Status là ô chữ, "Kết quả xử lý" + "Lý do", thời gian chính xác giây) và vẫn giữ preset thời gian của bạn như phần thêm? (K: đồng ý).
8. **Cỡ trang:** mặc định 20 và cho chọn 20/50/100 (K, backend chỉ nhận ba giá trị này).
9. **Liên kết sau khi gửi thử:** chỉ liên kết sang màn hình theo dõi lọc theo dịch vụ (K), hay truy vấn thêm để tìm đúng callback vừa gửi (heuristic)?
10. **Xung đột `/callbacks`:** proxy chỉ chuyển `POST` (K) hay đổi route SPA?
11. **Thư viện mới** (cần ghim phiên bản): `prettier`, `eslint-plugin-jsx-a11y`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `vitest-axe`; có thêm `@headlessui/react` cho hộp thoại/ngăn trượt (theo `interaction-spec`) hay tự dựng? (K: thêm bộ kiểm thử và Prettier; dùng headless UI chỉ nếu chọn ngăn trượt).
12. **Cấu trúc thư mục:** chấp nhận cấu trúc của bạn thay cho `src/shell`, `src/api/types.ts` trong C5, và ghi lệch có chủ ý? (K: đồng ý).
13. **Kho git:** commit hiện trạng portal làm baseline trên `main`, xóa tệp `_*`, tạo remote GitHub khi nào? Có cho phép thêm `-FrontendOnly` vào `verify.ps1`?
14. **Khi chạy kiểm chứng:** bạn phải tắt `npm run dev` trước `verify.ps1`/`npm ci` (EPERM đã gặp ở U2). Đồng ý nhắc điều này trong mỗi lượt kiểm chứng?

---

## 8. Tóm tắt điều hành (10 dòng)

1. Portal của bạn đã có đủ năm màn hình, bám Stitch, nên khối lượng còn lại chủ yếu là nối dữ liệu thật, không phải dựng UI.
2. Chế độ `api` hiện chạy theo contract tự đề xuất, lệch backend thật ở tên trường, phân trang, lỗi, method, đường dẫn chi tiết và hai endpoint không tồn tại.
3. Mapping và timestamp đang chạy trong trình duyệt; sau khi nối, thử mapping phải gọi `POST /api/mapping-tests`.
4. Chặn cứng: chưa có Vite proxy (backend cấm CORS) và route SPA `/callbacks/:id` đụng endpoint nhận callback.
5. 45 test hiện có chỉ kiểm logic của mock; chưa có test form, API, bộ lọc, polling, truy cập; Vitest chưa chạy được `.tsx`.
6. Lệch đặc tả đã duyệt: chi tiết là trang (không phải ngăn trượt), thiếu xóa mềm, bộ lọc status và "kết quả xử lý", cỡ trang 20/50/100, có thẻ thống kê thuộc Won't Have.
7. Đề xuất: bỏ `functional-design`, `nfr-requirements`, `nfr-design`, `infrastructure-design` cho cả U3 và U4; giữ `code-generation` rút gọn; `build-and-test` và `ci-pipeline` một lần ở cuối.
8. Không gộp U3 với U4 (đi ngược DAG và Bolt đã duyệt); U3 sở hữu nền tảng API dùng chung, U4 xây trên đó; chạy tuần tự, mỗi Unit một worker.
9. Việc còn lại: U3 khoảng 11 việc (nền tảng, dịch vụ, mapping-test, gửi thử, công cụ và test), U4 khoảng 6 việc (theo dõi, chi tiết, polling, test); ước lượng thô, chưa đo.
10. Bạn cần chốt 14 quyết định ở mục 7; quan trọng nhất là ngăn trượt hay trang, xóa mềm, xóa lớp mock, bỏ bốn stage thiết kế, và thư viện kiểm thử mới.
