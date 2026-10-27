# Scope Definition — Câu hỏi làm rõ

> Phạm vi, thứ tự ba phần và tiêu chí nghiệm thu đã chốt trong `docs/brief.md` và hai stage trước, nên không hỏi lại. Chỉ còn hai điểm cần bạn xác nhận vì chúng quyết định cách xếp backlog.

## Q1. Trong MVP có chức năng nào chỉ là "nên có" (có thể cắt nếu cần) không?

Brief liệt kê 10 tiêu chí nghiệm thu và chưa phân mức ưu tiên giữa các chức năng. Câu trả lời quyết định backlog có mục Should/Could hay toàn bộ là Must.

A. (Recommended) Không: mọi chức năng trong brief, cộng chức năng xóa mềm dịch vụ đã chốt ở Intent Capture, đều là Must-have; MVP chỉ xong khi đạt đủ 10 tiêu chí nghiệm thu
B. Có: một số chức năng có thể cắt nếu cần (ghi rõ chức năng nào, ví dụ tự cập nhật mỗi 5 giây hoặc gửi callback thử trên giao diện)
X. Other (please specify)

[Answer]: A

## Q2. Chức năng xóa dịch vụ (mới thêm, chưa có trong ba phần của brief mục 9) được làm ở phần nào?

A. (Recommended) Chia theo ba phần sẵn có: phần 1 (backend) làm xóa mềm và trả 404 cho dịch vụ đã xóa; phần 2 (giao diện cấu hình dịch vụ) thêm nút xóa có hỏi xác nhận
B. Làm riêng thành một phần thứ tư, sau khi xong ba phần của brief
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

Tóm tắt câu trả lời:

- Q1 — Mọi chức năng trong brief và chức năng xóa mềm dịch vụ đều là Must-have; MVP chỉ xong khi đạt đủ 10 tiêu chí nghiệm thu.
- Q2 — Xóa dịch vụ chia vào ba phần sẵn có: phần 1 (backend) làm xóa mềm và trả 404; phần 2 (giao diện cấu hình) thêm nút xóa có hỏi xác nhận.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
