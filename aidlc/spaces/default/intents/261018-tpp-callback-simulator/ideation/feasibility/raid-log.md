# RAID Log — TPP Callback Simulator

## Risks

| ID | Rủi ro | Khả năng | Ảnh hưởng | Biện pháp | Căn cứ |
|---|---|---|---|---|---|
| R1 | MVP chỉ kiểm chứng bằng callback giả lập (cURL, gửi callback thử trên giao diện); khi đưa TPP tới chỗ hệ thống ngân hàng thật gọi được, có thể phát sinh vấn đề mạng, định dạng hoặc header chưa lường trước | Trung bình | Trung bình | Ghi rõ trong README là chưa kiểm chứng với ngân hàng thật; xem đây là việc sau MVP | [Q1] |
| R2 | Dữ liệu callback tăng dần vì giữ vô thời hạn, làm tra cứu chậm dần khi dùng lâu | Thấp | Thấp | README hướng dẫn cách làm sạch database | [Q3] |
| R3 | Không có đăng nhập; ai truy cập được ứng dụng đều xem và sửa được cấu hình | Thấp | Thấp | Chấp nhận được vì chỉ có dữ liệu kiểm thử và chạy local | [Q2] [Q1] |

## Assumptions

| ID | Giả định | Căn cứ |
|---|---|---|
| A1 | Payload callback trên dev/UAT không chứa dữ liệu khách hàng thật | [Q2] |
| A2 | Máy phát triển có hoặc cài được JDK 21, Maven, Node.js, Docker | [Q6] |

## Issues

| ID | Vấn đề | Căn cứ |
|---|---|---|
| — | Không có vấn đề nào đang mở | [Q8] |

## Dependencies

| ID | Phụ thuộc | Căn cứ |
|---|---|---|
| D1 | Docker chạy được trên máy phát triển để khởi động database | [Q6] [Q7] |
| D2 | Truy cập được Maven Central và npm để tải thư viện | [Q6] |

## Assumptions & Open Questions

None.
