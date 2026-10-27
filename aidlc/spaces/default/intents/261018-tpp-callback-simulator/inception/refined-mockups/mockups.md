# Mockups chi tiết — TPP Callback Simulator (MVP)

## Nguồn và nguyên tắc

- Bố cục và phong cách theo Stitch (`docs/design/stitch/stitch_tpp_callback_simulator_ui/`, `tpp_callback_simulator/DESIGN.md`). Chức năng theo `docs/brief.md`, `requirements.md` và `stories.md`; khi Stitch khác brief thì giữ brief (quy tắc đã chốt ở Rough Mockups).
- Năm màn hình S1–S5 và luồng giữ nguyên `wireframes.md` và `user-flow.md`. Tài liệu này thêm: nội dung từng vùng, trạng thái (tải, trống, lỗi, thành công, một phần), nội dung chữ trên giao diện, độ rộng màn hình và truy vết sang story. Quy tắc tương tác nằm ở `interaction-spec.md`, màu và thành phần ở `design-system-mapping.md`, kiểm tra truy cập ở `accessibility-checklist.md`.
- Chỉ trình duyệt máy tính: tối ưu từ 1280px, dùng đủ chức năng từ 1024px, dưới 1024px không hỗ trợ [Q2]. Ngôn ngữ giao diện là tiếng Việt; mã dịch vụ, tên header, đường dẫn JSON, mã HTTP giữ nguyên [G11].
- Ký hiệu: **[Q1]–[Q5]** = câu hỏi trong `refined-mockups-questions.md`; **[G1]–[G12]** = giả định đã chấp nhận ở đó; **[W]** = `wireframes.md`; **[FR…]/[NFR…]/[US…]** = mã trong requirements và stories; **[D1]–[D15]** = quyết định thiết kế bổ sung ở cuối tài liệu, cần bạn xem.
- Hình dưới đây là sơ đồ chữ ở mức trung thực vừa, không phải ảnh. Màu, cỡ chữ và khoảng cách lấy từ `design-system-mapping.md`.

## 1. Khung chung

```
 ≥1280px
+------------+----------------------------------------------------------------+
| ▣ TPP      |  [UAT]  Múi giờ: Asia/Ho_Chi_Minh (GMT+7)                      |  <- header, cao 48px
| Simulator  +----------------------------------------------------------------+
|            |                                                                |
| ▸ Dịch vụ  |                    VÙNG NỘI DUNG (main)                        |
|   Theo dõi |                                                                |
|   giao dịch|                                                                |
| 240px      |                                                                |
+------------+----------------------------------------------------------------+

 1024–1279px: thanh bên thu thành thanh hẹp 48px (chỉ biểu tượng, có tooltip và nhãn truy cập)
+----+---------------------------------------------------------------------+
| ▣  |  [UAT]  Múi giờ: Asia/Ho_Chi_Minh (GMT+7)                           |
| ▸  +---------------------------------------------------------------------+
| ≡  |                       VÙNG NỘI DUNG                                 |
+----+---------------------------------------------------------------------+
```

- Thanh bên (`nav`, tên "Điều hướng chính") có hai mục "Dịch vụ" (S1, S2, S3) và "Theo dõi giao dịch" (S4, S5). Mục đang mở được tô nền indigo-50, viền trái 2px indigo, kèm `aria-current="page"`. Sidebar không có hồ sơ người dùng, vì ứng dụng không có đăng nhập [IC].
- Header (`header`) chỉ có nhãn môi trường "UAT" và múi giờ cố định. Đồng hồ chạy từng giây của Stitch bị bỏ [D1].
- Ở 1024–1279px thanh hẹp mở rộng tạm thời thành 240px đè lên nội dung khi bấm nút "Mở rộng điều hướng"; đóng bằng Esc hoặc khi chọn mục.
- Dưới 1024px: không thiết kế riêng, chỉ hiện một banner phía trên vùng nội dung "Cửa sổ hẹp hơn 1024px nên giao diện có thể khó dùng. Hãy mở rộng cửa sổ hoặc giảm mức phóng to." kèm nút "Đóng". Nội dung vẫn hiện bình thường, cuộn ngang khi cần, không bị chặn [D15].
- Bỏ khỏi Stitch (ngoài phạm vi): Endpoint Receiver, Gateway Port, mTLS, phiên bản API Spec, thẻ thống kê, banner "System & Protocol Advisory" [RM].

### Quy ước hiển thị dùng chung

| Thành phần | Quy ước | Nguồn |
|---|---|---|
| Thời gian | `yyyy-MM-dd HH:mm:ss`, đứng sau là nhãn cột hoặc dòng chú thích "(GMT+7)". Khi cần cả hai múi: giờ Việt Nam trước, UTC trong ngoặc, ví dụ `2026-10-19 10:00:00 (UTC 03:00:00Z)`. | FR4.6 |
| Mã HTTP | Chip phông mono: 2xx xanh lá, 4xx/5xx đỏ, luôn kèm chữ số (không chỉ màu). | DESIGN.md |
| Status nghiệp vụ | Chip phông mono, nền xám trung tính, viền xám, chữ nguyên văn (không đổi hoa thường). Không dùng màu xanh/đỏ. | FR8.4, [W] |
| Kết quả mapping | Chip có chữ: "Hợp lệ" (xanh lá), "Lỗi" (đỏ), "Cảnh báo" (vàng). Mỗi chip kèm biểu tượng khác hình dạng: ✓, ✕, !. | NFR4 |
| Kết quả xử lý của một lần nhận | "Thành công", "Lỗi mapping", "Bị từ chối: <lý do>". Lý do: Sai API key, Thiếu API key, JSON hoặc Content-Type không hợp lệ, Dịch vụ tắt, Dịch vụ đã xóa. | FR3.8, FR10.2 |
| Giá trị trống | Gạch "—" kèm chữ ẩn cho trình đọc màn hình ("không có giá trị"). | AC3.1.3 |
| Mã, URL, JSON, đường dẫn JSON | Phông JetBrains Mono. | DESIGN.md |
| Dịch vụ đã xóa | Hậu tố "(đã xóa)" trong chữ, màu xám đậm. | FR8.2 |
| Nút sao chép | Biểu tượng 28px, nhãn "Sao chép …"; sau khi bấm đổi thành dấu tích 1,5 giây và thông báo "Đã sao chép". | [G10] |

---

## S1. Danh sách dịch vụ

Truy vết: US2.1, US2.7, US2.8, mở đầu US2.2/US2.3/US2.10; FR1.1, FR1.4, FR1.11, FR1.12.

```
+-----------------------------------------------------------------------------------+
| Dịch vụ callback                                              [ + Tạo dịch vụ ]   |
| [🔍 Tìm theo mã hoặc tên           ]   ( Tất cả ) ( Đang bật ) ( Đã tắt )          |
+-----------------------------------------------------------------------------------+
| Mã       | Tên và mô tả        | URL callback                | Xác thực | Trạng thái|
|----------|---------------------|-----------------------------|----------|-----------|
| thu-ho   | Thu hộ              | POST http://…/callbacks/    | API_KEY  | (●) Đang  |
|          | Nhận kết quả thu... |      thu-ho            [⧉]  |          |     bật   |
|          |                     |                             |          |           |
|          |          Thao tác:  [Gửi thử]  [Sửa]  [Xóa]                              |
|----------|---------------------|-----------------------------|----------|-----------|
| chi-ho   | Chi hộ              | POST http://…/callbacks/    | NONE     | (●) Đang  |
| ...      |                     |      chi-ho            [⧉]  |          |     bật   |
+-----------------------------------------------------------------------------------+
```

Thực tế cột "Thao tác" nằm cùng hàng với các cột khác ở ≥1280px (hình trên tách dòng để vừa khung chữ).

Vùng và nội dung:

- **Tiêu đề** (h1) "Dịch vụ callback" và nút chính "Tạo dịch vụ" (mở S2 ở chế độ tạo).
- **Tìm kiếm** theo mã hoặc tên (lọc ngay trên danh sách đã tải, không phân biệt hoa thường) và nhóm nút chọn một "Tất cả / Đang bật / Đã tắt".
- **Bảng** các cột: Mã (mono), Tên và mô tả (mô tả cắt một dòng, đầy đủ xem ở S2), URL callback (chip `POST` + địa chỉ đầy đủ mono + nút "Sao chép URL"), Xác thực (chip `NONE` hoặc `API_KEY`), Trạng thái (công tắc kèm chữ "Đang bật" / "Đã tắt"), Thao tác ("Gửi thử", "Sửa", "Xóa"). Thứ tự dòng: theo mã tăng dần.
- Dịch vụ đã xóa không hiện ở đây.
- Địa chỉ gốc của URL lấy từ cấu hình frontend, mặc định là địa chỉ trang đang mở; chốt ở Code Generation [D8].

| Trạng thái | Hiển thị |
|---|---|
| Đang tải | 5 dòng khung xám tĩnh; bảng có `aria-busy="true"`. |
| Chưa có dịch vụ nào | "Chưa có dịch vụ nào." + nút "Tạo dịch vụ" + dòng gợi ý "Có thể tạo nhanh ba dịch vụ mẫu bằng script trong `docs/samples/`." Không tự tạo dịch vụ nào (AC2.11.4). |
| Tìm hoặc lọc không khớp | "Không có dịch vụ khớp bộ lọc." + nút "Xóa bộ lọc". |
| Lỗi tải | Banner đỏ "Không tải được danh sách dịch vụ." + nút "Thử lại". |
| Đổi trạng thái đang xử lý | Công tắc của dòng đó bị khóa, chữ "Đang lưu…"; không đổi trạng thái hiển thị trước khi server trả lời. |
| Đổi trạng thái lỗi | Công tắc giữ trạng thái cũ; thông báo "Không đổi được trạng thái của <mã>. Thử lại." (AC2.7.3). |
| Thành công | Trạng thái và chữ đổi sau khi server xác nhận; thông báo ngắn "Đã tắt <mã>" / "Đã bật <mã>". |

### S1a. Hộp thoại xác nhận xóa

```
+-----------------------------------------------------------+
| Xóa dịch vụ "thu-ho"?                                     |
| URL callback sẽ trả 404. Lịch sử callback và giao dịch    |
| vẫn tra cứu được. Mã "thu-ho" không dùng lại được.        |
|                               [ Hủy ]  [ Xóa dịch vụ ]    |
+-----------------------------------------------------------+
```

- Là hộp thoại cảnh báo (`alertdialog`). Tiêu điểm vào nút "Hủy". Esc hoặc "Hủy" đóng và không đổi gì (AC2.8.1). "Xóa dịch vụ" là nút đỏ.
- Trong lúc xóa: nút "Đang xóa…", cả hai nút bị khóa. Lỗi: thông báo ngay trong hộp thoại, hộp thoại giữ mở.
- Xong: dịch vụ biến khỏi danh sách, tiêu điểm chuyển về nút "Tạo dịch vụ", thông báo "Đã xóa <mã>".

---

## S2. Cấu hình dịch vụ (tạo mới / sửa)

Truy vết: US2.2, US2.3, US2.4, US2.5, US2.6, US2.7, US2.9; FR1.2–FR1.10, FR2.

```
+-----------------------------------------------------------------------------------+
| Dịch vụ / Sửa: thu-ho                                  [ Gửi callback thử ]       |
| Cấu hình dịch vụ                                                                   |
| ! Có 2 lỗi cần sửa: Tên header API key, Đường dẫn status           (khi lưu lỗi)  |
+---------------------------------------+-------------------------------------------+
| A. Thông tin chung                    | B. Xác thực                                |
| [●] Dịch vụ đang bật                  | (  ) NONE   (●) API_KEY                    |
| Mã dịch vụ  thu-ho  🔒 (không đổi)    | Tên header   [ X-API-KEY            ]      |
| Tên         [ Thu hộ              ]   | Giá trị khóa [ Đã cấu hình khóa      ]     |
| Mô tả       [ Nhận kết quả thu... ]   |   Để trống để giữ khóa hiện tại            |
| URL  POST http://…/callbacks/thu-ho ⧉ |   Khóa không hiển thị lại sau khi lưu.     |
+---------------------------------------+-------------------------------------------+
| C. Mapping                                                                         |
| transactionId (bắt buộc)  $. [ transId            ]                                |
| status        (bắt buộc)  $. [ code               ]                                |
| timestamp     (tùy chọn)  $. [ time               ]                                |
| Định dạng thời gian [ ISO 8601 ▾ ]  Mẫu chuỗi (khi chọn "Mẫu chuỗi") [ yyyy-MM-dd… ]|
| Múi giờ khi chuỗi không có múi giờ  [ Asia/Ho_Chi_Minh ▾ ]                         |
+-----------------------------------------------------------------------------------+
| D. Thử mapping            Không lưu dữ liệu, không tạo callback hay giao dịch      |
| [Mẫu hợp lệ] [Mẫu thiếu trường] [Định dạng JSON]                                   |
| +-----------------------------------+  +----------------------------------------+ |
| | JSON mẫu                          |  | Kết quả (theo cấu hình đang nhập)      | |
| | { "transId": "TEST-001",          |  | transactionId  TEST-001   ✓ Hợp lệ     | |
| |   "code": "SAMPLE", ...           |  | status         SAMPLE     ✓ Hợp lệ     | |
| +-----------------------------------+  | timestamp 2026-10-19T03:00:00Z ✓ Hợp lệ| |
| JSON không hợp lệ: …(nếu sai)           |   2026-10-19 10:00:00 (GMT+7)          | |
| [ Kiểm tra mapping ]                    +----------------------------------------+ |
+-----------------------------------------------------------------------------------+
| E. Response trả về cho ngân hàng                                                   |
| HTTP status [ 200 ] (200–599)    Body JSON  [Định dạng JSON]                       |
| +-------------------------------------------------------------------------------+ |
| | { "code": "00", "message": "OK" }                                             | |
| +-------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
| (thanh cố định cuối trang)             [ Hủy thay đổi ]   [ Lưu cấu hình ]         |
+-----------------------------------------------------------------------------------+
```

Vùng và nội dung:

- **Đầu trang:** đường dẫn "Dịch vụ / Tạo mới" hoặc "Dịch vụ / Sửa: <mã>"; h1 "Cấu hình dịch vụ"; nút "Gửi callback thử" bên phải. Nút này khóa khi đang tạo mới hoặc khi biểu mẫu có thay đổi chưa lưu, kèm dòng giải thích "Lưu cấu hình trước khi gửi thử." vì trang gửi thử dùng cấu hình đã lưu [D2].
- **A. Thông tin chung:** công tắc "Dịch vụ đang bật" (mặc định bật khi tạo); "Mã dịch vụ" nhập được khi tạo (xem trước URL cập nhật theo mã gõ), chỉ đọc kèm biểu tượng khóa khi sửa (AC2.3.1); "Tên"; "Mô tả" (nhiều dòng); "URL callback" chỉ đọc kèm nút sao chép.
- **B. Xác thực:** nhóm chọn một NONE / API_KEY. Khi API_KEY mới hiện "Tên header" và "Giá trị khóa" (ô che, có nút "Hiện/Ẩn" chỉ tác dụng với chuỗi vừa gõ). Khi sửa dịch vụ đã có khóa, ô hiện chữ "Đã cấu hình khóa" (không phải giá trị thật) và gợi ý "Để trống để giữ khóa hiện tại"; gõ khóa mới sẽ thay khóa cũ (AC2.4.2–AC2.4.4). Đổi sang NONE thì ẩn hai ô (AC2.4.5).
- **C. Mapping:** ba ô đường dẫn mono với tiền tố `$.` cố định bên trái ô; transactionId và status có dấu "bắt buộc" bằng chữ; timestamp "tùy chọn". Lựa chọn định dạng: ISO 8601, Unix giây, Unix mili giây, Mẫu chuỗi. Ô "Mẫu chuỗi" chỉ hiện khi chọn "Mẫu chuỗi", kèm ví dụ `yyyy-MM-dd HH:mm:ss`. Múi giờ mặc định `Asia/Ho_Chi_Minh`. Định dạng và múi giờ bị khóa (giữ giá trị) khi ô đường dẫn timestamp để trống, kèm chữ "Chỉ dùng khi có đường dẫn timestamp" [D3].
- **D. Thử mapping:** ô JSON mẫu (xem Q4: ô nhiều dòng mono), ba nút mẫu: "Mẫu hợp lệ" (dựng JSON từ ba đường dẫn đang nhập, giá trị giả `TEST-001`, `SAMPLE`, thời gian hiện tại theo định dạng đang chọn), "Mẫu thiếu trường" (như trên, bỏ trường status) và "Định dạng JSON". Nút "Kiểm tra mapping" chạy theo **cấu hình đang nhập trên form**, kể cả chưa lưu (FR2.3). Kết quả gồm bảng ba dòng (trường, giá trị mono, chip kết quả kèm lý do); dòng timestamp thêm UTC và giờ Việt Nam. Khi biểu mẫu hoặc JSON mẫu đổi sau lần kiểm tra, kết quả hiện chữ xám "Kết quả đã cũ, hãy kiểm tra lại" [D4].
- **E. Response:** ô số HTTP status và ô body JSON mono kèm nút "Định dạng JSON"; sai khoảng 200–599 hoặc sai JSON thì báo ngay dưới ô (AC2.6.2, AC2.6.3).
- **Thanh cố định cuối trang:** "Hủy thay đổi" (đưa biểu mẫu về bản đã lưu; khóa khi chưa có thay đổi) và "Lưu cấu hình" (nút chính).

| Trạng thái | Hiển thị |
|---|---|
| Đang tải dịch vụ (chế độ sửa) | Khung xám cho từng khối A–E; thanh cuối trang khóa. |
| Không tìm thấy dịch vụ (đã xóa hoặc sai mã) | Trang thay bằng "Không tìm thấy dịch vụ <mã>." + liên kết "Về danh sách dịch vụ". |
| Lỗi tải | Banner đỏ + "Thử lại". |
| Lỗi nhập liệu khi lưu | Mọi lỗi hiện cạnh từng ô; đầu trang có dòng tóm tắt liệt kê các ô lỗi, mỗi mục là liên kết nhảy tới ô; tiêu điểm chuyển tới ô lỗi đầu tiên; không có thay đổi nào được lưu (AC2.3.3). |
| Mã trùng | Lỗi ở ô mã: "Mã dịch vụ đã tồn tại (kể cả dịch vụ đã xóa)." (AC2.2.2) |
| Đang lưu | Nút "Đang lưu…", mọi ô khóa tạm. |
| Lưu thành công | Về S1, thông báo "Đã lưu dịch vụ <mã>." |
| Lưu lỗi server | Banner đỏ đầu trang "Không lưu được cấu hình. Thử lại."; dữ liệu đang nhập giữ nguyên. |
| Thử mapping lỗi | Mỗi trường báo riêng: "Không tìm thấy", "Giá trị rỗng", "Sai kiểu (object hoặc mảng)", "Không đọc được theo định dạng"; JSON hỏng thì báo "JSON mẫu không hợp lệ" và không có bảng kết quả (AC2.9.2, AC2.9.3). |
| Thử mapping thiếu timestamp | Chip "Cảnh báo": "Không có trường timestamp" (không phải lỗi, AC1.7.4). |
| Rời trang khi có thay đổi chưa lưu | Hộp thoại "Bỏ các thay đổi chưa lưu?" với "Ở lại" (tiêu điểm mặc định) và "Bỏ thay đổi" [G5]. |

Ở 1024–1279px: khối A và B xếp chồng thành một cột; D xếp ô JSON mẫu trên, kết quả dưới.

---

## S3. Gửi callback thử

Truy vết: US2.10; FR7.

```
+-----------------------------------------------------------------------------------+
| < Quay lại cấu hình                                                                |
| Gửi callback thử   [thu-ho]                                                        |
| ⓘ Callback gửi từ đây đi qua endpoint thật và ĐƯỢC LƯU như callback bình thường.   |
+---------------------------------------------+-------------------------------------+
| POST http://…/callbacks/thu-ho           ⧉  | Kết quả phản hồi                     |
|                                             |                                     |
| Xác thực API_KEY                            | (chưa gửi): "Chưa gửi callback nào." |
| Header  X-API-KEY                           |                                     |
| Giá trị khóa [ ••••••• ] [Hiện]             | Sau khi gửi:                         |
|   Nhập khóa đã cấu hình, hoặc nhập sai để   | HTTP [200]   Thời gian 34 ms         |
|   thử 401. Backend không gửi khóa về đây.   | Body                                |
|                                             | +---------------------------------+ |
| Mẫu: [Thành công] [Lỗi mapping] [Sai key]   | | { "code": "00", "message": ... }| |
| ( Body JSON ) ( Headers )                   | +---------------------------------+ |
| +-----------------------------------------+ | [ Xem trong Theo dõi ]              |
| | { "transId": "TEST-001", "code": ...    | |                                     |
| +-----------------------------------------+ |                                     |
| JSON không hợp lệ: …(nếu sai)  [Định dạng JSON]                                    |
|                              [ Gửi callback ]                                      |
+---------------------------------------------+-------------------------------------+
```

Vùng và nội dung:

- **Đầu trang:** liên kết "Quay lại cấu hình" (về S2 của dịch vụ này), h1 "Gửi callback thử", chip mã dịch vụ. Thông báo cố định (không tắt được) về việc dữ liệu được lưu.
- **Yêu cầu:** dòng `POST <URL>` có sao chép. Khối "Xác thực API_KEY" chỉ hiện với dịch vụ API_KEY: tên header điền sẵn và chỉ đọc; ô giá trị khóa luôn trống khi mở trang, người dùng tự nhập (AC2.10.4). Với dịch vụ NONE khối này không hiện.
- **Mẫu:** "Thành công" (dựng JSON từ đường dẫn mapping đã lưu), "Lỗi mapping" (bỏ trường status), "Sai key" (điền khóa sai; chỉ hiện với dịch vụ API_KEY) [Q5].
- **Body / Headers:** tab "Body JSON" (ô nhiều dòng mono, nút "Định dạng JSON") và tab "Headers" (bảng khóa và giá trị, thêm và xóa dòng). Có sẵn dòng `Content-Type: application/json`, sửa được để thử trường hợp 400 (AC1.4.2). Header API key không nằm ở bảng này mà ở khối xác thực (AC2.10.6 vẫn thêm được header tùy ý).
- **Kết quả phản hồi:** vùng thông báo lịch sự. Gồm chip HTTP, thời gian phản hồi tính bằng ms (đo ở trình duyệt từ lúc gửi tới khi nhận đủ phản hồi), body trong khung xem JSON (nếu không phải JSON thì hiện văn bản nguyên văn), nút "Xem trong Theo dõi" mở S4 đã lọc theo dịch vụ này và transactionId vừa gửi nếu lấy được [G9].

| Trạng thái | Hiển thị |
|---|---|
| Mở trang | Kết quả: "Chưa gửi callback nào." Nút gửi bật. |
| Đang gửi | Nút "Đang gửi…" khóa; kết quả: "Đang gửi…". Không cho gửi chồng. |
| Phản hồi 2xx | Chip xanh lá, body đã cấu hình. |
| Phản hồi 4xx/5xx (401, 400, 503, 404, 500…) | Chip đỏ, body (nếu có) và dòng giải thích ngắn: 401 "Sai hoặc thiếu API key", 400 "JSON hoặc Content-Type không hợp lệ", 503 "Dịch vụ đang tắt", 404 "Dịch vụ không tồn tại hoặc đã xóa", 500 "Server không lưu được callback". Callback bị từ chối vẫn được lưu (trừ 413 và serviceCode chưa từng có). |
| Phản hồi 413 | Giải thích "Body vượt quá 1 MB, callback không được lưu." |
| Không kết nối được | Banner đỏ "Không gửi được request tới server." và không hiện chip HTTP. |
| JSON ở ô Body sai | Cho phép gửi, vì người kiểm thử cần thử 400; ô báo vàng "JSON không hợp lệ, server sẽ trả 400" [D5]. |
| Dịch vụ không còn (đã xóa lúc đang mở) | Gửi sẽ nhận 404 và hiện như trên. |

Ở 1024–1279px: ô kết quả xếp dưới phần yêu cầu.

---

## S4. Theo dõi giao dịch & callback

Truy vết: US3.1, US3.2, US3.3, US3.5, US3.6, US3.8, US3.9; FR8, FR10, FR11.

```
+-----------------------------------------------------------------------------------+
| Theo dõi giao dịch & Callback                                                      |
| Dịch vụ [Tất cả ▾]  transactionId [        ]  Status [        ]                    |
| Nhận từ [2026-10-19 00:00:00]  đến [2026-10-19 23:59:59]   (GMT+7)                 |
|                                        [ Xóa bộ lọc ] [ Áp dụng ]                  |
| (●) Tự cập nhật mỗi 5 giây     Cập nhật lúc 10:25:02 (GMT+7)       [ ⟳ Tải lại ]   |
+-----------------------------------------------------------------------------------+
| [ Giao dịch ]  [ Tất cả callback ]                                                 |
+-----------------------------------------------------------------------------------+
| Dịch vụ | transactionId | Status gần nhất | Thời gian     | Nhận gần nhất | Số    |  |
|         |               |                 | nghiệp vụ     | (GMT+7)       | cb    |  |
|---------|---------------|-----------------|---------------|---------------|-------|--|
| thu-ho  | TEST-001      | [SAMPLE]        | 2026-10-18... | 10:24:15      | 3     |Xem|
| chi-ho  | PRC-77        | — thiếu giá trị | —             | 10:23:50      | 4     |Xem|
|         |               | ✕ Lỗi mapping   |               |               |       |  |
|---------|---------------|-----------------|---------------|---------------|-------|--|
| Hiển thị 1–20 trong 128    Dòng mỗi trang [20 ▾]          < 1 2 3 … 7 >           |
+-----------------------------------------------------------------------------------+
```

Tab "Tất cả callback":

```
| Kết quả xử lý [Tất cả ▾]   Lý do [Tất cả lý do ▾] (chỉ khi chọn "Bị từ chối")      |
|------------------------------------------------------------------------------------|
| Nhận lúc (GMT+7) | Dịch vụ | transactionId | Status | Kết quả xử lý        | HTTP   |
| 10:24:15         | thu-ho  | TEST-001      | [SAMPLE]| ✓ Thành công        | [200]  | Xem
| 10:23:50         | chi-ho  | —             | —      | ✕ Lỗi mapping: thiếu transactionId | [200] | Xem
| 10:22:01         | thu-ho  | —             | —      | ⛔ Bị từ chối: Sai API key | [401] | Xem
```

Vùng và nội dung:

- **Bộ lọc:** "Dịch vụ" (danh sách chọn gồm "Tất cả", các dịch vụ còn hoạt động và dịch vụ đã xóa có hậu tố "(đã xóa)"), "transactionId" và "Status" (nhập chữ, lọc theo "chứa chuỗi", không phân biệt hoa thường), "Nhận từ / đến" (ô văn bản dạng `yyyy-MM-dd HH:mm:ss`, chính xác tới giây, giờ Việt Nam, tính cả hai đầu; gõ tắt `yyyy-MM-dd` được hiểu là 00:00:00 cho ô "từ" và 23:59:59 cho ô "đến") [D6]. Enter trong ô chữ hoặc nút "Áp dụng" mới áp dụng; "Xóa bộ lọc" đưa về mặc định. Mặc định không giới hạn thời gian.
- **Tab "Giao dịch":** các bộ lọc ở trên (đủ năm ô). **Tab "Tất cả callback":** ẩn ô "Status" (FR10.2 không có bộ lọc status) và thêm "Kết quả xử lý" (Tất cả, Thành công, Lỗi mapping, Bị từ chối) và "Lý do" (chỉ khi chọn "Bị từ chối") [D7]. Mỗi tab giữ bộ lọc và trang riêng khi chuyển qua lại [D9].
- **Thanh cập nhật:** công tắc "Tự cập nhật mỗi 5 giây" (mặc định bật), dòng "Cập nhật lúc HH:mm:ss (GMT+7)", nút "Tải lại".
- **Tab "Giao dịch":** cột Dịch vụ, transactionId (mono), Status gần nhất (chip trung tính), Thời gian nghiệp vụ của callback gần nhất, Nhận gần nhất, Số callback, nút "Xem". Sắp theo "Nhận gần nhất" mới trước, hòa nhau theo mã.
- **Tab "Tất cả callback":** cột Nhận lúc, Dịch vụ, transactionId (— nếu không có), Status (— nếu không có), Kết quả xử lý (chip có biểu tượng và chữ), HTTP, nút "Xem". Mới nhất trước.
- **Phân trang:** dòng "Hiển thị 1–20 trong 128", ô "Dòng mỗi trang" (20, 50, 100), nút Trước/Sau và số trang (rút gọn bằng dấu … khi nhiều).
- Dòng được chọn (đang mở ở S5): nền indigo-50, viền trái 2px indigo.

| Trạng thái | Hiển thị |
|---|---|
| Đang tải lần đầu | 8 dòng khung xám tĩnh. |
| Đang tự cập nhật | Không đổi giao diện; chỉ cập nhật dữ liệu, giữ trang, bộ lọc, vị trí cuộn và ngăn chi tiết đang mở (AC3.8.2). |
| Chưa có dữ liệu | Tab Giao dịch: "Chưa có giao dịch nào. Gửi callback bằng cURL hoặc trang Gửi thử." Tab Tất cả callback: "Chưa nhận callback nào." |
| Bộ lọc không khớp | "Không có dữ liệu khớp bộ lọc." + nút "Xóa bộ lọc". Khác hẳn thông báo lỗi tải (AC3.2.5). |
| Lỗi tải lần đầu (chưa có dữ liệu) | Banner đỏ "Không tải được dữ liệu." + "Thử lại". |
| Lỗi khi tự cập nhật | Giữ dữ liệu cũ; banner vàng phía trên bảng "Không cập nhật được. Đang hiển thị dữ liệu lúc 10:25:02 (GMT+7)." Lần cập nhật sau thành công thì banner mất (AC3.9.1, AC3.9.2). |
| Lần tải trước chưa xong | Bỏ qua lần tự cập nhật kế tiếp (AC3.9.3). |
| Tự cập nhật tắt | Dòng "Tự cập nhật đang tắt"; dữ liệu chỉ đổi khi bấm "Tải lại" hoặc "Áp dụng" (AC3.8.3). |
| Bộ lọc sai | Ô ngày giờ "từ" sau "đến": lỗi cạnh ô "Thời gian bắt đầu phải trước thời gian kết thúc"; không gọi server. |
| Dòng đang mở bị đẩy khỏi trang (có callback mới) | Ngăn chi tiết vẫn mở với dữ liệu của giao dịch đó; dòng nền xanh nhạt chỉ hiện nếu còn trên trang. |

Ở 1024–1279px: bảng nằm trong khung cuộn ngang với tiêu đề cột cố định; thanh bộ lọc xuống hai dòng.

---

## S5. Ngăn chi tiết (bảng trượt bên phải)

Truy vết: US3.4 (giao dịch), US3.7 (một lần nhận); FR9, FR10.4.

### S5a. Chi tiết giao dịch (mở từ tab "Giao dịch")

```
 (danh sách S4 vẫn thấy, mờ nhẹ)        +--------------------------------------------+
                                         | thu-ho  TEST-001 ⧉   [SAMPLE]    [ ✕ Đóng ] |
                                         | 3 callback · status lấy từ lần nhận gần nhất |
                                         +--------------------------------------------+
                                         | Lịch sử callback (theo thứ tự nhận)        |
                                         |  #1  10:20:11  [200]  SAMPLE               |
                                         |  #2  10:22:04  [200]  SAMPLE               |
                                         | ▸#3  10:24:15  [200]  SAMPLE   (đang xem)  |
                                         +--------------------------------------------+
                                         | Nhận lúc  2026-10-19 10:24:15 (GMT+7)      |
                                         | Thời gian nghiệp vụ                        |
                                         |   2026-10-19 10:24:00 (UTC 03:24:00Z)      |
                                         | Cấu hình áp dụng: phiên bản 2              |
                                         | Mapping                                    |
                                         |  transactionId TEST-001 $.transId ✓ Hợp lệ |
                                         |  status        SAMPLE   $.code    ✓ Hợp lệ |
                                         |  timestamp     …        $.time    ✓ Hợp lệ |
                                         | Headers (đã che)                           |
                                         |  X-API-KEY  ***     X-Request-Id  abc      |
                                         | Payload gốc                  [Sao chép]    |
                                         | +----------------------------------------+ |
                                         | | 1 { "transId": "TEST-001", ...         | |
                                         | +----------------------------------------+ |
                                         | Response đã trả   [200]    [Sao chép]      |
                                         | +----------------------------------------+ |
                                         | | 1 { "code": "00" }                     | |
                                         | +----------------------------------------+ |
                                         +--------------------------------------------+
```

- Rộng 560px ở ≥1280px, 480px ở 1024–1279px. Là ngăn có tiêu điểm bị giữ bên trong, có lớp phủ rất nhạt; danh sách phía sau vẫn tự cập nhật nhưng không thao tác được cho tới khi đóng [G6].
- Danh sách "Lịch sử callback" xếp theo thứ tự nhận (tăng dần), mỗi mục là nút chọn một: số thứ tự, giờ nhận, mã HTTP, status. Khi mở, chọn sẵn lần nhận gần nhất và cuộn tới nó. Danh sách cao tối đa 160px và cuộn.
- Phần "Mapping" là bảng ba dòng: trường, giá trị, đường dẫn đã dùng, chip kết quả kèm lý do khi lỗi. Giá trị trống hiện "—".
- "Headers (đã che)" là bảng khóa và giá trị mono; `Authorization`, `Proxy-Authorization`, `Cookie` và header API key hiện `***`; header khác hiện nguyên văn (AC1.12.1, AC1.12.4).
- Mỗi lần nhận có "Cấu hình áp dụng: phiên bản N", vì sửa cấu hình sau đó không đổi kết quả cũ (AC1.13).

| Trạng thái | Hiển thị |
|---|---|
| Đang tải chi tiết | Khung xám cho từng khối; nút Đóng vẫn dùng được. |
| Lỗi tải chi tiết | Banner đỏ trong ngăn "Không tải được chi tiết." + "Thử lại". |
| Callback có lỗi mapping | Dòng mapping của trường lỗi hiện chip đỏ "Lỗi" kèm lý do; trường còn lại hiện giá trị bình thường. |
| Không có response (bị từ chối) | Khối "Response đã trả" hiện mã HTTP và body đã trả cho lần đó (ví dụ 401). |
| Payload rất lớn | Khung xem JSON có chiều cao tối đa 320px và cuộn; hiện số byte. |

### S5b. Chi tiết một lần nhận (mở từ tab "Tất cả callback")

Cùng bố cục S5a nhưng **không có** danh sách "Lịch sử callback"; tiêu đề ngăn là "<dịch vụ> · Nhận lúc <giờ>". Thêm chip "Kết quả xử lý". Với request bị từ chối vì body không phải JSON (AC3.7.2): khối "Body nhận được" là văn bản nguyên văn trong khung mono (không tô màu cú pháp, không định dạng), kèm mã HTTP và lý do từ chối. Khối "Mapping" thay bằng dòng "Không áp dụng vì request bị từ chối." khi bị từ chối trước bước mapping. Với callback lỗi timestamp (AC3.7.3): dòng timestamp hiện giá trị gốc và thông báo "Không đọc được theo định dạng đã cấu hình".

### Khung xem JSON (dùng ở S2, S3, S5)

```
+---------------------------------------------------------------+
| Payload gốc · 214 byte    ( Định dạng đẹp | Nguyên văn )  [⧉] |
+----+----------------------------------------------------------+
|  1 | {                                                        |
|  2 |   "transId": "TEST-001",                                 |
|  3 |   "code": "SAMPLE"                                       |
|  4 | }                                                        |
+----+----------------------------------------------------------+
```

- Chỉ đọc. Gồm tên khung, số byte, nút chuyển "Định dạng đẹp / Nguyên văn" (nhóm chọn một), nút sao chép, số dòng (không chọn được khi bôi đen), tô màu cú pháp. Không có thanh truy vấn JSONPath và không có chế độ tối [Q3] [G3].
- Chuỗi không phải JSON hợp lệ chỉ có chế độ "Nguyên văn". Khung nhận tiêu điểm bàn phím để cuộn bằng phím mũi tên.

---

## Truy vết story → màn hình

| Story | Màn hình / vùng | Ghi chú |
|---|---|---|
| US1.1–US1.14 | Không có giao diện riêng | Hành vi của endpoint và API tra cứu; kết quả xem được ở S3, S4, S5. Trải nghiệm gọi API ghi ở cuối tài liệu. |
| US2.1 | S1 | Danh sách, sao chép URL, trạng thái trống. |
| US2.2 | S1 (nút) → S2 (tạo) | Kiểm tra mã ở ô "Mã dịch vụ". |
| US2.3 | S1 (nút "Sửa") → S2 (sửa) | Ô mã chỉ đọc. |
| US2.4 | S2 khối B | Khóa che, "Để trống để giữ khóa hiện tại". |
| US2.5 | S2 khối C | Tiền tố `$.`, lỗi đường dẫn và mẫu chuỗi. |
| US2.6 | S2 khối E | Khoảng 200–599, JSON hợp lệ. |
| US2.7 | S1 công tắc, S2 khối A | Không đổi hiển thị trước khi server xác nhận. |
| US2.8 | S1, S1a | Lịch sử vẫn xem ở S4 với nhãn "(đã xóa)". |
| US2.9 | S2 khối D | Dùng cấu hình đang nhập. |
| US2.10 | S3 | Khóa API luôn nhập tay. |
| US2.11 | Không có màn hình | Gợi ý ở trạng thái trống của S1. |
| US3.1–US3.3 | S4 tab "Giao dịch" | |
| US3.4 | S5a | |
| US3.5–US3.6 | S4 tab "Tất cả callback" | |
| US3.7 | S5b | |
| US3.8–US3.9 | S4 thanh cập nhật | |
| US4.1–US4.10 | Không thiết kế | Won't Have. |

## Trải nghiệm API (phía lập trình viên gọi endpoint)

Giao diện không thay endpoint; phần này chỉ ghi điều người gọi `POST /callbacks/{serviceCode}` thấy, để màn hình S3 và S5 hiện cùng ngôn ngữ.

| Điều kiện | Mã trả về | Nhãn hiển thị trên giao diện |
|---|---|---|
| Dịch vụ không tồn tại hoặc đã xóa | 404 | Dịch vụ không tồn tại / Dịch vụ đã xóa |
| Dịch vụ đang tắt | 503 | Dịch vụ tắt |
| API key sai hoặc thiếu | 401 | Sai API key / Thiếu API key |
| Content-Type không phải JSON hoặc JSON hỏng | 400 | JSON hoặc Content-Type không hợp lệ |
| Body quá 1 MB | 413 | (không lưu) |
| Lỗi lưu | 500 | (không có response cấu hình) |
| Thành công (kể cả lỗi mapping) | Response đã cấu hình | Thành công / Lỗi mapping |

Cách chốt hợp đồng response cho các mã lỗi (nội dung body) thuộc bước thiết kế hợp đồng sau; giao diện chỉ hiện nguyên văn những gì server trả.

## Sources

- `docs/brief.md` mục 3, 5, 6 (chức năng và hành vi).
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/ideation/rough-mockups/wireframes.md`, `user-flow.md`.
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/requirements-analysis/requirements.md`.
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/user-stories/stories.md`.
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/practices-discovery/team-practices.md`.
- `docs/design/stitch/stitch_tpp_callback_simulator_ui/` (màn hình và `tpp_callback_simulator/DESIGN.md`).
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/refined-mockups/refined-mockups-questions.md` (Q1–Q5 và 12 giả định đã chấp nhận).

## Assumptions & Open Questions

Những quyết định dưới đây tôi đã chọn khi thiết kế chi tiết và chưa được bạn trả lời trực tiếp. Nếu muốn đổi, nói rõ mã [D…] khi xem lại:

- **[D1]** Header chỉ có nhãn "UAT" và múi giờ cố định, bỏ đồng hồ chạy từng giây của Stitch, vì đồng hồ làm trình đọc màn hình và mắt người dùng bị nhiễu mà không giúp việc theo dõi; thời điểm cập nhật dữ liệu đã có ở thanh cập nhật.
- **[D2]** Nút "Gửi callback thử" ở S2 khóa khi đang tạo mới hoặc có thay đổi chưa lưu, vì S3 gửi qua endpoint thật theo cấu hình đã lưu.
- **[D3]** Ở S2, định dạng thời gian và múi giờ bị khóa (giữ giá trị) khi đường dẫn timestamp để trống.
- **[D4]** Kết quả "Kiểm tra mapping" hiện chữ "đã cũ" khi biểu mẫu hoặc JSON mẫu đổi sau lần kiểm tra.
- **[D5]** Ở S3, JSON sai vẫn cho gửi (để thử 400), chỉ cảnh báo.
- **[D6]** Bộ lọc thời gian nhận chính xác tới giây, giờ Việt Nam, tính cả hai đầu: "đến 11:00:00" gồm các lần nhận tới hết giây 11:00:00. Điều này làm rõ góp ý "độ chính xác bộ lọc thời gian" của lần xem lại User Stories.
- **[D7]** Wireframe S4 có bộ lọc "Kết quả mapping" (Hợp lệ/Lỗi) cho tab "Tất cả callback". Yêu cầu FR10.2 sau đó mở rộng thành "Kết quả xử lý" gồm cả "Bị từ chối" kèm lý do, nên thiết kế dùng bộ lọc "Kết quả xử lý" thay cho bộ lọc cũ; ô "Status" chỉ có ở tab "Giao dịch" vì FR10.2 không có bộ lọc status.
- **[D8]** Địa chỉ gốc của URL callback hiển thị lấy từ cấu hình frontend, mặc định là địa chỉ trang đang mở. Khi chạy dev có Vite proxy, giá trị này có thể khác địa chỉ backend mà hệ thống ngân hàng thật gọi tới; chốt ở Code Generation.
- **[D9]** Mỗi tab của S4 giữ bộ lọc và trang riêng khi chuyển qua lại.
- **[D10]** "Tên" của dịch vụ là bắt buộc, "Mô tả" là tùy chọn. Requirements chỉ nói danh sách hiển thị tên và mô tả (FR1.1), chưa nói bắt buộc hay không.
- **[D11]** Khi ngăn chi tiết đang mở, danh sách lịch sử của giao dịch cập nhật cùng nhịp tự cập nhật; lần nhận đang chọn không tự nhảy, chỉ hiện chữ "Có N callback mới".
- **[D12]** Làm rõ giả định G8: dòng "Cập nhật lúc" đổi chữ mỗi lần tải thành công, nhưng vùng thông báo cho trình đọc màn hình chỉ nói khi người dùng bấm "Tải lại", khi tổng số dòng đổi, khi lỗi và khi phục hồi sau lỗi, để không đọc lại mỗi 5 giây.
- **[D13]** Giá trị mặc định khi tạo dịch vụ: bật, xác thực NONE, ISO 8601, múi giờ `Asia/Ho_Chi_Minh`, response `200` với body `{}`.
- **[D15]** Dưới 1024px chỉ có banner cảnh báo có thể đóng, không chặn nội dung, thay vì thay màn hình bằng thông báo. Lý do: người dùng phóng to trình duyệt 200% trên màn hình 1920px chỉ còn 960px CSS, và chặn hẳn sẽ làm người cần phóng to không dùng được công cụ. Vẫn đúng quyết định "dưới 1024px không hỗ trợ" vì không có bố cục riêng.
- **[D14]** Bấm "Mẫu hợp lệ", "Mẫu thiếu trường" hay một mẫu ở S3 khi ô đang có nội dung người dùng tự gõ thì hỏi xác nhận trước khi ghi đè.
- Giới hạn "1 MB" (1.000.000 hay 1.048.576 byte) là quyết định hợp đồng, thuộc bước thiết kế sau; giao diện chỉ hiển thị "1 MB".
