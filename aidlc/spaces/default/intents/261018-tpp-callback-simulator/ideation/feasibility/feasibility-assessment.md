# Feasibility Assessment — TPP Callback Simulator

## Kết luận

**Khả thi, rủi ro thấp.** Có thể làm MVP như mô tả trong intent statement (`ideation/intent-capture/intent-statement.md`) với nguồn lực và môi trường hiện có. Không có ràng buộc pháp lý, hạ tầng hay tổ chức nào chặn việc triển khai. [Q2] [Q6] [Q7] [Q8]

## Tính khả thi kỹ thuật

| Khía cạnh | Đánh giá | Căn cứ |
|---|---|---|
| Môi trường chạy | Khả thi. Toàn bộ ứng dụng chạy trên máy phát triển, database chạy bằng Docker Compose | [Q1] [Q6] [Q7] |
| Công cụ và thư viện | Khả thi. Máy có hoặc cài được JDK 21, Maven, Node.js, Docker, và tải được thư viện từ Maven Central và npm | [Q6] |
| Kỹ năng | Khả thi. Chủ dự án đã quen cả hai mảng backend và frontend đã chốt | [Q5] |
| Công nghệ | Đã chốt trong `docs/brief.md` mục 2, không cần đánh giá lựa chọn khác | [desc] |
| Kiểm chứng nhận callback | Khả thi ở mức local: dùng cURL và chức năng gửi callback thử trên giao diện. Chưa kiểm chứng việc hệ thống ngân hàng thật gọi tới | [Q1] |

## Liên hệ với tiêu chí thành công của intent

- 10 tiêu chí nghiệm thu trong intent statement đều kiểm chứng được trên môi trường local: tiêu chí 3 dùng cURL, tiêu chí 9 dùng gửi callback thử trên giao diện. Không tiêu chí nào cần hệ thống ngân hàng thật. [Q1]
- Mục tiêu "kiểm tra callback có đến TPP hay không" của intent chỉ được chứng minh bằng callback giả lập trong MVP. Để ngân hàng thật gọi tới được là việc sau MVP (xem rủi ro R1 trong `raid-log.md`). [Q1]

## Phân tích rủi ro (tóm tắt)

| Mức | Rủi ro | Căn cứ |
|---|---|---|
| Trung bình | Cách đưa TPP tới chỗ hệ thống ngân hàng gọi được chưa được kiểm chứng trong MVP | [Q1] |
| Thấp | Dữ liệu callback tăng dần do giữ vô thời hạn; cần tự làm sạch database khi cần | [Q3] |
| Thấp | Không có đăng nhập, nhưng chấp nhận được vì chỉ có dữ liệu kiểm thử | [Q2] |

Chi tiết nằm trong `raid-log.md`.

## Đánh giá đám mây và tuân thủ

- Đám mây: không áp dụng. MVP không dùng dịch vụ đám mây và không triển khai production. [Q7]
- Tuân thủ: không có yêu cầu tuân thủ riêng (như PCI DSS hay quy định về dữ liệu cá nhân), vì payload chỉ chứa dữ liệu kiểm thử hoặc giả lập. [Q2]

## Assumptions & Open Questions

None.
