# Rough Mockups — Câu hỏi làm rõ

> Các màn hình, trường dữ liệu, bộ lọc và hành vi tự cập nhật đã chốt trong `docs/brief.md` mục 3 và 5, nên không hỏi lại. Các câu dưới đây chỉ hỏi cách bố trí mà brief chưa nói tới.
>
> **Mode:** chat. Người dùng cung cấp thiết kế Google Stitch tại `docs/design/stitch/stitch_tpp_callback_simulator_ui/` (5 màn hình và `DESIGN.md`). Câu trả lời Q1–Q5 được đối chiếu từ thiết kế và người dùng đã xác nhận trong chat.

## Q1. Ứng dụng cần dùng tốt trên thiết bị nào?

A. (Recommended) Chỉ trình duyệt trên máy tính (desktop/laptop); không cần tối ưu cho điện thoại
B. Cả máy tính và điện thoại
X. Other (please specify)

[Answer]: A

## Q2. Điều hướng chính giữa các khu vực đặt ở đâu?

Ứng dụng có hai khu vực: cấu hình dịch vụ và theo dõi (tab "Giao dịch", tab "Tất cả callback").

A. (Recommended) Thanh trên cùng với hai mục "Dịch vụ" và "Theo dõi"; trong "Theo dõi" có hai tab "Giao dịch" và "Tất cả callback"
B. Thanh bên trái (sidebar) liệt kê "Dịch vụ", "Giao dịch", "Tất cả callback"
X. Other (please specify)

[Answer]: B, theo thiết kế Stitch: thanh bên trái có hai mục "Dịch vụ" và "Theo dõi giao dịch"; trong "Theo dõi giao dịch" có hai tab "Giao dịch" và "Tất cả callback"

## Q3. Thử mapping và gửi callback thử đặt ở đâu?

A. (Recommended) Trong trang chi tiết của từng dịch vụ, thành ba tab: "Cấu hình", "Thử mapping", "Gửi callback thử"; người dùng không phải chọn lại dịch vụ
B. Hai màn hình riêng, mỗi màn hình có ô chọn dịch vụ
X. Other (please specify)

[Answer]: X. Other (please specify): theo thiết kế Stitch, thử mapping là một mục ngay trong trang cấu hình dịch vụ; gửi callback thử là trang riêng của từng dịch vụ, mở bằng nút "Gửi thử" ở danh sách hoặc ở trang cấu hình

## Q4. Chi tiết giao dịch (lịch sử callback, payload, kết quả mapping) mở ra dưới dạng nào?

Brief yêu cầu tự cập nhật không được đóng nội dung chi tiết đang đọc, cũng không làm mất bộ lọc và trang hiện tại.

A. (Recommended) Bảng trượt bên phải (drawer); danh sách vẫn ở phía sau, giữ nguyên bộ lọc và trang
B. Trang riêng; khi quay lại danh sách thì khôi phục bộ lọc và trang
C. Hộp thoại (modal) giữa màn hình
X. Other (please specify)

[Answer]: A

## Q5. Yêu cầu về khả năng truy cập (accessibility) ở mức nào?

A. (Recommended) Mức cơ bản: dùng được hoàn toàn bằng bàn phím, mọi ô nhập có nhãn, trạng thái lỗi không chỉ thể hiện bằng màu; không đặt mục tiêu WCAG chính thức
B. Đạt WCAG 2.1 mức AA
X. Other (please specify)

[Answer]: A

## Q6. Xử lý chỗ thiết kế Stitch khác brief như thế nào?

Brief là nguồn yêu cầu chính; thiết kế Stitch có thêm một số phần ngoài phạm vi và thiếu một số phần brief yêu cầu.

A. (Recommended) Giữ brief, dùng Stitch cho bố cục và phong cách: (1) bỏ retry policy, IP whitelist/firewall, mTLS, chứng chỉ SSL, nút Replay, mục "Nhật ký nhận" và các số liệu thống kê giả (p95, callback 24h, tỉ lệ thành công, số retry); (2) bổ sung nút xóa dịch vụ có hỏi xác nhận, ô lọc status dạng nhập chữ, tab "Tất cả callback" có bộ lọc kết quả mapping; (3) mọi status nghiệp vụ dùng một màu trung tính, chỉ mã HTTP và lỗi mapping có màu; (4) timestamp là trường tùy chọn: thiếu thì chỉ cảnh báo, còn thiếu transactionId hoặc status là lỗi mapping
B. Làm đúng nguyên thiết kế Stitch, kể cả phần ngoài phạm vi brief
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

Tóm tắt câu trả lời:

- Q1 — Chỉ tối ưu cho trình duyệt trên máy tính.
- Q2 — Thanh bên trái với "Dịch vụ" và "Theo dõi giao dịch"; trong theo dõi có hai tab "Giao dịch" và "Tất cả callback".
- Q3 — Thử mapping nằm trong trang cấu hình dịch vụ; gửi callback thử là trang riêng của từng dịch vụ.
- Q4 — Chi tiết giao dịch mở trong bảng trượt bên phải, giữ nguyên danh sách, bộ lọc và trang.
- Q5 — Khả năng truy cập mức cơ bản: dùng được bằng bàn phím, ô nhập có nhãn, lỗi không chỉ thể hiện bằng màu.
- Q6 — Giữ brief, dùng Stitch cho bố cục và phong cách; bỏ phần ngoài phạm vi, bổ sung xóa dịch vụ, lọc status, tab "Tất cả callback"; status nghiệp vụ màu trung tính; timestamp tùy chọn.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
