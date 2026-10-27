# Wireframes — TPP Callback Simulator (MVP)

## Nguồn và nguyên tắc

- Bố cục và phong cách lấy từ thiết kế Google Stitch tại `docs/design/stitch/stitch_tpp_callback_simulator_ui/` (5 màn hình `screen.png`/`code.html` và `DESIGN.md`). [Q6]
- Nội dung chức năng theo `docs/brief.md`, intent statement và scope document. Khi thiết kế khác brief thì giữ brief. [Q6]
- Chỉ tối ưu cho trình duyệt trên máy tính. [Q1]
- Đây là wireframe mức thấp: mô tả vùng và thành phần, không chốt kích thước hay màu chính xác.

## Khung chung (mọi màn hình)

```
+----------------------+----------------------------------------------------+
| TPP Simulator [UAT]  |  Thanh trên: tên ứng dụng | Múi giờ: Asia/Ho_Chi_Minh |
| Múi giờ: GMT+7       +----------------------------------------------------+
|                      |                                                    |
| > Dịch vụ            |                 VÙNG NỘI DUNG CHÍNH                |
|   Theo dõi giao dịch |                                                    |
|                      |                                                    |
+----------------------+----------------------------------------------------+
```

- Thanh bên trái có hai mục "Dịch vụ" và "Theo dõi giao dịch"; mục đang chọn được tô nền. [Q2]
- Mọi thời gian hiển thị theo Asia/Ho_Chi_Minh và ghi rõ múi giờ (brief mục 6).
- Bỏ các phần trong thiết kế nằm ngoài phạm vi: "Endpoint Receiver", "Gateway Port", "mTLS", phiên bản API Spec. [Q6]
- Khả năng truy cập: landmark `nav` (thanh bên), `header` (thanh trên), `main` (nội dung). [Q5]

## S1. Danh sách dịch vụ

Theo màn hình Stitch "Dịch vụ callback - Danh sách".

```
+-----------------------------------------------------------------------+
| Dịch vụ callback                                   [+ Tạo dịch vụ]    |
| [Tìm theo mã hoặc tên...]   (Tất cả | Đang bật | Đã tắt)              |
+-----------------------------------------------------------------------+
| Mã       | Tên / Mô tả      | URL callback                 | Xác thực |
|          |                  |                              | Bật/tắt  | Thao tác          |
|----------+------------------+------------------------------+----------+-------------------|
| thu-ho   | Thu hộ           | POST .../callbacks/thu-ho [⧉]| API_KEY  | [●] Đang bật | Gửi thử Sửa Xóa |
| chi-ho   | Chi hộ           | POST .../callbacks/chi-ho [⧉]| NONE     | [●] Đang bật | Gửi thử Sửa Xóa |
| bien-... | Biến động số dư  | POST .../bien-dong-so-du [⧉] | API_KEY  | [●] Đang bật | Gửi thử Sửa Xóa |
+-----------------------------------------------------------------------+
```

- Cột theo brief mục 3: mã, tên, mô tả, URL callback và nút sao chép, kiểu xác thực, trạng thái bật/tắt.
- Thêm nút **Xóa** (thiết kế chưa có), mở hộp thoại xác nhận S1a. [Q6]
- Bỏ các thẻ thống kê (tổng endpoint, callback 24h, thời gian phản hồi), khối cURL mẫu, retry policy, IP whitelist, chứng chỉ SSL. [Q6]
- Dịch vụ đã xóa không hiện trong danh sách (intent statement).
- A11y: h1 "Dịch vụ callback"; bảng có tiêu đề cột; vào bằng bàn phím từ ô tìm kiếm; nút sao chép có nhãn "Sao chép URL". [Q5]

### S1a. Hộp thoại xác nhận xóa

```
+-----------------------------------------------+
| Xóa dịch vụ "thu-ho"?                         |
| URL callback sẽ trả 404. Lịch sử callback và  |
| giao dịch vẫn tra cứu được. Mã "thu-ho" không |
| dùng lại được.                                |
|                         [Hủy]  [Xóa dịch vụ]  |
+-----------------------------------------------+
```

- A11y: h2 tiêu đề hộp thoại; tiêu điểm vào nút "Hủy"; phím Esc đóng hộp thoại. [Q5]

## S2. Cấu hình dịch vụ và thử mapping (tạo mới / sửa)

Theo màn hình Stitch "Cấu hình dịch vụ". Thử mapping nằm ngay trong trang này. [Q3]

```
+-----------------------------------------------------------------------+
| < Dịch vụ / Sửa: thu-ho                    [Gửi callback thử] [Lưu]   |
+---------------------------------+-------------------------------------+
| A. Thông tin chung   [●] Bật    | B. Xác thực                         |
| Mã dịch vụ: [thu-ho] (khóa)     | ( ) NONE   (●) API_KEY              |
| Tên: [Thu hộ]                   | Tên header: [X-API-KEY]             |
| Mô tả: [...]                    | Giá trị khóa: [••••••••] [hiện]     |
| URL: POST /callbacks/thu-ho [⧉] |                                     |
+---------------------------------+-------------------------------------+
| C. Mapping                                                            |
| transactionId (bắt buộc) [ $.transId ]                                |
| status        (bắt buộc) [ $.code    ]                                |
| timestamp     (tùy chọn) [ $.time    ]                                |
| Định dạng thời gian [ISO 8601 v]  Mẫu chuỗi [yyyy-MM-dd HH:mm:ss]     |
| Múi giờ mặc định [Asia/Ho_Chi_Minh v]                                 |
+-----------------------------------------------------------------------+
| D. Thử mapping (không lưu dữ liệu)       [Mẫu hợp lệ] [Mẫu thiếu trường]|
| +-----------------------------+  +----------------------------------+ |
| | JSON mẫu                    |  | transactionId: "TEST-001"   Hợp lệ| |
| | { "transId": "TEST-001",... |  | status: "SUCCESS"           Hợp lệ| |
| +-----------------------------+  | timestamp: 2026-10-18T...  Hợp lệ | |
| [Kiểm tra mapping]               +----------------------------------+ |
+-----------------------------------------------------------------------+
| E. Response trả về ngân hàng                                          |
| HTTP status [200]     Body JSON: { "code": "00", ... }                |
+-----------------------------------------------------------------------+
|                                         [Hủy thay đổi] [Lưu cấu hình] |
+-----------------------------------------------------------------------+
```

- Mã dịch vụ chỉ nhập khi tạo mới, khóa khi sửa (brief mục 3).
- Giá trị khóa API luôn được che; nút "hiện" chỉ dùng khi đang nhập (brief mục 3).
- Định dạng thời gian gồm ISO 8601, Unix giây, Unix mili giây, mẫu chuỗi ngày giờ (brief mục 3).
- timestamp là trường tùy chọn; thiếu thì cảnh báo, không phải lỗi mapping. [Q6]
- Thử mapping hiện ba giá trị và lỗi từng trường, ghi rõ "không lưu dữ liệu". [Q3]
- Bỏ ghi chú "mã hóa SHA-256" và "Engine RFC9535" của thiết kế, vì đó là chi tiết kỹ thuật chưa được quyết định. [Q6]
- A11y: h1 "Cấu hình dịch vụ"; h2 cho từng khối A–E; mọi ô nhập có nhãn; kết quả kiểm tra ghi chữ "Hợp lệ"/"Lỗi", không chỉ dùng màu. [Q5]

## S3. Gửi callback thử

Theo màn hình Stitch "Gửi callback thử". Là trang riêng của từng dịch vụ. [Q3]

```
+-----------------------------------------------------------------------+
| < Quay lại cấu hình    Gửi callback thử  [thu-ho]                     |
| ! Callback gửi từ đây đi qua endpoint thật và ĐƯỢC LƯU như bình thường|
+------------------------------------------+----------------------------+
| POST /callbacks/thu-ho [⧉]               | Kết quả phản hồi           |
| Mẫu: [Thành công] [Lỗi mapping] [Sai key]| HTTP: 200   Thời gian: 34ms|
| (Body JSON) (Headers)                    | Body:                      |
| +--------------------------------------+ | { "code": "00", ... }      |
| | { "transId": "TEST-001", ...         | | [Xem trong Theo dõi]       |
| +--------------------------------------+ |                            |
|                         [Gửi callback]   |                            |
+------------------------------------------+----------------------------+
```

- Nhập payload và headers; hiển thị HTTP status, response body, thời gian phản hồi (brief mục 3).
- Các mẫu payload lấy từ dữ liệu mẫu của ba dịch vụ (brief mục 4).
- Bỏ khối "Mẫu phản hồi lỗi để đối soát", nhãn "Mutual TLS", "TLS v1.3", "JSON Schema v2.1". [Q6]
- A11y: h1 "Gửi callback thử"; khối kết quả là vùng thông báo để trình đọc màn hình đọc khi có phản hồi; vào bằng bàn phím từ ô payload. [Q5]

## S4. Theo dõi giao dịch

Theo màn hình Stitch "Theo dõi giao dịch & Callback".

```
+-----------------------------------------------------------------------+
| Theo dõi giao dịch & Callback                                         |
| Dịch vụ [Tất cả v]  transactionId [....]  Status [....]               |
| Thời gian nhận [từ ... đến ...]                         [Áp dụng]     |
| [●] Tự cập nhật 5 giây    Cập nhật lúc 10:25:02 (GMT+7)   [Tải lại]   |
+-----------------------------------------------------------------------+
| [Tab: Giao dịch]  [Tab: Tất cả callback]                              |
+-----------------------------------------------------------------------+
| Tab Giao dịch                                                         |
| Dịch vụ | transactionId | Status gần nhất | Thời gian nghiệp vụ |      |
|         |               |                 | Nhận gần nhất | Số callback | |
| thu-ho  | TEST-001      | SUCCESS         | 2026-10-18 00:05 | 10:24:15 | 3 | [Xem] |
| ...                                                                   |
| Hiển thị 1-20 trong 128                         < 1 2 3 ... 13 >      |
+-----------------------------------------------------------------------+
| Tab Tất cả callback                                                   |
| Bộ lọc thêm: Kết quả mapping [Tất cả | Hợp lệ | Lỗi]                  |
| Nhận lúc | Dịch vụ | transactionId | Status | Kết quả mapping | HTTP  |
| 10:24:15 | thu-ho  | TEST-001      | SUCCESS| Hợp lệ          | 200   |
| 10:23:50 | chi-ho  | (không lấy được) | -   | Lỗi: thiếu transactionId | 200 |
| ...                                         < 1 2 3 >                 |
+-----------------------------------------------------------------------+
```

- Tab "Giao dịch": một dòng cho mỗi cặp dịch vụ + transactionId, các cột theo brief mục 5.
- Ô lọc status là ô nhập chữ, thay cho các nút lọc đếm sẵn của thiết kế. [Q6]
- Tab "Tất cả callback": thiết kế chưa có, bổ sung theo brief mục 5, gồm cả callback lỗi mapping hoặc thiếu transactionId. [Q6]
- Phân trang phía server cho cả hai tab (brief mục 5).
- Status nghiệp vụ hiển thị nguyên văn với một màu trung tính; chỉ mã HTTP và lỗi mapping có màu. [Q6]
- Tự cập nhật không làm mất bộ lọc, trang hiện tại hoặc đóng chi tiết đang mở (brief mục 5).
- Bỏ các số liệu tổng hợp ở đầu trang và ghi chú "LIFO Cache", "Mô hình Ingestion". [Q6]
- A11y: h1 trang; tab dùng phím mũi tên để chuyển; công tắc tự cập nhật có nhãn; dòng bảng vào được bằng Tab và mở chi tiết bằng Enter. [Q5]

## S5. Chi tiết giao dịch (bảng trượt bên phải)

Theo màn hình Stitch "Chi tiết giao dịch". Mở chồng lên S4, danh sách vẫn ở phía sau. [Q4]

```
+-------------------------------+---------------------------------------+
| (danh sách S4 vẫn hiển thị,   | thu-ho  TEST-001 [⧉]  SUCCESS  [Đóng] |
|  giữ bộ lọc và trang)         | Status theo lần nhận gần nhất; 3 callback|
|                               +---------------------------------------+
|                               | Lịch sử callback (theo thứ tự nhận)   |
|                               | [#1 10:20:11] [#2 10:22:04] [#3 10:24:15]|
|                               +---------------------------------------+
|                               | Nhận lúc: 2026-10-18 10:24:15 (GMT+7) |
|                               | Thời gian nghiệp vụ: 2026-10-18 00:05 |
|                               | Mapping từng trường                   |
|                               |  transactionId  TEST-001  $.transId Hợp lệ|
|                               |  status         SUCCESS   $.code    Hợp lệ|
|                               |  timestamp      ...       $.time    Hợp lệ|
|                               | Headers (đã che): X-API-KEY ••••••    |
|                               | Payload gốc     | Response đã trả     |
|                               | { ... }         | 200 { "code":"00" } |
|                               | Cấu hình áp dụng: phiên bản v2        |
+-------------------------------+---------------------------------------+
```

- Nội dung theo brief mục 5: lịch sử callback theo thứ tự nhận, payload gốc, headers đã che, kết quả mapping từng trường, HTTP response đã cấu hình cho lần nhận đó.
- Ghi phiên bản cấu hình áp dụng cho lần nhận đó (brief mục 6).
- Không hiển thị Authorization hoặc giá trị API key nguyên văn (brief mục 6).
- Bỏ nút "Replay", nhãn "Retry", latency và danh sách giao dịch thu gọn bên trái của thiết kế. [Q6]
- A11y: h2 mã giao dịch; landmark `aside` có nhãn; tiêu điểm chuyển vào bảng khi mở và trả về dòng đã chọn khi đóng; Esc đóng. [Q5]

## Phong cách hình ảnh

Dùng `DESIGN.md` của Stitch làm nguồn phong cách: nền sáng, viền mảnh, chữ Inter cho giao diện, JetBrains Mono cho mã, JSON và đường dẫn JSON, góc bo 4px, mật độ thông tin cao. [Q6]

Ngoại lệ so với `DESIGN.md`: không dùng màu xanh/đỏ cho status nghiệp vụ như ở màn hình chi tiết của thiết kế. [Q6]

## Assumptions & Open Questions

None.
