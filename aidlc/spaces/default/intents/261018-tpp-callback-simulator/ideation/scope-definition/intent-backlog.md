# Intent Backlog — TPP Callback Simulator (MVP)

Phương pháp ưu tiên: MoSCoW. Mọi hạng mục đều là **Must**, vì MVP chỉ xong khi đạt đủ 10 tiêu chí nghiệm thu trong intent statement. [Q1]

Thứ tự thực hiện theo ba phần đã chốt (`docs/brief.md` mục 9, constraint register C-O1). Trong mỗi phần, hạng mục xếp theo phụ thuộc. [Q2]

## Phần 1 — Backend

| ID | Hạng mục (proto-Unit) | MoSCoW | Phụ thuộc | Tiêu chí nghiệm thu liên quan |
|---|---|---|---|---|
| B1 | Quản lý cấu hình dịch vụ: tạo, sửa, bật/tắt, xóa mềm, lưu phiên bản cấu hình | Must | — | 2, 8 |
| B2 | Thử mapping không tạo dữ liệu | Must | B1 | 2 |
| B3 | Nhận callback: xác thực, mapping, lưu từng lần nhận, trả response hoặc mã lỗi (404 cho dịch vụ không tồn tại hoặc đã xóa, 503, 401, 400, 500) | Must | B1 | 3, 5, 6, 7 |
| B4 | Tra cứu giao dịch và callback: lọc, phân trang phía server | Must | B3 | 4, 5, 6 |
| B5 | Dữ liệu mẫu cho ba dịch vụ và kịch bản cURL kiểm chứng | Must | B1, B3 | 3, 8 |
| B6 | Khởi động database bằng Docker Compose và README | Must | — | 1 |

## Phần 2 — Giao diện cấu hình

| ID | Hạng mục (proto-Unit) | MoSCoW | Phụ thuộc | Tiêu chí nghiệm thu liên quan |
|---|---|---|---|---|
| F1 | Danh sách và form dịch vụ, sao chép URL, nút xóa có hỏi xác nhận | Must | B1 | 2, 8 |
| F2 | Màn hình thử mapping | Must | B2, F1 | 2 |
| F3 | Màn hình gửi callback thử qua endpoint thật | Must | B3, F1 | 9 |

## Phần 3 — Giao diện theo dõi

| ID | Hạng mục (proto-Unit) | MoSCoW | Phụ thuộc | Tiêu chí nghiệm thu liên quan |
|---|---|---|---|---|
| M1 | Tab "Giao dịch" và chi tiết giao dịch | Must | B4 | 4, 5 |
| M2 | Tab "Tất cả callback" | Must | B4 | 6 |
| M3 | Tự cập nhật mỗi 5 giây, bật/tắt, tải lại, giữ bộ lọc, trang và chi tiết đang mở | Must | M1, M2 | 4 |

## Hạng mục xuyên suốt

| ID | Hạng mục | MoSCoW | Tiêu chí nghiệm thu liên quan |
|---|---|---|---|
| X1 | Build backend và frontend thành công; kiểm thử tích hợp cho mapping, thời gian, xác thực, lịch sử, xử lý đồng thời và API | Must | 10 |

## Assumptions & Open Questions

None.
