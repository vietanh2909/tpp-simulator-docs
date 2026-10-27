# Refined Mockups — Câu hỏi làm rõ

> Đã chốt, không hỏi lại: năm màn hình S1–S5 và luồng người dùng (`wireframes.md`, `user-flow.md`); chỉ tối ưu cho trình duyệt máy tính; thanh bên trái; chi tiết giao dịch là bảng trượt bên phải; khả năng truy cập mức cơ bản (NFR4); bố cục và phong cách theo Stitch (`docs/design/stitch/`), chức năng theo brief; status nghiệp vụ một màu trung tính; mọi story giao diện ở nhóm 2 và nhóm 3 trong `stories.md`. Brief chỉ nói "UI đơn giản, nhất quán, không xây design system riêng" chứ chưa chọn thư viện. Các câu dưới đây chỉ hỏi những điểm còn để ngỏ.

## Q1. Dựng giao diện bằng gì?

Thiết kế Stitch viết bằng Tailwind CSS, phông Inter và JetBrains Mono, bộ icon Material Symbols. Brief không cho xây design system riêng.

A. (Recommended) Tailwind CSS với màu, cỡ chữ, góc bo lấy từ `DESIGN.md` của Stitch, cộng các thành phần headless có sẵn khả năng truy cập (ví dụ Radix UI) cho hộp thoại, ngăn trượt, tab và công tắc. Tự viết phần còn lại (bảng, ô nhập, nhãn) rất mỏng
B. Thư viện thành phần dựng sẵn (ví dụ MUI) và chỉnh theme cho gần Stitch
C. CSS thuần, tự viết toàn bộ thành phần
X. Other (please specify)

[Answer]: A

## Q2. Giao diện cần chạy tốt từ độ rộng màn hình nào?

`DESIGN.md` có ba mức: màn hình rộng từ 1280px, màn hình gọn từ 1024 đến 1279px, và dưới 1024px thì xếp chồng.

A. (Recommended) Tối ưu cho từ 1280px; từ 1024 đến 1279px vẫn dùng đủ chức năng (thanh bên thu thành thanh hẹp, bảng cuộn ngang khi cần); dưới 1024px không hỗ trợ
B. Chỉ hỗ trợ từ 1280px trở lên
C. Hỗ trợ cả dưới 1024px như `DESIGN.md` (xếp chồng thành tab)
X. Other (please specify)

[Answer]:A

## Q3. Khung xem JSON (payload, response) có những tính năng nào?

`DESIGN.md` mô tả khung xem mã có thanh công cụ, số dòng, tô màu cú pháp và cả thanh truy vấn JSONPath. Phạm vi MVP chỉ cho đường dẫn dạng `$.a.b.c`, không wildcard hay filter.

A. (Recommended) Chỉ đọc: JSON định dạng đẹp hoặc nguyên văn (chuyển đổi được), tô màu cú pháp, số dòng, số byte, nút sao chép. Không có thanh truy vấn JSONPath
B. Như A và thêm thanh truy vấn JSONPath để tô sáng các nút khớp
X. Other (please specify)

[Answer]:A

## Q4. Ô nhập JSON mẫu và payload (S2, S3) là loại nào?

A. (Recommended) Ô văn bản nhiều dòng phông monospace, có nút "Định dạng JSON" và báo "JSON không hợp lệ" ngay dưới ô khi sai cú pháp
B. Trình soạn mã đầy đủ (ví dụ CodeMirror) có tô màu cú pháp ngay khi gõ
X. Other (please specify)

[Answer]:A

## Q5. Các nút mẫu ở S2 ("Mẫu hợp lệ", "Mẫu thiếu trường") và S3 ("Thành công", "Lỗi mapping", "Sai key") điền nội dung từ đâu?

Dịch vụ cấu hình bằng đường dẫn tùy ý nên không thể có sẵn payload cho mọi dịch vụ.

A. (Recommended) Giao diện tự dựng JSON từ đường dẫn mapping đang nhập của dịch vụ đó (giá trị giả như `TEST-001`); "thiếu trường" bỏ trường status; "sai key" gửi khóa sai. Dùng được cho dịch vụ mới bất kỳ
B. Chỉ có mẫu cố định lấy từ `docs/samples/` cho ba dịch vụ của brief; dịch vụ khác phải tự nhập
X. Other (please specify)

[Answer]:A

## Giả định đề xuất

Những chi tiết dưới đây chưa có trong brief hay thiết kế. Tôi đề xuất chọn như sau và sẽ ghi vào các tài liệu của bước này:

1. **Phông chữ và icon:** Inter, JetBrains Mono và bộ icon được đóng gói cùng frontend, không tải từ CDN như file Stitch, để chạy được khi máy không có Internet.
2. **Màu và tương phản:** dùng bảng màu Stitch; chữ thường đạt tỉ lệ tương phản 4.5:1, thành phần giao diện 3:1 (mức cơ bản, không cam kết WCAG). Màu nào không đạt thì chỉnh nhẹ và ghi trong `design-system-mapping.md`.
3. **Chế độ tối:** ngoài phạm vi MVP.
4. **Lỗi biểu mẫu:** hiện ngay cạnh ô sai và có dòng tóm tắt ở đầu biểu mẫu khi bấm lưu; ô sai có thuộc tính truy cập (`aria-invalid`, `aria-describedby`); tiêu điểm chuyển về ô sai đầu tiên.
5. **Thay đổi chưa lưu:** rời trang cấu hình (S2) khi có thay đổi chưa lưu thì hỏi xác nhận.
6. **Hộp thoại và ngăn trượt:** giữ tiêu điểm bên trong khi mở, Esc để đóng, đóng xong trả tiêu điểm về phần tử đã mở.
7. **Trạng thái tải:** dòng khung xám tĩnh, không hiệu ứng chuyển động; trạng thái "chưa có dữ liệu", "không khớp bộ lọc" và "lỗi tải" là ba thông báo khác nhau.
8. **Tự cập nhật và trình đọc màn hình:** chỉ dòng "Cập nhật lúc …" là vùng thông báo lịch sự (`aria-live="polite"`); không đọc lại cả bảng mỗi 5 giây.
9. **Nút "Xem trong Theo dõi" ở S3:** mở S4 đã lọc sẵn theo dịch vụ và transactionId của callback vừa gửi (nếu lấy được), nếu không thì lọc theo dịch vụ.
10. **Sao chép:** nút sao chép đổi thành dấu tích 1,5 giây và có thông báo cho trình đọc màn hình.
11. **Ngôn ngữ giao diện:** tiếng Việt; mã dịch vụ, tên header, đường dẫn JSON, mã HTTP giữ nguyên.
12. **Đặc tả thành phần:** `interaction-spec.md` dùng mẫu `component-spec-template.md` nhưng chỉ ghi các cột trạng thái, đầu vào, hành vi theo độ rộng và truy cập cho thành phần dùng lại nhiều nơi (bảng, bộ lọc, ngăn trượt, khung xem JSON, biểu mẫu cấu hình, công tắc, hộp thoại); màn hình dùng một lần mô tả trong `mockups.md`.

## Assumption Confirmation

Bạn đồng ý dùng các giả định trên chứ? Nếu muốn đổi giả định nào, chọn B và ghi số giả định.

A. Accept assumptions
B. Convert to follow-up questions
X. Other (please specify)

[Answer]:A

## Consolidated Summary Confirmation

Tóm tắt câu trả lời:

- Q1 — Tailwind CSS với màu, cỡ chữ, góc bo lấy từ `DESIGN.md` của Stitch, cộng thành phần headless có sẵn khả năng truy cập (ví dụ Radix UI) cho hộp thoại, ngăn trượt, tab, công tắc; phần còn lại tự viết mỏng.
- Q2 — Tối ưu từ 1280px; từ 1024 đến 1279px vẫn đủ chức năng (thanh bên thu hẹp, bảng cuộn ngang khi cần); dưới 1024px không hỗ trợ.
- Q3 — Khung xem JSON chỉ đọc: định dạng đẹp hoặc nguyên văn, tô màu cú pháp, số dòng, số byte, nút sao chép; không có thanh truy vấn JSONPath.
- Q4 — Ô nhập JSON là ô văn bản nhiều dòng phông monospace, có nút "Định dạng JSON" và báo "JSON không hợp lệ" ngay dưới ô.
- Q5 — Các nút mẫu tự dựng JSON từ đường dẫn mapping đang nhập của dịch vụ; "thiếu trường" bỏ trường status; "sai key" gửi khóa sai.
- Giả định — Đồng ý 12 giả định: đóng gói phông chữ và icon cùng frontend; tương phản 4.5:1 và 3:1 ở mức cơ bản; không có chế độ tối; lỗi biểu mẫu cạnh ô và tóm tắt đầu biểu mẫu; hỏi xác nhận khi rời S2 có thay đổi chưa lưu; hộp thoại giữ tiêu điểm, Esc để đóng; trạng thái tải là khung xám tĩnh và ba thông báo trống/không khớp/lỗi tách biệt; chỉ dòng "Cập nhật lúc" là vùng thông báo lịch sự; "Xem trong Theo dõi" mở S4 đã lọc; nút sao chép đổi thành dấu tích 1,5 giây; giao diện tiếng Việt; đặc tả thành phần chỉ cho thành phần dùng lại nhiều nơi.

Does this all look correct before I generate the refined mockups?

- Looks correct
- Request changes

[Answer]: Looks correct
