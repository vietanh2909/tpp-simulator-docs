# Contract Design — Câu hỏi làm rõ

> Đã chốt, không hỏi lại: HTTP đồng bộ giữa frontend và backend, không sự kiện hay hàng đợi (ADR-008); Vite proxy `/api` và `/callbacks`, không cấu hình CORS (giả định A15 của Requirements Analysis); hai kho git `tpp-simulator-app/` (backend) và `tpp-simulator-portal/` (frontend); thứ tự kiểm tra của endpoint callback 404, 503, 401, 400 và các mã tương ứng (FR3.1); che header nhạy cảm (FR6.1). Bước này chỉ chốt hình dạng các hợp đồng HTTP.
>
> Cách trả lời: bạn đã giao quyền tự quyết cho tôi theo phương án khuyến nghị (tin nhắn "Tôi cho bạn quyền tự quyết theo ý bạn recommend cho tôi"). Mỗi `[Answer]:` dưới đây là lựa chọn khuyến nghị của tôi. Toàn bộ quyết định cũng được tổng hợp ở `docs/auto-decisions.md` để bạn đọc lại.

## Q1. Hợp đồng API được lưu ở đâu và kho nào là chủ?

Hai kho git tách nhau nên lệch phiên bản hợp đồng sẽ không bị CI của kho nào phát hiện (rủi ro đã ghi ở Units Generation).

A. (Recommended) Backend là chủ: file OpenAPI `docs/api/openapi.yaml` nằm trong `tpp-simulator-app/`. Frontend dùng bản sao kiểu TypeScript viết tay theo file đó, không sinh mã tự động. Bản mô tả trong `contract-summary.md` là nguồn cho đến khi Code Generation tạo file OpenAPI
B. Frontend là chủ và backend theo
C. Thêm một kho thứ ba chỉ chứa hợp đồng
X. Other (please specify)

[Answer]: A

## Q2. Hình dạng các endpoint quản lý và truy vấn

Danh sách dịch vụ kể cả đã xóa phục vụ bộ lọc của màn hình theo dõi (câu hỏi để lại từ Domain Design).

A. (Recommended) REST JSON dưới tiền tố `/api`: `GET/POST /api/services`, `GET/PUT/DELETE /api/services/{serviceCode}`, `PUT /api/services/{serviceCode}/enabled`, `POST /api/mapping-tests`, `GET /api/transactions`, `GET /api/transactions/{serviceCode}/{transactionId}`, `GET /api/callbacks`, `GET /api/callbacks/{recordId}`. Dịch vụ đã xóa lấy bằng tham số `includeDeleted=true` của `GET /api/services`, không có endpoint riêng
B. Như A nhưng có endpoint riêng `GET /api/services/all` cho dịch vụ đã xóa
C. Một endpoint tìm kiếm chung `GET /api/search` cho cả giao dịch lẫn callback
X. Other (please specify)

[Answer]: A

## Q3. Giới hạn 1 MB của callback và vị trí kiểm tra 413

Câu hỏi để lại từ Domain Design: 1 MB là 1.000.000 hay 1.048.576 byte, và 413 đứng ở đâu trong thứ tự kiểm tra.

A. (Recommended) 1 MB là 1.048.576 byte (1 MiB). Kiểm tra kích thước đứng đầu tiên, trước khi tìm dịch vụ, để không đọc body lớn vào bộ nhớ. 413 không bao giờ được ghi vào lịch sử. Hệ quả: body lớn gửi tới dịch vụ không tồn tại nhận 413 thay vì 404
B. 1.048.576 byte nhưng kiểm tra sau 404 (đọc body tới giới hạn rồi mới tìm dịch vụ)
C. 1.000.000 byte, kiểm tra đầu tiên
X. Other (please specify)

[Answer]: A

## Q4. Nội dung body response cho các mã lỗi của endpoint callback

Câu hỏi để lại từ Domain Design cho 404, 503, 401, 400, 413, 500. Response thành công do cấu hình dịch vụ quyết định, nên chỉ các mã lỗi cần body cố định.

A. (Recommended) JSON `{"error": "<MÃ>", "message": "<mô tả ngắn>"}` với mã `SERVICE_NOT_FOUND` (404), `SERVICE_DISABLED` (503), `UNAUTHORIZED` (401), `INVALID_JSON` hoặc `UNSUPPORTED_CONTENT_TYPE` (400), `PAYLOAD_TOO_LARGE` (413), `INTERNAL_ERROR` (500). Body không chứa giá trị khóa hay dữ liệu nhạy cảm
B. Body rỗng, chỉ có mã HTTP
C. Văn bản thuần một dòng
X. Other (please specify)

[Answer]: A

## Q5. Định dạng lỗi của các API quản lý và truy vấn

A. (Recommended) Cùng hình dạng với Q4, thêm danh sách lỗi theo trường khi kiểm tra cấu hình: `{"error": "VALIDATION_FAILED", "message": "...", "fieldErrors": [{"field": "...", "message": "..."}]}`. Mã HTTP: 400 dữ liệu sai, 404 không thấy, 409 mã dịch vụ trùng (kể cả không phân biệt hoa thường và dịch vụ đã xóa), 500 lỗi máy chủ
B. RFC 7807 `application/problem+json`
C. Chỉ trả mã HTTP và một chuỗi thông báo
X. Other (please specify)

[Answer]: A

## Q6. Quy ước phân trang và lọc

A. (Recommended) Tham số `page` (bắt đầu từ 1, mặc định 1) và `size` (chỉ nhận 20, 50 hoặc 100, mặc định 20). Phản hồi `{"items": [...], "page": n, "size": n, "totalItems": n, "totalPages": n}`. Bộ lọc thời gian `receivedFrom` và `receivedTo` là thời điểm ISO 8601 có múi giờ, tính cả hai đầu. Sắp xếp cố định mới nhất trước, hòa nhau theo mã bản ghi lớn hơn. `serviceCode` lọc chính xác; `transactionId` và `status` lọc theo chuỗi chứa, không phân biệt hoa thường
B. Phân trang theo con trỏ (cursor) thay cho số trang
X. Other (please specify)

[Answer]: A

## Q7. Quy tắc đổi hợp đồng và phiên bản

A. (Recommended) Không đặt phiên bản trong đường dẫn (ứng dụng nội bộ, hai kho do một người giữ). Thay đổi thêm (trường mới, endpoint mới) được phép và phía nhận bỏ qua trường lạ. Thay đổi phá vỡ phải sửa file hợp đồng và cả hai kho trong cùng một đợt làm việc, ghi vào `contract-summary.md` hoặc file OpenAPI
B. Đặt tiền tố `/api/v1` ngay từ đầu
X. Other (please specify)

[Answer]: A

## Q8. Thời gian chờ và thử lại ở các ranh giới

A. (Recommended) Backend không tự thử lại. Trình duyệt đặt thời gian chờ 30 giây cho mọi lời gọi `/api` và `/callbacks`, không tự thử lại; riêng tự cập nhật thì nhịp 5 giây kế tiếp là lần thử lại tự nhiên (đã chốt ở FR11.3). Trang gửi thử đo thời gian ở trình duyệt đúng như FR7.4
B. Trình duyệt tự thử lại 3 lần với mọi lời gọi đọc
X. Other (please specify)

[Answer]: A

## Giả định đề xuất

1. Trường tối thiểu của API tạo dịch vụ (việc Units Generation R-07 chuyển sang bước này): `serviceCode`, `name`, `description`, `authType`, `apiKeyHeaderName`, `apiKeySecret`, `transactionIdPath`, `statusPath`, `timestampPath`, `timestampFormat`, `timestampPattern`, `defaultTimeZone`, `responseHttpStatus`, `responseBody`. U1 dùng đúng hợp đồng này nhưng chỉ kiểm tra tập con quy tắc; U2 hoàn thiện kiểm tra.
2. Phản hồi API quản lý không bao giờ chứa `apiKeySecret`; thay vào đó có cờ `apiKeyConfigured` (đúng/sai). Khi sửa, `apiKeySecret` để trống hoặc vắng nghĩa là giữ khóa cũ.
3. Thời điểm trong mọi phản hồi là ISO 8601 UTC (ví dụ `2026-10-19T03:00:00Z`); giao diện đổi sang Asia/Ho_Chi_Minh khi hiển thị.
4. Chi tiết giao dịch trả kèm toàn bộ lịch sử callback theo thứ tự nhận trong một phản hồi; chi tiết một callback gồm payload (hoặc `payloadRawText`), header đã che, kết quả mapping từng trường, response đã trả, số phiên bản cấu hình đã dùng (`configVersionNumber`).
5. `POST /api/mapping-tests` nhận cấu hình đang nhập và JSON mẫu dạng chuỗi, trả ba giá trị ánh xạ và lỗi từng trường, không ghi dữ liệu.
6. Endpoint tra cứu tối giản của U1 là `GET /api/transactions` (không lọc, không phân trang đầy đủ) và `GET /api/transactions/{serviceCode}/{transactionId}`; U2 mở rộng cùng hợp đồng bằng tham số lọc, không đổi đường dẫn.
7. Đặt tên trường JSON theo camelCase; giá trị enum viết hoa (`NONE`, `API_KEY`, `ACCEPTED`, `REJECTED`).

## Assumption Confirmation

Bạn đồng ý dùng các giả định trên chứ?

A. Accept assumptions
B. Convert to follow-up questions
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
