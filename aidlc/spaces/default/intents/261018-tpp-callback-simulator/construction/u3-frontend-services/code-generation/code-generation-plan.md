# Kế hoạch Code Generation — U3 `u3-frontend-services`

## Summary

- Builds: giao diện quản lý dịch vụ nối với API backend thật: khung ứng dụng, danh sách (tìm, lọc, bật/tắt, sao chép URL, xóa mềm), biểu mẫu tạo và sửa (khóa API chỉ ghi), thử mapping qua `POST /api/mapping-tests`, gửi callback thử; Vite proxy; bộ công cụ và kiểm thử giao diện
- Touches: `tpp-simulator-portal/` (`src/app`, `src/features/callback-services`, `src/services/http`, `src/components`, `vite.config.ts`, `package.json`, `eslint.config.js`, `.env.example`, `README.md`, `.gitignore`, bỏ `src/mocks`) và `scripts/verify.ps1` ở gốc workspace; không đụng `tpp-simulator-app/`
- Tests: khoảng 70 đến 110 kiểm thử mới bằng Vitest, jsdom, Testing Library, `vitest-axe` (ánh xạ DTO, API client, biểu mẫu, danh sách, thử mapping, gửi thử, xóa mềm, truy cập cơ bản, không lộ khóa); bốn tệp test của lớp mock bị xóa cùng lớp mock

## Phạm vi và nguồn

Phần "U3 làm" của `unit-of-work.md`: story US2.1 đến US2.10; NFR4 (truy cập cơ bản) cho khung và biểu mẫu; NFR3 phía giao diện (không bao giờ hiện hay giữ lại giá trị khóa API); NFR5 (README chạy được), NFR6 (lint, test, build của portal), NFR7 phía biểu mẫu. Nguồn: `requirements.md`, `stories.md`, `contract-summary.md` và `tpp-simulator-app/docs/api/openapi.yaml` (hợp đồng thật của backend U1+U2), `refined-mockups/` (`mockups.md` D1 đến D15, `interaction-spec.md`, `design-system-mapping.md`, `accessibility-checklist.md`), thiết kế Stitch `docs/design/stitch/`, và báo cáo quét portal `.agents/tasks/portal-scan-report.md` (đầu vào chính của kế hoạch này). Mã nằm ở `tpp-simulator-portal/` (kho git riêng); chỉ các tệp bàn giao của stage này nằm trong thư mục record.

Hai Unit frontend chạy tuần tự. U3 dựng nền dùng chung (khung ứng dụng, API client, công cụ kiểm thử); các màn hình theo dõi giao dịch và chi tiết callback thuộc U4 và chỉ được giữ biên dịch được trong U3, không viết lại.

Phương pháp kiểm thử (Testing Contract của team): **test-after**: với mỗi lớp có thể kiểm thử, viết xong lớp đó rồi viết và chạy kiểm thử của lớp đó trước khi sang lớp tiếp theo. Chiến lược kiểm thử là Standard (5 đến 8 kiểm thử cho mỗi thành phần chính). Frontend không đặt ngưỡng coverage cứng (team.md); vẫn đo và báo cáo ở Build and Test. **Docker không dùng được trên máy này**: không bước nào phụ thuộc Docker. Kiểm thử frontend dùng `fetch` giả, không cần backend hay database.

## Quyết định triển khai và độ lệch cần bạn xem khi duyệt kế hoạch

1. **Tận dụng giao diện đã dựng.** Giữ cấu trúc `features/*`, các thành phần UI và token màu đã khớp Stitch; chỉ sửa lớp dữ liệu, logic biểu mẫu và những chỗ lệch với đặc tả đã duyệt. Không dựng lại giao diện.
2. **Bỏ hẳn lớp mock.** Xóa `src/mocks`, logic mapping, timestamp, nhận callback, gom nhóm chạy trong trình duyệt và bốn tệp test của chúng (45 test cũ chỉ kiểm logic mock). Cờ `VITE_DATA_MODE` và nhánh `appConfig.isMock` bị bỏ; mọi gọi dữ liệu đi qua API thật. Thử mapping luôn do server tính (đã duyệt ở Refined Mockups, R-03).
3. **Vite proxy chỉ cho `/api` và `POST /callbacks/*`.** Route SPA `callbacks/:callbackId` (thuộc U4) là yêu cầu GET trình duyệt, nên proxy `/callbacks` dùng `bypass` trả về trang SPA cho mọi phương thức khác POST; không đổi đường dẫn SPA trong U3. Backend không bật CORS; trình duyệt luôn gọi cùng nguồn qua proxy.
4. **Xóa mềm dịch vụ (US2.8) được làm**, với `ConfirmDialog` mới (headless, có bẫy tiêu điểm, Esc, trả tiêu điểm). `USER_REQUIREMENT.md` ghi "không cần xóa" nhưng stories Must Have và Rough Mockups Q6 đã chốt có xóa; kế hoạch theo stories.
5. **Bỏ khỏi UI:** bốn thẻ thống kê callback, nút "Nhật ký nhận", đồng hồ chạy từng giây ở header (D1). Backend không có `/api/callbacks/stats` và không có thời gian xử lý để tính trung bình hay p95.
6. **Khóa API chỉ ghi.** Form gửi `apiKeySecret` khi người dùng nhập; đọc `apiKeyConfigured` để hiện "Đã cấu hình khóa / Để trống để giữ khóa hiện tại"; không bao giờ giữ giá trị khóa trong trạng thái đọc về. Kiểm thử bắt buộc: form sửa và trang gửi thử không chứa giá trị khóa.
7. **Chi tiết callback giữ là trang riêng** (không ngăn trượt). Đây là sai lệch có chủ đích khỏi AC3.4.1 và AC3.4.4 của U4, đã được bạn duyệt; U4 ghi lại trong kế hoạch của nó. U3 không đụng phần này ngoài việc giữ biên dịch được.
8. **Sau khi gửi thử** chỉ có liên kết sang trang theo dõi đã lọc theo dịch vụ (không liên kết tới từng callback vì phản hồi không trả mã bản ghi).
9. **Thư viện mới do bạn cài.** Bạn đã yêu cầu: khi cần thêm thư viện, coder nhắn bạn lệnh cài chính xác (phiên bản cố định) để bạn chạy cho nhanh. Step 2 là điểm dừng đó. Danh sách dự kiến: `prettier`, `eslint-plugin-jsx-a11y`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `vitest-axe`.
10. **`scripts/verify.ps1` thêm tùy chọn `-FrontendOnly`** (đã duyệt) để kiểm chứng riêng portal mà không chạy lại 20 đến 25 phút của backend; lệnh kiểm chứng đã ủy quyền cho Construction giữ nguyên chữ và hành vi mặc định.
11. **Nhắc tắt `npm run dev` trước mỗi lần kiểm chứng:** máy chủ Vite đang chạy khóa tệp `.node` của lightningcss và làm `npm ci` lỗi EPERM.
12. **Kích thước trang mặc định 20** (lựa chọn 20/50/100) và bộ lọc theo D6/D7 thuộc U4; U3 chỉ áp dụng tìm theo mã hoặc tên và lọc bật/tắt phía client cho danh sách dịch vụ (`GET /api/services` không có tham số lọc).
13. **Tên Node:** Vitest 5 cần Node 22 trở lên nhưng README ghi Node 20 và phiên bản Node thực tế trên máy chưa kiểm chứng. Step 1 chạy `node -v` và sửa README cho đúng; nếu máy dùng Node thấp hơn, coder nhắn bạn thay vì tự đổi công cụ.

## Kế hoạch các bước (test-after theo từng lớp)

- [x] **Step 1: Khung dự án và cấu hình sản xuất**
  - Kho portal: ghi nhận hiện trạng git (một commit, còn lại chưa theo dõi); **không commit**. Xóa các tệp rác `_*` trong `tpp-simulator-portal/` sau khi liệt kê cho người dùng; bổ sung `.gitignore` (`node_modules`, `dist`, `coverage`, `*.log`, tệp môi trường cục bộ) nếu thiếu. Chạy `node -v`, ghi vào `README.md` yêu cầu Node đúng với Vitest/Vite hiện dùng.
  - `vite.config.ts`: `server.proxy` cho `/api` (mọi phương thức) và `/callbacks` (`bypass` trả `req.url` khi phương thức khác POST) tới `http://localhost:8080` (đọc từ biến `VITE_BACKEND_URL`, mặc định `http://localhost:8080`); cùng cấu hình cho `preview`. Cập nhật `.env.example`; bỏ mặc định `https://tpp-uat.example.com` của `callbackBaseUrl`: gốc URL callback mặc định là `window.location.origin` (D8). Bỏ `VITE_DATA_MODE`.
  - Truy vết: NFR5, NFR6, D8.
- [x] **Step 2: Chuẩn bị bộ chạy kiểm thử (điểm nhắn người dùng cài thư viện)**
  - Xác định phiên bản mới nhất ổn định của từng gói trong quyết định 9 bằng `npm view <gói> version`. **Nhắn người dùng một lệnh duy nhất** `npm install -D --save-exact <gói>@<phiên bản> ...` (chạy trong `tpp-simulator-portal/`, đóng `npm run dev` trước) rồi dừng chờ người dùng báo đã cài xong; không chạy `npm install` thay họ, không dùng khoảng phiên bản.
  - Sau khi cài: Vitest `environment: 'jsdom'`, `include` cả `*.test.ts` và `*.test.tsx`, `setupFiles` (`@testing-library/jest-dom`, `vitest-axe/extend-expect`, dọn DOM), script `test` (`vitest run`), `test:watch`; ghi lệnh chạy từng tệp vào `unit-test-instructions.md`.
  - Thêm Prettier (cấu hình mặc định của Vite/React, `.prettierrc`), script `format`, `format:check`; thêm `eslint-plugin-jsx-a11y` vào `eslint.config.js` với bộ quy tắc khuyến nghị; sửa toàn bộ lỗi lint nảy sinh. Không hạ hay tắt quy tắc để qua.
  - Kiểm tra bộ chạy: một kiểm thử khói (render `App` không lỗi) chạy xanh bằng `npx vitest run src/app`.
  - Truy vết: NFR4 (lint truy cập), NFR6.
- [x] **Step 3: Nền tảng API: cài đặt (lớp dữ liệu, phần 1)**
  - `src/services/http/`: client `fetch` dùng chung (hết thời gian 30 giây, `AbortSignal` do bên gọi truyền, đọc header `X-Simulator-Error`), kiểu `ErrorResponse` và `Page<T>` theo `openapi.yaml`, lớp `ApiError` mang `status`, `code`, `message`, `fieldErrors[]` (mảng `{field, message}`), bảng mã lỗi thật của backend (`VALIDATION_FAILED`, `SERVICE_CODE_DUPLICATE`, `SERVICE_NOT_FOUND`, `CALLBACK_NOT_FOUND`, `UNAUTHORIZED`, `INTERNAL_ERROR`...; đối chiếu `openapi.yaml`), phân loại lỗi mạng, hết thời gian, 5xx. Bỏ hợp đồng tự chế (`fieldErrors` dạng bản đồ, tên mã lỗi cũ).
  - Truy vết: AC2.3.3, AC2.7.3, NFR3 (không ghi khóa vào thông báo lỗi).
- [x] **Step 4: Nền tảng API: kiểm thử**
  - Kiểm thử đơn vị với `fetch` giả: phân tích `ErrorResponse` có `fieldErrors[]`; lỗi 409 trùng mã; 404; 500 không có thân JSON; lỗi mạng; hết thời gian; hủy bằng `AbortSignal`; không nhúng nội dung request chứa khóa vào lỗi. 5 đến 8 kiểm thử.
- [x] **Step 5: Dịch vụ: DTO, ánh xạ và API (lớp dữ liệu, phần 2) — cài đặt**
  - `callback-services.types.ts`: mô hình giao diện (`ServiceSettings`, `ServiceFormValues`) và DTO backend (`ServiceConfig`/`Service`) tách riêng; hàm ánh xạ hai chiều theo mục 3.2 của báo cáo quét (`toServiceSettings`, `toServiceRequest`): `callbackPath` ghép với gốc cấu hình thành URL đầy đủ, `apiKeyConfigured` thay `apiKeyValue`, `apiKeySecret` chỉ ghi, định dạng `CUSTOM` ↔ `PATTERN`, `responseBody` gửi dạng giá trị JSON (không phải chuỗi), `deleted`, `createdAt`, `updatedAt`.
  - `callbackServicesApi` thật: `list` (`GET /api/services`), `get`, `create` (`POST`), `update` (`PUT /api/services/{code}`), `setEnabled` (`PUT /api/services/{code}/enabled`), `remove` (`DELETE`); lọc và tìm theo mã hoặc tên phía client. `useServiceList` bỏ phụ thuộc mock. Hàm `buildCallbackUrl` dùng gốc cấu hình.
  - Truy vết: AC2.1.1, AC2.1.3, AC2.4.2, AC2.7.1, AC2.8.2.
- [x] **Step 6: Dịch vụ: kiểm thử DTO, ánh xạ và API**
  - Kiểm thử: ánh xạ hai chiều (kể cả `PATTERN`, múi giờ mặc định, `responseBody` là JSON), gói yêu cầu không chứa `apiKeySecret` khi ô khóa trống, đọc về không có giá trị khóa, URL callback ghép đúng, từng hàm API gọi đúng phương thức và đường dẫn (PUT chứ không PATCH, `size` chứ không `pageSize`). 6 đến 8 kiểm thử.
- [x] **Step 7: Logic biểu mẫu dịch vụ — cài đặt**
  - `service-form.ts`: mã dịch vụ `^[A-Za-z0-9_-]{1,50}$` (cho phép chữ hoa và `_`), tên bắt buộc (D10), mã trạng thái 200 đến 599 và cấm 204/205/304, `responseBody` phải là JSON hợp lệ tối đa 64 KB, đường dẫn mapping `$.` kèm 1 đến 10 đoạn `[A-Za-z0-9_-]` tối đa 200 ký tự, quy tắc khóa API (tạo mới: bắt buộc tên header và giá trị khóa; sửa: để trống thì giữ khóa cũ, chuyển sang `NONE` thì bỏ khóa), mẫu thời gian để server kiểm. Ánh xạ `fieldErrors[]` của backend về từng ô; lỗi 409 gắn vào ô mã; mặc định múi giờ `Asia/Ho_Chi_Minh` (AC2.5.4); mặc định body response `{}` (D13); khóa ô định dạng khi không có đường dẫn timestamp (D3).
  - Truy vết: AC2.2.2, AC2.2.3, AC2.3.3, AC2.4.1, AC2.4.3, AC2.4.4, AC2.4.5, AC2.5.1 đến AC2.5.5, AC2.6.2, AC2.6.3.
- [x] **Step 8: Logic biểu mẫu dịch vụ — kiểm thử**
  - Kiểm thử đơn vị cho mọi quy tắc trên (biên 199/200/599/600, `THU_HO`, `thu_ho`, mã dài 51 ký tự, `$.items[0].id` bị từ chối, `$..id`, `data.transId`), khóa để trống khi sửa, ánh xạ `fieldErrors[]` về ô, 409 vào ô mã. 8 đến 12 kiểm thử.
- [x] **Step 9: Thành phần giao diện: danh sách, biểu mẫu, xóa mềm — cài đặt**
  - Danh sách (`pages/Services`, `ServiceTable`): cột đủ theo AC2.1.1, nút sao chép URL kèm thông báo (AC2.1.2), `EmptyState` có nút tạo tách khỏi `ErrorPanel` (AC2.1.4), tìm theo mã hoặc tên và lọc bật/tắt phía client, bật/tắt gọi API và chỉ cập nhật sau khi thành công (AC2.7.3), nút "Gửi thử" mở đúng dịch vụ (AC2.10.1), nút xóa mở `ConfirmDialog`; hủy thì không đổi gì, xác nhận thì gọi `DELETE` rồi tải lại danh sách (AC2.8.1, AC2.8.2). Dịch vụ đã xóa không hiện (AC2.1.3).
  - `components/ui/ConfirmDialog` mới (thành phần headless Radix đã dùng sẵn trong dự án nếu có, nếu không dựng bằng thẻ `dialog` truy cập được): bẫy tiêu điểm, Esc đóng, trả tiêu điểm về nút mở, nhãn và mô tả bằng `aria-labelledby`/`aria-describedby`.
  - Biểu mẫu (`ServiceFormView`, `AuthSection`, `ResponseSection`, `GeneralSection`, `MappingSection`): dùng logic Step 7; ô mã chỉ đọc khi sửa (AC2.3.1); ô khóa hiện "Đã cấu hình khóa" và "Để trống để giữ khóa hiện tại" khi `apiKeyConfigured` (AC2.4.2); lỗi hiện cạnh từng ô bằng chữ, không chỉ màu (NFR4); nút lưu bật/tắt đúng theo trạng thái đang gửi; sau khi lưu quay về danh sách.
  - Bỏ khỏi UI: bốn thẻ thống kê (`ServiceStats`), nút "Nhật ký nhận", đồng hồ giây ở `SimulatorHeader` (D1: chỉ nhãn UAT và múi giờ).
  - Truy vết: AC2.1.x, AC2.2.1, AC2.3.1, AC2.3.2, AC2.4.2, AC2.7.x, AC2.8.1 đến AC2.8.4, AC2.10.1.
- [x] **Step 10: Thành phần giao diện: danh sách, biểu mẫu, xóa mềm — kiểm thử**
  - Testing Library + `user-event` với `fetch` giả: danh sách đủ cột, trạng thái trống khác trạng thái lỗi, sao chép URL, tìm và lọc, bật/tắt thành công và thất bại (trạng thái không đổi khi lỗi), xóa có xác nhận (hủy không gọi API, xác nhận gọi `DELETE` và danh sách mất dòng), form tạo (thành công và lỗi từng ô, 409 vào ô mã), form sửa (ô mã chỉ đọc, ô khóa không chứa giá trị khóa, để trống khóa thì yêu cầu không có `apiKeySecret`), bàn phím trên `ConfirmDialog` (Esc, trả tiêu điểm). 15 đến 25 kiểm thử.
- [x] **Step 11: Thử mapping qua API — cài đặt**
  - `mapping-tests.api.ts` gọi `POST /api/mapping-tests` với cấu hình đang nhập (chưa lưu, AC2.9.4) và JSON mẫu; `MappingTester` hiển thị `transactionId`, `status`, `timestamp` (kèm giờ Asia/Ho_Chi_Minh), "không tìm thấy" cho trường thiếu mà hai trường còn lại vẫn hiện (AC2.9.2), `sampleJsonValid=false` báo JSON không hợp lệ (AC2.9.3), `errorCode` và `warning` từ server; xóa `applyMapping` chạy trong trình duyệt. Thử mapping không điều hướng và không gọi bất kỳ endpoint ghi nào (AC2.9.5).
  - Truy vết: AC2.9.1 đến AC2.9.5.
- [x] **Step 12: Thử mapping qua API — kiểm thử**
  - Kiểm thử: yêu cầu mang cấu hình chưa lưu; hiển thị kết quả thành công; trường thiếu; JSON mẫu sai; lỗi server; chỉ gọi đúng `/api/mapping-tests` bằng POST và không gọi gì khác. 5 đến 8 kiểm thử.
- [x] **Step 13: Gửi callback thử — cài đặt**
  - `SelfTestPanel`, `callbacks.api.ts` (chỉ phần gửi), `ServiceTest/index.tsx`: mở đúng dịch vụ (AC2.10.1); header khóa điền sẵn tên và để trống giá trị, không nhận khóa từ backend (AC2.10.4); bỏ `X-Callback-Id`; cho thêm header tùy ý và gửi kèm (AC2.10.6); gọi `POST /callbacks/{serviceCode}` qua proxy; hiện mã HTTP, body phản hồi, thời gian ms đo ở trình duyệt (AC2.10.2), và `X-Simulator-Error` khi có; giải thích mã 413 (giới hạn 1 MiB); sửa câu chữ: yêu cầu bị từ chối vẫn được lưu với lý do (AC2.10.5); sau khi gửi chỉ có liên kết sang trang theo dõi đã lọc theo dịch vụ (AC2.10.3).
  - Truy vết: AC2.10.1 đến AC2.10.6.
- [x] **Step 14: Gửi callback thử — kiểm thử**
  - Kiểm thử: header khóa trống, header tùy ý được gửi, hiển thị status/body/ms, 401 với khóa sai, 413, `X-Simulator-Error`, liên kết sang theo dõi có tham số dịch vụ, không giữ giá trị khóa sau khi gửi. 6 đến 8 kiểm thử.
- [x] **Step 15: Dọn lớp mock và mã thừa**
  - Xóa `src/mocks`, logic mapping/timestamp/nhận/gom nhóm trong trình duyệt, 4 tệp test mock, `mask-headers.ts` nếu không còn nơi dùng (backend đã che header), cờ `isMock` và các nhánh `mockApi`. Màn hình theo dõi (U4) phải còn biên dịch được: nếu nó đang dựa vào mock thì tách tối thiểu để build qua và ghi rõ trong `code-summary.md` phần bàn giao cho U4. Chạy `npm run lint` và `npx tsc --noEmit` đến sạch.
  - Truy vết: NFR6.
- [x] **Step 16: Truy cập cơ bản (NFR4) và không lộ khóa (NFR3)**
  - Kiểm thử `vitest-axe` cho khung ứng dụng, danh sách, biểu mẫu tạo, biểu mẫu sửa, hộp thoại xác nhận, thử mapping, trang gửi thử: không vi phạm; thủ công theo `accessibility-checklist.md` các mục bàn phím (Tab, mũi tên trong `Tabs`, Esc, skip link), ghi các mục chưa đo tự động vào `code-summary.md`. Kiểm thử không lộ khóa: dựng form sửa với dịch vụ `apiKeyConfigured`, khẳng định không có chuỗi khóa trong DOM, trong yêu cầu gửi đi khi để trống, trong thông báo lỗi. 6 đến 10 kiểm thử.
  - Truy vết: NFR4, NFR3, AC2.4.2, AC2.10.4.
- [x] **Step 17: Cấu hình xây dựng và kiểm chứng**
  - `package.json` scripts: `lint`, `format:check`, `test`, `build`; `scripts/verify.ps1` (gốc workspace) thêm tham số `-FrontendOnly` chỉ chạy bước portal (`npm ci`, `lint`, `format:check`, `test`, `build`), giữ nguyên hành vi mặc định và các bước backend; README portal viết lại cho đúng (chạy cùng nguồn qua proxy, bỏ mô tả cross-origin và `VITE_DATA_MODE`, yêu cầu Node đúng, lệnh `npm ci`, `npm run dev`, `npm test`, nhắc đóng `npm run dev` trước khi chạy verify). Không hạ hay tắt quy tắc lint hoặc ngưỡng nào để qua.
  - Chạy `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1 -FrontendOnly` cho đến khi xanh (nhắc người dùng đóng `npm run dev` trước). Chạy tay một lần cùng backend thật (`docs/samples` script tạo ba dịch vụ mẫu) khi người dùng cho phép chạy backend; nếu không chạy được thì ghi rõ "chưa chạy" trong `code-summary.md`.
  - Truy vết: NFR5, NFR6.
- [x] **Step 18: Tài liệu bàn giao của Code Generation**
  - Viết `code-summary.md`, `source-manifest.json` (mọi đường dẫn nguồn do Unit này tạo, sửa hoặc xóa, tương đối với `tpp-simulator-portal/`, kèm `repo` theo cách engine yêu cầu cho đa kho, và `scripts/verify.ps1` ở workspace), `traceability.json` (AC và NFR trỏ tới một tệp thật). Ghi rõ các việc bàn giao cho U4 và các mục kiểm chứng chưa đo.
  - Truy vết: toàn bộ.

## Truy vết story đến bước

| Story | Tiêu chí | Bước |
|---|---|---|
| US2.1 | AC2.1.1 đến AC2.1.4 | Step 5, Step 6, Step 9, Step 10 |
| US2.2 | AC2.2.1 đến AC2.2.4 | Step 7, Step 8, Step 9, Step 10 |
| US2.3 | AC2.3.1 đến AC2.3.3 | Step 7, Step 8, Step 9, Step 10 |
| US2.4 | AC2.4.1 đến AC2.4.5 | Step 5, Step 6, Step 7, Step 8, Step 9, Step 16 |
| US2.5 | AC2.5.1 đến AC2.5.5 | Step 7, Step 8 |
| US2.6 | AC2.6.1 đến AC2.6.3 | Step 5, Step 7, Step 8 |
| US2.7 | AC2.7.1 đến AC2.7.3 | Step 5, Step 9, Step 10 |
| US2.8 | AC2.8.1 đến AC2.8.4 | Step 5, Step 9, Step 10 |
| US2.9 | AC2.9.1 đến AC2.9.5 | Step 11, Step 12 |
| US2.10 | AC2.10.1 đến AC2.10.6 | Step 9, Step 13, Step 14, Step 16 |
| NFR3 phía giao diện | không lộ khóa | Step 3, Step 5, Step 6, Step 16 |
| NFR4 | bàn phím, nhãn, lỗi không chỉ bằng màu | Step 2, Step 9, Step 16 |
| NFR5, NFR6 | chạy theo README, lint/test/build | Step 1, Step 15, Step 17 |
| NFR7 phía biểu mẫu | thêm dịch vụ bằng cấu hình | Step 7, Step 9 |

AC2.2.4 (callback mới được ánh xạ đúng mà không sửa code) và AC2.3.2 (callback mới dùng cấu hình mới) là hành vi của backend U2; U3 kiểm chứng ở Step 17 bằng lần chạy tay cùng backend thật.

## Ngoài phạm vi của kế hoạch này

Mọi màn hình theo dõi giao dịch và chi tiết callback (U4: US3.1 đến US3.9, bộ lọc D6/D7, polling, ngăn chi tiết); US2.11 (đã làm ở U2); thêm endpoint hay trường mới ở backend; bản triển khai production; CI của portal (CI Pipeline); Docker; git commit.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "Viết xong từng lớp có thể kiểm thử, sau đó viết và chạy kiểm thử của lớp đó trước khi sang lớp tiếp theo.",
  "scope": "mvp",
  "test_strategy": "standard",
  "project_type": "greenfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Methodology evidence**: người dùng chọn Q3-A; khớp mặc định của org và brief mục 9.\n- **Ordering**: Viết xong từng lớp có thể kiểm thử, sau đó viết và chạy kiểm thử của lớp đó trước khi sang lớp tiếp theo.\n- Backend: JUnit 5 + Spring Boot Test; kiểm thử tích hợp chạy PostgreSQL thật qua Testcontainers (vì dùng JSONB).\n- Frontend: Vitest + React Testing Library cho các phần có logic (form cấu hình, bộ lọc, polling).\n- Trọng tâm theo brief: mapping, timestamp, xác thực, lịch sử, xử lý đồng thời và API tích hợp; không viết test chỉ lặp lại getter/setter hoặc chi tiết triển khai.\n- Coverage: tối thiểu 80% line coverage cho backend, đo bằng JaCoCo (Q4); frontend không đặt ngưỡng cứng.\n- CI: GitHub Actions build và chạy test backend và frontend khi đẩy code lên GitHub; test phải xanh trước khi gộp vào `main` (Q4)."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Meet an 80% line-coverage floor.",
      "Run the selected tests in CI before merge."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:4bfdbdb64312e7034ae5ed64b00b2e6b8b898211e456ce9dca996fe5e6afdfce",
  "contract_sha256": "sha256:c40748ae7947098622610ee74b89f8cfde88b947373a91ca77f1733dba8f1532"
}
```
