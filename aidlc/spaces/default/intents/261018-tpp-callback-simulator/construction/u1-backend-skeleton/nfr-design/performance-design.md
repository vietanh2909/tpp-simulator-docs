# Thiết kế hiệu năng — U1 `u1-backend-skeleton`

> Nguồn: `performance-requirements.md` (NFR1.1 đến NFR1.6), `tech-stack-decisions.md`, `functional-spec.md` (W2, W5, W6), `contract-summary.md` (C4, C6) và các câu trả lời Q2 B, giả định 1 đến 4, 10, 11 trong `nfr-design-questions.md`. Mức thiết kế: mẫu và quyết định, không phải mã triển khai.

## Đường đi nóng: nhận một callback (NFR1.1)

Mục tiêu p95 dưới 200 ms trên máy local đạt được bằng cách giữ đường đi ngắn, một giao dịch cơ sở dữ liệu, không bộ nhớ đệm:

1. Đọc thân request có chặn trên 1.048.576 byte (xem `security-design.md`).
2. Khớp dịch vụ và đọc phiên bản cấu hình hiện hành bằng **một** truy vấn nối hai bảng, theo chỉ mục chữ thường của `serviceCode`.
3. Phân tích JSON một lượt đọc dòng (streaming) lấy ba giá trị theo ba đường dẫn, ngoài giao dịch cơ sở dữ liệu (NFR1.4: không dựng cây JSON đầy đủ cho mục đích ánh xạ).
4. Mở giao dịch cơ sở dữ liệu: ghi Callback (một câu `INSERT`, nhận `recordId`), rồi thêm hoặc cập nhật Transaction bằng một câu lệnh (xem `scalability-design.md`). Hoàn tất giao dịch.
5. Trả response đã cấu hình từ phiên bản đã đọc ở bước 2.

Tổng cộng 3 lần đi tới cơ sở dữ liệu (một truy vấn đọc, hai câu ghi), giao dịch mở chỉ quanh hai câu ghi nên khóa giữ rất ngắn.

**Quyết định không dùng bộ nhớ đệm cấu hình dịch vụ.** Đổi cấu hình phải có hiệu lực ngay cho callback kế tiếp (FR1.13), và thêm bộ nhớ đệm đồng nghĩa thêm một nơi giữ trạng thái cần làm mất hiệu lực. Với mục tiêu 200 ms trên máy local, một truy vấn khóa là chi phí chấp nhận được; xem lại nếu đo thấy không đạt (NFR1.1).

## Lược đồ và chỉ mục nền trong `V1__init_schema` (NFR1.2)

| Bảng | Khóa và chỉ mục | Phục vụ |
|---|---|---|
| `services` | Khóa chính `service_code`; chỉ mục duy nhất trên chữ thường của `service_code` | Tìm dịch vụ theo mã không phân biệt hoa thường (BR2.1, BR1.9); phát hiện trùng mã khi tạo (BR1.2) |
| `service_config_versions` | Khóa chính `version_id`; khóa duy nhất (`service_code`, `version_number`) | Đọc phiên bản hiện hành theo `currentVersionNumber` |
| `callbacks` | Khóa chính `record_id`; chỉ mục (`service_code`, `received_at`, `record_id`); chỉ mục (`service_code`, `transaction_id`, `received_at`, `record_id`) khi `transaction_id` không rỗng | Đọc các lần nhận của một giao dịch (BR5.3) theo thứ tự nhận mà không quét toàn bảng |
| `transactions` | Khóa chính ghép (`service_code`, `transaction_id`); chỉ mục (`latest_received_at` giảm dần, `latest_callback_id` giảm dần) | Tìm giao dịch theo cặp khóa; danh sách giao dịch sắp theo đúng thứ tự của BR5.1 và phân trang |

**Dạng điều kiện truy vấn bắt buộc để dùng được chỉ mục:** (1) tìm dịch vụ: `lower(service_code) = lower(:code)` (đúng biểu thức của chỉ mục duy nhất); (2) tìm giao dịch theo cặp khóa: `service_code = :svc AND transaction_id = :txn` với `:svc` là mã đúng chữ gốc của dịch vụ đã khớp; (3) đọc các lần nhận của giao dịch: `service_code = :svc AND transaction_id = :txn ORDER BY received_at, record_id` (chỉ mục từng phần chỉ dùng được khi điều kiện kèm `transaction_id IS NOT NULL` hoặc `= :txn`); (4) danh sách giao dịch: `ORDER BY latest_received_at DESC, latest_callback_id DESC LIMIT :n OFFSET :m`. **Kiểm chứng:** một kiểm thử tích hợp chạy `EXPLAIN` cho bốn truy vấn trên với khối lượng dữ liệu đủ lớn để bộ lập kế hoạch chọn chỉ mục và khẳng định không có quét toàn bảng ở truy vấn khóa; kết quả ghi vào báo cáo của Build and Test.

Chỉ mục phục vụ bộ lọc (trạng thái chứa chuỗi, khoảng thời gian, kết quả xử lý) và danh sách callback thuộc U2 (`V2` trở đi); chuỗi chứa không phân biệt hoa thường có thể cần chỉ mục chuyên dụng, do NFR Design của U2 chọn.

## Phân trang (NFR1.3, NFR1.5)

- Phân trang theo số trang với `OFFSET` và `LIMIT` cộng một truy vấn đếm tổng; hợp lý ở khối lượng 100.000 bản ghi của MVP. Không dùng con trỏ vì hợp đồng đã chốt `page` và `totalPages` (Contract Design Q6).
- Thứ tự cố định `latest_received_at` giảm dần rồi `latest_callback_id` giảm dần khớp chỉ mục nên không cần sắp xếp bù.
- Cách đo mục tiêu 1 giây cho danh sách có lọc: script PowerShell chạy tay do U2 xây (Q3 A của NFR Requirements): nạp 100.000 callback và giao dịch thẳng vào PostgreSQL bằng câu lệnh sinh hàng loạt, gọi API danh sách 200 lần với các bộ lọc mẫu, in p50, p95, p99. U1 chỉ bảo đảm lược đồ và chỉ mục nền không cản trở.

## Tài nguyên (NFR1.4)

- Pool kết nối HikariCP tối đa 10; thời gian chờ lấy kết nối 5 giây (xem `reliability-design.md`). Số luồng xử lý request mặc định của máy chủ nhúng là đủ cho 5 giao dịch/giây.
- Bộ nhớ mỗi request **nhận callback** có chặn trên: body tối đa 1.048.576 byte, payload JSON được đọc dòng một lượt, kết quả ánh xạ chỉ giữ ba chuỗi (mỗi chuỗi tối đa 255 ký tự). Chặn trên này không áp dụng cho `GET /api/transactions/detail` (xem mục rủi ro bên dưới).
- Cột JSONB nhận văn bản JSON đã đọc sẵn qua tham số có ép kiểu rõ ràng; không phân tích lần hai ở tầng lưu. `spring.jpa.open-in-view` đặt `false` để không giữ kết nối suốt vòng đời request.
- **Giới hạn đã biết của JSONB:** PostgreSQL `jsonb` từ chối vài JSON mà bộ phân tích Jackson coi là hợp lệ (chuỗi chứa ký tự thoát Unicode không, số vượt miền `numeric`). Callback như vậy làm việc ghi lỗi và trả 500 `INTERNAL_ERROR` dù BR2.4 nhận mọi JSON hợp lệ. Chấp nhận như giới hạn đã biết ở U1: log theo NFR3.2 (chỉ lớp ngoại lệ và SQLSTATE), README ghi rõ, và có một kiểm thử cho hành vi này (500, không ghi gì, log không lộ payload).

## Kích thước phản hồi chi tiết giao dịch: rủi ro đã chấp nhận (NFR1.6, Q2 B)

Theo quyết định Q2 B, U1 **không đặt trần** cho `GET /api/transactions/detail`: phản hồi trả toàn bộ các lần nhận kèm payload. Một giao dịch có nhiều lần nhận lớn (mỗi lần tới 1 MiB, kịch bản NFR2 là 50 lần) có thể sinh phản hồi hàng chục MiB, tốn bộ nhớ và thời gian, và ngăn chi tiết của giao diện làm mới 5 giây một lần sẽ lặp lại chi phí đó.

- **Giảm thiểu ở U1:** chọn **đọc hết các lần nhận ra bộ nhớ rồi giải phóng kết nối cơ sở dữ liệu trước khi ghi phản hồi**, thay vì phát trực tiếp: nếu phát trực tiếp, một máy khách chậm giữ kết nối trong pool 10 kết nối (chờ 5 giây) và có thể làm nghẽn việc nhận callback. Đổi lại bộ nhớ của endpoint chi tiết không có chặn trên (chính là rủi ro đã chấp nhận). `spring.jpa.open-in-view=false`. README ghi rõ giới hạn đã biết.
- **Hướng giải quyết:** U2 thêm `GET /api/callbacks/{recordId}` (chi tiết từng lần nhận) để U4 có thể rút gọn danh sách lần nhận trong chi tiết giao dịch; quyết định đó và việc thêm trần thuộc Functional Design của U2.
- **Điều kiện xem lại:** nếu đo thấy chi tiết giao dịch quá chậm hoặc quá lớn với dữ liệu thật của người dùng, đặt trần bằng thay đổi additive vào hợp đồng C4 (ví dụ `callbackTotal` và `callbacksTruncated`).

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/performance-requirements.md` (performance-requirements: NFR1.1 đến NFR1.6)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/tech-stack-decisions.md` (tech-stack-decisions)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/functional-design/functional-spec.md` (functional-spec: W2, W5, W6)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-summary.md` (contract-summary: C4, C6, Contract Design Q6)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-design/nfr-design-questions.md` (Q2 B, giả định 1 đến 4, 10, 11)

## Assumptions & Open Questions

- Chi tiết giao dịch đọc hết rồi mới trả (không phát trực tiếp) để không giữ kết nối trong lúc máy khách chậm; đổi lại không có chặn trên bộ nhớ cho endpoint này (Q2 B).
- Chỉ mục (`service_code`, `transaction_id`, ...) trên `callbacks` và chỉ mục sắp xếp của `transactions` đặt trong `V1` theo giả định 3; nếu bạn muốn dồn mọi chỉ mục ngoài khóa sang `V2`, nói ở cổng duyệt.
- Quyết định không dùng bộ nhớ đệm cấu hình dịch vụ có thể xem lại sau khi đo NFR1.1.
