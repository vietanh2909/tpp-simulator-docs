# Intent Statement — TPP Callback Simulator

## Problem Statement

Dự án xây dựng mới ứng dụng TPP Callback Simulator ở mức MVP; yêu cầu đã chốt nằm trong `docs/brief.md`, nguồn yêu cầu chính. [desc]

Trên môi trường dev/UAT, ngân hàng chủ động gọi HTTP API của đối tác (TPP) để báo kết quả nghiệp vụ như thu hộ, chi hộ và biến động số dư. [Q1]

Người kiểm thử không có công cụ để biết callback có đến hay không, ngân hàng gửi trạng thái gì, payload ra sao và lịch sử các lần nhận. [Q1]

Mỗi khi có dịch vụ mới, giả lập phía TPP lại phải sửa code. [Q1]

## Target Customer

Người kiểm thử và lập trình viên nội bộ làm việc trên môi trường dev/UAT của ngân hàng. [Q2]

Họ dùng chung dữ liệu và không cần đăng nhập. [Q2]

Khó khăn hiện tại: phải tự dựng giả lập TPP và không quan sát được callback. [Q2]

## Success Metrics

Thành công khi đạt đủ 10 tiêu chí nghiệm thu trong `docs/brief.md` mục 8: [Q3]

| # | Tiêu chí (đạt / không đạt) | Source |
|---|---|---|
| 1 | Khởi động được PostgreSQL, backend và frontend theo README | [Q3] |
| 2 | Tạo dịch vụ và thử mapping mà không tạo giao dịch | [Q3] |
| 3 | Gọi callback bằng cURL và nhận đúng response đã cấu hình | [Q3] |
| 4 | Xem được giao dịch và payload trên giao diện | [Q3] |
| 5 | Gửi nhiều callback cùng mã giao dịch, giữ đủ lịch sử và tổng hợp đúng theo lần nhận gần nhất | [Q3] |
| 6 | Callback lỗi mapping vẫn được lưu và tra cứu được | [Q3] |
| 7 | API key đúng và sai được xử lý đúng | [Q3] |
| 8 | Thêm dịch vụ có cấu trúc JSON khác mà không sửa code | [Q3] |
| 9 | Gửi callback thử trên giao diện đi qua endpoint callback thật và tạo dữ liệu | [Q3] |
| 10 | Build backend và frontend thành công; có kiểm thử tích hợp cho các hành vi quan trọng | [Q3] |

## Initiative Trigger

Cần tăng tốc kiểm thử tích hợp callback giữa ngân hàng và đối tác trên dev/UAT. [Q4]

Đồng thời đây là dự án cá nhân/thử nghiệm để làm quen quy trình AI-DLC với một bài toán thực tế. [Q4]

## Initial Scope Signal

### Phạm vi workflow (workflow-selected)

Phạm vi workflow được chọn là `mvp`. [scope]

### Ranh giới sản phẩm (người dùng đã xác nhận)

Phiên bản đầu tiên không bao gồm: [Q8]

- Gọi API nghiệp vụ từ TPP sang ngân hàng. [Q8]
- Quản lý danh sách giao dịch dự kiến hoặc phát hiện callback chưa đến. [Q8]
- Kafka, NoSQL hoặc đồng bộ dữ liệu. [Q8]
- Đăng nhập và phân quyền quản trị. [Q8]
- Response động lấy giá trị từ request. [Q8]
- Giả lập timeout, độ trễ, lỗi N lần hoặc phản hồi theo điều kiện. [Q8]
- Triển khai production. [Q8]
- JSON path dạng wildcard, filter hoặc mapping mảng. [Q8]
- WebSocket. [Q8]

Xóa dịch vụ nằm trong phạm vi phiên bản đầu: người dùng tạo, sửa và xóa được dịch vụ. [Q8] [Q10]

Xóa dịch vụ là xóa mềm: chỉ đổi trạng thái, mọi thông tin khác giữ nguyên; dịch vụ biến khỏi danh sách cấu hình và URL callback trả 404 như dịch vụ không tồn tại. [Q9]

Lịch sử callback và giao dịch của dịch vụ đã xóa vẫn được giữ và tra cứu được; `serviceCode` đã xóa không được dùng lại. [Q9]

## Assumptions & Open Questions

None.
