# Personas — TPP Callback Simulator (MVP)

> Nguồn: `requirements.md` §1 (người dùng là người kiểm thử và lập trình viên nội bộ, dùng chung dữ liệu, không đăng nhập; dùng trình duyệt trên máy tính) và câu trả lời Q1 trong `user-stories-questions.md`.

## P1 — Người kiểm thử (Tester)

- **Vai trò:** kiểm thử viên trên môi trường dev/UAT của ngân hàng, kiểm tra các luồng có callback gửi sang TPP (thu hộ, chi hộ, biến động số dư).
- **Mục tiêu:**
  - Biết ngay callback của một giao dịch đã đến TPP chưa, đến mấy lần, lần cuối mang trạng thái gì.
  - Xem payload gốc và response TPP đã trả để đối chiếu với kết quả mong đợi của ca kiểm thử.
  - Tự gửi callback thử (đúng, sai khóa, sai JSON) để tái hiện tình huống mà không cần nhờ lập trình viên.
- **Khó khăn hiện tại:** khi "callback không đến" thì không biết lỗi nằm ở phía ngân hàng gửi hay phía TPP từ chối; phải hỏi người khác xem log server.
- **Bối cảnh:** dùng màn hình theo dõi nhiều nhất, thường để mở và chờ dữ liệu tự cập nhật; lọc theo mã giao dịch vừa thực hiện.

## P2 — Lập trình viên (Developer)

- **Vai trò:** lập trình viên tích hợp phía ngân hàng hoặc phía TPP trên dev/UAT.
- **Mục tiêu:**
  - Thêm dịch vụ mới có cấu trúc JSON khác chỉ bằng cấu hình, không sửa code.
  - Thử mapping với JSON mẫu trước khi để hệ thống thật gửi tới.
  - Chẩn đoán lỗi tích hợp: sai API key, sai Content-Type, sai đường dẫn mapping, sai định dạng thời gian.
- **Khó khăn hiện tại:** mỗi dịch vụ mới cần một TPP giả lập riêng hoặc sửa code; lỗi mapping chỉ thấy được trong log.
- **Bối cảnh:** dùng màn hình cấu hình dịch vụ, thử mapping và gửi thử; gọi endpoint bằng cURL khi kiểm tra backend.

## Quan hệ và thứ tự ưu tiên

| Ưu tiên | Persona | Màn hình chính |
|---|---|---|
| 1 | P1 — Người kiểm thử | Theo dõi giao dịch, tất cả callback, gửi thử |
| 2 | P2 — Lập trình viên | Danh sách và cấu hình dịch vụ, thử mapping, gửi thử, endpoint callback |

- Hai persona dùng chung một bộ dữ liệu, không có phân quyền: dịch vụ do P2 cấu hình được P1 dùng ngay.
- Story mà cả hai cùng dùng ghi persona chính trước (Q1).
- Hệ thống ngân hàng gửi callback không phải persona: hành vi của endpoint được viết theo góc nhìn người gọi endpoint (giả định 2).
