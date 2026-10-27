# Constraint Register — TPP Callback Simulator

## Ràng buộc kỹ thuật

| ID | Ràng buộc | Ảnh hưởng | Căn cứ |
|---|---|---|---|
| C-T1 | Công nghệ, kiến trúc và cấu trúc thư mục đã chốt trong `docs/brief.md` mục 2 | Không đánh giá hoặc thay thế công nghệ ở các stage sau | [desc] |
| C-T2 | MVP chạy local theo README; database chạy bằng Docker Compose | Hướng dẫn chạy phải đủ để khởi động mọi thành phần trên một máy | [Q1] [Q7] |
| C-T3 | Kiểm chứng nhận callback bằng cURL và chức năng gửi callback thử trên giao diện | Kịch bản cURL mẫu là một phần của bàn giao | [Q1] |
| C-T4 | Không dùng hạ tầng đám mây | Không cần cấu hình tài khoản hay dịch vụ đám mây | [Q7] |
| C-T5 | Dữ liệu callback được giữ vô thời hạn, không tự động xóa | Không cần cơ chế dọn dữ liệu; người dùng tự làm sạch database khi cần | [Q3] |
| C-T6 | Thư viện tải từ Maven Central và npm công khai | Không cần cấu hình proxy hoặc kho nội bộ | [Q6] |

## Ràng buộc tổ chức

| ID | Ràng buộc | Ảnh hưởng | Căn cứ |
|---|---|---|---|
| C-O1 | Không có hạn chót cứng; làm lần lượt ba phần theo brief mục 9, kiểm chứng xong phần nào mới chuyển phần đó | Kế hoạch giao hàng chia theo ba phần, mỗi phần có điểm kiểm chứng riêng | [Q4] |
| C-O2 | Một người (chủ dự án) phát triển cùng AI | Tài liệu bàn giao giữ ở mức đủ để một người chạy và tiếp tục | [Q5] |
| C-O3 | Không có trở ngại tổ chức (cấp quyền, đóng băng thay đổi, ưu tiên cạnh tranh) | Không có điều kiện chờ trước khi bắt đầu | [Q8] |

## Ràng buộc pháp lý và tuân thủ

| ID | Ràng buộc | Ảnh hưởng | Căn cứ |
|---|---|---|---|
| C-R1 | Payload chỉ chứa dữ liệu kiểm thử hoặc giả lập, không có dữ liệu khách hàng thật | Không áp dụng yêu cầu tuân thủ về dữ liệu cá nhân; vẫn giữ quy tắc che API key và Authorization trong brief | [Q2] |

## Assumptions & Open Questions

None.
