# Kế hoạch Code Generation — U4 `u4-frontend-monitoring`

## Summary

- Builds: màn hình theo dõi nối API backend thật: danh sách giao dịch và danh sách tất cả callback (lọc, phân trang 20/50/100, tự cập nhật 5 giây có bỏ qua nhịp và hủy yêu cầu cũ), chi tiết giao dịch và chi tiết một lần nhận (kể cả callback bị từ chối), banner cửa sổ hẹp
- Touches: `tpp-simulator-portal/` (`src/features/transactions`, `src/features/callbacks`, `src/hooks/useAsyncData.ts`, `src/pages/Monitoring`, `src/pages/TransactionDetail`, `src/components/ui/Pagination.tsx`, `src/layouts`, `src/types/api.ts`, `src/app/config`, `README.md`); gỡ kiểu và hợp đồng cũ; không đụng `tpp-simulator-app/`, không thêm thư viện
- Tests: khoảng 100 đến 130 kiểm thử mới bằng Vitest, jsdom, Testing Library, axe-core (DTO, API, bộ lọc và thời gian, hook tự cập nhật với đồng hồ giả, màn hình theo dõi, chi tiết, truy cập)

## Phạm vi và nguồn

Phần "U4 làm" của `unit-of-work.md`: story US3.1 đến US3.9; NFR4 (truy cập mức cơ bản) cho màn hình theo dõi và chi tiết; NFR1 phía giao diện (dữ liệu hiện ngay khi API trả về, giao diện không thêm độ trễ nhân tạo); NFR3 phía giao diện (header đã che, không lộ khóa); NFR5, NFR6 (README, lint, test, build của portal). Nguồn: `requirements.md`, `stories.md`, `contract-summary.md`, `tpp-simulator-app/docs/api/openapi.yaml` (hợp đồng thật), `refined-mockups/` (`mockups.md` D1 đến D15, `interaction-spec.md` mục 2.4, 2.5, 2.6, 4.1 đến 4.3, `accessibility-checklist.md` mục E, F, G), thiết kế Stitch `docs/design/stitch/`, báo cáo quét portal `.agents/tasks/portal-scan-report.md` (mục 2.3, 3.1, 3.4, 3.5, 3.7, 5.3) và mục "Bàn giao cho U4" trong `construction/u3-frontend-services/code-generation/code-summary.md`. Mã nằm ở `tpp-simulator-portal/` (kho git riêng); chỉ các tệp bàn giao của stage này nằm trong thư mục record.

Functional Design, NFR Requirements, NFR Design và Infrastructure Design đã bỏ qua cho U4 (giống U3): đơn vị giao diện thuần, không thực thể hay quy tắc nghiệp vụ mới. Hành vi nằm ở AC US3.x, `interaction-spec.md` và `openapi.yaml`; các mục NFR4 thành bước và kiểm thử có tên ở Step 16.

Phương pháp kiểm thử (Testing Contract của team): **test-after**: với mỗi lớp có thể kiểm thử, viết xong lớp đó rồi viết và chạy kiểm thử của lớp đó trước khi sang lớp tiếp theo. Chiến lược Standard (5 đến 8 kiểm thử cho mỗi thành phần chính). Frontend không đặt ngưỡng coverage cứng (team.md); vẫn đo và báo cáo ở Build and Test. **Docker không dùng được trên máy này**: không bước nào phụ thuộc Docker; kiểm thử dùng `fetch` giả, không cần backend hay database.

Ánh xạ lớp theo hồ sơ test-after: "Repository / data access" = các mô-đun API và lớp ánh xạ DTO của portal; "Business logic" = logic bộ lọc, thời gian, trạng thái URL, hook tải dữ liệu; "Frontend behavior" = thành phần và trang. "Data model / database" và "API / endpoint" của backend không áp dụng cho Unit giao diện này.

## Quyết định triển khai và độ lệch cần bạn xem khi duyệt kế hoạch

1. **Tận dụng giao diện đã dựng.** Giữ khung `features/*`, token màu và thành phần UI đã khớp Stitch. Viết lại lớp dữ liệu, bộ lọc, hook tải; sửa các thành phần hiển thị để dùng DTO thật. Không dựng lại giao diện từ đầu.
2. **Chi tiết là TRANG RIÊNG, không dùng ngăn trượt** (quyết định bạn đã duyệt ở U3). Đây là sai lệch có chủ đích khỏi AC3.4.1 ("bảng trượt bên phải") và AC3.4.4 ("Esc đóng bảng, tiêu điểm về dòng"), và khỏi `interaction-spec.md` mục 2.6 và 4.3. Phần còn lại của AC3.4 và AC3.7 vẫn đủ: nội dung, thứ tự nhận, giữ bộ lọc và trang khi quay lại. Thay cho Esc và tiêu điểm về dòng là nút "Quay lại danh sách theo dõi" (và nút Back của trình duyệt) trả đúng URL có bộ lọc, trang, tab. Không dựng `SlideOver`.
3. **Hợp đồng thật, không dùng lại hợp đồng đề xuất cũ.** Danh sách dùng `page`/`size`/`totalItems`/`totalPages` (kiểu `Page<T>` đã có), `size` chỉ nhận 20, 50, 100 (gửi 10 sẽ bị 400); chi tiết giao dịch là `GET /api/transactions/detail?serviceCode&transactionId` trả `{transaction, callbacks}`; chi tiết callback là `GET /api/callbacks/{recordId}` với `recordId` số nguyên; kết quả xử lý là `outcome` (`SUCCESS`, `MAPPING_ERROR`, `REJECTED`) và `rejectionReason`. Bỏ `statusFacets`, bỏ `GET /api/callbacks/stats` (không tồn tại), bỏ `X-Callback-Id`, bỏ dải "callback 24h / mapping tốt / lỗi mapping".
4. **Bộ lọc theo D6, D7, D9.** Tab "Giao dịch": dịch vụ, transactionId, **Status là ô chữ** (chứa chuỗi, không phân biệt hoa thường; không còn chip theo facet và không còn lọc "thiếu status" vì backend không có), thời gian nhận. Tab "Tất cả callback": dịch vụ, transactionId, thời gian nhận, **"Kết quả xử lý"** (Tất cả / Thành công / Lỗi mapping / Bị từ chối) và **"Lý do"** (chỉ khi chọn "Bị từ chối"). Bộ lọc dịch vụ gọi `callbackServicesApi.list({ includeDeleted: true })` và gắn chữ "(đã xóa)" vào tên tùy chọn cho dịch vụ `deleted` (AC3.2.3).
5. **Thời gian lọc chính xác tới giây (D6).** Hai ô văn bản `yyyy-MM-dd HH:mm:ss` (giờ GMT+7; gõ tắt `yyyy-MM-dd` hiểu là 00:00:00 cho ô "Từ" và 23:59:59 cho ô "Đến"), lỗi cạnh ô "Nhập theo dạng yyyy-MM-dd HH:mm:ss" và "Thời gian bắt đầu phải trước thời gian kết thúc". Gửi lên API **không có phần thập phân giây** (đầu "đến" là hết giây đó, theo BR19.1 của backend), thay cho cách cộng `59,999` giây hiện tại. Các preset 15 phút, 1 giờ, 24 giờ, 7 ngày bạn đã dựng vẫn giữ làm lựa chọn thêm (báo cáo quét mục 7 câu 7, khuyến nghị đã duyệt); preset cũng không có phần thập phân và tính lại ở mỗi lần tải.
6. **Mỗi tab giữ bộ lọc và trang riêng (D9), giữ nguyên khi quay lại từ chi tiết.** URL giữ bộ lọc, trang, cỡ trang của tab đang xem (nên quay lại bằng lịch sử là về đúng chỗ, AC3.4.3, AC3.7.4). Giá trị của tab còn lại được nhớ trong `sessionStorage` (khóa riêng, không chứa dữ liệu nhạy cảm) để chuyển tab qua lại và quay về từ chi tiết không mất. Đây là cơ chế do kế hoạch chọn; nếu bạn muốn đơn giản hơn (chỉ nhớ trong bộ nhớ trang), nói khi duyệt.
7. **Tự cập nhật đúng AC3.9.3 và interaction-spec 2.5.** `useAsyncData` thêm `AbortController` và `signal` cho hàm tải; nhịp 5 giây **bị bỏ qua** khi một lần tải đang chạy (không có hai lần tải chồng nhau); thao tác của người dùng (Áp dụng, đổi trang, đổi tab, Tải lại) hủy lần tải đang chạy và chỉ nhận kết quả của yêu cầu mới nhất. Chỉ tab đang xem được tải và poll (bỏ hook thừa của tab ẩn). Khi lỗi giữ dữ liệu cũ kèm banner và giờ cập nhật thành công gần nhất; thành công thì banner mất.
8. **Vùng thông báo lịch sự (D12).** Một vùng `aria-live="polite"` ẩn về mặt hình ảnh, chỉ nói khi: người dùng bấm "Tải lại", áp dụng bộ lọc ("Đã áp dụng bộ lọc, N kết quả"), đổi trang ("Trang 2 trên 7"), tổng số dòng đổi, lỗi tải, hoặc phục hồi sau lỗi; không đọc lại mỗi 5 giây.
9. **"Có N callback mới" ở chi tiết giao dịch (D11).** Trang chi tiết giao dịch tự cập nhật cùng nhịp; lần nhận đang chọn không tự nhảy; khi có callback mới hiện chữ "Có N callback mới" kèm nút chọn lần nhận mới nhất.
10. **Giá trị gốc của timestamp trong chi tiết (AC3.7.3).** Backend không trả giá trị gốc của timestamp; `mappingFieldResults.timestamp` chỉ có `value`, `errorCode`, `error`, `warning`. Kế hoạch: chi tiết luôn hiện payload đầy đủ (JSON hoặc `payloadRawText`), nên giá trị gốc nằm trong payload; ngoài ra, khi `configVersionNumber` của lần nhận bằng `currentVersionNumber` của dịch vụ (đọc `callbackServicesApi.get`), giao diện đọc giá trị ở `timestampPath` hiện hành từ `payloadJson` (đường dẫn chỉ đi qua object lồng nhau, không wildcard) và hiện cạnh thông báo lỗi với chú thích "đọc theo đường dẫn hiện tại của dịch vụ". Khác phiên bản hoặc dịch vụ đã xóa thì hiện "xem giá trị trong payload bên dưới". **Cần bạn xác nhận** cách này đủ cho AC3.7.3, hay bạn muốn backend trả thêm giá trị gốc (thay đổi ngoài phạm vi U4).
11. **Header đã che do backend làm.** `requestHeaders` là object, giá trị `***` là đã che (Authorization, Proxy-Authorization, Cookie và header khóa API). Giao diện chỉ chuyển object thành danh sách và đánh dấu `masked` khi giá trị là `***`; không che phía trình duyệt nữa, `mask-headers.ts` còn dùng cho gửi thử ở U3 nên được giữ nếu còn nơi dùng.
12. **Callback bị từ chối.** Hiện lý do bằng chữ (sai khóa, thiếu khóa, JSON không hợp lệ, Content-Type không hỗ trợ, dịch vụ tắt, dịch vụ đã xóa), `httpStatusReturned`, body gốc văn bản khi không phải JSON (AC3.7.2), mapping là `{}` nên hiện "Chưa chạy mapping vì request bị từ chối". Hiển thị nhãn bằng chữ và biểu tượng, không chỉ bằng màu (NFR4).
13. **Màu trạng thái (AC3.1.2).** Status nghiệp vụ luôn trung tính (không diễn giải `00`, `FAILED`); chỉ mã HTTP và lỗi mapping có màu. Thiếu status thì ô trống kèm nhãn chữ "Thiếu status".
14. **`transactionId` có thể chứa `/`, `?`, `#`, `%`, khoảng trắng.** Đường dẫn SPA `/transactions/:serviceCode/:transactionId` và API đều mã hóa phần trăm; kiểm thử bắt buộc với `2026/10/001`.
15. **Banner cửa sổ hẹp (D15).** Dưới 1024px hiện banner đóng được, không chặn nội dung (U3 chưa làm, báo cáo bàn giao mục 7). Đây là thay đổi nhỏ ở khung dùng chung (`src/layouts`), nằm ở Step 16; bạn có thể bỏ bước con này khi duyệt nếu muốn để cho Build and Test.
16. **Không thêm thư viện.** Mọi thứ cần đều đã có từ U3 (Vitest, Testing Library, user-event, jest-dom, axe-core, Prettier). Không có điểm dừng nhắn bạn cài gói.
17. **Khoảng trống của U3 không thuộc màn hình theo dõi** (hộp thoại "Bỏ các thay đổi chưa lưu?" G5 và xác nhận ghi đè JSON mẫu D14) giữ nguyên là khoảng trống đã ghi; chuyển sang danh sách việc của Build and Test, không làm trong U4.
18. **Nhắc tắt `npm run dev` trước mỗi lần kiểm chứng** (khóa tệp `.node` của lightningcss gây lỗi EPERM ở `npm ci`). Máy chậm: `npm ci` 6 đến 8 phút, bộ kiểm thử khoảng 130 đến 260 giây, `scripts/verify.ps1 -FrontendOnly` khoảng 20 phút; không bước nào được rút gọn bằng cách hạ ngưỡng hay tắt quy tắc.

## Kế hoạch các bước (test-after theo từng lớp)

- [x] **Step 1: Cấu hình và khung của đơn vị**
  - `src/app/config/app.config.ts`: `defaultPageSize` từ 10 thành 20, thêm `pageSizeOptions: [20, 50, 100]` (chỉ ba giá trị backend chấp nhận); giữ `pollIntervalMs: 5000`. Ghi nhận bằng `tsc` các nơi dùng `defaultPageSize` (Monitoring) để Step 11 đổi theo.
  - `src/constants/routes.ts`: giữ `monitoring: '/transactions'`, `transactionDetail(serviceCode, transactionId, callbackId?)` và `callbackDetail(recordId)`; đổi `callbackId` thành `recordId` (số) ở tham số, vẫn mã hóa phần trăm. Liệt kê (chỉ ghi nhận, chưa xóa) mọi nơi còn dùng `LegacyPage`, `MappingResult`, `MappingOverall`, `CallbackRecord`, `CallbackStats`, `MISSING_STATUS_FILTER` để Step 15 dọn đúng.
  - Truy vết: AC3.3.1, AC3.3.2, NFR6.
- [x] **Step 2: Bộ chạy kiểm thử sẵn sàng (không đổi mã)**
  - Bộ chạy Vitest, jsdom, Testing Library, `src/test/{setup.ts,http.ts,render.tsx,a11y.ts}` đã có từ U3; không dựng lại. Chạy `npx vitest run src/components/ui src/app src/test` xanh làm đường chuẩn trước khi sửa, và ghi các lệnh theo nhóm của U4 vào `unit-test-instructions.md` (đã viết). Nếu đường chuẩn đỏ vì thay đổi ngoài U4, dừng và báo thay vì sửa lan.
  - Truy vết: NFR6.
- [x] **Step 3: Kiểu và DTO giao dịch, callback — cài đặt (lớp dữ liệu, phần 1)**
  - `features/transactions/types/transactions.types.ts` viết lại theo `openapi.yaml`: `TransactionSummary` (`serviceCode`, `serviceDeleted`, `transactionId`, `latestStatus`, `latestBusinessTimestamp`, `latestReceivedAt`, `latestCallbackId`, `latestHasMappingError`, `callbackCount`), `TransactionPage = Page<TransactionSummary>`, `TransactionDetail = { transaction, callbacks: CallbackDetail[] }`, `TransactionFilter`.
  - `features/callbacks/types/callbacks.types.ts`: thêm `CallbackOutcome`, `RejectionReason`, `CallbackSummary`, `CallbackDetail` (header object, `payloadJson` hoặc `payloadRawText`, `mappingFieldResults`, `configVersionNumber`, `responseStatusReturned`, `responseBodyReturned`), `CallbackFilter` (`outcome`, `rejectionReason`); giữ `SelfTestRequest`, `SelfTestResult`, `StoredHeader` của U3 gửi thử.
  - `features/callbacks/utils/callback-dto.ts` và `features/transactions/utils/transaction-dto.ts` (hoặc một tệp `monitoring-dto.ts` dùng chung): cắt mốc thời gian về mili giây (backend có thể trả tới micro giây); chuyển `requestHeaders` object thành danh sách `{name, value, masked}` (masked khi giá trị là `***`); chọn nguồn payload (`payloadRawText` có mặt thì là văn bản, ngược lại là `payloadJson` đã định dạng đẹp, kể cả JSON null); chuẩn hóa `mappingFieldResults` rỗng cho lần bị từ chối; nhãn tiếng Việt cho `outcome` và `rejectionReason` (hằng số, không dùng màu đơn độc).
  - Truy vết: AC3.1.1, AC3.5.3, AC3.4.2, AC3.7.1, AC3.7.2, NFR3.
- [x] **Step 4: Kiểu và DTO — kiểm thử**
  - Kiểm thử đơn vị: cắt micro giây về mili giây; header `***` thành `masked`, header thường giữ nguyên (`X-Request-Id: abc`); `payloadRawText` và `payloadJson` (kể cả JSON null) chọn đúng nguồn; mapping `{}` của lần bị từ chối; nhãn cho đủ sáu `rejectionReason`; không có khóa trong kết quả. 8 đến 10 kiểm thử (`npx vitest run src/features/transactions/utils src/features/callbacks/utils`).
- [x] **Step 5: API giao dịch và callback — cài đặt (lớp dữ liệu, phần 2)**
  - `transactions.api.ts`: `list(filter, page, size, signal)` gọi `GET /api/transactions` với `serviceCode`, `transactionId`, `status`, `receivedFrom`, `receivedTo`, `page`, `size`; `get(serviceCode, transactionId, signal)` gọi `GET /api/transactions/detail` với hai tham số mã hóa phần trăm bởi bộ dựng truy vấn; 404 `TRANSACTION_NOT_FOUND` giữ là `ApiError`.
  - `callbacks.api.ts`: `list(filter, page, size, signal)` gọi `GET /api/callbacks` với `serviceCode`, `transactionId`, `outcome`, `rejectionReason`, `receivedFrom`, `receivedTo`, `page`, `size`; `get(recordId, signal)` gọi `GET /api/callbacks/{recordId}`; **gỡ** `getStats`; giữ nguyên `sendTest` của U3.
  - Giá trị rỗng không gửi lên (client đã bỏ chuỗi rỗng). Không còn `pageSize`, `mapping`, `statusFacets`. Áp DTO của Step 3 ngay trong lớp API để thành phần chỉ thấy dạng giao diện.
  - Truy vết: AC3.1.1, AC3.2.x, AC3.3.1, AC3.3.2, AC3.5.1 đến AC3.5.4, AC3.6.x, AC3.4.1, AC3.7.1.
- [x] **Step 6: API giao dịch và callback — kiểm thử**
  - Kiểm thử với `fetch` giả bám `openapi.yaml`: đúng đường dẫn và phương thức, tên tham số (`size` chứ không `pageSize`, `outcome`, `rejectionReason`), `transactionId` có `/`, `?`, `#`, `%`, khoảng trắng được mã hóa trong `detail`, không gửi tham số rỗng, 400 `VALIDATION_FAILED` với `fieldErrors[]`, 404 `TRANSACTION_NOT_FOUND` và `CALLBACK_NOT_FOUND`, hủy bằng `AbortSignal`, không còn lời gọi `/api/callbacks/stats`. 8 đến 10 kiểm thử (`npx vitest run src/features/transactions/api src/features/callbacks/api`).
- [x] **Step 7: Logic bộ lọc, thời gian và trạng thái URL — cài đặt (logic nghiệp vụ giao diện, phần 1)**
  - `features/transactions/utils/time-filter.ts` (thay `range.ts`): phân tích `yyyy-MM-dd HH:mm:ss` và `yyyy-MM-dd` theo GMT+7, thông báo lỗi D6 đúng chữ, kiểm tra "Từ" trước "Đến", đổi sang ISO UTC không phần thập phân (đầu "đến" là chính giây đã nhập), preset tương đối (15 phút, 1 giờ, 24 giờ, 7 ngày) cũng không phần thập phân.
  - `features/transactions/utils/monitoring-query.ts` và `hooks/useMonitoringQuery.ts` viết lại: trạng thái bộ lọc của tab đang xem trong URL (`tab`, `service`, `txn`, `status` hoặc `outcome` và `reason`, `range`, `from`, `to`, `page`, `size`), mặc định tab "Giao dịch", trang 1, `size` 20; `size` ngoài {20, 50, 100} quy về 20; `reason` chỉ hợp lệ khi `outcome=REJECTED`; đổi bộ lọc, đổi cỡ trang, đổi tab về trang 1; nhớ giá trị của tab kia trong `sessionStorage` (D9, quyết định 6); liên kết từ gửi thử U3 `?tab=callbacks&service=<mã>` hoạt động.
  - `features/callbacks/utils/payload-path.ts`: đọc giá trị theo `$.a.b.c` từ `payloadJson` (chỉ đi qua object lồng nhau, không wildcard), dùng cho quyết định 10; `features/transactions/utils/history.ts` viết lại cho DTO thật (phát hiện callback đến sai thứ tự theo `businessTimestamp`, đếm "callback mới").
  - Truy vết: AC3.2.1 đến AC3.2.4, AC3.3.1, AC3.3.2, AC3.4.3, AC3.6.1 đến AC3.6.3, AC3.7.3, AC3.7.4, NFR4 (lỗi nhập hiện bằng chữ).
- [x] **Step 8: Logic bộ lọc, thời gian và trạng thái URL — kiểm thử**
  - Kiểm thử đơn vị: biên thời gian (đúng 10:00:00 và đúng 11:00:00 đều nằm trong khoảng, AC3.2.4), gõ tắt ngày, định dạng sai, "Từ" sau "Đến", preset không có phần thập phân; chuyển GMT+7 sang UTC qua nửa đêm; URL ↔ trạng thái cho từng tab, `size` không hợp lệ, `reason` mà không có `outcome=REJECTED`, đổi tab giữ và khôi phục bộ lọc riêng, quay lại từ chi tiết giữ trang và bộ lọc; đọc `$.a.b.c` (có, thiếu, qua mảng thì không đọc); phát hiện đến sai thứ tự. 20 đến 26 kiểm thử (`npx vitest run src/features/transactions/utils src/features/transactions/hooks src/features/callbacks/utils`).
- [x] **Step 9: Hook tải dữ liệu và tự cập nhật — cài đặt (logic nghiệp vụ giao diện, phần 2)**
  - `src/hooks/useAsyncData.ts`: hàm tải nhận `signal: AbortSignal`; `AbortController` cho mỗi lần tải; **bỏ qua nhịp poll khi một lần tải đang chạy** (AC3.9.3); đổi tham số, đổi tab, Áp dụng, Tải lại hủy lần tải đang chạy và chỉ nhận kết quả mới nhất; lỗi giữ `data` cũ và `updatedAt` của lần thành công gần nhất; thành công xóa lỗi; hủy khi gỡ thành phần; chữ ký tương thích với nơi dùng của U3 (`useService`, `useServiceList`).
  - `features/transactions/hooks/useMonitoringAnnouncements.ts` (hoặc tương đương): quyết định khi nào vùng `aria-live` nói (Tải lại thủ công, áp dụng bộ lọc, đổi trang, tổng số dòng đổi, lỗi, phục hồi) và không nói ở nhịp tự cập nhật thường (D12).
  - Truy vết: AC3.8.1 đến AC3.8.4, AC3.9.1 đến AC3.9.3, NFR4 (F-01, F-02).
- [x] **Step 10: Hook tải dữ liệu và tự cập nhật — kiểm thử**
  - Kiểm thử hook với `vi.useFakeTimers()`: tải lần đầu; nhịp 5 giây tải lại; **một lần tải kéo dài hơn 5 giây thì nhịp kế tiếp bị bỏ qua, không có hai lần tải chồng nhau**; đổi tham số hủy lần cũ và bỏ kết quả cũ về muộn; lỗi giữ dữ liệu cũ và giờ cập nhật; hồi phục xóa lỗi; tắt tự cập nhật thì dữ liệu chỉ đổi khi Tải lại; gỡ thành phần dừng poll và hủy yêu cầu; vùng thông báo chỉ nói ở các sự kiện đã nêu. 9 đến 12 kiểm thử (`npx vitest run src/hooks src/features/transactions/hooks`).
- [x] **Step 11: Màn hình theo dõi — cài đặt (hành vi giao diện, phần 1)**
  - `components/ui/Pagination.tsx`: thêm chọn số dòng mỗi trang 20/50/100 (nhãn, `aria`), thông báo "Trang N trên M"; đổi cỡ trang về trang 1; tương thích nơi dùng khác (tùy chọn).
  - `features/transactions/components/MonitoringFilters.tsx` viết lại: ô theo tab (Giao dịch: dịch vụ, transactionId, Status chữ, thời gian; Tất cả callback: dịch vụ, transactionId, "Kết quả xử lý", "Lý do" khi bị từ chối, thời gian), ô thời gian văn bản và preset, lỗi cạnh ô, Enter hoặc "Áp dụng" mới áp dụng, "Xóa bộ lọc", dòng "Đang lọc: …", công tắc "Tự cập nhật mỗi 5 giây", "Cập nhật lúc HH:mm:ss (GMT+7)", nút "Tải lại"; bộ lọc dịch vụ có "(đã xóa)".
  - `features/callbacks/components/StatusBadges.tsx`: thêm `OutcomeBadge` và `RejectionReasonBadge` (chữ và biểu tượng, không chỉ màu) thay `MappingBadge`; `CallbackTable` có cột dịch vụ, transactionId (nếu có), thời điểm nhận, mã HTTP đã trả, kết quả xử lý, lý do (AC3.5.3); `TransactionTable` đủ cột AC3.1.1, `caption` ẩn, `th scope="col"`, nút "Xem chi tiết giao dịch <id> của <dịch vụ>", chữ bị cắt có `title`, ô trống là "—" kèm chữ ẩn; `TransactionTable` và `CallbackTable` giữ thứ tự của backend.
  - `pages/Monitoring/index.tsx` viết lại: một truy vấn cho tab đang xem (bỏ hook của tab ẩn, bỏ `stats`), trạng thái tải, ba thông báo rỗng phân biệt (chưa có dữ liệu, không khớp bộ lọc, lỗi tải), banner vàng "Không cập nhật được. Đang hiển thị dữ liệu lúc HH:mm:ss (GMT+7)." khi lỗi và còn dữ liệu cũ, `aria-busy`, vùng thông báo lịch sự, lùi về trang cuối khi trang vượt quá số trang, đếm số dòng trên nhãn tab. Bỏ dải số liệu 24 giờ khỏi tiêu đề trang.
  - Truy vết: AC3.1.1 đến AC3.1.4, AC3.2.1 đến AC3.2.5, AC3.3.1 đến AC3.3.3, AC3.5.1 đến AC3.5.4, AC3.6.1 đến AC3.6.4, AC3.8.1 đến AC3.8.4, AC3.9.1, AC3.9.2, NFR1 (giao diện không thêm độ trễ), NFR4.
- [x] **Step 12: Màn hình theo dõi — kiểm thử**
  - Testing Library, `user-event` và `fetch` giả: mở trang là tab "Giao dịch", trang 1, 20 dòng, tự cập nhật bật; đủ cột và status trung tính; thiếu status có chữ; lọc transactionId `t1` chỉ ra `T100`; Status `0` ra `00` và `10`; dịch vụ đã xóa có chữ "(đã xóa)"; lọc thời gian hai đầu; phân trang 25 dòng (trang 2 có 5), chọn 50 dòng, lựa chọn chỉ 20/50/100; tab "Tất cả callback" có cả thành công, lỗi mapping, bị từ chối với lý do; callback thiếu transactionId không có ở tab "Giao dịch"; lọc "Bị từ chối" kèm lý do, lọc dịch vụ và transactionId cùng lúc; ba thông báo rỗng khác nhau; lỗi tải giữ dữ liệu cũ kèm giờ, phục hồi xóa banner; 100 dòng hiện đủ ngay sau khi API trả về (không timer, không trễ nhân tạo); đổi bộ lọc không làm đổi tab kia; điều hướng sang chi tiết rồi quay lại giữ bộ lọc và trang (`renderPage` với `MemoryRouter`). 24 đến 32 kiểm thử (`npx vitest run src/pages/Monitoring src/features/transactions/components src/features/callbacks/components src/components/ui/Pagination`).
- [x] **Step 13: Chi tiết giao dịch và chi tiết một lần nhận — cài đặt (hành vi giao diện, phần 2)**
  - `pages/TransactionDetail/index.tsx`, `features/transactions/components/{TransactionDetailView,TransactionTimeline}.tsx`, `features/callbacks/components/{CallbackDetailPanel,MappingResultTable,HeadersTable}.tsx` chuyển sang DTO thật: lịch sử theo thứ tự nhận (cũ trước) với lần đang chọn, mỗi lần có payload (JSON hoặc `payloadRawText` văn bản gốc), header đã che (`***` có biểu tượng khóa), kết quả mapping từng trường (giá trị hoặc `errorCode` và `error`, cảnh báo timestamp), response đã trả (`responseStatusReturned`, `responseBodyReturned`), `configVersionNumber`; bỏ `processingMs`, `source`, ảnh chụp cấu hình đầy đủ (backend chỉ trả số phiên bản); callback bị từ chối hiện lý do, mã HTTP, "Chưa chạy mapping" và body gốc; callback lỗi timestamp hiện thông báo lỗi và giá trị gốc theo quyết định 10; "Có N callback mới" khi tự cập nhật thêm lần nhận mà không đổi lần đang chọn (D11).
  - Route `callbacks/:callbackId` dùng `recordId` số (tham số không phải số thì hiện "Không tìm thấy callback" thay vì gọi API); 404 `TRANSACTION_NOT_FOUND` và `CALLBACK_NOT_FOUND` hiện `NotFoundView`; `transactionId` có ký tự đặc biệt đi qua đường dẫn SPA đúng; nút "Quay lại danh sách theo dõi" dùng lịch sử để giữ bộ lọc và trang (AC3.4.3, AC3.7.4); liên kết "Xem giao dịch …" từ chi tiết callback; `TabPanel` và `idBase` của `Tabs` giữ nguyên.
  - Truy vết: AC3.4.1 đến AC3.4.4 (kèm độ lệch quyết định 2), AC3.7.1 đến AC3.7.4, AC3.8.2, AC3.9.1, NFR3, NFR4.
- [x] **Step 14: Chi tiết giao dịch và chi tiết một lần nhận — kiểm thử**
  - Kiểm thử: giao dịch `T1` có 3 callback hiện đủ 3 lần nhận theo thứ tự nhận; mỗi lần có payload, header đã che (`***`, `X-Request-Id: abc` giữ nguyên), mapping từng trường, response đã trả; callback bị từ chối với body không phải JSON hiện văn bản gốc, mã HTTP và lý do (AC3.7.2); callback lỗi timestamp hiện thông báo lỗi và giá trị gốc theo cả hai nhánh (cùng phiên bản cấu hình và khác phiên bản); chọn lần nhận bằng bàn phím; "Có N callback mới" khi tự cập nhật; 404 hiện không tìm thấy; `transactionId` `2026/10/001` đi hết đường dẫn; quay lại giữ bộ lọc và trang. 14 đến 18 kiểm thử (`npx vitest run src/pages/TransactionDetail src/features/transactions/components src/features/callbacks/components`).
- [x] **Step 15: Dọn kiểu cũ và mã thừa**
  - Gỡ `LegacyPage` (`src/types/api.ts`), `features/callback-services/types/mapping-result.types.ts` (`MappingResult`, `MappingOverall`, `MAPPING_OVERALL_LABEL`) và các export liên quan trong `features/callback-services/index.ts`, `CallbackRecord`, `ConfigSnapshot`, `CallbackListItem`, `CallbackStats`, `MISSING_STATUS_FILTER` và hằng số chip cũ, `range.ts` cũ, `MappingBadge`, mọi nhánh dùng chúng; giữ `mask-headers.ts` chỉ khi gửi thử còn dùng. Chỉ xóa khi không còn nơi dùng (kiểm bằng `npx tsc --noEmit` và tìm kiếm). `npm run lint` và `npm run typecheck` đến sạch.
  - Truy vết: NFR6.
- [x] **Step 16: Truy cập cơ bản (NFR4), không lộ khóa (NFR3) và banner cửa sổ hẹp**
  - Kiểm thử axe (`expectNoA11yViolations`) cho tab "Giao dịch", tab "Tất cả callback" (có dữ liệu, rỗng, lỗi), chi tiết giao dịch, chi tiết callback bị từ chối: không vi phạm; kiểm thử bàn phím: Tab tới từng nút "Xem", mũi tên đổi lần nhận trong `Tabs`, công tắc tự cập nhật bằng phím, Enter áp dụng bộ lọc; lỗi nhập bằng chữ; kiểm thử không lộ khóa: dựng chi tiết với header `Authorization` và header khóa API đã `***` và khẳng định không có chuỗi khóa trong DOM, trong URL, trong thông báo lỗi.
  - Banner dưới 1024px (D15): thành phần đóng được ở `src/layouts` với chữ "Cửa sổ hẹp hơn 1024px nên giao diện có thể khó dùng. Hãy mở rộng cửa sổ hoặc giảm mức phóng to.", không chặn nội dung, kiểm thử bằng cách đặt `window.innerWidth`. Bước con này có thể bỏ khi duyệt (quyết định 15).
  - Kiểm tra tay theo `accessibility-checklist.md` mục E, F, G cần trình duyệt và trình đọc màn hình: **không chạy được ở bước này**, ghi vào `code-summary.md` là "chưa chạy" cùng mục cần kiểm ở Build and Test. 9 đến 12 kiểm thử (`npx vitest run src/test src/layouts`).
  - Truy vết: NFR4, NFR3, AC3.1.2, AC3.1.3, AC3.2.5, AC3.9.1.
- [x] **Step 17: Cấu hình xây dựng và kiểm chứng**
  - `README.md` portal: cập nhật phần theo dõi (tự cập nhật 5 giây, cỡ trang 20/50/100, đường dẫn chi tiết, lọc thời gian), giữ nội dung đúng của U3 (cùng nguồn qua proxy, yêu cầu Node, `npm ci`, `npm run dev`, `npm test`, nhắc đóng `npm run dev` trước khi chạy verify). Không đổi `package.json` ngoài việc cần thiết (không thêm gói); không đổi `scripts/verify.ps1`.
  - Chạy lần lượt cho đến khi xanh: `npm run typecheck`, `npm run lint`, `npm run format:check`, bộ kiểm thử của đơn vị, rồi `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1 -FrontendOnly` (từ `D:\pet-pj-dlc`, sau khi nhắc người dùng đóng `npm run dev`). Không hạ hay tắt quy tắc lint, ngưỡng hay kiểm thử nào để qua.
  - Chạy tay cùng backend thật (`docs/samples` script tạo ba dịch vụ mẫu, gửi thử rồi theo dõi US3.1 đến US3.9, kiểm tra tự cập nhật khi tắt backend rồi bật lại) khi người dùng cho phép chạy backend và PostgreSQL (máy không có Docker); nếu không chạy được thì ghi rõ "chưa chạy" trong `code-summary.md`.
  - Truy vết: NFR5, NFR6.
- [x] **Step 18: Tài liệu bàn giao của Code Generation**
  - Viết `code-summary.md`, `source-manifest.json` (mọi đường dẫn nguồn do Unit này tạo, sửa hoặc xóa, **tương đối với kho `tpp-simulator-portal/`**, không có khóa `repo` và không có tiền tố `tpp-simulator-portal/`, như U1 đến U3; tệp ở gốc workspace nếu có thì liệt kê theo đường dẫn từ gốc), `traceability.json` (mỗi AC US3.1 đến US3.9 và NFR trỏ tới một tệp thật; AC3.3.4 và các mục cần backend thật ghi `Deferred` với target `build-and-test`). Ghi rõ độ lệch (chi tiết là trang riêng, quyết định 2), các mục kiểm chứng chưa đo (chạy tay cùng backend, truy cập thủ công, NFR1 100.000 callback ở backend, coverage) và khoảng trống chuyển sang Build and Test.
  - Truy vết: toàn bộ.

## Truy vết story đến bước

| Story | Tiêu chí | Bước |
|---|---|---|
| US3.1 | AC3.1.1 đến AC3.1.4 | Step 3, Step 4, Step 5, Step 6, Step 11, Step 12 |
| US3.2 | AC3.2.1 đến AC3.2.5 | Step 5, Step 6, Step 7, Step 8, Step 11, Step 12 |
| US3.3 | AC3.3.1 đến AC3.3.3 | Step 1, Step 5, Step 6, Step 7, Step 8, Step 11, Step 12 |
| US3.3 | AC3.3.4 | Step 11, Step 12 (phía giao diện); phần backend 100.000 callback: `Deferred` sang Build and Test |
| US3.4 | AC3.4.1 đến AC3.4.4 | Step 3, Step 5, Step 7, Step 13, Step 14 (độ lệch trang riêng, quyết định 2) |
| US3.5 | AC3.5.1 đến AC3.5.4 | Step 3, Step 5, Step 6, Step 11, Step 12 |
| US3.6 | AC3.6.1 đến AC3.6.4 | Step 5, Step 7, Step 8, Step 11, Step 12 |
| US3.7 | AC3.7.1 đến AC3.7.4 | Step 3, Step 7, Step 8, Step 13, Step 14 |
| US3.8 | AC3.8.1 đến AC3.8.4 | Step 9, Step 10, Step 11, Step 12, Step 13 |
| US3.9 | AC3.9.1 đến AC3.9.3 | Step 9, Step 10, Step 11, Step 12 |
| NFR1 phía giao diện | dữ liệu hiện ngay khi API trả về | Step 11, Step 12 |
| NFR3 phía giao diện | header đã che, không lộ khóa | Step 3, Step 4, Step 13, Step 16 |
| NFR4 | bàn phím, nhãn, lỗi không chỉ bằng màu | Step 9, Step 11, Step 13, Step 16 |
| NFR5, NFR6 | chạy theo README, lint/test/build | Step 1, Step 2, Step 15, Step 17 |

AC3.3.4 (100.000 callback, dưới 1 giây p95 trên máy local) và các kiểm tra chạy tay cùng backend thật là hành vi và đo đạc của backend và Build and Test; U4 chỉ bảo đảm giao diện không thêm độ trễ nhân tạo và hiển thị được 100 dòng ngay sau khi API trả về.

## Điểm cần bạn quyết định khi duyệt kế hoạch

- Quyết định 2: xác nhận chi tiết là trang riêng (độ lệch AC3.4.1, AC3.4.4 đã được duyệt ở U3).
- Quyết định 10: cách lấy giá trị gốc của timestamp (đọc từ payload theo đường dẫn hiện tại khi cùng phiên bản cấu hình) có đủ cho AC3.7.3 không.
- Quyết định 6: nhớ bộ lọc của tab kia bằng `sessionStorage` hay chỉ trong bộ nhớ trang.
- Quyết định 15: làm banner cửa sổ hẹp trong U4 hay để cho Build and Test.

## Ngoài phạm vi của kế hoạch này

Quản lý dịch vụ, thử mapping, gửi thử (U3, đã xong); thêm endpoint hay trường mới ở backend (kể cả giá trị gốc timestamp); thẻ thống kê, "Nhật ký nhận", Replay (Won't Have, US4.9); ngăn trượt cho chi tiết (độ lệch có chủ đích); hộp thoại "Bỏ các thay đổi chưa lưu?" (G5) và xác nhận ghi đè JSON mẫu (D14) của U3; CI của portal (CI Pipeline); bản triển khai production; Docker; git commit.

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
