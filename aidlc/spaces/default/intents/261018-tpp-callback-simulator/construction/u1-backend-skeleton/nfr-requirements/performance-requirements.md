# Yêu cầu hiệu năng — U1 `u1-backend-skeleton`

> Nguồn: NFR1 trong `requirements.md`, thiết kế chức năng của U1 (`functional-spec.md`, `rules.md`) và hợp đồng `contract-summary.md`. Mã `NFRx.y` kế thừa mã NFR gốc. Câu trả lời: Q3 A và giả định 1, 2 trong `nfr-requirements-questions.md`.

## Yêu cầu

| ID | Yêu cầu | Chỉ tiêu đo được | Đo bằng | Thuộc |
|---|---|---|---|---|
| NFR1.1 | Nhận một callback đường vui (ánh xạ, ghi Callback và cập nhật Transaction, trả response đã cấu hình) | p95 dưới 200 ms trên máy local khi PostgreSQL đã nóng và không có tải khác; đây là mục tiêu phát triển để phát hiện lỗi thiết kế, không phải kiểm thử tự động bắt buộc của U1 | Đo tay trong Build and Test: 100 lần gọi cURL tuần tự vào dịch vụ mẫu, báo p50 và p95 | U1 |
| NFR1.2 | Lược đồ nền cho truy vấn nhanh | Bản chuyển `V1` có khóa chính và khóa duy nhất theo `entities.md`, kể cả chỉ mục duy nhất trên giá trị chữ thường của `serviceCode`; các truy vấn theo khóa của U1 (tìm dịch vụ theo mã không phân biệt hoa thường, tìm giao dịch theo cặp khóa, đọc các lần nhận của một giao dịch) dùng chỉ mục, không quét toàn bảng. Danh sách giao dịch sắp xếp và phân trang cần chỉ mục trên cột sắp xếp: chỉ mục này do NFR Design chọn và thêm bằng bản chuyển `V1` hoặc `V2` trở đi; với khối lượng nhỏ của U1 chưa cần để đạt NFR1.1 | Xem kế hoạch truy vấn của các truy vấn trên trong NFR Design | U1 |
| NFR1.3 | Danh sách có lọc và phân trang dưới 1 giây | p95 dưới 1 giây với 100.000 callback trong cơ sở dữ liệu (gồm các giao dịch tương ứng) | Script PowerShell chạy tay trong `tpp-simulator-app/scripts/`: nạp 100.000 callback và giao dịch thẳng vào PostgreSQL bằng câu lệnh sinh hàng loạt, rồi gọi API danh sách 200 lần với các bộ lọc mẫu và in p50, p95, p99; không chạy trong CI; kết quả ghi vào báo cáo Build and Test | U2 xây script; U1 chỉ bảo đảm lược đồ không cản trở |
| NFR1.4 | Tài nguyên | Chạy được trên máy phát triển phổ thông với cấu hình JVM và pool kết nối mặc định của Spring Boot; không có yêu cầu bộ nhớ riêng; đọc body tối đa 1.048.576 byte (BR2.2) nên bộ nhớ mỗi request có chặn trên | Quan sát khi chạy kiểm thử tải của NFR1.3 | U1 |
| NFR1.5 | Khối lượng dữ liệu thiết kế | Đúng và nhanh ở 100.000 callback; không có mục tiêu cho khối lượng lớn hơn, không phân vùng bảng ở MVP | Như NFR1.3 | U1, U2 |
| NFR1.6 | Kích thước phản hồi chi tiết giao dịch (`GET /api/transactions/detail`, BR5.3): mỗi lần nhận có thể tới 1.048.576 byte, kịch bản 50 lần nhận cùng giao dịch có thể ra khoảng 50 MiB | Khoảng trống đã biết: NFR Design chốt trần cụ thể (số lần nhận hoặc dung lượng tối đa trả về, cách báo khi bị cắt) trước Code Generation của U1; cho tới lúc đó U1 không được hứa bộ nhớ hay thời gian cho giao dịch có nhiều lần nhận lớn | Thiết kế ở NFR Design; kiểm thử với giao dịch 50 lần nhận lớn | U1, U4 |

## Phần không áp dụng ở U1

- Giao diện: thời gian hiển thị dữ liệu trong 1 giây ở trình duyệt khi API đạt mục tiêu là phần của U4.
- Danh sách có bộ lọc: U1 từ chối tham số lọc (BR5.2) nên chưa có truy vấn lọc để đo; mục tiêu NFR1.3 áp dụng khi U2 hoàn thiện.

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/requirements-analysis/requirements.md` (requirements: NFR1)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/functional-design/functional-spec.md` (functional-spec: W2, W4, W5, W6) và `rules.md` (rules: BR2.2, BR5.1, BR5.2)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-summary.md` (contract-summary: C4, C6)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/nfr-requirements-questions.md` (Q3 A, giả định 1 và 2)

## Assumptions & Open Questions

- Mục tiêu 200 ms của NFR1.1 là con số tôi đề xuất và bạn đã chấp nhận (giả định 1); brief chỉ đặt mục tiêu 1 giây cho danh sách.
- Chỉ mục cụ thể cho lọc và sắp xếp do NFR Design chọn; cách đo NFR1.3 do U2 hiện thực hóa.
