# NFR Design — U1 `u1-backend-skeleton` — Câu hỏi làm rõ

> Phạm vi: chọn giải pháp thiết kế cho các yêu cầu phi chức năng của U1 (hiệu năng, bảo mật, mở rộng và đồng thời, độ tin cậy, quan sát) và phân rã thành phần logic. Dữ liệu vào: `performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `observability-requirements.md`, `tech-stack-decisions.md`, `functional-spec.md` và `contract-summary.md`.
>
> Đã chốt, không hỏi lại: Spring Boot 3.5.16, PostgreSQL 16, Flyway, JPA, Jackson (Q1 B của NFR Requirements); khóa API lưu nguyên văn (Q2 C); không bộ nhớ đệm phân tán, không hàng đợi, một backend một database (brief, ADR-008); ghi Callback và Transaction nguyên tử trong một giao dịch (ADR-002); quy tắc "gần nhất" theo cặp (`receivedAt`, `recordId`) (BR4.4); chỉ lắng nghe `127.0.0.1`; không SLA, nhật ký văn bản ra console.
>
> Hai việc NFR Requirements để lại cho bước này nên cần bạn quyết (Q1, Q2). Phần còn lại tôi đề xuất sẵn ở "Giả định đề xuất".

## Q1. Bảo đảm đúng khi hai callback cùng giao dịch ghi đồng thời bằng cách nào? (việc ADR-002 để lại cho bước này)

Lý do hỏi: giao dịch (cặp mã dịch vụ và mã giao dịch) phải đúng khi nhiều callback đến cùng lúc: không mất lần nhận nào, tổng số chính xác, trạng thái "gần nhất" đúng bất kể thứ tự hoàn tất, và callback đầu tiên của một cặp không được thất bại vì tranh chấp (NFR2.2 và NFR2.3).

A. (Recommended) Một câu lệnh duy nhất "thêm, nếu đã có thì cập nhật có điều kiện": thêm giao dịch mới; nếu cặp khóa đã tồn tại thì tăng tổng số thêm 1 và chỉ thay các trường "gần nhất" khi (`receivedAt`, `recordId`) của lần nhận này lớn hơn cặp đang lưu. Không cần khóa tường minh hay vòng thử lại; tính nguyên tử do PostgreSQL bảo đảm; callback đầu tiên không bao giờ gặp lỗi trùng khóa
B. Khóa dòng bi quan: đọc giao dịch kèm khóa ghi, rồi thêm hoặc cập nhật; khi hai bên cùng thêm lần đầu thì bên thua bắt lỗi trùng khóa và thử lại. Dễ đọc hơn nhưng có thêm vòng thử lại và dễ sai ở trường hợp tạo lần đầu
C. Khóa lạc quan: cột số phiên bản và vòng thử lại ở tầng ứng dụng khi cập nhật bị từ chối. Phù hợp ORM nhưng dễ mất lần đếm nếu thử lại sai
X. Other (please specify)

[Answer]: A

## Q2. Giới hạn kích thước phản hồi chi tiết giao dịch thế nào? (việc ghi nhận từ góp ý R-10 và NFR1.6)

Lý do hỏi: chi tiết giao dịch trả toàn bộ các lần nhận kèm payload; mỗi lần nhận có thể tới 1 MiB nên một giao dịch có 50 lần nhận lớn có thể trả hàng chục MiB, và ngăn chi tiết của giao diện có thể làm mới 5 giây một lần. API chi tiết từng lần nhận (`GET /api/callbacks/{recordId}`) thuộc U2 nên U1 chưa thể rút gọn danh sách.

A. (Recommended) Đặt trần: trả tối đa 50 lần nhận gần nhất của giao dịch (vẫn xếp cũ nhất trước trong phản hồi) và tổng dung lượng payload tối đa khoảng 10 MiB; vượt thì cắt các lần nhận cũ hơn và thêm hai trường vào phản hồi: `callbackTotal` (tổng số lần nhận của giao dịch) và `callbacksTruncated` (true khi bị cắt). Là thay đổi thêm (additive) vào hợp đồng C4, tôi sẽ cập nhật `contract-summary.md`. Giao dịch thông thường (ít lần nhận, payload nhỏ) không bị ảnh hưởng
B. Không đặt trần ở U1, ghi rủi ro vào tài liệu và để U2 thêm API chi tiết từng lần nhận để rút gọn danh sách (chấp nhận U1 có thể trả phản hồi rất lớn)
C. Đưa `GET /api/callbacks/{recordId}` vào U1 và để chi tiết giao dịch chỉ trả bản tóm tắt từng lần nhận (mở rộng phạm vi U1, đổi hợp đồng C4 nhiều hơn)
X. Other (please specify)

[Answer]: B

## Giả định đề xuất

Các điểm dưới đây tôi tự quyết theo mặc định hợp lý; bạn chỉ đọc và sửa nếu không đồng ý. Mỗi mục ghi NFR cụ thể hóa.

1. **Luồng nhận callback gọn (NFR1.1):** một giao dịch cơ sở dữ liệu duy nhất cho mỗi callback gồm ba bước: đọc dịch vụ cùng phiên bản cấu hình hiện hành bằng một truy vấn, ghi Callback, thêm hoặc cập nhật Transaction (Q1). Phân tích và ánh xạ payload làm trước và ngoài giao dịch để giao dịch ngắn. Không có bộ nhớ đệm cấu hình dịch vụ (đổi cấu hình phải có hiệu lực ngay và tránh thêm một nơi giữ trạng thái).
2. **Ánh xạ bằng một lượt đọc dòng (streaming) (BR3.2, NFR1.4):** MappingEngine duyệt JSON bằng bộ phân tích theo mã thông báo (token), lấy ba giá trị tại ba đường dẫn, giữ văn bản số nguyên văn từ mã thông báo, giá trị trùng khóa thì lấy lần xuất hiện cuối. Không dựng cây JSON đầy đủ cho mục đích ánh xạ. Payload gốc được ghi vào JSONB từ văn bản đã nhận (dạng chuẩn hóa của JSONB, theo BR5.3).
3. **Chỉ mục (NFR1.2):** `V1` có khóa chính, khóa duy nhất theo chữ thường của `serviceCode`, khóa chính ghép của Transaction, khóa ngoại và chỉ mục khóa ngoại của Callback theo (`serviceCode`, `receivedAt`). Chỉ mục sắp xếp danh sách giao dịch theo (`latestReceivedAt` giảm dần, `latestCallbackId` giảm dần) có trong `V1` vì danh sách giao dịch của U1 sắp xếp theo đúng thứ tự đó. Chỉ mục phục vụ bộ lọc và danh sách callback thuộc U2.
4. **Pool kết nối và thời gian chờ (NFR2.4):** HikariCP mặc định của Spring Boot, tối đa 10 kết nối; thời gian chờ lấy kết nối 5 giây; kiểm tra kết nối trước khi cấp; khi cơ sở dữ liệu trở lại, pool tự tạo lại kết nối. Request không lấy được kết nối trả 500 `INTERNAL_ERROR`.
5. **Bảo mật theo lớp (NFR3):** (a) địa chỉ lắng nghe là thuộc tính cấu hình, mặc định `127.0.0.1`; (b) Actuator chỉ mở `health`, không hiện chi tiết; (c) bộ lọc đứng đầu chuỗi xử lý đếm byte đã đọc và dừng ở 1.048.576 byte, kể cả khi không có Content-Length; (d) kiểu dữ liệu "header đã che" là kiểu riêng, CallbackLedger chỉ nhận kiểu này nên không thể ghi giá trị chưa che (ADR-007); (e) tiện ích làm sạch giá trị bên gọi cung cấp trước khi ghi log (bỏ ký tự điều khiển, cắt 100 ký tự) (NFR3.2); (f) mọi truy vấn tham số hóa; (g) không bật CORS; (h) thông tin kết nối cơ sở dữ liệu từ biến môi trường `TPP_DB_URL`, `TPP_DB_USER`, `TPP_DB_PASSWORD` với giá trị mặc định cho phát triển.
6. **Xử lý lỗi tập trung (NFR2.1, NFR2.4, BR2.5):** một bộ xử lý lỗi duy nhất dịch ngoại lệ thành `ErrorResponse` và đặt header `X-Simulator-Error`; vi phạm khóa duy nhất khi tạo dịch vụ thành 409 `SERVICE_CODE_DUPLICATE`; mọi lỗi truy cập dữ liệu khác thành 500 `INTERNAL_ERROR` mà không kèm chi tiết nội bộ. Ranh giới giao dịch đặt ở dịch vụ ứng dụng của CallbackIngestion và của ServiceCatalog, không ở bộ điều khiển.
7. **Khởi động an toàn (NFR2.5):** Flyway chạy trước khi nhận request; lỗi kết nối hoặc bản chuyển làm ứng dụng thoát với thông báo nêu nguyên nhân.
8. **Quan sát (NFR5.3 đến NFR5.5):** bộ ghi log theo thành phần (`catalog`, `mapping`, `ingestion`, `ledger`, `web`); mẫu dòng log có thời điểm UTC, mức, tên bộ ghi và nội dung; chỉ báo sức khỏe cơ sở dữ liệu của Actuator; không có số liệu đo hay truy vết.
9. **Phân rã thành phần logic (ADR-001):** các gói `com.tpp.simulator.catalog` (ServiceCatalog), `mapping` (MappingEngine, không phụ thuộc gói nào khác), `ingestion` (CallbackIngestion), `ledger` (CallbackLedger), `web` (bộ điều khiển và xử lý lỗi), `config`. Phụ thuộc một chiều: `web` rồi `ingestion` rồi (`catalog`, `mapping`, `ledger`); `catalog` rồi `mapping`; không có vòng. Kiểm bằng một kiểm thử đơn giản đọc các lệnh import, không thêm thư viện mới.
10. **Đồng hồ và định danh:** một `Clock` có thể thay thế trong kiểm thử; `receivedAt` cắt về micro giây UTC; `recordId` và `versionId` sinh bằng cột định danh tăng dần của PostgreSQL.
11. **Dữ liệu JSON trong cơ sở dữ liệu:** cột JSONB nhận văn bản JSON qua tham số có ép kiểu rõ ràng; `mappingFieldResults`, `requestHeadersMasked`, `responseBodyReturned` cũng là JSONB; `responseBody` của phiên bản cấu hình lưu dạng văn bản JSON (BR1.5).

## Assumption Confirmation

Bạn đồng ý dùng các giả định trên chứ?

A. Accept assumptions
B. Convert to follow-up questions
X. Other (please specify)

[Answer]:A

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
