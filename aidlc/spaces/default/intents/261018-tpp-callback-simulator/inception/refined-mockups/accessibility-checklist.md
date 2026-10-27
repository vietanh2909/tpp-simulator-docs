# Danh mục kiểm tra khả năng truy cập — TPP Callback Simulator (MVP)

> Mức đã chốt: **cơ bản** (NFR4). Dùng được hoàn toàn bằng bàn phím, mọi ô nhập có nhãn, trạng thái lỗi không chỉ thể hiện bằng màu. Không đặt mục tiêu WCAG chính thức. Danh mục này **không phải** xác nhận đạt WCAG: muốn xác nhận cần kiểm thử thủ công với công cụ hỗ trợ (trình đọc màn hình) và đánh giá của chuyên gia truy cập.
>
> Cột "Cách kiểm" cho biết lúc nào kiểm: **Thiết kế** = đã thể hiện trong tài liệu thiết kế của bước này; **Dựng** = cần kiểm khi có mã (kiểm thử tự động hoặc đi tay) ở Build and Test.

## 1. Cấu trúc và điều hướng

| Mã | Yêu cầu | Cách đáp ứng | Màn hình | Cách kiểm |
|---|---|---|---|---|
| A-01 | Có landmark `header`, `nav` (tên "Điều hướng chính"), `main` | Khung chung | Tất cả | Thiết kế, Dựng |
| A-02 | Mỗi màn hình đúng một h1, thứ tự tiêu đề không nhảy cấp | h1 là tên màn hình; h2 cho khối A–E (S2) và mục trong ngăn (S5) | Tất cả | Dựng |
| A-03 | Có liên kết "Bỏ qua tới nội dung" | Ẩn tới khi có tiêu điểm, nhảy tới `main` | Tất cả | Dựng |
| A-04 | `lang="vi"` và `<title>` riêng từng màn hình | Ví dụ "Dịch vụ callback – TPP Simulator" | Tất cả | Dựng |
| A-05 | Mục điều hướng đang mở được đánh dấu | `aria-current="page"` + tô nền (không chỉ màu) | Khung chung | Thiết kế, Dựng |
| A-06 | Khi đổi màn hình, tiêu điểm và thông báo hợp lý | Tiêu điểm chuyển tới h1 của màn hình mới (`tabindex="-1"`) | Chuyển giữa S1–S4 | Dựng |

## 2. Bàn phím và tiêu điểm

| Mã | Yêu cầu | Cách đáp ứng | Màn hình | Cách kiểm |
|---|---|---|---|---|
| B-01 | Mọi chức năng dùng được bằng bàn phím | Không dùng thao tác chỉ có chuột; dòng bảng mở chi tiết bằng nút "Xem" | Tất cả | Dựng (đi tay) |
| B-02 | Luôn thấy vị trí tiêu điểm | Vòng tiêu điểm 2px `primary`, cách 2px (6,29 trên nền trắng) | Tất cả | Thiết kế, Dựng |
| B-03 | Thứ tự Tab theo thứ tự đọc | `interaction-spec.md` mục 5 | Tất cả | Dựng |
| B-04 | Không bị kẹt tiêu điểm | Chỉ hộp thoại và ngăn trượt giữ tiêu điểm, luôn có Esc và nút Đóng | S1a, S2, S5 | Dựng |
| B-05 | Hộp thoại, ngăn: tiêu điểm vào trong khi mở, trả về nơi đã mở khi đóng | AlertDialog/Dialog; về nút "Xem" hoặc h1 nếu dòng không còn | S1a, S2, S5 | Dựng |
| B-06 | Nhóm chọn một, tab, công tắc dùng phím chuẩn | Mũi tên chuyển, Space/Enter chọn; Radix cho công tắc, tab | S1, S2, S3, S4 | Dựng |
| B-07 | Vùng chạm đủ lớn | Nút biểu tượng 28×28px, cách nhau ≥4px; nút chữ cao 32px | Tất cả | Thiết kế |
| B-08 | Khung cuộn được bằng bàn phím | Khung JSON và bảng cuộn ngang có `tabindex="0"` và tên | S2, S3, S4, S5 | Dựng |

## 3. Biểu mẫu và nhập liệu

| Mã | Yêu cầu | Cách đáp ứng | Màn hình | Cách kiểm |
|---|---|---|---|---|
| C-01 | Mọi ô nhập có nhãn hiển thị | `label` gắn với ô; placeholder chỉ là ví dụ phụ | S1–S4 | Thiết kế, Dựng |
| C-02 | Trường bắt buộc ghi bằng chữ | "(bắt buộc)" trong nhãn, không chỉ dấu `*` hay màu | S2 | Thiết kế |
| C-03 | Lỗi nằm cạnh ô, gắn với ô | `aria-invalid="true"` + `aria-describedby` tới thông báo | S2, S3, S4 | Dựng |
| C-04 | Lỗi không chỉ bằng màu | Biểu tượng ✕ + chữ lỗi + viền đỏ | S2, S3, S4 | Thiết kế |
| C-05 | Tóm tắt lỗi khi lưu, tiêu điểm tới ô lỗi đầu tiên | `role="alert"`, mục tóm tắt là liên kết tới ô | S2 | Dựng |
| C-06 | Nhóm lựa chọn có tên nhóm | `fieldset` + `legend` | S1, S2 | Dựng |
| C-07 | Ô che (khóa API) có điều khiển hiện/ẩn rõ ràng | Nút "Hiện/Ẩn" có `aria-pressed`; ô `autocomplete="off"` | S2, S3 | Dựng |
| C-08 | Ô bị khóa có giải thích | `readonly`/`disabled` kèm chữ nối bằng `aria-describedby` | S2 | Dựng |
| C-09 | Không đặt giới hạn chữ nhập sai cách | Không giới hạn độ dài ô JSON ở trình duyệt; kiểm tra hợp lệ ở lúc lưu/kiểm tra | S2, S3 | Dựng |

## 4. Màu và tương phản

| Mã | Yêu cầu | Cách đáp ứng | Cách kiểm |
|---|---|---|---|
| D-01 | Chữ thường đạt tỉ lệ ≥4,5:1 | Bảng tỉ lệ trong `design-system-mapping.md` mục 2–3; điều chỉnh các màu Stitch dưới 4,5 | Thiết kế; Dựng (đo lại `err-text` trên `#fff1f2` và `muted` trên `#f8f9ff`) |
| D-02 | Thành phần giao diện và ranh giới điều khiển đạt ≥3:1 | Viền ô nhập `#777587` (4,49); biểu tượng `#64748b` (4,34); vòng tiêu điểm (6,29) | Thiết kế |
| D-03 | Ý nghĩa không chỉ bằng màu | Chip có chữ (và biểu tượng cho kết quả mapping/xử lý); dòng chọn có viền trái và `aria-current`; công tắc có chữ trạng thái | Thiết kế, Dựng |
| D-04 | Status nghiệp vụ không bị nhầm với mã HTTP | Status luôn là chip xám trung tính; chỉ mã HTTP và lỗi mapping có màu | Thiết kế |
| D-05 | Văn bản tô cú pháp đọc được khi không thấy màu | Cấu trúc JSON giữ nguyên (ngoặc, dấu hai chấm), màu chỉ bổ sung | Thiết kế |
| D-06 | Cỡ chữ nhỏ nhất | 12px (bỏ 11px của Stitch) | Thiết kế |

## 5. Bảng và dữ liệu

| Mã | Yêu cầu | Cách đáp ứng | Màn hình | Cách kiểm |
|---|---|---|---|---|
| E-01 | Bảng dữ liệu là `table` thật có tiêu đề cột | `caption` ẩn, `th scope="col"` | S1, S4, S5 | Dựng |
| E-02 | Nút trong dòng có tên rõ ràng | "Xem chi tiết giao dịch <id> của <dịch vụ>" | S4 | Dựng |
| E-03 | Dòng đang chọn có chỉ báo ngoài màu | Viền trái 2px + `aria-current="true"` trên nút | S4 | Dựng |
| E-04 | Chữ bị cắt vẫn truy cập được | `title` + đầy đủ ở chi tiết | S1, S4 | Dựng |
| E-05 | Giá trị trống không để ô trống | "—" kèm chữ ẩn "không có giá trị" | S4, S5 | Dựng |
| E-06 | Thời gian có múi giờ rõ | Nhãn "(GMT+7)", UTC kèm theo khi cần | S4, S5 | Thiết kế |
| E-07 | Ba thông báo rỗng phân biệt | Chữ và biểu tượng khác nhau cho "chưa có dữ liệu", "không khớp bộ lọc", "lỗi tải" | S1, S4, S5 | Thiết kế, Dựng |

## 6. Thông báo động và thời gian

| Mã | Yêu cầu | Cách đáp ứng | Màn hình | Cách kiểm |
|---|---|---|---|---|
| F-01 | Kết quả của hành động người dùng được báo cho trình đọc màn hình | Vùng lịch sự: "Đã áp dụng bộ lọc, 7 kết quả", "Trang 2 trên 7", "Đã sao chép", kết quả gửi thử | S1–S4 | Dựng |
| F-02 | Tự cập nhật không đọc lại bảng mỗi 5 giây | Vùng thông báo chỉ nói khi tải lại thủ công, tổng số dòng đổi, lỗi, phục hồi [D12] | S4 | Dựng |
| F-03 | Lỗi nghiêm trọng được thông báo ngay | `role="alert"` cho banner lỗi và tóm tắt lỗi | S1–S5 | Dựng |
| F-04 | Trạng thái đang tải được báo | `aria-busy="true"` và nút đổi chữ "Đang …" | Tất cả | Dựng |
| F-05 | Thông báo ngắn không biến mất khi đang đọc | Tạm dừng khi rê chuột hoặc có tiêu điểm; lỗi không dùng thông báo ngắn | Tất cả | Dựng |
| F-06 | Có thể tắt nội dung tự cập nhật | Công tắc "Tự cập nhật mỗi 5 giây" và nút "Tải lại" | S4 | Thiết kế |
| F-07 | Không có hạn chế thời gian cho thao tác | Không có phiên hết hạn; không có thao tác nào bị giới hạn giờ | Tất cả | Thiết kế |

## 7. Chuyển động, phóng to và nội dung

| Mã | Yêu cầu | Cách đáp ứng | Cách kiểm |
|---|---|---|---|
| G-01 | Tôn trọng cài đặt giảm chuyển động | Ngăn trượt không chuyển động hoặc mờ dần dưới 150ms; khung xám tĩnh | Dựng |
| G-02 | Không nhấp nháy | Không có nội dung nhấp nháy | Thiết kế |
| G-03 | Phóng to không làm mất chức năng | Dưới 1024px chỉ có banner đóng được và nội dung cuộn ngang, không bị chặn [D15] | Dựng (thử phóng to 200% trên màn hình 1920px) |
| G-04 | Văn bản tiếng Việt hiển thị đủ dấu | Phông Inter có tập ký tự Vietnamese; phông mono có chuỗi dự phòng | Dựng |
| G-05 | Khung JSON không buộc người đọc dùng chuột | `tabindex="0"`, cuộn bằng phím; số dòng ẩn khỏi trình đọc màn hình | Dựng |

## 8. Liên hệ với tiêu chí chấp nhận trong stories

| Tiêu chí | Mã kiểm tra liên quan |
|---|---|
| Tiêu chí chung NFR4 (bàn phím, nhãn, lỗi không chỉ bằng màu) | B-01, C-01, C-04, D-03 |
| AC3.1.2, AC3.1.3 (status trung tính, thiếu status có dấu lỗi bằng chữ) | D-03, D-04 |
| AC3.4.4 (Esc, tiêu điểm trả về dòng) | B-04, B-05 |
| AC2.4.2–AC2.4.3 (khóa che, giữ khóa cũ) | C-07 |
| AC2.1.4, AC3.2.5, AC3.9.1 (ba thông báo rỗng, lỗi tải) | E-07 |
| AC3.8.2, AC3.9.3 (tự cập nhật giữ nguyên trạng thái) | F-02 |

## 9. Cách kiểm ở Build and Test

**Tự động (một phần):**

- Quy tắc truy cập của ESLint cho JSX (`eslint-plugin-jsx-a11y` hoặc bản tương đương) chạy trong CI cùng ESLint đã chốt.
- Kiểm thử Vitest + React Testing Library: dùng truy vấn theo vai trò và tên (`getByRole`) cho dịch vụ, bộ lọc, bảng, hộp thoại, ngăn; thêm kiểm tra bằng bộ máy axe (ví dụ `vitest-axe`) cho từng màn hình khi dựng.
- Kiểm thử tự động chỉ bắt được một phần vấn đề truy cập; không thay cho đi tay.

**Đi tay (mỗi màn hình, một lần trước khi chấp nhận phần frontend):**

1. Rút chuột, dùng Tab/Shift+Tab/Enter/Space/Esc/mũi tên: hoàn thành các luồng tạo dịch vụ, thử mapping, gửi thử, lọc, mở và đóng chi tiết.
2. Mở từng hộp thoại và ngăn: tiêu điểm vào trong, Esc đóng, tiêu điểm trở về đúng nơi.
3. Gây từng lỗi nhập ở S2: kiểm tóm tắt lỗi, tiêu điểm tới ô lỗi, thông báo đọc đúng.
4. Bật tự cập nhật và giữ ngăn chi tiết mở: kiểm không mất tiêu điểm, không đọc lặp.
5. Phóng to 200% và 400% trên màn hình rộng: kiểm banner hẹp, cuộn ngang, nút vẫn bấm được.
6. Bật trình đọc màn hình (ví dụ NVDA trên Windows với trình duyệt đang dùng) và nghe hết một luồng: tạo dịch vụ, gửi thử, xem chi tiết.
7. Tắt màu (chế độ thang xám hoặc tương phản cao của hệ điều hành) và kiểm mọi trạng thái vẫn phân biệt được.
