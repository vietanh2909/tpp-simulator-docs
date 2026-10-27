# Thiết kế quan sát — U1 `u1-backend-skeleton`

> Nguồn: `observability-requirements.md` (NFR5.3 đến NFR5.5), `security-requirements.md` (NFR3.2), `tech-stack-decisions.md`, `functional-spec.md` (W2) và giả định 8 trong `nfr-design-questions.md`. Mức thiết kế: mẫu và quyết định.

## Phạm vi

Công cụ phát triển chạy local: nhật ký đủ để chẩn đoán "callback có đến không và vì sao bị từ chối" cộng một điểm kiểm tra sức khỏe. Không có số liệu đo (metrics), truy vết phân tán, ngưỡng cảnh báo, bảng điều khiển hay SLI/SLO ở MVP. Lịch sử callback trong cơ sở dữ liệu và màn hình theo dõi của U4 là công cụ chẩn đoán chính của người kiểm thử.

## Nhật ký (NFR5.4, NFR5.5)

- **Định dạng:** văn bản thường ra console: thời điểm UTC, mức, tên lớp, nội dung. Mức mặc định INFO, đổi bằng cấu hình mà không sửa mã. Không ghi tệp; người dùng chuyển hướng đầu ra nếu cần giữ.
- **UTC:** mẫu nhật ký đặt tường minh múi giờ UTC cho phần thời điểm (thuộc tính định dạng ngày giờ của logging, không phụ thuộc múi giờ JVM); kiểm thử khởi động đọc một dòng log và kiểm tra hậu tố `Z` hoặc `+0000`.
- **Bộ ghi theo thành phần:** tên bộ ghi là tên lớp dưới các gói `com.tpp.simulator.catalog`, `mapping`, `ingestion`, `ledger`, `web`, nên nâng mức riêng từng thành phần bằng cấu hình mức theo tên gói khi chẩn đoán mà vẫn thấy tên lớp trong dòng log.
- **Nội dung chuẩn:**

| Sự kiện | Mức | Nội dung (mọi giá trị do bên gọi cung cấp đi qua bộ làm sạch của NFR3.2) |
|---|---|---|
| Callback được chấp nhận và ghi | INFO | mã dịch vụ đúng chữ gốc, `recordId`, kết quả (`SUCCESS` hoặc `MAPPING_ERROR`), mã HTTP đã trả |
| Request bị từ chối ở U1 (413, 404, 503, 400) | INFO | mã dịch vụ đã làm sạch (nếu có), mã lỗi (`PAYLOAD_TOO_LARGE`, `SERVICE_NOT_FOUND`, `SERVICE_DISABLED`, `UNSUPPORTED_CONTENT_TYPE`, `INVALID_JSON`), mã HTTP đã trả |
| Dịch vụ được tạo | INFO | mã dịch vụ, số phiên bản (1) |
| Lỗi ghi cơ sở dữ liệu hoặc lỗi bất ngờ | ERROR | mã dịch vụ đã làm sạch, `recordId` nếu đã có, **lớp ngoại lệ và SQLSTATE**; không ghi thông điệp thô của ngoại lệ truy cập dữ liệu vì thông điệp PostgreSQL/JDBC có thể chứa dữ liệu dòng hoặc mảnh JSON; không kèm payload, header hay khóa |
| Khởi động và áp dụng bản chuyển lược đồ | INFO | phiên bản lược đồ, địa chỉ lắng nghe (không kèm mật khẩu cơ sở dữ liệu) |

- **Không bao giờ log:** payload, giá trị header, khóa API, mật khẩu (NFR3.2).
- **Kiểm thử:** kiểm thử tích hợp bắt đầu ra log cho các sự kiện trên và khẳng định đủ trường, không có giá trị nhạy cảm, không có dòng log giả khi mã dịch vụ chứa xuống dòng. Thêm kiểm thử ép lỗi ghi với payload chứa một chuỗi nhận biết và `transactionId` có xuống dòng, rồi khẳng định dòng ERROR không chứa chuỗi nhận biết, không chứa thông điệp thô của ngoại lệ và không có dòng log giả (đường lỗi, không chỉ đường vui).

## Điểm kiểm tra sức khỏe (NFR5.3)

- `GET /actuator/health` trả `UP` khi ứng dụng chạy và kết nối được cơ sở dữ liệu; `DOWN` khi không kết nối được. Chỉ báo sức khỏe cơ sở dữ liệu có sẵn của Actuator; không hiện chi tiết (`show-details=never`).
- Không có `liveness` và `readiness` riêng (không có trình điều phối).
- Kiểm thử: gọi `health` khi cơ sở dữ liệu có và khi dừng container.

## Tương quan yêu cầu

Không có mã tương quan (correlation ID) hay truy vết: mỗi request xử lý đồng bộ trong một tiến trình và dòng log đã có `recordId` để nối với bản ghi trong cơ sở dữ liệu. Nếu sau này cần truy vết, thêm bộ lọc gán mã yêu cầu vào ngữ cảnh log là thay đổi nhỏ không đổi hợp đồng.

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/observability-requirements.md` (observability-requirements: NFR5.3, NFR5.4, NFR5.5)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/security-requirements.md` (security-requirements: NFR3.2)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/tech-stack-decisions.md` (tech-stack-decisions)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/functional-design/functional-spec.md` (functional-spec: W2) và `rules.md` (rules: BR2.12)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-summary.md` (contract-summary: bảng mã lỗi)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-design/nfr-design-questions.md` (giả định 8)

## Assumptions & Open Questions

- Việc chọn không ghi tệp nhật ký và không có mã tương quan là đề xuất phù hợp công cụ local; có thể thêm sau mà không đổi hợp đồng.
