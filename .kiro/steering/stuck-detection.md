---
inclusion: always
---

# Quy tắc phát hiện bị kẹt

Nếu cùng một việc (cùng một lệnh, cùng một thao tác đọc/ghi, hoặc cùng một bước chờ) được làm đi làm lại trong khoảng 3 phút mà vẫn chưa ra kết quả, coi như đang bị kẹt.

Khi đó:

1. Dừng lặp ngay. Không thử thêm biến thể của cùng một cách.
2. Báo cho người dùng bằng tiếng Việt, ngắn gọn: việc đang làm là gì, đã thử mấy lần, lỗi hoặc dấu hiệu quan sát được, và nghi ngờ nguyên nhân là gì (nêu rõ điều nào đã kiểm chứng, điều nào chưa).
3. Đề xuất 1 đến 2 hướng xử lý và hỏi người dùng chọn hướng nào, hoặc nhờ họ hỗ trợ thao tác tay (ví dụ đóng tiến trình đang khóa tệp, mở lại terminal).
4. Chỉ tiếp tục sau khi người dùng trả lời. Không tự tắt tiến trình, xóa tệp hay đổi cách làm có rủi ro khi chưa được đồng ý.

Áp dụng cho cả agent điều phối lẫn các agent con do nó giao việc: khi giao việc cho workflow, nhắc agent con về quy tắc này và yêu cầu chúng gửi cảnh báo (`send_message` mức warning) thay vì tự lặp.
