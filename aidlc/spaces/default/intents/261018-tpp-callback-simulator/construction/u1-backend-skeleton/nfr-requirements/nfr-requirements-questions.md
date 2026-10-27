# NFR Requirements — U1 `u1-backend-skeleton` — Câu hỏi làm rõ

> Phạm vi: các yêu cầu phi chức năng cho lát cắt skeleton của backend (U1) và những quyết định kỹ thuật mà U1 phải chốt để các Unit sau dùng. Dữ liệu vào: thiết kế chức năng của U1 (`functional-spec.md`, `rules.md`), các yêu cầu phi chức năng NFR1 đến NFR7 trong `requirements.md`, và hợp đồng `contract-summary.md`.
>
> Đã chốt, không hỏi lại: Java 21, Maven, PostgreSQL với JSONB, một backend một database, chỉ chạy local, không triển khai production, GitHub Actions chỉ để build và test (brief mục 2, Feasibility, team practices); tối thiểu 80% line coverage backend đo bằng JaCoCo, kiểm thử tích hợp bằng Testcontainers, Spotless với google-java-format (team practices Q3 đến Q5); khung dự án `tpp-simulator-app/` đã có sẵn (Units Generation Q3); backend chỉ lắng nghe `127.0.0.1` và API quản lý không xác thực (BR6.1); mục tiêu hiệu năng danh sách dưới 1 giây (p95) với 100.000 callback (NFR1) và 50 callback đồng thời (NFR2).
>
> Khung dự án hiện có dùng Spring Boot 3.5.16, Flyway, Actuator, PostgreSQL 16 trong `compose.yaml`, Spotless, JaCoCo. Ba câu dưới đây là những chỗ cần bạn quyết; phần còn lại tôi đề xuất sẵn ở "Giả định đề xuất".

## Q1. Dùng Spring Boot phiên bản nào?

Lý do hỏi: khung dự án đang ghim Spring Boot 3.5.16. Theo các trang theo dõi vòng đời phiên bản, nhánh 3.5 đã hết hỗ trợ mã nguồn mở từ 30/06/2026 (không còn bản vá lỗi bảo mật miễn phí); chỉ còn nhánh 4.0 và 4.1 được vá, bản ổn định mới nhất là 4.1 (GA ngày 10/06/2026). Brief yêu cầu ghi rõ phiên bản thư viện ổn định. Hiện chưa có mã nghiệp vụ nào, nên đổi phiên bản bây giờ rẻ hơn nhiều so với sau này, nhưng nhánh 4 có thay đổi lớn (ví dụ Jackson 3, đổi tên một số starter).

A. (Recommended) Chuyển sang Spring Boot 4.1.x (bản vá mới nhất trên Maven Central lúc làm Code Generation). Tôi sẽ cập nhật `pom.xml` và kiểm tra `scripts/verify.ps1` vẫn chạy với khung rỗng trước khi viết mã nghiệp vụ. Chuyển trước khi có mã nên chi phí thấp
B. Giữ Spring Boot 3.5.16 như khung hiện tại; chấp nhận không còn bản vá mã nguồn mở, ghi rủi ro này vào `tech-stack-decisions.md` (công cụ chỉ chạy local, chỉ lắng nghe 127.0.0.1)
X. Other (please specify)

[Answer]: B

## Q2. Khóa API của dịch vụ được lưu thế nào? (việc ADR-007 để lại cho bước này)

Lý do hỏi: U1 chưa lưu khóa (chỉ từ chối `API_KEY`), nhưng U2 sẽ cần, và cột lưu khóa nằm sẵn trong bản chuyển lược đồ đầu tiên của U1. Khóa chỉ cần để so khớp với header của callback; giao diện và API không bao giờ trả khóa ra (FR1.6), và để trống ô khóa khi sửa nghĩa là giữ khóa cũ nên không cần đọc lại giá trị gốc.

A. (Recommended) Lưu băm một chiều có muối ngẫu nhiên (ví dụ SHA-256 kèm muối riêng cho từng khóa) và so khớp bằng so sánh thời gian hằng. Không khôi phục được khóa từ dữ liệu; lộ cơ sở dữ liệu không lộ khóa. Hệ quả: người dùng không xem lại được khóa đã đặt (đúng với giao diện hiện tại)
B. Mã hóa hai chiều (AES) với một khóa mã hóa lấy từ biến môi trường. Khôi phục được khóa nhưng phải quản lý thêm một bí mật và không có chức năng nào cần đọc lại khóa
C. Lưu nguyên văn trong cơ sở dữ liệu (đơn giản nhất; công cụ chỉ dùng cho UAT), chỉ che khi hiển thị
X. Other (please specify)

[Answer]: C

## Q3. Đo mục tiêu hiệu năng 100.000 callback bằng cách nào? (việc Units Generation để lại cho bước này)

Lý do hỏi: mục tiêu dưới 1 giây (p95) cho danh sách có lọc và phân trang cần dữ liệu nạp sẵn 100.000 callback. Công cụ nạp dữ liệu và phép đo thuộc phạm vi U2 (đã ghi ở `unit-of-work.md`), nhưng cách đo cần chốt trước để U1 đặt lược đồ và chỉ mục nền phù hợp.

A. (Recommended) Một script chạy tay (PowerShell) trong `tpp-simulator-app/scripts/`: nạp 100.000 callback và các giao dịch tương ứng thẳng vào PostgreSQL bằng câu lệnh sinh hàng loạt (nhanh, không đi qua endpoint), rồi gọi API danh sách 200 lần với các bộ lọc mẫu và in p50, p95, p99. Không chạy trong CI; kết quả ghi vào báo cáo của Build and Test
B. Kiểm thử tự động trong CI dùng Testcontainers nạp 100.000 bản ghi và khẳng định p95 dưới 1 giây. Phát hiện hồi quy sớm nhưng làm CI chậm và kết quả phụ thuộc máy chạy CI (có thể lúc đạt lúc không)
C. Nạp dữ liệu bằng cách gọi thật endpoint callback 100.000 lần (sát thực tế nhất nhưng rất chậm)
X. Other (please specify)

[Answer]:A

## Giả định đề xuất

Các điểm dưới đây tôi tự quyết theo mặc định hợp lý; bạn chỉ đọc và sửa nếu không đồng ý. Mỗi mục ghi NFR gốc mà nó cụ thể hóa.

1. **Hiệu năng nhận callback (NFR1, phần U1):** trên máy local, một callback đường vui hoàn tất (ghi Callback và Transaction) có p95 dưới 200 ms khi PostgreSQL ở trạng thái nóng và chưa có tải khác. Đây là mục tiêu phát triển để phát hiện lỗi thiết kế, không phải cam kết kiểm thử tự động của U1. Mục tiêu 1 giây của danh sách thuộc U2.
2. **Nền cho NFR1 ở U1:** khóa chính và khóa duy nhất theo thiết kế; chỉ mục phục vụ lọc và sắp xếp để NFR Design chọn, thêm bằng bản chuyển `V2` trở đi khi cần.
3. **Đồng thời (NFR2, phần U1):** thiết kế của U1 phải đúng khi hai callback cùng giao dịch ghi song song (cập nhật có điều kiện, tạo giao dịch lần đầu không được thất bại vì tranh chấp, đếm tăng nguyên tử). Kiểm chứng 50 callback đồng thời thuộc U2.
4. **Bảo mật (NFR3):** backend chỉ lắng nghe `127.0.0.1` mặc định; không có giá trị header nhạy cảm hay toàn bộ payload trong log; thông tin kết nối cơ sở dữ liệu lấy từ biến môi trường với giá trị mặc định cho môi trường phát triển (`tpp`/`tpp` khớp `compose.yaml`), không ghi cứng mật khẩu thật; Actuator chỉ mở `health` và chỉ trên địa chỉ local; không mở endpoint chẩn đoán nào khác. Mọi truy vấn dùng tham số hóa; kích thước body giới hạn 1.048.576 byte trước khi đọc hết. Kiểm chứng không lộ khóa và header bằng kiểm thử tích hợp (khóa là việc của U2).
5. **Độ tin cậy:** công cụ phát triển chạy local, không đặt mục tiêu khả dụng (SLA/SLO). Khi PostgreSQL tạm mất, API trả 500 `INTERNAL_ERROR` và tự phục hồi khi cơ sở dữ liệu trở lại, không cần khởi động lại. Khởi động backend khi chưa có cơ sở dữ liệu thì báo lỗi rõ ràng và thoát. Bản chuyển lược đồ chạy tự động lúc khởi động bằng Flyway; không bao giờ sửa bản đã áp dụng. Dữ liệu giữ vô thời hạn, không tự xóa; sao lưu là việc của người dùng (Docker volume).
6. **Quan sát (observability):** nhật ký văn bản thường ra console, mức INFO, mỗi callback một dòng gồm mã dịch vụ, mã bản ghi, kết quả và mã HTTP (BR2.12); lỗi 500 ghi mức ERROR kèm chuỗi lỗi (không kèm payload). Không có số liệu đo, truy vết phân tán hay cảnh báo ở MVP. `GET /actuator/health` cho biết ứng dụng và kết nối cơ sở dữ liệu còn sống.
7. **Khả năng mở rộng (scalability):** một bản backend, một cơ sở dữ liệu; thiết kế phục vụ tới 100.000 callback và khoảng 5 giao dịch/giây là đủ; không có chia tỷ lệ ngang, bộ nhớ đệm phân tán hay hàng đợi (brief mục 2).
8. **Công nghệ (tech stack):** Java 21 (Temurin), Maven 3.9.x qua `.mvn` của khung dự án, Spring Boot theo Q1, PostgreSQL 16 qua `compose.yaml`, Flyway cho bản chuyển lược đồ `V1__init_schema` (khớp quy ước `V1`, `V2` của hợp đồng C6), Jackson cho JSON, JPA cho truy cập dữ liệu nếu phù hợp (các truy vấn tổng hợp và cập nhật có điều kiện của Transaction được viết rõ ràng, không dựa vào hành vi ngầm của ORM), Testcontainers với PostgreSQL thật cho kiểm thử tích hợp, JaCoCo với ngưỡng 80% line coverage, Spotless với google-java-format chặn build khi chưa format. Mọi phụ thuộc ghim phiên bản cố định, không dùng khoảng.
9. **Giữ nguyên văn bản số (BR3.2):** Jackson mặc định làm mất định dạng số (`1.50` thành `1.5`, `1e3` thành `1000`). Tầng ánh xạ phải lấy giá trị số từ văn bản của mã thông báo (token) JSON, không từ số đã phân tích; đây là ràng buộc cho Code Generation và có kiểm thử riêng.
10. **Múi giờ và đồng hồ:** thời điểm lưu và trả về luôn là UTC; máy chủ không phụ thuộc múi giờ hệ điều hành; `receivedAt` lấy từ một đồng hồ có thể thay thế trong kiểm thử.
11. **README và chạy được (NFR5, phần U1):** README tối thiểu nêu điều kiện (Java 21, Maven, Docker), cách chạy `docker compose up`, khởi động backend, tạo dịch vụ và gửi callback bằng cURL, truy vấn giao dịch; bản đầy đủ chốt ở Build and Test.
12. **Chất lượng (NFR6, phần U1):** `scripts/verify.ps1` (lệnh kiểm chứng đã được duyệt) build, format, kiểm thử và kiểm tra ngưỡng bao phủ; CI của `tpp-simulator-app/` chạy cùng các bước. Kiểm thử theo trọng tâm của team: ánh xạ, timestamp, ghi nguyên tử và gom giao dịch, che header, API; không viết kiểm thử chỉ lặp lại getter/setter.
13. **NFR4 (truy cập):** không áp dụng cho U1 vì không có giao diện.
14. **NFR7 (mở rộng bằng cấu hình):** U1 đáp ứng phần backend: thêm dịch vụ chỉ cần gọi API tạo dịch vụ, không sửa mã; kiểm chứng bằng việc tạo ba dịch vụ mẫu có cấu trúc JSON khác nhau là việc của U2 (tài sản mẫu).

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
