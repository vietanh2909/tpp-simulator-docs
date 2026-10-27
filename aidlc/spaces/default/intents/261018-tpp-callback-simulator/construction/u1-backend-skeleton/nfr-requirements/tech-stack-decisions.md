# Quyết định công nghệ — U1 `u1-backend-skeleton`

> Nguồn: brief mục 2 (công nghệ đã chốt), `requirements.md` (NFR5, NFR6), team practices, khung dự án `tpp-simulator-app/` đã có (`pom.xml`, `compose.yaml`, `.github/workflows`, `scripts/verify.ps1`), thiết kế chức năng của U1 và các câu trả lời Q1 B, Q2 C, Q3 A cùng giả định 8 đến 12 trong `nfr-requirements-questions.md`. Mọi phụ thuộc ghim phiên bản cố định, không dùng khoảng.

## Bảng quyết định

| Hạng mục | Lựa chọn | Lý do | Nguồn |
|---|---|---|---|
| Ngôn ngữ và JDK | Java 21 (Temurin 21.0.x) | Brief mục 2 | Brief |
| Khung ứng dụng | Spring Boot 3.5.16 (giữ nguyên khung hiện có theo Q1 B) | Khung đã dựng và kiểm chứng; chuyển sang 4.1.x để sau. Rủi ro hết hỗ trợ mã nguồn mở của nhánh 3.5 từ 30/06/2026 ghi ở NFR3.9 | Q1 B |
| Xây dựng | Maven 3.9.x (`.mvn` của khung dự án) | Brief mục 2 | Brief |
| Cơ sở dữ liệu | PostgreSQL 16 qua `compose.yaml` (image `postgres:16`), payload dạng JSONB | Brief mục 2 | Brief, khung dự án |
| Bản chuyển lược đồ | Flyway (`flyway-core` và `flyway-database-postgresql`), tệp đánh số `V1__init_schema` cho U1, U2 thêm `V2`, `V3`... | Khớp quy ước bản chuyển đánh số của hợp đồng C6 | Contract Design C6 |
| Truy cập dữ liệu | Spring Data JPA cho thao tác đơn giản; truy vấn tổng hợp và cập nhật có điều kiện của Transaction viết rõ ràng (câu lệnh gốc hoặc truy vấn tường minh), không dựa vào hành vi ngầm của ORM | Đúng khi ghi đồng thời (NFR2.2, NFR2.3) | Giả định 8 |
| JSON | Jackson (kèm Spring Boot). Giá trị số lấy từ văn bản của mã thông báo JSON, không từ số đã phân tích, để giữ `1.50` và `1e3` đúng nguyên văn (BR3.2) | Mặc định của Jackson làm mất định dạng số; cần kiểm thử riêng | Giả định 9 |
| Kiểm tra đầu vào | Spring Validation cho ranh giới API quản lý; kiểm tra tùy chỉnh theo `rules.md` (BR1.x) | Thu thập đủ mọi lỗi trường trong một lần (BR1.3) | `rules.md` |
| Giám sát sức khỏe | Spring Boot Actuator, chỉ mở `health`, chỉ trên local | NFR3.7, NFR5.3 | Giả định 4, 6 |
| Nhật ký | Logging mặc định của Spring Boot (văn bản ra console, mức INFO) | NFR5.4 | Giả định 6 |
| Kiểm thử | JUnit 5 và Spring Boot Test; Testcontainers với PostgreSQL thật (vì dùng JSONB) | Team practices Q3 | Team practices |
| Bao phủ mã | JaCoCo 0.8.15, luật tối thiểu 80% line coverage, check ở phase `verify` | Team practices Q4, NFR6 | Khung dự án |
| Định dạng mã | Spotless 3.10.4 với google-java-format 1.37.0, check ở phase `validate`, build lỗi khi chưa format | Team practices Q5 | Khung dự án |
| Lệnh kiểm chứng | `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1` (đã được duyệt cho Construction): chạy `mvn verify` của backend, rồi frontend nếu đã có | NFR6.1 | Trạng thái workflow |
| CI | GitHub Actions trong `tpp-simulator-app/.github/workflows`, chạy build, format, kiểm thử và ngưỡng bao phủ; chỉ để build và test, không triển khai | Team practices Q4 | Khung dự án |
| Chạy local | `docker compose up` (PostgreSQL), backend theo README; không triển khai production, không dịch vụ đám mây | Feasibility | Feasibility |
| Đo hiệu năng 100.000 callback | Script PowerShell chạy tay trong `tpp-simulator-app/scripts/` (U2 xây): nạp thẳng vào PostgreSQL, gọi API danh sách 200 lần, in p50/p95/p99; không chạy trong CI | NFR1.3, Q3 A | Q3 A |
| Lưu khóa API | Nguyên văn trong cột riêng của Service, chỉ che khi hiển thị; không API nào trả ra; so khớp ở U2 | Q2 C, NFR3.5 | Q2 C |

## Yêu cầu chạy được và chất lượng (NFR5, NFR6)

| ID | Yêu cầu | Chỉ tiêu kiểm chứng |
|---|---|---|
| NFR5.1 | README tối thiểu của U1 nêu điều kiện cần (Java 21, Maven, Docker), cách chạy `docker compose up`, khởi động backend, tạo dịch vụ và gửi callback bằng cURL, truy vấn giao dịch (kể cả cách mã hóa `transactionId` có ký tự đặc biệt), và cảnh báo về địa chỉ lắng nghe; bản đầy đủ chốt ở Build and Test | Đọc README khi review; chạy theo README (NFR5.2) |
| NFR6.1 | `scripts/verify.ps1` (lệnh kiểm chứng đã được duyệt) build, kiểm tra định dạng, chạy kiểm thử tích hợp và kiểm tra ngưỡng bao phủ của backend; lỗi ở bước nào dừng ngay và báo bước đó | Chạy `verify.ps1` xanh trước khi duyệt Unit |
| NFR6.2 | Tối thiểu 80% line coverage cho backend, đo bằng JaCoCo, luật `check` ở phase `verify`; không hạ ngưỡng để qua kiểm tra | Luật JaCoCo trong `pom.xml` |
| NFR6.3 | Kiểm thử tích hợp bằng PostgreSQL thật qua Testcontainers, trọng tâm theo team: ánh xạ (kể cả giữ nguyên văn bản số), timestamp, gom giao dịch và quy tắc "gần nhất", ghi nguyên tử, che header, thứ tự kiểm tra và mã lỗi của endpoint callback, API tạo và đọc; không viết kiểm thử chỉ lặp lại getter/setter | Danh mục kiểm thử đối chiếu với `traceability.json` của Functional Design |
| NFR6.4 | Spotless với google-java-format chạy ở phase `validate`; build lỗi khi chưa format | Build thất bại khi mã chưa format |
| NFR6.5 | CI của `tpp-simulator-app/` (GitHub Actions) chạy cùng các bước build, format, kiểm thử và ngưỡng bao phủ khi đẩy mã lên GitHub; kiểm thử phải xanh trước khi gộp vào `main` | Workflow trong `tpp-simulator-app/.github/workflows` |
| NFR6.6 | Mọi phụ thuộc ghim phiên bản cố định trong `pom.xml`; bản chuyển lược đồ Flyway không bao giờ sửa sau khi áp dụng | Rà soát `pom.xml` và thư mục bản chuyển khi review |

## Quy tắc đặt tên và cấu trúc (áp dụng cho Code Generation)

- Gói gốc `com.tpp.simulator` (khớp khung hiện có); một ứng dụng Spring Boot, chia module theo bốn thành phần ServiceCatalog, MappingEngine, CallbackIngestion, CallbackLedger với phụ thuộc một chiều (ADR-001, ADR-008). MappingEngine không có trạng thái và không phụ thuộc cơ sở dữ liệu.
- Tên lớp PascalCase, tên phương thức và biến camelCase; JSON camelCase, enum viết hoa (Contract Design).
- Thời gian lưu và trả về luôn UTC; không phụ thuộc múi giờ hệ điều hành; `receivedAt` lấy từ một đồng hồ có thể thay thế trong kiểm thử.
- Cấu hình ứng dụng qua `application.yml` và biến môi trường; địa chỉ lắng nghe mặc định `127.0.0.1` (BR6.1); mật khẩu cơ sở dữ liệu lấy từ biến môi trường (NFR3.6).

## Rủi ro đã chấp nhận

- **Spring Boot 3.5.16 hết hỗ trợ mã nguồn mở (Q1 B).** Chấp nhận vì công cụ chỉ chạy local trên 127.0.0.1. Điều kiện bắt buộc xem lại: trước khi mở ứng dụng ra ngoài máy local hoặc dùng ngoài kiểm thử nội bộ, nâng lên Spring Boot 4.1.x. Khi nâng cần chú ý Jackson 3 và việc đổi tên một số starter.
- **Khóa API lưu nguyên văn (Q2 C).** Chấp nhận vì dữ liệu chỉ là khóa giả lập của UAT. Xem NFR3.5.

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/functional-design/functional-spec.md` (functional-spec) và `rules.md` (rules)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/requirements-analysis/requirements.md` (requirements: NFR5, NFR6, ràng buộc công nghệ)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-summary.md` (contract-summary: C6, quy ước chung)
- `tpp-simulator-app/pom.xml`, `tpp-simulator-app/compose.yaml`, `scripts/verify.ps1` (khung dự án và lệnh kiểm chứng hiện có)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/nfr-requirements-questions.md` (Q1 B, Q2 C, Q3 A, giả định 8 đến 12)

## Assumptions & Open Questions

- Các phiên bản JaCoCo 0.8.15, Spotless 3.10.4, google-java-format 1.37.0 lấy từ `pom.xml` hiện có; chưa kiểm tra lại với kho Maven trong bước này. Code Generation kiểm lại khi build.
- Truy cập dữ liệu: dùng JPA cho thao tác đơn giản và câu lệnh tường minh cho cập nhật Transaction là đề xuất; NFR Design chốt cách bảo đảm đồng thời.
- Điều kiện nâng Spring Boot lên 4.1.x (Q1 B) là đề xuất của tôi, không phải yêu cầu của bạn.
