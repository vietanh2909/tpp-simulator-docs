# Yêu cầu bảo mật — U1 `u1-backend-skeleton`

> Nguồn: NFR3 trong `requirements.md`, FR1.6, FR6, ADR-007, `rules.md` (BR2.10, BR2.12, BR6.1) và hợp đồng `contract-summary.md`. Câu trả lời: Q1 B, Q2 C và giả định 4 trong `nfr-requirements-questions.md`.

## Bối cảnh và mô hình mối đe dọa

- Công cụ chỉ dùng nội bộ trên môi trường dev/UAT, dữ liệu chỉ là dữ liệu kiểm thử hoặc giả lập, một người dùng chung, không đăng nhập (brief mục 7), chỉ chạy local.
- Không có xác thực và phân quyền cho API quản lý và tra cứu theo brief. Vì vậy ranh giới bảo vệ chính là địa chỉ lắng nghe: ai chạm được vào cổng của backend thì đọc được lịch sử và đổi được cấu hình.
- Rủi ro chính cần kiểm soát: lộ khóa API và header nhạy cảm qua log, phản hồi API hoặc lịch sử; lộ dịch vụ ra mạng chung; tiêm câu lệnh qua đầu vào; thư viện không còn được vá.

## Yêu cầu

| ID | Yêu cầu | Chỉ tiêu kiểm chứng |
|---|---|---|
| NFR3.1 | Backend mặc định chỉ lắng nghe `127.0.0.1` (BR6.1), nên chỉ máy chạy nó gọi được; nguồn callback là cURL, kịch bản kiểm thử hoặc trang gửi thử trên cùng máy. README cảnh báo rằng đổi sang địa chỉ khác làm mọi người cùng mạng đọc được lịch sử và đổi được cấu hình, vì API quản lý và tra cứu cùng cổng với `/callbacks` và không có đăng nhập; ai mở ra phải tự bảo vệ bằng tường lửa hoặc giới hạn mạng. Không có yêu cầu mở riêng `/callbacks` ra ngoài ở MVP | Kiểm thử cấu hình mặc định; xem README |
| NFR3.2 | Nhật ký ứng dụng không chứa giá trị header nhạy cảm, toàn bộ payload hay khóa API (BR2.12). Dòng nhật ký chỉ có mã dịch vụ, mã bản ghi, kết quả và mã HTTP. Mọi giá trị do bên gọi cung cấp được ghi vào log (như mã dịch vụ lấy từ đường dẫn) phải loại bỏ hoặc thoát ký tự điều khiển, kể cả xuống dòng, và cắt ở tối đa 100 ký tự để không chèn được dòng log giả | Kiểm thử tích hợp gửi callback có `Authorization`, `Cookie` rồi khẳng định đầu ra nhật ký không chứa giá trị |
| NFR3.3 | `Authorization`, `Proxy-Authorization`, `Cookie` được che thành `***` trước khi giao cho tầng lưu; tầng lưu không bao giờ nhận giá trị chưa che (BR2.10, ADR-007) | Kiểm thử tích hợp đọc bảng Callback sau khi gửi callback có ba header đó |
| NFR3.4 | Không phản hồi API nào của backend chứa khóa API: schema `Service` không có `apiKeySecret`, chỉ có `apiKeyConfigured`; thông báo lỗi không chứa khóa (BR1.8) | Kiểm thử hợp đồng trên phản hồi tạo và đọc dịch vụ |
| NFR3.5 | Cách lưu khóa API (quyết định Q2 C): khóa được lưu nguyên văn trong cột riêng của bảng Service, chỉ che khi hiển thị. Cột này chỉ đọc bởi bước so khớp khóa của U2; không API nào, không câu truy vấn tra cứu nào chọn cột này. U1 chưa lưu khóa (từ chối `API_KEY`, BR1.6) nên chưa có dữ liệu khóa | Rà soát truy vấn ở Code Generation của U2; kiểm thử không lộ khóa của U2 |
| NFR3.6 | Thông tin kết nối cơ sở dữ liệu lấy từ biến môi trường, giá trị mặc định cho môi trường phát triển (`tpp`/`tpp` khớp `compose.yaml`); không ghi cứng mật khẩu thật vào mã hay cấu hình được commit | Rà soát cấu hình khi review |
| NFR3.7 | Actuator chỉ mở `health`, chỉ trên địa chỉ local; không mở endpoint chẩn đoán nào khác (`env`, `beans`, `heapdump`, ...) | Kiểm thử gọi các endpoint đó nhận 404 |
| NFR3.8 | Mọi truy vấn dùng tham số hóa, không ghép chuỗi từ đầu vào; kích thước body giới hạn 1.048.576 byte trước khi đọc hết (BR2.2); đầu vào kiểm tra tại ranh giới (BR1.x); thân JSON hỏng hoặc sai kiểu khi tạo dịch vụ trả 400, không bao giờ 500 | Kiểm thử tích hợp với chuỗi có ký tự đặc biệt SQL; kiểm thử body quá lớn |
| NFR3.9 | Rủi ro phiên bản (quyết định Q1 B): giữ Spring Boot 3.5.16 dù nhánh 3.5 đã hết hỗ trợ mã nguồn mở từ 30/06/2026, nên không còn bản vá bảo mật miễn phí. Giảm rủi ro bằng NFR3.1 và NFR3.7; ghi nhận trong `tech-stack-decisions.md` điều kiện bắt buộc nâng lên 4.1.x trước khi mở ứng dụng ra ngoài máy local hoặc trước khi dùng cho mục đích khác ngoài kiểm thử nội bộ | Xem lại khi mở phạm vi triển khai |
| NFR3.10 | Dữ liệu lưu là dữ liệu kiểm thử: không dùng dữ liệu cá nhân thật; payload callback lưu nguyên văn nên README nhắc không gửi dữ liệu thật của khách hàng | Xem README |

## Không áp dụng ở U1

- Xác thực, phân quyền theo đối tượng, tách người thuê, mã hóa dữ liệu lưu trữ, chuẩn tuân thủ: ngoài phạm vi theo brief (không đăng nhập, dữ liệu giả lập, chỉ local).
- So khớp khóa API và che header chứa khóa API: thuộc U2 (U1 từ chối `API_KEY` lúc tạo dịch vụ, BR1.6, nên chưa có khóa để so khớp hay che). Vì Q2 C lưu khóa nguyên văn, U2 phải che header khóa API trước khi lưu lịch sử (BR2.10, ADR-007) và có kiểm thử chứng minh.
- CORS: không bật CORS cho bất kỳ nguồn gốc nào; khi chạy dev, giao diện gọi backend qua Vite proxy cùng nguồn gốc (Requirements Analysis A15).

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/requirements-analysis/requirements.md` (requirements: NFR3, FR1.6, FR6)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/functional-design/rules.md` (rules: BR1.6, BR1.8, BR2.2, BR2.10, BR2.12, BR6.1) và `functional-spec.md` (functional-spec)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-summary.md` (contract-summary: C2, quy ước chung R-12)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/nfr-requirements-questions.md` (Q1 B, Q2 C, giả định 4)

## Assumptions & Open Questions

- Q2 C (lưu khóa nguyên văn) là lựa chọn của bạn; khuyến nghị ban đầu của tôi là băm một chiều có muối. Rủi ro còn lại: ai đọc được cơ sở dữ liệu cũng đọc được khóa. Giảm rủi ro bằng NFR3.1, NFR3.4, NFR3.5; xem lại nếu dữ liệu khóa bắt đầu dùng ngoài môi trường dev/UAT.
- Q1 B (giữ Spring Boot 3.5.16) là lựa chọn của bạn; điều kiện nâng phiên bản ở NFR3.9 là đề xuất của tôi để rủi ro không bị quên.
- Cách bảo đảm che header ở mọi đường ghi mới (ADR-007) thuộc NFR Design và Code Generation.
