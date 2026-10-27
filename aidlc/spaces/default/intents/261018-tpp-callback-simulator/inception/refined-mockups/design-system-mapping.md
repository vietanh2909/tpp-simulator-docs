# Ánh xạ hệ thống thiết kế — TPP Callback Simulator (MVP)

> Brief: "chọn giải pháp UI đơn giản, nhất quán; không xây design system riêng". Vì vậy không có thư viện thành phần riêng: dùng Tailwind CSS với bảng màu lấy từ Stitch, cộng một số thành phần headless có sẵn khả năng truy cập [Q1]. Mọi số tương phản dưới đây đã tính bằng công thức WCAG (độ chói tương đối) trên giá trị màu thật, không ước lượng.

## 1. Nguồn token và hai bộ giá trị trong DESIGN.md

`docs/design/stitch/stitch_tpp_callback_simulator_ui/tpp_callback_simulator/DESIGN.md` có hai bộ giá trị:

- Phần frontmatter dùng bảng màu theo vai trò (`surface #f8f9ff`, `on-surface #0b1c30`, `primary-container #4f46e5`, `outline #777587`…). File `code.html` của Stitch cấu hình Tailwind bằng bảng này.
- Phần mô tả dùng màu slate/indigo/emerald/rose/amber của Tailwind (`#f8fafc`, `#e2e8f0`, `#4f46e5`, `#059669`…) cho chip trạng thái và khung mã.

Quyết định: màu nền, chữ và nút theo bảng frontmatter; chip trạng thái, khung mã và biên của khung theo bảng màu Tailwind trong phần mô tả. Hai bộ này gần nhau về sắc độ nên không lệch trong cùng màn hình.

## 2. Token ngữ nghĩa

Tên trong cột "Token" là tên đề xuất trong cấu hình Tailwind (`theme.extend.colors`); Code Generation có thể đổi tên miễn giữ giá trị.

### Màu và tương phản (đã tính)

| Token | Giá trị | Dùng cho | Đối chiếu | Tỉ lệ | Đạt |
|---|---|---|---|---|---|
| `canvas` | `#f8f9ff` | Nền trang | — | — | — |
| `card` | `#ffffff` | Nền thẻ, bảng, ô nhập | — | — | — |
| `ink` | `#0b1c30` | Chữ chính | trên `#f8f9ff` | 16,34 | Có |
| `ink-soft` | `#464555` | Chữ phụ, nhãn | trên `#f8f9ff` | 8,91 | Có |
| `muted` | `#64748b` | Placeholder, chú thích, "(GMT+7)", số dòng | trên `#ffffff` / trên `#f8fafc` | 4,76 / 4,55 | Có |
| `primary` | `#4f46e5` | Nút chính, viền tiêu điểm, liên kết | chữ trắng trên nền này | 6,29 | Có |
| `primary-hover` | `#4338ca` | Nút chính khi rê chuột | chữ trắng | 7,90 | Có |
| `primary-tint` | `#eef2ff` | Dòng đang chọn, tab đang mở | chữ `primary` trên nền này | 5,62 | Có |
| `control-border` | `#777587` | Viền ô nhập, ô chọn, ô tích, công tắc | trên `#ffffff` | 4,49 | Có (cần 3) |
| `divider` | `#e2e8f0` | Đường kẻ bảng, viền thẻ | trên `#f8fafc` | 1,18 | Chỉ trang trí, không dùng để nhận diện điều khiển |
| `well-border` | `#cbd5e1` | Viền khung mã | trên `#ffffff` | 1,48 | Chỉ trang trí (khung mã có tiêu đề và vùng riêng) |
| `ok-text` / `ok-bg` / `ok-border` | `#047857` / `#ecfdf5` / `#a7f3d0` | Chip HTTP 2xx, "Hợp lệ" | chữ trên nền | 5,21 | Có |
| `err-text` / `err-bg` / `err-border` | `#be123c` / `#fff1f2` / `#fecdd3` | Chip HTTP 4xx/5xx, lỗi, "Lỗi" | chữ trên nền trắng | 6,29 | Có (trên `#fff1f2` hơi thấp hơn nền trắng, cần xác nhận khi dựng) |
| `warn-text` / `warn-bg` / `warn-border` | `#b45309` / `#fffbeb` / `#fde68a` | Cảnh báo, "Kết quả đã cũ" | chữ trên nền | 4,84 | Có |
| `neutral-text` / `neutral-bg` / `neutral-border` | `#475569` / `#f8fafc` / `#cbd5e1` | Chip status nghiệp vụ, môi trường "UAT" | chữ trên nền | 7,24 | Có |
| `icon` | `#64748b` | Biểu tượng điều khiển | trên `#f1f5f9` | 4,34 | Có (cần 3) |
| `focus-ring` | `#4f46e5` | Vòng tiêu điểm 2px, cách 2px | trên `#ffffff` | 6,29 | Có (cần 3) |

### Màu tô cú pháp JSON

| Thành phần | Màu | Tỉ lệ trên `#ffffff` | Đạt |
|---|---|---|---|
| Khóa | `#4338ca` | 7,90 | Có |
| Chuỗi | `#047857` | 5,48 | Có |
| Số, boolean | `#b45309` | 5,02 | Có |
| `null` | `#e11d48` | 4,70 | Có |
| Số dòng | `#64748b` | 4,76 | Có |

### Chữ

| Token | Phông | Cỡ / dòng / đậm | Dùng cho |
|---|---|---|---|
| `headline-lg` | Inter | 24 / 32 / 600, giãn chữ −0,02em | h1 mỗi màn hình |
| `headline-md` | Inter | 18 / 24 / 600 | h2 mỗi khối (A–E của S2, mục trong ngăn S5) |
| `headline-sm` | Inter | 15 / 20 / 600 | Tiêu đề ngăn, hộp thoại |
| `body-lg` | Inter | 14 / 20 / 400 | Chữ chính trong biểu mẫu |
| `body-md` | Inter | 13 / 18 / 400 | Chữ trong bảng |
| `body-sm` | Inter | 12 / 16 / 400 | Chú thích, thông báo trợ giúp |
| `label-lg` / `label-md` | JetBrains Mono | 13 / 18 / 500 và 12 / 16 / 500 | Mã dịch vụ, transactionId, URL, đường dẫn JSON, chip |
| `code-body` | JetBrains Mono | 12 / 18 / 400 | Khung JSON, ô nhập JSON |

- Cỡ nhỏ nhất là 12px: `label-sm` (11px) của Stitch **không dùng**, thay bằng `label-md` 12px cho chip HTTP và nhãn nhỏ.
- Số dùng `font-variant-numeric: tabular-nums` cho cột số, thời gian, mã HTTP.
- Chuỗi dự phòng của phông mono: `ui-monospace, Consolas, "Courier New", monospace`. Văn bản tiếng Việt xuất hiện trong payload vẫn hiển thị đúng nhờ chuỗi dự phòng.

### Hình khối, khoảng cách, độ cao

| Mục | Giá trị |
|---|---|
| Góc bo | 4px cho nút, ô nhập, chip, khung; không dùng hình viên thuốc (pill). Núm công tắc là hình chữ nhật bo 4px. |
| Cơ sở khoảng cách | 4px. Khoảng cách trong khối 8–16px, lề nội dung 24px (≥1280px) và 16px (1024–1279px). |
| Chiều cao | Nút và ô nhập 32px; hàng bảng 36px; header 48px. |
| Vùng chạm | Nút biểu tượng 28×28px, cách nhau ít nhất 4px. |
| Bố cục | Thanh bên 240px (thanh hẹp 48px ở 1024–1279px); ngăn chi tiết 560px (480px ở 1024–1279px); khung nội dung trải hết chiều rộng còn lại. |
| Độ cao | Thẻ phẳng, viền 1px `divider`, không đổ bóng. Hộp thoại, ngăn trượt, thông báo ngắn dùng bóng nhẹ `0 4px 6px -1px rgba(15,23,42,0.08), 0 2px 4px -2px rgba(15,23,42,0.05)`. |
| Chế độ tối | Không có trong MVP [G3]. |

## 3. Điều chỉnh so với Stitch để đạt tương phản [G2]

| Mục | Stitch | Tỉ lệ của Stitch | Thiết kế này | Tỉ lệ mới |
|---|---|---|---|---|
| Chữ chip 2xx / "Hợp lệ" | `#059669` trên `#ecfdf5` | 3,58 | `#047857` trên `#ecfdf5` | 5,21 |
| Chữ chip 4xx/5xx / lỗi | `#e11d48` trên `#fff1f2` | 4,28 | `#be123c` | 6,29 trên nền trắng |
| Chữ cảnh báo | `#d97706` trên `#fffbeb` | 3,07 | `#b45309` trên `#fffbeb` | 4,84 |
| Viền ô nhập | `#cbd5e1` (slate-300) | 1,48 | `#777587` | 4,49 |
| Biểu tượng điều khiển | `#94a3b8` (slate-400) trên `#f1f5f9` | 2,34 | `#64748b` | 4,34 |
| Số dòng, placeholder | `#94a3b8` | 2,56 | `#64748b` | 4,76 |
| JSON chuỗi | `#059669` | 3,77 | `#047857` | 5,48 |
| JSON số, boolean | `#d97706` | 3,19 | `#b45309` | 5,02 |
| Cỡ chữ nhỏ nhất | 11px (`label-sm`) | — | 12px | — |

Không điều chỉnh: nút chính (6,29), chữ chính và chữ phụ, chip status trung tính (7,24), viền tiêu điểm, JSON khóa và `null`.

## 4. Ánh xạ thành phần

| Thành phần giao diện | Cách dựng | Ghi chú |
|---|---|---|
| Khung ứng dụng (header, thanh bên, `main`) | Tự viết bằng Tailwind | Landmark `header`, `nav`, `main`; liên kết "Bỏ qua tới nội dung". |
| Nút (chính, phụ, nguy hiểm, biểu tượng) | Thẻ `button` + lớp Tailwind | Nút chính nền `primary`; nguy hiểm nền `err-text`, chữ trắng; kích thước theo mục 2. |
| Công tắc | Radix Switch | S1, S2, S4. Chữ trạng thái luôn đi kèm. |
| Tab | Radix Tabs | Tab trong S4 ("Giao dịch", "Tất cả callback"), tab Body/Headers ở S3. |
| Hộp thoại xác nhận | Radix AlertDialog | S1a, thay mẫu JSON, bỏ thay đổi chưa lưu. |
| Ngăn trượt | Radix Dialog tạo kiểu thành ngăn bên phải | S5. |
| Thông báo ngắn | Radix Toast | Góc dưới bên phải. |
| Chú giải (tooltip) | Radix Tooltip | Chỉ cho biểu tượng ở thanh hẹp 48px và nút biểu tượng. |
| Ô nhập, ô nhiều dòng, ô chọn | Thẻ `input`, `textarea`, `select` gốc + Tailwind | Danh sách chọn dùng `select` gốc [Q1]. |
| Nhóm chọn một (NONE/API_KEY, "Tất cả/Đang bật/Đã tắt", định dạng thời gian) | `fieldset` + `input type="radio"` tạo kiểu | |
| Bảng | Thẻ `table` + Tailwind | Mục 4.1 của `interaction-spec.md`. |
| Phân trang | Tự viết, `nav` có nhãn "Phân trang" | Trước/Sau, số trang, chọn số dòng. |
| Chip (HTTP, mapping, status, xác thực) | Thẻ `span` + Tailwind | Luôn có chữ; chip kết quả có biểu tượng. |
| Khung xem JSON | Tự viết, bộ tô màu cú pháp nhỏ không kèm thư viện | Chỉ đọc; tải từ chuỗi gốc [Q3]. |
| Khung xám khi tải | `div` tĩnh | Không hiệu ứng chuyển động. |
| Ô nhập JSON | `textarea` mono + nút "Định dạng JSON" | Không dùng trình soạn mã [Q4]. |

- Không dùng thư viện thành phần dựng sẵn (MUI, Ant…) và không thêm thành phần ngoài bảng trên khi chưa có lý do.
- Phiên bản các thư viện (Tailwind, Radix, phông, bộ biểu tượng) được chọn bản ổn định tương thích và ghi cố định phiên bản trong `package.json` và README ở Code Generation, đúng yêu cầu của brief mục 2.

## 5. Phông chữ và biểu tượng [G1]

- **Phông:** Inter (đậm 400, 500, 600; gồm tập ký tự Latin và **Vietnamese**, nếu thiếu thì dấu tiếng Việt rơi về phông hệ thống) và JetBrains Mono (400, 500). Đóng gói cùng frontend, tải từ chính ứng dụng; không dùng Google Fonts như file Stitch. `font-display: swap`.
- **Biểu tượng:** kiểu Material Symbols Outlined như Stitch, nhưng dùng dạng SVG theo từng biểu tượng được dùng (không nhúng cả bộ phông biểu tượng). Danh sách cần dùng:

| Biểu tượng | Dùng ở |
|---|---|
| Sao chép, dấu tích | Nút sao chép |
| Thêm | "Tạo dịch vụ" |
| Tìm kiếm | Ô tìm kiếm S1 |
| Sửa, Xóa, Gửi | Thao tác dòng ở S1 |
| Mũi tên trái, đóng | Quay lại; đóng ngăn, hộp thoại, thông báo |
| Tải lại | "Tải lại" ở S4 |
| Lỗi (✕), cảnh báo (!), thông tin (i), thành công (✓) | Chip kết quả, banner |
| Khóa | Mã dịch vụ chỉ đọc |
| Hiện, ẩn | Ô khóa API |
| Mũi tên trái phải | Phân trang |
| Menu mở rộng | Thanh bên thu hẹp |
| Dịch vụ, Theo dõi | Hai mục điều hướng |

Biểu tượng chỉ trang trí đặt `aria-hidden="true"`; biểu tượng mang nghĩa luôn có chữ hoặc tên truy cập đi kèm.

## 6. Những gì bỏ hoặc đổi so với thiết kế Stitch

| Mục | Quyết định | Căn cứ |
|---|---|---|
| Retry policy, IP whitelist, mTLS, chứng chỉ SSL, nút Replay, "Nhật ký nhận", thẻ thống kê (p95, callback 24h, tỉ lệ thành công), banner giao thức | Bỏ | Ngoài phạm vi (rough mockups Q6) |
| Đồng hồ chạy từng giây ở header | Bỏ, chỉ giữ nhãn "UAT" và múi giờ | [D1] |
| Thanh truy vấn JSONPath trong khung xem JSON | Bỏ | [Q3], phạm vi đường dẫn chỉ `$.a.b.c` |
| Màu xanh/đỏ cho status nghiệp vụ | Bỏ, dùng chip trung tính | FR8.4 |
| Phông và biểu tượng tải từ CDN, script Tailwind CDN | Bỏ, đóng gói cùng ứng dụng, Tailwind build lúc dựng | [G1] |
| Chế độ tối của khung mã (`#0f172a`) | Bỏ | [G3] |
| `label-sm` 11px | Thay bằng 12px | Mục 3 |
| Hình viên thuốc | Không dùng | DESIGN.md |
| Bố cục hai panel (trái 360–420px kích hoạt, phải dòng sự kiện) | Giữ ý tưởng ở S3 (yêu cầu trái, kết quả phải) | [W] |
| Tab "Request Simulator / Callback Stream" dưới 1024px | Không làm | [Q2] |

## 7. Việc để lại cho các bước sau

- Chốt tên và phiên bản cụ thể của thư viện (Tailwind, Radix, bộ biểu tượng SVG, gói phông) ở Code Generation.
- Đo lại tương phản `err-text` trên `err-bg` (`#fff1f2`) và `muted` trên `canvas` (`#f8f9ff`) bằng công cụ trên màn hình thật; nếu dưới 4,5 thì đổi `muted` sang slate-600 `#475569` (7,24 trên `#f8fafc`) và ghi lại trong tài liệu thiết kế.
- Kiểm tra bằng công cụ kiểm tra truy cập tự động và đi bàn phím thủ công theo `accessibility-checklist.md` ở Build and Test.
