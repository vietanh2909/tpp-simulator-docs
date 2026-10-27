# Intent Capture & Framing — Câu hỏi làm rõ

> Các phương án (Recommended) được soạn sát nội dung đã chốt trong `docs/brief.md`. Bạn chỉ cần xác nhận hoặc chỉnh lại.

## Sources

- [desc] Initial description: "Xây dựng dự án mới TPP Callback Simulator (MVP). Toàn bộ yêu cầu đã chốt nằm trong docs/brief.md, đó là nguồn yêu cầu chính."
- [scope] Workflow-selected scope: `mvp`.

## Q1. Vấn đề nghiệp vụ cần giải quyết là gì?

Câu này xác định "vì sao" của dự án, làm nền cho mọi stage sau.

A. (Recommended) Trong môi trường dev/UAT, ngân hàng chủ động gọi HTTP API của đối tác (TPP) để báo kết quả nghiệp vụ (thu hộ, chi hộ, biến động số dư), nhưng người kiểm thử không có công cụ để biết callback có đến hay không, ngân hàng gửi trạng thái gì, payload ra sao và lịch sử các lần nhận; mỗi dịch vụ mới lại phải sửa code giả lập
B. Chỉ cần một endpoint nhận và ghi log callback, không cần giao diện tra cứu
C. Chưa xác định
X. Other (please specify)

[Answer]: A

## Q2. Ai là người dùng/khách hàng của ứng dụng và họ đang gặp khó khăn gì?

A. (Recommended) Người kiểm thử và lập trình viên nội bộ làm việc trên môi trường dev/UAT của ngân hàng; họ dùng chung dữ liệu, không cần đăng nhập; khó khăn là phải tự dựng giả lập TPP và không quan sát được callback
B. Đối tác TPP bên ngoài ngân hàng
C. Cả người kiểm thử nội bộ và đối tác bên ngoài
D. Chưa xác định
X. Other (please specify)

[Answer]:A

## Q3. Thành công được đo bằng gì?

Câu trả lời sẽ thành chỉ số thành công trong intent statement.

A. (Recommended) Đạt đủ 10 tiêu chí nghiệm thu trong `docs/brief.md` mục 8 (khởi động theo README, thử mapping không tạo giao dịch, callback bằng cURL nhận đúng response, xem giao dịch/payload trên UI, giữ đủ lịch sử và tổng hợp theo lần nhận gần nhất, lưu callback lỗi mapping, xử lý API key đúng/sai, thêm dịch vụ JSON khác không sửa code, self-test đi qua endpoint thật, build thành công kèm kiểm thử tích hợp)
B. 10 tiêu chí nghiệm thu ở trên, cộng thêm chỉ số định lượng (ví dụ thời gian cấu hình một dịch vụ mới)
C. Chưa xác định
X. Other (please specify)

[Answer]: A

## Q4. Điều gì thúc đẩy dự án này vào lúc này?

Tài liệu brief chưa nêu lý do "tại sao bây giờ".

A. Cần tăng tốc kiểm thử tích hợp callback giữa ngân hàng và đối tác trên dev/UAT
B. Dự án cá nhân/thử nghiệm để làm quen quy trình AI-DLC với một bài toán thực tế
C. Cả A và B
D. Chưa xác định
X. Other (please specify)

[Answer]: C

## Q5. Các bên liên quan chính là ai và mỗi bên quan tâm điều gì?

A. (Recommended) Người kiểm thử/lập trình viên dev/UAT (quan tâm: quan sát callback, cấu hình dịch vụ nhanh, không sửa code) và bạn — chủ dự án, người viết brief (quan tâm: đúng phạm vi MVP, chạy được theo README)
B. Như A, cộng thêm đội tích hợp phía ngân hàng (người cấu hình URL callback trên hệ thống ngân hàng)
C. Chưa xác định
X. Other (please specify)

[Answer]: A

## Q6. Ai quyết định phạm vi và thứ tự ưu tiên, ai chỉ góp ý?

A. (Recommended) Bạn là người quyết định duy nhất về phạm vi và ưu tiên; chưa có bên góp ý nào khác
B. Bạn quyết định; người kiểm thử dev/UAT góp ý
C. Chưa xác định
X. Other (please specify)

[Answer]: A

## Q7. Có yêu cầu về liên lạc hoặc báo cáo định kỳ không?

A. (Recommended) Không có báo cáo định kỳ; tiến độ và quyết định được ghi trong hồ sơ workflow AI-DLC, bạn duyệt tại các điểm dừng
B. Có báo cáo định kỳ (ghi rõ tần suất và người nhận)
C. Không có
X. Other (please specify)

[Answer]: A

## Q8. Phiên bản đầu tiên này KHÔNG làm những gì?

Phạm vi workflow `mvp` đã được chọn; câu này chỉ hỏi ranh giới sản phẩm.

A. Đúng danh sách loại trừ trong `docs/brief.md` mục 7 (không gọi API nghiệp vụ sang ngân hàng; không quản lý giao dịch dự kiến hay phát hiện callback chưa đến; không Kafka, NoSQL hay đồng bộ dữ liệu; không đăng nhập/phân quyền; không response động; không giả lập timeout, độ trễ, lỗi N lần hay phản hồi theo điều kiện; không triển khai production)
B. (Recommended) Danh sách ở A, cộng thêm các mục brief ghi "chưa cần": xóa dịch vụ, JSON path dạng wildcard/filter/mảng, WebSocket
C. Không loại trừ gì
X. Other (please specify)

[Answer]: X, tôi chọn phương án B nhưng xóa dịch vụ thì cần, khi thêm mới dịch vụ thì phải xóa và sửa được. Còn đồng ý chưa cần JSON path dạng wildcard/filter/mảng, WebSocket

## Q9. Khi xóa một dịch vụ đã từng nhận callback, dữ liệu lịch sử xử lý thế nào?

Câu trả lời Q8 bổ sung chức năng xóa dịch vụ (brief mục 3 ghi "Chưa cần xóa dịch vụ"). Cách xóa ảnh hưởng tới lịch sử callback, giao dịch và khả năng dùng lại `serviceCode`, và xóa hẳn dữ liệu thì không đảo ngược được.

A. (Recommended) Xóa mềm: dịch vụ biến khỏi danh sách cấu hình, URL callback trả 404 như dịch vụ không tồn tại; lịch sử callback và giao dịch vẫn giữ và tra cứu được; `serviceCode` đã xóa không được dùng lại
B. Xóa mềm như A, nhưng cho phép tạo lại dịch vụ mới với cùng `serviceCode`
C. Xóa hẳn dịch vụ cùng toàn bộ lịch sử callback và giao dịch của nó
D. Chỉ cho xóa dịch vụ chưa nhận callback nào; dịch vụ đã có dữ liệu thì chỉ tắt được
X. Other (please specify)

[Answer]: A. Làm rõ là chỉ đổi trạng thái, thông tin khác giữ nguyên 

## Q10. Có cập nhật `docs/brief.md` cho khớp quyết định xóa dịch vụ không?

Brief là nguồn yêu cầu chính và đang ghi "Tạo mới, sửa cấu hình. Chưa cần xóa dịch vụ." ở mục 3; câu trả lời Q8 thay đổi điểm này.

A. (Recommended) Có: chỉ sửa dòng đó ở mục 3 thành "Tạo mới, sửa và xóa dịch vụ", để brief vẫn là nguồn yêu cầu duy nhất
B. Không: giữ nguyên brief, quyết định chỉ ghi trong file câu hỏi này
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

Tóm tắt câu trả lời:

- Q1 — Vấn đề: trên dev/UAT, ngân hàng gọi HTTP API của TPP để báo kết quả nghiệp vụ, nhưng người kiểm thử không biết callback có đến hay không, trạng thái, payload và lịch sử; mỗi dịch vụ mới phải sửa code giả lập.
- Q2 — Người dùng: người kiểm thử và lập trình viên nội bộ trên dev/UAT, dùng chung dữ liệu, không đăng nhập.
- Q3 — Thành công: đạt đủ 10 tiêu chí nghiệm thu trong `docs/brief.md` mục 8.
- Q4 — Động lực: vừa cần tăng tốc kiểm thử tích hợp callback trên dev/UAT, vừa là dự án cá nhân/thử nghiệm để làm quen AI-DLC.
- Q5 — Bên liên quan: người kiểm thử/lập trình viên dev/UAT và chủ dự án (người viết brief).
- Q6 — Quyết định: chủ dự án là người quyết định duy nhất về phạm vi và ưu tiên.
- Q7 — Liên lạc: không có báo cáo định kỳ; tiến độ và quyết định ghi trong hồ sơ workflow AI-DLC, duyệt tại các điểm dừng.
- Q8 — Ngoài phạm vi bản đầu: toàn bộ loại trừ ở brief mục 7, cộng JSON path wildcard/filter/mảng và WebSocket. Xóa dịch vụ NẰM TRONG phạm vi (tạo, sửa, xóa).
- Q9 — Xóa dịch vụ là xóa mềm: chỉ đổi trạng thái, mọi thông tin khác giữ nguyên; dịch vụ biến khỏi danh sách cấu hình, URL callback trả 404; lịch sử callback và giao dịch vẫn tra cứu được; `serviceCode` đã xóa không dùng lại.
- Q10 — Đã sửa `docs/brief.md` mục 3 thành "Tạo mới, sửa và xóa dịch vụ."

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
