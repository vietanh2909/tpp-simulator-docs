# Thiết kế bảo mật — U1 `u1-backend-skeleton`

> Nguồn: `security-requirements.md` (NFR3.1 đến NFR3.10), `tech-stack-decisions.md`, `functional-spec.md`, `contract-summary.md` và giả định 5, 6, 11 cùng Q2 C (của NFR Requirements) trong `nfr-design-questions.md`. Mức thiết kế: mẫu và quyết định, không phải mã triển khai.

## Mô hình và nguyên tắc

Công cụ chạy local, một người dùng, không đăng nhập, không có Spring Security (không thêm thư viện xác thực không dùng). Bảo vệ theo sáu lớp: (1) ranh giới mạng, (2) giới hạn đầu vào, (3) che dữ liệu nhạy cảm trước khi lưu hoặc ghi log, (4) không lộ khóa qua phản hồi, (5) cấu hình an toàn mặc định, (6) rủi ro phiên bản được ghi nhận.

## Thiết kế theo yêu cầu

| ID | Thiết kế |
|---|---|
| NFR3.1 | Thuộc tính cấu hình `server.address` mặc định `127.0.0.1` trong `application.yml`; không có hồ sơ cấu hình nào mặc định mở rộng hơn. Biến môi trường cho phép đổi có chủ ý. README có đoạn cảnh báo: đổi sang địa chỉ khác làm mọi người cùng mạng đọc được lịch sử và đổi được cấu hình vì API quản lý và tra cứu cùng cổng với `/callbacks`; người đổi tự bảo vệ bằng tường lửa. Không có cấu hình mở riêng `/callbacks` ở MVP. Kiểm thử: khởi động ứng dụng với cấu hình mặc định và khẳng định địa chỉ gắn là loopback |
| NFR3.2 | Một tiện ích làm sạch giá trị do bên gọi cung cấp trước khi ghi log: thay mọi ký tự điều khiển (kể cả xuống dòng) bằng khoảng trắng hoặc dạng thoát, cắt ở 100 ký tự. Mọi lời gọi ghi log có giá trị từ đường dẫn, tham số hay header đều đi qua tiện ích này. Dòng log của callback chỉ có mã dịch vụ (đã làm sạch), mã bản ghi, kết quả và mã HTTP (BR2.12). Không bao giờ log payload, header hay khóa. Kiểm thử: gửi callback có `Authorization`, `Cookie` và mã dịch vụ chứa xuống dòng, bắt đầu ra log, khẳng định không có giá trị nhạy cảm và không có dòng log giả |
| NFR3.3 | Kiểu riêng "header đã che" (giá trị bất biến tạo bởi bộ che duy nhất của CallbackIngestion): mọi header của request đi qua bộ che, ba header `Authorization`, `Proxy-Authorization`, `Cookie` (so khớp tên không phân biệt hoa thường) nhận giá trị `***`. Phép che nằm **bên trong chính kiểu**: hàm tạo duy nhất nhận tập header thô và tự áp dụng che, không có đường tạo kiểu từ giá trị đã che sẵn; giao diện của CallbackLedger chỉ nhận kiểu này nên không đường ghi nào có thể đưa vào giá trị chưa che mà không đi qua phép che (ADR-007). Java không giới hạn được nơi gọi hàm tạo giữa các gói, nên bảo vệ còn dựa vào quy ước và kiểm thử NFR3.3, kèm yêu cầu U2 thêm kiểm thử cho mọi đường ghi mới. Header chứa khóa API sẽ được thêm vào tập che ở U2 mà không đổi giao diện của CallbackLedger. Kiểm thử: đọc thẳng bảng Callback sau khi gửi ba header đó |
| NFR3.4 | Kiểu phản hồi của `Service` không có thuộc tính khóa; chỉ có `apiKeyConfigured`. Thông báo lỗi dựng từ các mẫu cố định và tên trường, không bao giờ nhúng giá trị đầu vào chưa làm sạch hay khóa. Kiểm thử hợp đồng trên phản hồi tạo, đọc và lỗi của dịch vụ |
| NFR3.5 | Q2 C: khóa lưu nguyên văn trong cột `api_key_secret` của `services`; cột có mặt trong lược đồ `V1` nhưng U1 luôn để rỗng vì từ chối `API_KEY` (BR1.6). Quy tắc truy cập cho U2: không câu truy vấn tra cứu nào chọn cột này; chỉ bước so khớp khóa ở CallbackIngestion đọc nó, qua một phương thức truy vấn riêng; kiểu thực thể đọc cho API quản lý không có thuộc tính ánh xạ tới cột. Rà soát ở Code Generation của U2 |
| NFR3.6 | Thông tin kết nối từ biến môi trường `TPP_DB_URL`, `TPP_DB_USER`, `TPP_DB_PASSWORD`, giá trị mặc định cho phát triển khớp `compose.yaml` (`tpp`/`tpp`); các giá trị mặc định này chỉ nằm trong tệp cấu hình mẫu dành cho phát triển, README nhắc đổi khi không dùng Docker Compose cục bộ. Không có mật khẩu thật trong kho |
| NFR3.7 | `management.endpoints.web.exposure.include=health`, `management.endpoint.health.show-details=never`, cùng địa chỉ local của máy chủ chính; mọi endpoint Actuator khác không có (404). Kiểm thử gọi `env`, `beans`, `heapdump` nhận 404 |
| NFR3.8 | (a) Bộ lọc đứng đầu chuỗi xử lý bọc luồng đầu vào bằng bộ đếm byte và dừng ở 1.048.576 byte, kể cả khi không có `Content-Length` hoặc dùng chunked, trả 413 `PAYLOAD_TOO_LARGE` mà không đọc hết (BR2.2). (b) Mọi truy vấn tham số hóa, không ghép chuỗi từ đầu vào. (a2) Bộ lọc chạy trước DispatcherServlet nên bộ xử lý lỗi tập trung không tự áp dụng: bộ lọc dùng **chung bộ dựng `ErrorResponse` và header `X-Simulator-Error`** với bộ xử lý lỗi (một thành phần dựng lỗi duy nhất); các lỗi mức container như 404 cho đường dẫn không có (kể cả endpoint Actuator không mở) và 405 được cấu hình về cùng trang lỗi JSON (bộ xử lý lỗi của lớp web), nên mọi phản hồi lỗi đều đúng hợp đồng và có header; kiểm thử gọi đường dẫn không có, phương thức sai và body quá lớn rồi kiểm tra header và thân. (c) Kiểm tra đầu vào tại ranh giới theo BR1.x; thân JSON hỏng hoặc sai kiểu khi tạo dịch vụ trả 400 `VALIDATION_FAILED`, bộ xử lý lỗi không bao giờ để rơi thành 500. (d) Không bật CORS cho nguồn gốc nào; giao diện gọi qua Vite proxy cùng nguồn gốc |
| NFR3.9 | Giữ Spring Boot 3.5.16 (Q1 B). Biện pháp bù: NFR3.1, NFR3.7, không thêm thư viện không cần thiết, ghim phiên bản cố định (NFR6.6). Điều kiện nâng lên 4.1.x trước khi mở ứng dụng ra ngoài máy local hoặc dùng ngoài kiểm thử nội bộ được ghi ở `tech-stack-decisions.md` |
| NFR3.10 | README có đoạn nhắc không gửi dữ liệu cá nhân thật của khách hàng vì payload lưu nguyên văn trong JSONB |

## Xử lý lỗi và rò rỉ thông tin

- Một bộ xử lý lỗi tập trung dịch ngoại lệ thành `ErrorResponse` và đặt `X-Simulator-Error` (BR2.5). Lỗi không dự đoán được trả 500 `INTERNAL_ERROR` với thông báo chung, không kèm chuỗi lỗi nội bộ, tên bảng hay câu truy vấn; chi tiết chỉ nằm ở log mức ERROR gồm lớp ngoại lệ và SQLSTATE, không kèm thông điệp thô của ngoại lệ truy cập dữ liệu (có thể chứa dữ liệu dòng hoặc mảnh JSON) và không kèm payload.
- Không dùng trang lỗi mặc định của máy chủ nhúng; mọi phản hồi lỗi đều là JSON đúng hợp đồng.

## Rủi ro còn lại đã chấp nhận

- Không xác thực: ai gọi được cổng thì đọc được lịch sử và đổi được cấu hình; chấp nhận nhờ NFR3.1.
- Khóa API lưu nguyên văn (Q2 C): ai đọc được cơ sở dữ liệu đọc được khóa; chấp nhận vì khóa chỉ là khóa giả lập của UAT.
- Spring Boot 3.5.16 hết hỗ trợ mã nguồn mở (Q1 B): chấp nhận theo NFR3.9.

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/security-requirements.md` (security-requirements: NFR3.1 đến NFR3.10)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/tech-stack-decisions.md` (tech-stack-decisions)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/functional-design/functional-spec.md` (functional-spec: W2) và `rules.md` (rules: BR2.2, BR2.5, BR2.10, BR2.12, BR6.1)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-summary.md` (contract-summary: C1, C2, quy ước chung)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-design/nfr-design-questions.md` (giả định 5, 6, 11)

## Assumptions & Open Questions

- Việc thay ký tự điều khiển trong log bằng khoảng trắng hay dạng thoát (NFR3.2) do Code Generation chọn; yêu cầu là không còn xuống dòng thật.
- Cột `api_key_secret` có mặt trong `V1` dù U1 chưa dùng, theo thiết kế `entities.md`, để U2 không phải sửa bản chuyển đã áp dụng.
