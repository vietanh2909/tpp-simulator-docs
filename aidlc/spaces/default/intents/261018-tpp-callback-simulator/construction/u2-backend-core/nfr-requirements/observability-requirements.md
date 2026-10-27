# Yêu cầu quan sát — U2 `u2-backend-core`

> Nguồn: NFR3, NFR5 trong `requirements.md`, FR6.2, `rules.md` của U2 (BR14.10, BR15.6, BR22.4, BR22.5), yêu cầu quan sát đã duyệt của U1 và `nfr-requirements-questions.md` của U2 (giả định 13, 21, 22). Mã `NFRx.y` kế thừa mã NFR gốc; **mã của U2 nằm ở dải `y` từ 21 trở lên**, mã U1 (`NFR5.3` đến `NFR5.5`) giữ nguyên.

## Mức độ quan sát cho MVP

Giữ nguyên U1: nhật ký đủ để người dùng chẩn đoán "callback có đến không, vì sao bị từ chối", cộng điểm kiểm tra sức khỏe `GET /actuator/health` (`NFR5.3` của U1). Không số liệu đo (metrics), truy vết phân tán, bảng điều khiển hay cảnh báo; không SLI/SLO vì không có SLA (xem `reliability-requirements.md`). Lịch sử trong cơ sở dữ liệu (nay gồm cả lần nhận bị từ chối) và màn hình theo dõi của U4 là công cụ chẩn đoán chính.

## Quan hệ với yêu cầu của U1

| Mã U1 | Tình trạng ở U2 |
|---|---|
| NFR5.3 (`health` còn sống và `DOWN` khi mất cơ sở dữ liệu) | **Giữ nguyên**; là điểm kiểm tra duy nhất (`NFR5.23`) |
| NFR5.4 (văn bản thường ra console, thời điểm UTC, mức, tên lớp; mức mặc định INFO) | **Giữ nguyên** |
| NFR5.5 (nội dung dòng nhật ký mỗi callback; INFO ngắn cho các request bị từ chối ở U1) | **Được cụ thể hóa và thay bằng tập trường của BR14.10** cho endpoint callback (`NFR5.21`): U2 ghi cả lần nhận bị từ chối vào cơ sở dữ liệu nên dòng nhật ký có thêm `recordId` và `rejectionReason`. Các tên kết quả `SUCCESS`, `MAPPING_ERROR` và quy tắc không lộ dữ liệu của U1 giữ nguyên |

## Yêu cầu

| ID | Yêu cầu | Chỉ tiêu kiểm chứng | Cách kiểm chứng | Nguồn |
|---|---|---|---|---|
| NFR5.21 | **Đúng một dòng nhật ký cho mỗi request tới endpoint callback** (BR14.10), kể cả request bị từ chối không ghi bản ghi (413, mã dịch vụ chưa từng có). **Dòng INFO** (không lỗi ghi) gồm: mã dịch vụ lấy từ đường dẫn đã làm sạch (`NFR3.24`); `recordId` nếu đã ghi bản ghi; `outcome` (callback được chấp nhận) **hoặc** `rejectionReason` (lần bị từ chối), vắng khi 413 và khi mã chưa từng có; mã HTTP đã trả. **Dòng ERROR** (có lỗi ghi: BR14.8, BR14.9, BR15.6) **thay thế** dòng INFO, không đứng cạnh nó: các trường trên mà lúc đó đã biết, cộng mã HTTP đã trả, lớp ngoại lệ và mã lỗi của kho dữ liệu (SQLSTATE) nếu có. Không bao giờ ghi body, tên hay giá trị header, khóa đúng hoặc sai, hay thông điệp lỗi thô của kho dữ liệu | Kiểm thử tích hợp bắt đầu ra nhật ký cho từng trường hợp: `SUCCESS`, `MAPPING_ERROR`, từng lý do trong sáu lý do `REJECTED`, `413`, mã dịch vụ chưa từng có (404), và hai cách gây lỗi, mỗi cách đúng với tình huống của nó: (1) *đọc được ảnh dịch vụ, ghi lỗi* bằng **trigger chỉ dùng cho kiểm thử** `BEFORE INSERT` trên bảng `callbacks` của `NFR2.26` (callback được chấp nhận cho `500 INTERNAL_ERROR`; callback sai khóa cho `401` kèm header `X-Simulator-Record-Failed: true`); (2) *đọc ảnh dịch vụ lỗi* bằng pool trỏ vào địa chỉ hỏng (BR14.9: `500 INTERNAL_ERROR`, không header, dòng ERROR chỉ có các trường đã biết, vắng `recordId`, `outcome` và `rejectionReason`); trong cả hai cách, mỗi request cho **đúng một** dòng, đủ các trường nêu trên, mức đúng (INFO hoặc ERROR), và không chứa giá trị nhạy cảm (quét như `NFR3.21`) | Giả định 21; BR14.10; FR6.2; NFR5.5 (U1) |
| NFR5.22 | **Khối lượng nhật ký khi cơ sở dữ liệu mất:** mỗi request một dòng ERROR theo `NFR5.21`, **không gộp, không giới hạn tần suất**; không có tệp nhật ký xoay vòng, chỉ console như U1 (NFR5.4). Ở khoảng 5 request/giây lượng này nhỏ | Kiểm thử tích hợp với pool trỏ vào địa chỉ hỏng (BR14.9, mỗi request trả `500 INTERNAL_ERROR`): gửi 20 request callback **song song** (20 luồng bắt đầu cùng lúc) để tổng thời gian chỉ cỡ một lần chờ kết nối (khoảng 5 giây cộng dư địa), thay vì ~100 giây nếu gửi tuần tự; hoặc, nếu NFR Design muốn, **rút ngắn thời gian chờ lấy kết nối chỉ riêng cho kiểm thử này** bằng cấu hình của kiểm thử (không đổi giá trị 5000 ms của ứng dụng, `NFR2.4` của U1). **Phạm vi đếm:** chỉ các dòng do **logger của endpoint callback** ghi (nhận biết bằng tên logger và mẫu nội dung dòng của BR14.10: mã dịch vụ, mã HTTP đã trả, lớp ngoại lệ), mức ERROR; **loại trừ** mọi dòng WARN/ERROR của Hikari, Spring hay JDBC tự ghi khi cơ sở dữ liệu mất. Khẳng định đúng 20 dòng như vậy, mỗi dòng một dòng vật lý, không dòng nào trùng lặp hay bị bỏ, và không dòng nào của logger endpoint ở mức INFO cho các request này | Giả định 13; NFR5.4 (U1) |
| NFR5.23 | **Không thêm công cụ quan sát mới:** không số liệu đo, truy vết hay cảnh báo; `GET /actuator/health` vẫn là điểm kiểm tra duy nhất và Actuator vẫn chỉ mở `health` (NFR3.7 của U1). Dòng nhật ký theo `NFR5.21` là đủ để chẩn đoán đường mới | `pom.xml` không thêm bộ xuất số liệu (registry/exporter) hay thư viện truy vết; kiểm thử Actuator của U1 (các endpoint khác trả 404) vẫn xanh | Giả định 21; NFR5.3 (U1); NFR3.7 (U1) |
| NFR5.24 | **Đầu ra của công cụ nạp** (BR22.5): không ghi dòng nhật ký cho từng callback (không sinh 100.000 dòng), và dòng nhật ký mỗi request của BR14.10 **không phát sinh** trong lần chạy nạp. Công cụ in **tiến độ mỗi 10.000 callback** và **một dòng tổng kết** gồm số Callback, số giao dịch, tổng thời gian và số callback mỗi giây; thoát mã 0. Khi lỗi in số bản ghi đã ghi và lý do (`NFR2.27`). Đầu ra không chứa payload, khóa hay mật khẩu (`NFR3.21`, `NFR3.26`) | Kiểm thử tích hợp nạp quy mô nhỏ (500 callback): đầu ra có đúng một dòng tổng kết với bốn trường và không có dòng tiến độ (vì dưới 10.000); kiểm thử với số callback lớn hơn 10.000 (chạy với bộ đếm tiến độ được cấu hình nhỏ hoặc kiểm thử đơn vị trên bộ đếm) khẳng định có dòng tiến độ mỗi 10.000; quét đầu ra không có payload hay giá trị bí mật | Giả định 22; BR22.5; NFR1.26 |

## Không áp dụng ở MVP

- Số liệu đo, dashboard, truy vết phân tán, ngưỡng cảnh báo, SLI/SLO: ngoài phạm vi (như U1).
- Tệp nhật ký xoay vòng: console là đủ; người dùng chuyển hướng đầu ra nếu cần giữ.
- Nhật ký cho API quản lý (tạo, sửa, bật/tắt, xóa, liệt kê dịch vụ, danh sách, thử mapping): không có yêu cầu riêng ở U2; mặc định logging của Spring Boot ở mức INFO, không ghi dữ liệu nhạy cảm (`NFR3.21`).

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/requirements-analysis/requirements.md` (requirements: NFR3, NFR5, FR6.2)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/functional-design/rules.md` (rules: BR14.8, BR14.9, BR14.10, BR15.6, BR22.4, BR22.5) và `functional-spec.md` (functional-spec: W16, W18, W25)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/nfr-requirements/nfr-requirements-questions.md` (giả định 13, 21, 22)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/observability-requirements.md` (NFR5.3 đến NFR5.5)

## Assumptions & Open Questions

- **Kiểm thử dòng tiến độ ở `NFR5.24`:** nạp thật hơn 10.000 callback trong bộ kiểm thử thường là chậm; tôi cho phép kiểm thử đơn vị trên bộ đếm tiến độ hoặc đặt ngưỡng cấu hình nhỏ khi kiểm thử. Cách làm do NFR Design chọn; yêu cầu là đầu ra thật của công cụ có tiến độ mỗi 10.000 callback.
- **Phạm vi đếm và cách gửi ở `NFR5.22` (R-07)** và **cách gây lỗi ở `NFR5.21` (R-01)** là chi tiết kiểm thử tôi thêm sau review; không đổi chỉ tiêu "mỗi request một dòng ERROR, không giới hạn tần suất" (giả định 13). Mẫu nội dung dòng và tên logger cụ thể do NFR Design/Code Generation chốt theo BR14.10.
- **Dòng nhật ký U1 cho 503 và 400:** U1 NFR5.5 yêu cầu dòng INFO ngắn cho các request bị từ chối; ở U2 chúng được thay bằng dòng theo BR14.10 (có `recordId` và `rejectionReason` khi lần nhận được ghi). Không còn dòng thứ hai cho cùng request.
- Không có câu hỏi mở khác.
