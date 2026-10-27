# User Stories — Kế hoạch và câu hỏi

> Mọi nội dung đã chốt trong `docs/brief.md`, Ideation và `requirements.md` (FR1–FR12, NFR1–NFR7) không hỏi lại. Các câu dưới đây chỉ quyết định cách viết story: persona, cách chia và độ chi tiết.

## Kế hoạch đề xuất

- **Persona:** người kiểm thử và lập trình viên trên môi trường dev/UAT (xem Q1).
- **Định dạng story:** "Là [persona], tôi muốn [mục tiêu], để [lợi ích]"; mã `US{nhóm}.{số}`; tiêu chí chấp nhận Given/When/Then mã `AC{nhóm}.{số}.{số}`, 3–6 tiêu chí mỗi story, có cả trường hợp lỗi; kiểm tra theo INVEST.
- **Ưu tiên MoSCoW:** mọi chức năng trong phạm vi là Must Have (đã chốt ở Scope Definition). Ranh giới MVP chính thức chốt ở Delivery Planning.
- **Truy vết:** mỗi FR và NFR trong `requirements.md` được ánh xạ tới story trong `traceability.json`.

## Q1. Dùng mấy persona?

A. (Recommended) Hai persona: **Người kiểm thử** (gửi callback, xem trạng thái và lịch sử để xác nhận kết quả) và **Lập trình viên** (cấu hình dịch vụ, mapping, tìm lỗi tích hợp). Story nào cả hai cùng dùng thì ghi persona chính
B. Một persona chung "Người dùng nội bộ" cho mọi story
X. Other (please specify)

[Answer]:A

## Q2. Chia story theo cách nào?

A. (Recommended) Theo nhóm chức năng, sắp theo thứ tự giao hàng ở brief mục 9: (1) nhận và xử lý callback, tra cứu qua API; (2) cấu hình dịch vụ, thử mapping, gửi thử; (3) theo dõi giao dịch và callback
B. Theo hành trình người dùng (tạo dịch vụ → gửi callback → theo dõi → sửa cấu hình), không bám theo ba phần giao hàng
X. Other (please specify)

[Answer]:A

## Q3. Story chi tiết đến mức nào?

A. (Recommended) Mỗi story là một khả năng người dùng thấy được và làm xong trong 1–3 ngày, khoảng 25–35 story
B. Gộp lớn hơn, khoảng một story cho mỗi nhóm FR (khoảng 12 story), nhiều tiêu chí chấp nhận hơn mỗi story
X. Other (please specify)

[Answer]:A

## Q4. Có ghi các mục ngoài phạm vi thành story "Won't Have" không?

A. (Recommended) Có: liệt kê ngắn các mục ngoài phạm vi (brief mục 7 và các phần Stitch bị bỏ) thành story Won't Have, không có tiêu chí chấp nhận, để ranh giới rõ ràng khi lập kế hoạch
B. Không: chỉ giữ ở mục Out of scope của `requirements.md`
X. Other (please specify)

[Answer]:A

## Giả định đề xuất

1. **Tiêu chí chấp nhận:** dùng lại tiêu chí trong `requirements.md` làm gốc, tách thành từng story và bổ sung trường hợp lỗi còn thiếu; không thêm hành vi mới ngoài requirements.
2. **Story phía API:** hành vi nhận callback được viết theo góc nhìn người kiểm thử gọi endpoint (bằng cURL hoặc hệ thống ngân hàng ở dev/UAT), không viết story cho "hệ thống ngân hàng" như một persona.
3. **NFR xuyên suốt:** NFR1 (hiệu năng), NFR2 (đồng thời), NFR3 (bảo mật) thành tiêu chí chấp nhận của story liên quan; NFR4 (khả năng truy cập) thành tiêu chí chung áp dụng cho mọi story giao diện; NFR5, NFR6 (chạy theo README, chất lượng, CI) và NFR7 (mở rộng bằng cấu hình) ghi Deferred hoặc ánh xạ sang story phù hợp trong `traceability.json`, kèm stage xử lý.
4. **Phụ thuộc:** ghi phụ thuộc giữa các story khi có (ví dụ gửi thử cần dịch vụ đã tạo), nhưng mỗi story vẫn kiểm thử độc lập được bằng dữ liệu chuẩn bị sẵn.
5. **Ngôn ngữ:** story viết bằng tiếng Việt; mã story, mã tiêu chí, tên trường và đường dẫn giữ nguyên.

## Assumption Confirmation

Bạn đồng ý dùng các giả định trên chứ? Nếu muốn đổi giả định nào, chọn B và ghi số giả định.

A. Accept assumptions
B. Convert to follow-up questions
X. Other (please specify)

[Answer]:A

## Consolidated Summary Confirmation

Tóm tắt câu trả lời:

- Q1 — Hai persona: Người kiểm thử và Lập trình viên; story dùng chung ghi persona chính.
- Q2 — Chia theo nhóm chức năng, sắp theo ba phần giao hàng của brief mục 9: (1) nhận, xử lý callback và tra cứu qua API; (2) cấu hình dịch vụ, thử mapping, gửi thử; (3) theo dõi giao dịch và callback.
- Q3 — Mỗi story là một khả năng người dùng thấy được, làm xong trong 1–3 ngày, khoảng 25–35 story.
- Q4 — Ghi các mục ngoài phạm vi thành story Won't Have, không có tiêu chí chấp nhận.
- Giả định — Đồng ý 5 giả định: dùng tiêu chí trong requirements làm gốc; story API theo góc nhìn người kiểm thử; NFR thành tiêu chí của story liên quan hoặc Deferred kèm stage; ghi phụ thuộc nhưng story vẫn kiểm thử độc lập; viết tiếng Việt, giữ nguyên mã và tên trường.

Does this all look correct before I generate the user stories?

- Looks correct
- Request changes

[Answer]: Looks correct
