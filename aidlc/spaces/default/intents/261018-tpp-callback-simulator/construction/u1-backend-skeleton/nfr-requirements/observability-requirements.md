# Yêu cầu quan sát — U1 `u1-backend-skeleton`

> Nguồn: NFR3, NFR5 trong `requirements.md`, `rules.md` (BR2.12), `functional-spec.md` và hợp đồng `contract-summary.md`. Câu trả lời: giả định 6 trong `nfr-requirements-questions.md`.

## Mức độ quan sát cho MVP

Công cụ phát triển chạy local: nhật ký đủ để người dùng chẩn đoán "callback có đến không, vì sao bị từ chối", cộng một điểm kiểm tra sức khỏe. Không có thu thập số liệu đo, truy vết phân tán, bảng điều khiển hay cảnh báo ở MVP. Lịch sử callback trong cơ sở dữ liệu và màn hình theo dõi của U4 là công cụ chẩn đoán chính của người kiểm thử.

## Yêu cầu

| ID | Yêu cầu | Chỉ tiêu kiểm chứng |
|---|---|---|
| NFR5.3 | `GET /actuator/health` cho biết ứng dụng và kết nối cơ sở dữ liệu còn sống; trạng thái `DOWN` khi không kết nối được cơ sở dữ liệu | Kiểm thử tích hợp gọi `health` khi cơ sở dữ liệu có và không có |
| NFR5.4 | Định dạng nhật ký: văn bản thường ra console, mỗi dòng có thời điểm UTC, mức, tên lớp và nội dung; mức mặc định INFO, có thể đổi bằng cấu hình mà không sửa mã | Xem đầu ra khi chạy theo README |
| NFR5.5 | Nội dung nhật ký đủ để chẩn đoán (phần không lộ dữ liệu nhạy cảm nằm ở NFR3.2): mỗi callback được xử lý ghi một dòng mức INFO gồm mã dịch vụ đúng chữ gốc, mã bản ghi, kết quả (`SUCCESS`, `MAPPING_ERROR`) và mã HTTP đã trả; khi ghi không được, ghi mức ERROR kèm lớp ngoại lệ và SQLSTATE (không ghi thông điệp thô của ngoại lệ vì có thể chứa dữ liệu dòng) và không kèm payload hay header; các request bị từ chối ở U1 (413, 404, 503, 400) ghi mức INFO ngắn gồm mã lỗi để người dùng thấy vì sao | Kiểm thử tích hợp bắt đầu ra nhật ký và khẳng định đủ trường, không có giá trị nhạy cảm (NFR3.2) |

## Không áp dụng ở MVP

- Số liệu đo (metrics) và dashboard, truy vết phân tán, ngưỡng cảnh báo, SLI/SLO: ngoài phạm vi vì công cụ chạy local và không đặt SLA (xem `reliability-requirements.md`).
- Tệp nhật ký xoay vòng: console là đủ; người dùng chuyển hướng đầu ra nếu cần giữ.

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/requirements-analysis/requirements.md` (requirements: NFR3, NFR5, FR6.2)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/functional-design/rules.md` (rules: BR2.12, BR2.2 đến BR2.4) và `functional-spec.md` (functional-spec: W2)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-summary.md` (contract-summary: quy ước chung)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/nfr-requirements-questions.md` (giả định 6)

## Assumptions & Open Questions

- Việc ghi nhật ký mức INFO cho các request bị từ chối ở U1 là chi tiết tôi thêm để người dùng chẩn đoán được khi U1 chưa ghi lần nhận bị từ chối vào cơ sở dữ liệu; U2 sẽ ghi vào cơ sở dữ liệu.
