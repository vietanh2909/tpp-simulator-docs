# Đặc tả tương tác — TPP Callback Simulator (MVP)

> Đi kèm `mockups.md` (bố cục, trạng thái) và `accessibility-checklist.md`. Ký hiệu nguồn như `mockups.md`: [Q1]–[Q5], [G1]–[G12], [D1]–[D15], mã FR/NFR/US.

## 1. Quy tắc dùng chung

| Chủ đề | Quy tắc | Nguồn |
|---|---|---|
| Thành phần | Tailwind CSS + thành phần headless có sẵn khả năng truy cập cho hộp thoại, ngăn trượt, tab, công tắc; `table`, `input`, `select`, `textarea` dùng thẻ gốc của HTML. | [Q1] |
| Độ rộng | Tối ưu từ 1280px; 1024–1279px vẫn đủ chức năng; dưới 1024px không có bố cục riêng, chỉ có banner cảnh báo đóng được, nội dung không bị chặn. | [Q2] [D15] |
| Bàn phím | Mọi thao tác làm được bằng bàn phím. Thứ tự Tab theo thứ tự đọc trực quan (trái sang phải, trên xuống dưới). Không có phím tắt riêng. Tab (nhóm tab) và nhóm chọn một chuyển bằng phím mũi tên. | NFR4 |
| Tiêu điểm | Luôn thấy vòng tiêu điểm: viền 2px indigo, cách phần tử 2px. Không bỏ outline mà không thay bằng vòng tương đương. | NFR4 |
| Hộp thoại và ngăn trượt | Giữ tiêu điểm bên trong khi mở; Esc đóng; đóng xong trả tiêu điểm về phần tử đã mở nó. | [G6] |
| Nhãn | Mọi ô nhập có nhãn hiển thị cố định (không dùng placeholder thay nhãn). Nút chỉ có biểu tượng phải có tên truy cập. | NFR4 |
| Lỗi | Không chỉ thể hiện bằng màu: luôn có chữ và biểu tượng. | NFR4 |
| Thời gian | Hiển thị theo Asia/Ho_Chi_Minh, ghi "(GMT+7)". Không dùng định dạng AM/PM. | FR4.6 |
| Sao chép | Dùng Clipboard API. Nếu trình duyệt từ chối (trang không phải ngữ cảnh an toàn), chọn sẵn văn bản và báo "Nhấn Ctrl+C để sao chép". Thành công: biểu tượng đổi thành dấu tích 1,5 giây và thông báo "Đã sao chép". | [G10] |
| Thông báo ngắn | Hiện ở góc dưới bên phải, tự tắt sau 5 giây, tạm dừng khi rê chuột hoặc có tiêu điểm trong thông báo, đọc lịch sự cho trình đọc màn hình. Lỗi quan trọng dùng banner trong trang, không dùng thông báo ngắn. | [G8] |
| Chuyển động | Không hiệu ứng chuyển động chỉ để trang trí. Ngăn trượt hiện ngay (hoặc mờ dần dưới 150ms), tôn trọng cài đặt "giảm chuyển động" của hệ điều hành. | DESIGN.md |
| Trạng thái tải | Dòng khung xám tĩnh; vùng đang tải có `aria-busy="true"`. | [G7] |
| Ba thông báo rỗng | "Chưa có dữ liệu", "Không có dữ liệu khớp bộ lọc" và "Lỗi tải" luôn là ba thông báo khác nhau, khác chữ và khác biểu tượng. | AC3.2.5, AC2.1.4 |
| Chống gửi chồng | Nút gửi, lưu, xóa bị khóa trong lúc chờ phản hồi, chữ đổi thành "Đang …". | |

## 2. Luồng tương tác theo màn hình

### 2.1 S1 Danh sách dịch vụ

1. Mở trang: tải danh sách; hiện khung xám, rồi bảng hoặc trạng thái trống.
2. Gõ vào ô tìm kiếm: lọc ngay (không cần Enter); nút chọn "Tất cả / Đang bật / Đã tắt" lọc tiếp. Tiêu điểm giữ ở ô đang gõ; số dòng khớp được báo cho trình đọc màn hình ("3 dịch vụ khớp").
3. Bấm "Sao chép URL": sao chép địa chỉ đầy đủ (xem mục 1).
4. Bật/tắt công tắc: gọi server; công tắc khóa và hiện "Đang lưu…" tới khi xong (AC2.7.1–AC2.7.3).
5. "Gửi thử" mở S3 của dịch vụ đó; "Sửa" mở S2 chế độ sửa; "Xóa" mở S1a.
6. Xóa xác nhận: gọi server; thành công thì dòng biến mất, tiêu điểm về nút "Tạo dịch vụ".

### 2.2 S2 Cấu hình dịch vụ

1. Chế độ tạo: biểu mẫu trống, dịch vụ mặc định bật, xác thực NONE, định dạng ISO 8601, múi giờ `Asia/Ho_Chi_Minh`, response `200` với body `{}` [D13]. Ô "URL callback" xem trước theo mã đang gõ.
2. Chế độ sửa: tải dịch vụ; ô mã chỉ đọc; khóa API chỉ hiện "Đã cấu hình khóa".
3. Kiểm tra khi lưu (không kiểm tra từng phím gõ, trừ JSON ở ô body và JSON mẫu, kiểm tra khi rời ô):
   - Lỗi hiện cạnh ô và tóm tắt ở đầu trang; tiêu điểm chuyển tới ô lỗi đầu tiên; lỗi biến mất khi ô được sửa đúng.
   - Lỗi mã trùng từ server hiện ở ô mã.
4. "Kiểm tra mapping": dùng cấu hình đang nhập (kể cả chưa lưu); gọi server hoặc tính tại trình duyệt đều được miễn là cùng quy tắc với lúc nhận callback; không ghi gì vào dữ liệu (FR2.2). Kết quả nằm trong vùng thông báo lịch sự.
5. "Mẫu hợp lệ" / "Mẫu thiếu trường" ghi đè nội dung ô JSON mẫu. Nếu ô đang có nội dung người dùng tự gõ, hỏi "Thay nội dung ô JSON mẫu?" với "Thay" và "Giữ lại" trước khi ghi đè [D14].
6. "Lưu cấu hình": thành công thì về S1 kèm thông báo; thất bại thì ở lại, giữ dữ liệu.
7. "Hủy thay đổi": đưa biểu mẫu về bản đã lưu (chế độ sửa) hoặc về trống (chế độ tạo), không hỏi lại; khóa khi chưa có thay đổi.
8. Rời trang bằng thanh bên, liên kết đầu trang hoặc nút Trở lại của trình duyệt khi có thay đổi chưa lưu: hộp thoại "Bỏ các thay đổi chưa lưu?" [G5].

### 2.3 S3 Gửi callback thử

1. Mở trang: tải cấu hình dịch vụ (để biết kiểu xác thực, tên header, đường dẫn mapping). Ô khóa luôn trống.
2. Mẫu: "Thành công" ghi vào ô Body và để nguyên ô khóa; "Lỗi mapping" bỏ trường status; "Sai key" điền một khóa sai cố định `sai-khoa` vào ô khóa. Mẫu ghi đè body hỏi xác nhận nếu ô có nội dung tự gõ, như S2.
3. "Gửi callback": đo thời gian bằng `performance.now()` từ lúc bắt đầu gửi tới lúc nhận đủ body; hiển thị làm tròn tới ms [A14 của Requirements].
4. Kết quả thay thế kết quả lần trước; tiêu điểm vẫn ở nút "Gửi callback". Vùng kết quả thông báo: "Phản hồi HTTP 401, 34 ms".
5. "Xem trong Theo dõi" mở S4 tab "Tất cả callback", lọc theo dịch vụ này; nếu body có transactionId đọc được (theo đường dẫn mapping của dịch vụ) thì thêm bộ lọc transactionId [G9]. Tab "Tất cả callback" được chọn vì request bị từ chối cũng có ở đó.

### 2.4 S4 Theo dõi

1. Mở trang: tab "Giao dịch", không có bộ lọc, trang 1, 20 dòng, tự cập nhật bật.
2. Áp dụng bộ lọc: Enter trong ô chữ hoặc nút "Áp dụng"; về trang 1; thông báo cho trình đọc màn hình "Đã áp dụng bộ lọc, 7 kết quả". Thay đổi ô lọc mà chưa áp dụng không ảnh hưởng dữ liệu hiện tại và không ảnh hưởng tự cập nhật.
3. Nhập thời gian: ô văn bản dạng `yyyy-MM-dd HH:mm:ss` (giờ Việt Nam); chấp nhận `yyyy-MM-dd` (ô "từ" hiểu là 00:00:00, ô "đến" hiểu là 23:59:59). Sai định dạng: lỗi cạnh ô "Nhập theo dạng yyyy-MM-dd HH:mm:ss". "Từ" sau "đến": lỗi "Thời gian bắt đầu phải trước thời gian kết thúc". Cả hai đầu được tính (AC3.2.4) [D6].
4. Đổi trang, đổi số dòng mỗi trang: tiêu điểm giữ ở điều khiển phân trang; thông báo cho trình đọc màn hình "Trang 2 trên 7". Đổi số dòng về trang 1.
5. Chuyển tab: giữ bộ lọc và trang riêng của từng tab [D9]. Tab "Giao dịch" có ô Status; tab "Tất cả callback" có ô "Kết quả xử lý" và "Lý do" [D7]. Hai tab dùng chung ô Dịch vụ, transactionId và Thời gian nhận, nhưng giá trị nhớ riêng.
6. Mở chi tiết: bấm nút "Xem" của dòng (hoặc bấm vào dòng bằng chuột); ngăn trượt mở bên phải; tiêu điểm vào nút Đóng của ngăn; dòng được chọn tô nền. Đóng: trả tiêu điểm về nút "Xem" của dòng đó nếu dòng còn trên trang, nếu không thì về tiêu đề h1 trang.
7. Tải lại: nút "Tải lại" lấy dữ liệu theo bộ lọc và trang hiện tại, không đổi chúng.

### 2.5 Tự cập nhật (FR11)

| Trạng thái | Điều kiện | Hành vi |
|---|---|---|
| Tắt | Công tắc tắt | Không có bộ đếm; chỉ cập nhật khi bấm "Tải lại", "Áp dụng", đổi trang hoặc tab. |
| Chờ | Bật, không có lần tải nào đang chạy | Mỗi 5 giây có một nhịp. |
| Đang tải | Một lần tải đang chạy | Nhịp 5 giây tới bị bỏ qua (AC3.9.3). Lần tải do người dùng yêu cầu (Áp dụng, đổi trang) hủy lần tự cập nhật đang chạy; kết quả cũ về sau bị bỏ, chỉ nhận kết quả của yêu cầu mới nhất. |
| Lỗi, đang giữ dữ liệu cũ | Lần tải gần nhất lỗi | Giữ nguyên bảng; banner vàng "Không cập nhật được. Đang hiển thị dữ liệu lúc HH:mm:ss (GMT+7)."; vẫn thử lại ở nhịp kế tiếp; thành công thì banner mất (AC3.9.1, AC3.9.2). |

- Cập nhật thay dữ liệu tại chỗ: không đổi trang, bộ lọc, vị trí cuộn, tiêu điểm hay ngăn chi tiết đang mở (FR11.2). Dòng đang được chọn giữ trạng thái chọn nếu còn trên trang.
- **Làm rõ giả định G8:** dòng "Cập nhật lúc HH:mm:ss" đổi chữ ở mỗi lần tải thành công để mắt người thấy, nhưng vùng thông báo lịch sự (ẩn về mặt hình ảnh) chỉ nói khi: người dùng bấm "Tải lại", tổng số dòng đổi ("Có dữ liệu mới, tổng 129"), lần tải lỗi, hoặc phục hồi sau lỗi. Nhờ vậy trình đọc màn hình không đọc lại mỗi 5 giây [D12].
- Ngăn chi tiết đang mở: danh sách lịch sử của giao dịch cập nhật theo cùng nhịp. Lần nhận đang chọn không đổi; nếu có callback mới, thêm dòng vào cuối danh sách và hiện chữ "Có 1 callback mới" (không tự nhảy sang lần mới) [D11].

### 2.6 S5 Ngăn chi tiết

1. Tiêu điểm vào nút "Đóng". Esc hoặc "Đóng" đóng ngăn. Bấm vào lớp phủ nhạt cũng đóng.
2. Danh sách lịch sử là nhóm chọn một: mũi tên lên xuống đổi lần nhận, Enter hoặc Space chọn; nội dung bên dưới đổi ngay và tiêu điểm giữ ở danh sách.
3. Tên truy cập của ngăn: "Chi tiết giao dịch <transactionId> của <dịch vụ>" (S5a) hoặc "Chi tiết lần nhận lúc <giờ> của <dịch vụ>" (S5b).

## 3. Danh mục thông báo

| Ngữ cảnh | Nội dung | Story |
|---|---|---|
| Mã trống | "Nhập mã dịch vụ." | AC2.2.3 |
| Mã sai ký tự hoặc độ dài | "Mã chỉ gồm chữ, số, '-' và '_', dài 1–50 ký tự." | AC2.2.3 |
| Mã trùng | "Mã dịch vụ đã tồn tại (kể cả dịch vụ đã xóa)." | AC2.2.2 |
| Tên trống | "Nhập tên dịch vụ." | [D10] |
| Header API key trống | "Nhập tên header." | AC2.4.1 |
| Khóa API trống (tạo mới, hoặc sửa khi chuyển từ NONE sang API_KEY) | "Nhập giá trị khóa." | AC2.4.1 |
| Đường dẫn trống (transactionId, status) | "Nhập đường dẫn." | AC2.5.5 |
| Đường dẫn sai cú pháp | "Đường dẫn phải có dạng $.a.b.c (object lồng nhau; không dùng [ ], * hay ..)." | AC2.5.2 |
| Mẫu chuỗi trống | "Nhập mẫu ngày giờ." | AC2.5.3 |
| Mẫu chuỗi sai | "Mẫu ngày giờ không hợp lệ theo cú pháp DateTimeFormatter của Java." | AC2.5.3 |
| HTTP status ngoài khoảng | "HTTP status phải từ 200 đến 599." | AC2.6.2 |
| Body response không phải JSON | "Body phải là JSON hợp lệ." | AC2.6.3 |
| JSON mẫu hỏng (thử mapping) | "JSON mẫu không hợp lệ." | AC2.9.3 |
| Trường mapping: không tìm thấy / rỗng / sai kiểu / sai định dạng | "Không tìm thấy", "Giá trị rỗng", "Sai kiểu (object hoặc mảng)", "Không đọc được theo định dạng đã cấu hình" | AC1.6.4, AC1.7.5 |
| Timestamp thiếu | "Không có trường timestamp" (cảnh báo) | AC1.7.4 |
| Thời gian sai dạng (bộ lọc) | "Nhập theo dạng yyyy-MM-dd HH:mm:ss." | [D6] |
| Khoảng thời gian ngược | "Thời gian bắt đầu phải trước thời gian kết thúc." | [D6] |
| Lưu cấu hình lỗi server | "Không lưu được cấu hình. Thử lại." | AC2.3.3 |
| Đổi trạng thái lỗi | "Không đổi được trạng thái của <mã>. Thử lại." | AC2.7.3 |
| Xóa lỗi | "Không xóa được <mã>. Thử lại." | AC2.8 |
| Tải danh sách lỗi | "Không tải được danh sách dịch vụ." / "Không tải được dữ liệu." / "Không tải được chi tiết." | AC3.9 |
| Không kết nối khi gửi thử | "Không gửi được request tới server." | AC2.10 |
| Cửa sổ hẹp (dưới 1024px) | "Cửa sổ hẹp hơn 1024px nên giao diện có thể khó dùng. Hãy mở rộng cửa sổ hoặc giảm mức phóng to." (banner, có nút "Đóng") | [Q2] [D15] |

## 4. Đặc tả thành phần dùng lại

Chỉ ghi các cột trạng thái, đầu vào chính, hành vi theo độ rộng và truy cập; thành phần dùng một lần mô tả trong `mockups.md` [G12].

### 4.1 Bảng dữ liệu (DataTable)

| Mục | Giá trị |
|---|---|
| Dùng ở | S1, S4 (hai tab), bảng mapping và headers ở S5 |
| Loại | display |

**Trạng thái:** mặc định; đang tải (khung xám, `aria-busy`); trống; không khớp bộ lọc; lỗi tải; có dòng được chọn; dòng khi rê chuột (nền slate-50) và khi có tiêu điểm (vòng tiêu điểm trên nút trong dòng).

| Đầu vào | Kiểu | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|---|
| columns | danh sách cột (nhãn, kiểu căn lề, có phải mono) | có | — | Cột số căn phải, chữ căn trái |
| rows | danh sách dòng | có | — | |
| rowKey | hàm | có | — | S4: mã bản ghi, hòa nhau thứ tự ổn định |
| selectedKey | khóa | không | không có | Tô nền indigo-50, viền trái 2px indigo, nút "Xem" có `aria-current="true"` |
| rowAction | hàm | không | — | Nút "Xem" trong dòng; bấm vào dòng bằng chuột gọi cùng hàm |
| state | `loading` / `empty` / `noMatch` / `error` / `ready` | có | `loading` | |
| stickyHeader | boolean | không | true | Tiêu đề cột cố định khi cuộn |

| Độ rộng | Hành vi |
|---|---|
| ≥1280px | Vừa khung, không cuộn ngang. Hàng cao 36px, một dòng, cắt chữ bằng "…" (đầy đủ xem ở chi tiết). |
| 1024–1279px | Khung bảng cuộn ngang, tiêu đề cột cố định, cột "Dịch vụ" và "transactionId" cố định bên trái. |

| Truy cập | Cách làm |
|---|---|
| Vai trò | `table` thật với `caption` ẩn ("Danh sách giao dịch"), `th scope="col"`. |
| Bàn phím | Tab vào từng nút "Xem". Không dùng bảng dạng lưới (grid) để tránh quản lý phím mũi tên. |
| Nhãn nút | "Xem chi tiết giao dịch <id> của <dịch vụ>" / "Xem chi tiết lần nhận lúc <giờ> của <dịch vụ>". |
| Chữ bị cắt | Có thuộc tính `title` và đầy đủ ở chi tiết; thông tin quan trọng không chỉ nằm trong phần bị cắt. |
| Thông báo trạng thái | Vùng ẩn về mặt hình ảnh, lịch sự, dùng cho thao tác của người dùng (mục 2.4 và 2.5). |

### 4.2 Thanh bộ lọc (FilterBar)

| Mục | Giá trị |
|---|---|
| Dùng ở | S1 (tìm kiếm và nhóm nút), S4 |
| Loại | input |

**Trạng thái:** mặc định; có giá trị chưa áp dụng (nút "Áp dụng" đậm); đã áp dụng (hiện dòng tóm tắt "Đang lọc: …" cạnh nút "Xóa bộ lọc"); lỗi nhập (từng ô); đang tải (nút "Áp dụng" hiện "Đang tải…", vẫn cho sửa ô).

| Đầu vào | Kiểu | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|---|
| fields | danh sách ô (chữ, chọn, ngày giờ) | có | — | Mỗi tab của S4 một danh sách khác nhau |
| value | map | có | rỗng | Nhớ riêng theo tab [D9] |
| onApply | hàm | có | — | Enter trong ô chữ hoặc nút "Áp dụng" |
| onClear | hàm | có | — | Về mặc định và áp dụng ngay |

| Độ rộng | Hành vi |
|---|---|
| ≥1280px | Hai dòng: ô chữ và chọn trên một dòng, thời gian và nút trên dòng kế. |
| 1024–1279px | Ba dòng, các ô xuống dòng tự nhiên; thứ tự Tab không đổi. |

| Truy cập | Cách làm |
|---|---|
| Vai trò | `form` có tên "Bộ lọc"; mỗi ô có `label`. |
| Lỗi | Thông báo cạnh ô, nối với ô bằng `aria-describedby`, ô có `aria-invalid="true"`. |
| Danh sách chọn | Dùng thẻ `select` gốc của trình duyệt (dễ dùng bằng bàn phím và trình đọc màn hình). |
| Dịch vụ đã xóa | Chữ "(đã xóa)" nằm trong tên tùy chọn, không dùng màu. |

### 4.3 Ngăn trượt (Drawer)

| Mục | Giá trị |
|---|---|
| Dùng ở | S5a, S5b |
| Loại | layout |

**Trạng thái:** đóng; đang mở và tải; đang mở và sẵn sàng; lỗi tải; có callback mới.

| Đầu vào | Kiểu | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|---|
| open | boolean | có | false | |
| title | chuỗi | có | — | Dùng làm tên truy cập |
| onClose | hàm | có | — | Esc, nút Đóng, bấm lớp phủ |
| returnFocusTo | phần tử | không | phần tử đã mở | |
| width | số | không | 560 (≥1280px), 480 (1024–1279px) | |

| Truy cập | Cách làm |
|---|---|
| Vai trò | `dialog` với `aria-modal="true"`, `aria-labelledby` trỏ vào tiêu đề h2. |
| Tiêu điểm | Vào nút Đóng khi mở; giữ bên trong; trả về phần tử mở khi đóng. |
| Nền phía sau | Nội dung phía sau bị đánh dấu không tương tác cho trình đọc màn hình khi ngăn mở; vẫn hiển thị và vẫn cập nhật. |
| Cuộn | Nội dung ngăn cuộn riêng; trang phía sau không cuộn. |

### 4.4 Khung xem JSON (JsonViewer)

| Mục | Giá trị |
|---|---|
| Dùng ở | S2 (kết quả thử), S3 (kết quả phản hồi), S5 |
| Loại | display |

**Trạng thái:** định dạng đẹp; nguyên văn; không phải JSON (chỉ nguyên văn); rỗng ("Không có nội dung"); rất lớn (cao tối đa 320px, cuộn).

| Đầu vào | Kiểu | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|---|
| text | chuỗi | có | — | Dữ liệu gốc nhận được; không tự đổi nội dung nguyên văn |
| title | chuỗi | có | — | Ví dụ "Payload gốc" |
| mode | `pretty` / `raw` | không | `pretty` nếu là JSON | |

| Truy cập | Cách làm |
|---|---|
| Vai trò | Vùng có tên (`role="region"`, `aria-label` = tiêu đề), nội dung trong `pre` có `tabindex="0"` để cuộn bằng bàn phím. |
| Số dòng | Ẩn khỏi trình đọc màn hình (`aria-hidden`) và không chọn được khi bôi đen. |
| Tô màu cú pháp | Chỉ là phụ; ý nghĩa không phụ thuộc màu. Màu đã chỉnh để đạt tương phản (xem `design-system-mapping.md`). |
| Nút sao chép | Sao chép bản đang hiển thị ("Định dạng đẹp" hoặc "Nguyên văn" theo chế độ), có nhãn "Sao chép <tiêu đề>". |

### 4.5 Biểu mẫu cấu hình dịch vụ (ServiceForm)

| Mục | Giá trị |
|---|---|
| Dùng ở | S2 |
| Loại | input |

**Trạng thái:** tạo mới; sửa chưa thay đổi; sửa có thay đổi chưa lưu; đang lưu; có lỗi nhập; lỗi server; chỉ đọc (khi đang lưu).

| Đầu vào | Kiểu | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|---|
| mode | `create` / `edit` | có | — | `edit`: mã chỉ đọc, khóa API hiện "Đã cấu hình khóa" |
| initial | cấu hình dịch vụ | khi `edit` | — | Không bao giờ chứa giá trị khóa |
| onSave | hàm | có | — | |
| dirty | boolean | tính từ biểu mẫu | false | Bật cảnh báo khi rời trang [G5] |

| Độ rộng | Hành vi |
|---|---|
| ≥1280px | Khối A và B cạnh nhau; C, D, E full chiều rộng; D chia hai cột (JSON mẫu, kết quả). |
| 1024–1279px | Một cột; D xếp JSON mẫu trên, kết quả dưới. |

| Truy cập | Cách làm |
|---|---|
| Cấu trúc | Mỗi khối A–E là `section` có h2; trường bắt buộc ghi chữ "(bắt buộc)" trong nhãn, không chỉ dấu `*`. |
| Nhóm chọn một | NONE/API_KEY và định dạng thời gian dùng `fieldset` với `legend`. |
| Lỗi | Tóm tắt đầu trang là `role="alert"` khi bấm lưu; mỗi mục trong tóm tắt là liên kết tới ô lỗi. |
| Ô khóa | Loại `password`; nút "Hiện/Ẩn" có `aria-pressed`; chữ "Đã cấu hình khóa" là văn bản thật, không phải giá trị. |
| Ô bị khóa (mã khi sửa, định dạng thời gian khi thiếu đường dẫn timestamp) | `readonly` hoặc `disabled` kèm chữ giải thích nằm trong `aria-describedby`. |

### 4.6 Công tắc (Switch)

| Mục | Giá trị |
|---|---|
| Dùng ở | S1 (trạng thái dịch vụ), S2 (bật dịch vụ), S4 (tự cập nhật) |
| Loại | input |

**Trạng thái:** bật; tắt; đang lưu (khóa, chữ "Đang lưu…"); lỗi (về trạng thái cũ, thông báo); tiêu điểm.

| Đầu vào | Kiểu | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|---|
| checked | boolean | có | — | S1 chỉ đổi sau khi server xác nhận |
| label | chuỗi | có | — | Luôn hiển thị chữ ("Đang bật" / "Đã tắt" / "Tự cập nhật mỗi 5 giây"), nhãn không chỉ là vị trí núm |
| onChange | hàm bất đồng bộ | có | — | |

| Truy cập | Cách làm |
|---|---|
| Vai trò | `role="switch"` với `aria-checked`; Space đổi trạng thái. |
| Tên | Ở S1 gồm mã dịch vụ: "Trạng thái dịch vụ thu-ho: đang bật". |
| Hình dạng | Chữ trạng thái cạnh công tắc là bắt buộc để không chỉ dựa vào màu. |

### 4.7 Hộp thoại (ConfirmDialog)

| Mục | Giá trị |
|---|---|
| Dùng ở | S1a (xóa), S2 (bỏ thay đổi chưa lưu, thay mẫu JSON) |
| Loại | feedback |

**Trạng thái:** đóng; mở; đang xử lý (nút đổi chữ "Đang …", khóa); lỗi (thông báo trong hộp thoại, vẫn mở).

| Đầu vào | Kiểu | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|---|
| title | chuỗi | có | — | |
| description | chuỗi | có | — | Nêu hậu quả cụ thể |
| confirmLabel | chuỗi | có | — | Nút xác nhận có tên hành động ("Xóa dịch vụ", "Bỏ thay đổi", "Thay") |
| cancelLabel | chuỗi | có | "Hủy" | Tiêu điểm mặc định vào nút này |
| tone | `danger` / `neutral` | không | `neutral` | `danger` tô nút xác nhận đỏ |

| Truy cập | Cách làm |
|---|---|
| Vai trò | `alertdialog`, `aria-labelledby` và `aria-describedby`. |
| Tiêu điểm | Giữ trong hộp thoại; Esc như "Hủy"; trả về phần tử đã mở. |

### 4.8 Nút sao chép (CopyButton)

| Mục | Giá trị |
|---|---|
| Dùng ở | S1, S2, S3, S5 |
| Loại | input |

**Trạng thái:** mặc định; đã sao chép (dấu tích 1,5 giây); không sao chép được (thông báo "Nhấn Ctrl+C để sao chép" và chọn sẵn văn bản).

| Truy cập | Cách làm |
|---|---|
| Tên | "Sao chép <đối tượng>", ví dụ "Sao chép URL thu-ho". Kích thước tối thiểu 28px; khoảng cách tới nút kề ít nhất 4px. |
| Thông báo | Sau khi bấm, vùng lịch sự đọc "Đã sao chép". |

## 5. Bàn phím theo màn hình (thứ tự Tab)

| Màn hình | Thứ tự |
|---|---|
| Chung | Liên kết "Bỏ qua tới nội dung" (ẩn tới khi có tiêu điểm) → điều hướng chính → nội dung. |
| S1 | Tạo dịch vụ → tìm kiếm → nhóm chọn → từng dòng (Sao chép URL → công tắc → Gửi thử → Sửa → Xóa). |
| S2 | Gửi callback thử → khối A → B → C → D (nút mẫu → ô JSON mẫu → Kiểm tra mapping → kết quả) → E → Hủy thay đổi → Lưu cấu hình. |
| S3 | Quay lại cấu hình → khối xác thực (khóa) → nút mẫu → tab Body/Headers → ô nội dung → Gửi callback → kết quả → Xem trong Theo dõi. |
| S4 | Bộ lọc → công tắc tự cập nhật → Tải lại → tab → bảng (từng nút "Xem") → phân trang. |
| S5 | Đóng → danh sách lịch sử → (Tab qua từng khối có thể cuộn: khung JSON) → hết ngăn thì quay lại nút Đóng (giữ bên trong). |

## 6. Quyết định chưa có trong giả định đã chấp nhận

Các mã [D1]–[D15] xem ở cuối `mockups.md`. Ngoài ra:

- Gõ nhanh "Mẫu hợp lệ" dựng thời gian theo định dạng đang chọn: ISO 8601 → thời điểm hiện tại theo ISO có múi giờ; Unix giây/mili giây → số tương ứng; mẫu chuỗi → thời điểm hiện tại theo mẫu và múi giờ đang chọn. Nếu mẫu chuỗi đang rỗng hoặc sai, mẫu timestamp để trống kèm cảnh báo.
- Khi sửa dịch vụ, chuyển NONE sang API_KEY bắt buộc nhập khóa mới; chuyển API_KEY sang NONE rồi lưu thì khóa cũ bị xóa (AC2.4.5).
