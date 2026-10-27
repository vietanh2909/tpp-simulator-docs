# Code Summary — U4 `u4-frontend-monitoring`

Ngôn ngữ: tiếng Việt. Mã nguồn nằm ở `tpp-simulator-portal/` (kho git riêng, **chưa commit**). Backend `tpp-simulator-app/` và `scripts/verify.ps1` không bị sửa. Không thêm thư viện, không chạy `npm install` hay `npm ci` ngoài `scripts/verify.ps1`, không dùng Docker, không tạo commit.

## 1. Kết quả

- 18/18 bước của kế hoạch đã làm theo phương pháp test-after (hiện thực lớp rồi viết và chạy kiểm thử của lớp đó trước khi sang lớp sau).
- **261 kiểm thử, 261 xanh** cho toàn bộ portal (29 tệp): 109 của U3 giữ nguyên xanh và **152 kiểm thử mới của U4** (Vitest 5, jsdom, Testing Library, axe-core).
- Kiểm chứng cuối: xem mục 5.

Số liệu ở mục này là của đợt đầu (trước "Sửa theo review lần 1" ở mục 8). Sau đợt sửa: **271 kiểm thử, 31 tệp**, trong đó 162 kiểm thử mới của U4 (xem mục 8).

### Số kiểm thử mới theo lớp (đợt đầu)

| Lớp (bước) | Tệp kiểm thử | Số kiểm thử |
| --- | --- | --- |
| DTO callback (3, 4) | `features/callbacks/utils/callback-dto.test.ts` | 9 |
| DTO giao dịch (3, 4) | `features/transactions/utils/transaction-dto.test.ts` | 4 |
| API callback (5, 6) | `features/callbacks/api/callbacks.api.test.ts` | 7 |
| API giao dịch (5, 6) | `features/transactions/api/transactions.api.test.ts` | 7 |
| Thời gian GMT+7 và quy đổi (7, 8) | `features/transactions/utils/time-filter.test.ts` | 10 |
| Bộ lọc, trang, URL, nhớ theo tab (7, 8) | `features/transactions/utils/monitoring-query.test.ts` | 10 |
| Lịch sử, sai thứ tự, "callback mới" (7, 8) | `features/transactions/utils/history.test.ts` | 3 |
| Đọc `$.a.b.c`, giá trị gốc timestamp (7, 8) | `features/callbacks/utils/payload-path.test.ts` | 7 |
| Hook tải và tự cập nhật, đồng hồ giả (9, 10) | `hooks/useAsyncData.test.tsx` | 9 |
| Vùng thông báo `aria-live` (9, 10) | `features/transactions/hooks/useMonitoringAnnouncements.test.ts` | 9 |
| Phân trang có chọn cỡ trang (11, 12) | `components/ui/Pagination.test.tsx` | 6 |
| Nhãn trạng thái (11, 12) | `features/callbacks/components/StatusBadges.test.tsx` | 5 |
| Màn hình theo dõi, tab Giao dịch (11, 12) | `pages/Monitoring/Monitoring.transactions.test.tsx` | 21 |
| Màn hình theo dõi, tab Tất cả callback (11, 12) | `pages/Monitoring/Monitoring.callbacks.test.tsx` | 12 |
| Chi tiết giao dịch và một lần nhận (13, 14) | `pages/TransactionDetail/TransactionDetail.test.tsx` | 19 |
| Truy cập (axe, bàn phím), `aria-live`, không lộ khóa (16) | `test/monitoring-accessibility.test.tsx` | 10 |
| Banner cửa sổ hẹp (16) | `layouts/SimulatorLayout/NarrowWindowBanner.test.tsx` | 4 |
| **Tổng U4** | | **152** |

Kiểm thử chỉ giả `fetch` ở biên mạng. `src/test/fixtures/fake-backend.ts` là backend giả ở biên đó: lọc (chứa chuỗi, không phân biệt hoa thường), hai đầu thời gian tính cả hai, sắp mới nhất trước, `size` chỉ nhận 20/50/100 (khác thì 400 `VALIDATION_FAILED`) và `404` đúng mã, bám `openapi.yaml`. Mọi logic giao diện (DTO, bộ lọc, hook, thành phần) chạy thật.

## 2. Tệp tạo, sửa, xóa (đường dẫn tương đối với kho `tpp-simulator-portal/`)

**Tạo (mã)**: `src/features/callbacks/constants/callbacks.constants.ts`, `src/features/callbacks/utils/{callback-dto,payload-path}.ts`, `src/features/transactions/utils/{transaction-dto,time-filter,monitoring-query,navigation-state}.ts`, `src/features/transactions/hooks/useMonitoringAnnouncements.ts`, `src/layouts/SimulatorLayout/NarrowWindowBanner.tsx`.

**Tạo (kiểm thử, fixture)**: toàn bộ tệp `*.test.ts(x)` ở mục 1; `src/test/fixtures/{monitoring,fake-backend}.ts`, `src/test/monitoring-app.tsx`.

**Viết lại**: `src/hooks/useAsyncData.ts`, `src/features/callbacks/{types/callbacks.types.ts,api/callbacks.api.ts}`, `src/features/transactions/{types/transactions.types.ts,api/transactions.api.ts,hooks/useMonitoringQuery.ts,utils/history.ts}`, các thành phần hiển thị `callbacks/components/{CallbackDetailPanel,CallbackTable,HeadersTable,MappingResultTable,StatusBadges}.tsx`, `transactions/components/{MonitoringFilters,TransactionDetailView,TransactionTable,TransactionTimeline}.tsx`, `src/pages/{Monitoring,TransactionDetail}/index.tsx`.

**Sửa nhỏ**: `README.md`, `src/app/config/app.config.ts` (`defaultPageSize` 20, thêm `pageSizeOptions`), `src/constants/routes.ts` (`recordId` số), `src/types/api.ts` (gỡ `LegacyPage`), `src/components/ui/Pagination.tsx` (chọn cỡ trang, tùy chọn), `src/components/ui/JsonViewer.tsx` (thêm `plain` cho body không phải JSON), `src/layouts/SimulatorLayout/index.tsx` (banner), `src/features/callback-services/index.ts` (gỡ export mô hình cũ), `src/features/callbacks/index.ts`, `src/features/transactions/index.ts`.

**Xóa**: `src/features/transactions/utils/range.ts`, `src/features/transactions/constants/transactions.constants.ts` (`MISSING_STATUS_FILTER`), `src/features/callback-services/types/mapping-result.types.ts` (`MappingResult`, `MappingOverall`, `MAPPING_OVERALL_LABEL`). Cùng với đó đã gỡ `LegacyPage`, `CallbackRecord`, `ConfigSnapshot`, `CallbackListItem`, `CallbackStats`, `StatusFacet`, `callbacksApi.getStats` và `MappingBadge`. Giữ `features/callbacks/utils/mask-headers.ts` vì gửi thử (U3) còn dùng. `package.json`, `package-lock.json`, `vite.config.ts`, `eslint.config.js` không đổi.

## 3. Quyết định chính

1. **Hợp đồng thật**: `Page<T>` (`items, page, size, totalItems, totalPages`), `size` chỉ 20/50/100 (mặc định 20; giá trị lạ trên địa chỉ quy về 20 nên không bao giờ gửi 10); `GET /api/transactions/detail?serviceCode&transactionId` (cả hai mã hóa phần trăm trong truy vấn); `GET /api/callbacks/{recordId}` với `recordId` số; `outcome` và `rejectionReason`. Đã gỡ `statusFacets`, `getStats` (`/api/callbacks/stats`), `X-Callback-Id` và dải thống kê 24 giờ. Lớp API áp DTO ngay: mốc thời gian cắt về mili giây; header object thành danh sách `{name, value, masked}` (`***` là đã che); `payloadRawText` hoặc `payloadJson` (kể cả JSON null).
2. **Bộ lọc**: tab Giao dịch (dịch vụ, transactionId, Status là ô chữ, thời gian); tab Tất cả callback (dịch vụ, transactionId, thời gian, "Kết quả xử lý", "Lý do" chỉ khi chọn "Bị từ chối"). Bộ lọc dịch vụ gọi `callbackServicesApi.list({ includeDeleted: true })` và gắn "(đã xóa)". Thời gian: ô chữ `yyyy-MM-dd HH:mm:ss` (GMT+7), gõ tắt `yyyy-MM-dd` (00:00:00 cho "Từ", 23:59:59 cho "Đến"), lỗi "Nhập theo dạng yyyy-MM-dd HH:mm:ss." và "Thời gian bắt đầu phải trước thời gian kết thúc."; mốc gửi API không có phần thập phân giây; giữ preset 15 phút, 1 giờ, 24 giờ, 7 ngày (tính lại ở mỗi lần tải).
3. **Trạng thái trên địa chỉ**: tab, bộ lọc, trang và cỡ trang của tab đang xem nằm trong URL; bộ lọc của tab kia nhớ trong `sessionStorage` (khóa `tpp-simulator:monitoring:<tab>`, không chứa dữ liệu nhạy cảm). Liên kết của gửi thử U3 `/transactions?tab=callbacks&service=<mã>` hoạt động (có kiểm thử).
4. **Tự cập nhật** (`useAsyncData`): hàm tải nhận `signal`; nhịp 5 giây bị bỏ qua khi một lần tải đang chạy (AC3.9.3, kiểm thử đồng hồ giả); đổi tham số hoặc "Tải lại" hủy lần đang chạy và chỉ nhận kết quả mới nhất; lỗi giữ dữ liệu và giờ cập nhật thành công gần nhất; chữ ký tương thích `useService`, `useServiceList`. Chỉ tab đang xem được tải.
5. **Vùng `aria-live="polite"` (D12)**: chỉ nói khi Tải lại, áp dụng bộ lọc, đổi trang, tổng số dòng đổi (cùng một truy vấn), lỗi và phục hồi. Thông báo gắn với **khóa truy vấn** mà thao tác dẫn tới, nên kết quả cũ về muộn không "ăn" mất thông báo (lỗi này đã gặp ở kiểm thử và được sửa).
6. **Chi tiết giao dịch**: tự cập nhật cùng nhịp, lần đang chọn không tự nhảy, hiện "Có N callback mới" kèm nút "Xem lần nhận mới nhất" (D11). `transactionId` có `/` đi đúng qua đường dẫn SPA (`2026/10/001`, có kiểm thử); `/ ? # %` và khoảng trắng được kiểm thử ở lớp API.
7. **Callback bị từ chối**: lý do bằng chữ và biểu tượng, `httpStatusReturned`, body gốc dạng văn bản khi `payloadRawText`, mapping `{}` hiện "Chưa chạy mapping vì request bị từ chối.". Status nghiệp vụ luôn trung tính; thiếu status có nhãn "Thiếu status" và dấu "Lỗi mapping" có chữ.
8. **Giá trị gốc của timestamp (AC3.7.3)**: backend không trả. Luôn hiện payload đầy đủ; khi `configVersionNumber` bằng `currentVersionNumber` của dịch vụ, đọc giá trị ở `timestampPath` hiện hành từ `payloadJson` (chỉ object lồng nhau) và hiện kèm chú thích "đọc theo đường dẫn hiện tại của dịch vụ"; khác phiên bản, dịch vụ đã xóa hoặc payload không phải JSON thì "xem giá trị trong payload bên dưới". Dịch vụ chỉ được tải khi có lỗi timestamp.
9. **Quay lại danh sách**: bấm "Xem" mang theo địa chỉ danh sách (`backTo` trong state điều hướng); nút "Quay lại danh sách theo dõi" mở lại đúng tab, bộ lọc, trang. Mở chi tiết trực tiếp (không có `backTo`) thì về `/transactions`. Đổi lần nhận trong chi tiết giữ `backTo`.
10. **Banner cửa sổ hẹp (D15)** dưới 1024px, đóng được, không chặn nội dung, ở `src/layouts/SimulatorLayout`.

## 4. Độ lệch so với kế hoạch và đặc tả

| # | Độ lệch | Lý do và hệ quả |
| --- | --- | --- |
| 1 | **Chi tiết là TRANG RIÊNG, không dựng ngăn trượt** (`SlideOver`). Lệch có chủ đích khỏi AC3.4.1 ("bảng trượt bên phải"), AC3.4.4 ("Esc đóng bảng, tiêu điểm về dòng") và `interaction-spec.md` mục 2.6, 4.3. | Quyết định đã duyệt ở U3 và xác nhận ở kế hoạch U4. Thay cho Esc và tiêu điểm về dòng là nút "Quay lại danh sách theo dõi" và nút Back của trình duyệt, đều trả đúng tab, bộ lọc, trang. Phần còn lại của AC3.4 và AC3.7 đủ. Trong `traceability.json`: AC3.4.1 là `OK`, **AC3.4.4 là `Deferred`** vì chưa thỏa nguyên văn. |
| 2 | Giá trị gốc timestamp lấy từ payload theo đường dẫn hiện tại của dịch vụ khi cùng phiên bản cấu hình (mục 3.8), không do backend trả. | Backend không có trường này; thay đổi backend nằm ngoài U4. Cần người dùng xác nhận đủ cho AC3.7.3 (đã nêu ở kế hoạch). |
| 3 | Bộ lọc thời gian: chọn "Tùy chọn (GMT+7)..." trong ô "Khung giờ nhận" thì mới hiện hai ô chữ; mặc định là "Tất cả thời gian". | Giữ ô chọn có preset đã dựng (kế hoạch quyết định 5) thay vì luôn hiện hai ô như wireframe S4. |
| 4 | "Từ" bằng "Đến" vẫn hợp lệ (một giây duy nhất); chỉ báo "Thời gian bắt đầu phải trước thời gian kết thúc." khi "Từ" lớn hơn "Đến". Lỗi này gắn vào ô "Từ". | Tránh chặn bộ lọc đúng một giây (đầu "đến" là hết giây đó). |
| 5 | Bảng callback giữ cột "Mã" (`#recordId`); bảng mapping bỏ cột "Đường dẫn". | Cột mã giúp tra cứu và đã có trong giao diện U3; backend không trả đường dẫn đã dùng cho từng lần nhận (chỉ `configVersionNumber`). |
| 6 | Trang chi tiết một callback không có công tắc tự cập nhật (chỉ "Tải lại"). Từ tab "Tất cả callback" luôn mở `/callbacks/:recordId`; từ tab "Giao dịch" mở `/transactions/:serviceCode/:transactionId`. | Một lần nhận không đổi sau khi lưu; khớp S5a, S5b. |
| 7 | Nút trang của `Pagination` có tên "Trang N trên M" thay vì chỉ số N. | Giúp trình đọc màn hình (kế hoạch Step 11); không ảnh hưởng nơi dùng khác vì chỉ màn hình theo dõi dùng `Pagination`. |
| 8 | Step 2: **không chạy riêng đường chuẩn** `npx vitest run src/components/ui src/app src/test` trước khi sửa. | Bù bằng kết quả cuối: toàn bộ 109 kiểm thử của U3 vẫn xanh trong bộ 261. |
| 9 | Hộp thoại "Bỏ các thay đổi chưa lưu?" (G5) và xác nhận ghi đè JSON mẫu (D14) của U3 **không làm** ở U4. | Đúng kế hoạch (quyết định 17); chuyển sang Build and Test. |

Ghi chú công cụ: trên máy này `npx` và `npm` bị chặn bởi chính sách chạy script PowerShell nên phải gọi `npx.cmd` và `npm.cmd` (script `scripts/verify.ps1` chạy với `-ExecutionPolicy Bypass` nên không bị ảnh hưởng). Một số thao tác ghi tệp bị móc chặn nhất thời ("no hook payload arrived") và được thử lại ngay; không có tệp nào bị ghi dở.

## 5. Kiểm chứng

Mỗi lớp được chạy lẻ ngay sau khi viết (`npx.cmd vitest run <đường dẫn>`), rồi chạy cả bộ.

- `npm run typecheck`: **sạch** (chạy lẻ khi mã đã xong; `tsc --noEmit` còn chạy trong bước build của verify).
- `npm run lint`: **sạch** (lẻ và trong verify).
- `npm run format:check`: **sạch** sau `npm run format` (Prettier định dạng các tệp U4 mới; tệp U3 không đổi).
- `npm test`: **29 tệp, 261/261 xanh** (574 giây khi chạy lẻ, 591 giây trong verify). Cảnh báo `HTMLCanvasElement's getContext() Not implemented` là của jsdom khi axe chạy quy tắc `icon-ligature`, không làm kiểm thử lỗi (như U3).
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1 -FrontendOnly` (từ `d:\pet-pj-dlc`, không có `npm run dev` đang chạy): **`VERIFY OK`** (npm ci 8 phút, lint, format:check, test 261/261, build gồm `tsc --noEmit`, bản dựng chính 343,92 kB, gzip 108,88 kB).
- Lỗi gặp và đã sửa trong lúc phát triển (không hạ hay tắt kiểm thử nào): (a) kỳ vọng sai thứ tự header trong `callback-dto.test.ts`; (b) fixture giao dịch T100 có thêm một lần nhận ngoài ý muốn ở kiểm thử chi tiết; (c) axe báo `heading-order` ở trang chi tiết callback (h3 ngay dưới h1), sửa bằng `headingLevel` cho `CallbackDetailPanel`; (d) thông báo `aria-live` "Đã áp dụng bộ lọc" bị kết quả cũ về muộn tiêu thụ, sửa bằng cách gắn thông báo với khóa truy vấn.

## 6. Khoảng trống chuyển sang Build and Test (chưa chạy hoặc chưa đo)

- **Chạy tay cùng backend thật** (script `docs/samples` tạo ba dịch vụ mẫu, gửi thử, đi tay US3.1 đến US3.9, tắt rồi bật lại backend để xem banner lỗi và phục hồi): **chưa chạy**, cần người dùng cho phép chạy backend và PostgreSQL (máy không có Docker). Mọi kiểm thử của U4 dùng `fetch` giả bám `openapi.yaml`, nên khác biệt giữa hợp đồng viết tay và backend thật (nếu có) chỉ lộ ở bước này.
- **AC3.3.4 / NFR1** (100.000 callback, dưới 1 giây p95 trên máy local): hành vi và đo của backend, **chưa đo**. U4 chỉ bảo đảm giao diện không thêm độ trễ nhân tạo (100 dòng hiện đủ ngay khi API trả về, có kiểm thử `Monitoring.transactions.test.tsx`; đây là bằng chứng phần giao diện, không phải số đo độ trễ). `traceability.json` ghi **cả AC3.3.4 và NFR1 là `Deferred`** (đích `build-and-test`; NFR1 đã đổi từ `OK` ở review lần 1, R-04).
- **AC3.4.4 nguyên văn** (Esc đóng bảng, tiêu điểm về dòng): không áp dụng vì chi tiết là trang riêng (mục 4, dòng 1); `Deferred`.
- **AC3.5.2** (callback lỗi mapping thiếu transactionId không có ở tab "Giao dịch"): quy tắc gom giao dịch là của backend (U2). Kiểm thử U4 (`Monitoring.callbacks.test.tsx`) chỉ chứng minh phần giao diện: tab "Giao dịch" chỉ đọc `/api/transactions`. `traceability.json` ghi AC3.5.2 là `Deferred` (đích `build-and-test`, đổi từ `OK` ở review lần 1, R-04); cần xác nhận lại với backend thật.
- **Hiệu năng `JsonViewer` với payload khoảng 1 MiB** (R-05, **chưa đo, không sửa mã**): `JsonViewer` dựng mỗi dòng payload thành một khối DOM riêng, không `memo` theo `value`, không cắt hay ảo hóa; hợp đồng `openapi.yaml` cho phép mỗi lần nhận tới 1 MiB payload và trang chi tiết giao dịch tự cập nhật mỗi 5 giây (mỗi nhịp tạo đối tượng mới nên cây dòng được dựng lại). Ở Build and Test cần đo trang chi tiết giao dịch bật tự cập nhật với payload JSON đã định dạng khoảng 1 MiB; nếu giật thì `memo` `JsonViewer` theo `value` hoặc giới hạn số dòng hiển thị kèm nút "Sao chép". Ghi kết quả đo vào tệp này.
- **Truy cập thủ công** theo `accessibility-checklist.md` mục E, F, G (Tab và Shift+Tab trong trình duyệt thật, mũi tên trong `Tabs`, công tắc tự cập nhật, trình đọc màn hình đọc đúng vùng thông báo và không đọc lại mỗi 5 giây, độ tương phản màu, phóng to 200%, banner dưới 1024px): **chưa chạy**. Tự động chỉ có axe-core trên jsdom (tắt `color-contrast`, không có bố cục).
- `transactionId` có `?`, `#`, `%`, khoảng trắng: đã kiểm thử ở lớp API (mã hóa phần trăm trong truy vấn) nhưng **chưa kiểm thử qua đường dẫn SPA bằng trình duyệt thật**; riêng `/` (`2026/10/001`) đã kiểm thử qua đường dẫn SPA với router bộ nhớ.
- **Coverage** của U4: **chưa đo** (frontend không đặt ngưỡng cứng; lệnh đo nằm trong `unit-test-instructions.md`).
- `scripts/verify.ps1` bản đầy đủ (kèm backend, khoảng 20 phút): conductor chạy sau.
- Khoảng trống của U3 không thuộc màn hình theo dõi và chưa làm: hộp thoại "Bỏ các thay đổi chưa lưu?" (G5), xác nhận ghi đè JSON mẫu (D14).
- Git: **không commit hay push**; kho `tpp-simulator-portal/` còn nhiều thay đổi chưa theo dõi.

## 7. Tệp bàn giao trong thư mục record

`code-summary.md` (tệp này), `source-manifest.json`, `traceability.json` (36 AC của US3.1 đến US3.9 cùng NFR1, NFR3, NFR4, NFR5, NFR6; `Deferred` cho AC3.3.4 và AC3.4.4), và `code-generation-plan.md` với 18 bước đã tick.
