# User Stories — Đánh giá

## Quyết định

Execute — viết user stories cho MVP.

## Lý do

- Ứng dụng có giao diện người dùng thật (cấu hình dịch vụ, thử mapping, gửi callback thử, theo dõi giao dịch) và hai nhóm người dùng: người kiểm thử và lập trình viên [requirements.md §1].
- Nghiệp vụ có nhiều quy tắc dễ hiểu sai: thứ tự kiểm tra callback, gom giao dịch theo callback nhận gần nhất, lưu cả request bị từ chối, snapshot cấu hình (FR3–FR5). Viết theo góc nhìn người dùng kèm tiêu chí Given/When/Then giúp kiểm chứng đúng hành vi.
- Brief chia giao hàng thành ba phần (backend, frontend cấu hình, frontend theo dõi). Story có mã ổn định là đầu vào cho Units Generation và Delivery Planning.

## Yếu tố đã xem xét

- Loại dự án: greenfield, MVP, một người phát triển kiêm người duyệt.
- Phạm vi giao diện: bốn màn hình chính theo Rough Mockups (danh sách dịch vụ, cấu hình dịch vụ, gửi thử, theo dõi).
- Độ phức tạp: trung bình; phần rủi ro nằm ở xử lý callback, mapping và đồng thời, không nằm ở số lượng màn hình.

## Nơi story mang lại nhiều giá trị nhất

- Nhận callback và các trường hợp bị từ chối (FR3), vì đây là câu hỏi chính "callback có đến không".
- Mapping, chuẩn hóa thời gian và gom giao dịch (FR4, FR5).
- Theo dõi với bộ lọc, phân trang và tự cập nhật không làm mất trạng thái màn hình (FR8–FR11).
