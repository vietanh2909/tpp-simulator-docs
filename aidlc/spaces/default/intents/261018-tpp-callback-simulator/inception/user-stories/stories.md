# User Stories — TPP Callback Simulator (MVP)

> Nguồn: `requirements.md` (FR1–FR12, NFR1–NFR7) và câu trả lời trong `user-stories-questions.md` (Q1–Q4 chọn A, 5 giả định đã chấp nhận). Persona xem `personas.md`: **P1** = Người kiểm thử, **P2** = Lập trình viên.
>
> Story chia theo ba phần giao hàng của brief mục 9 (Q2): nhóm 1 là backend, nhóm 2 là frontend cấu hình, nhóm 3 là frontend theo dõi. Nhóm 4 ghi các mục Won't Have (Q4). Mọi story trong nhóm 1–3 là **Must Have**, vì mọi chức năng trong phạm vi đã được chốt là Must-have ở Scope Definition. Ranh giới MVP chính thức chốt ở Delivery Planning.

## Quy ước

- Mỗi story: "Là [persona], tôi muốn [mục tiêu], để [lợi ích]". Mỗi story có 3–6 tiêu chí chấp nhận dạng Given/When/Then, có cả trường hợp lỗi.
- Mọi story kiểm thử độc lập được bằng dữ liệu chuẩn bị sẵn (dịch vụ và callback tạo trực tiếp qua API hoặc database kiểm thử), kể cả khi có phụ thuộc giao hàng (giả định 4).
- **Tiêu chí chung cho mọi story giao diện (NFR4):** mọi chức năng dùng được bằng bàn phím; mọi ô nhập có nhãn; trạng thái lỗi không chỉ thể hiện bằng màu; bố cục và phong cách theo `docs/design/stitch/`.
- Thời gian trên giao diện hiển thị theo `Asia/Ho_Chi_Minh` và ghi rõ múi giờ (FR4.6).

## Bản đồ story

| Nhóm | Story | Persona chính |
|---|---|---|
| 1. Nhận, xử lý callback và tra cứu qua API | US1.1–US1.14 | P2, P1 |
| 2. Cấu hình dịch vụ, thử mapping, gửi thử | US2.1–US2.11 | P2 |
| 3. Theo dõi giao dịch và callback | US3.1–US3.9 | P1 |
| 4. Won't Have | US4.1–US4.10 | — |

---

## Nhóm 1 — Nhận, xử lý callback và tra cứu qua API

> Phần giao hàng 1 (backend). Walking skeleton đi qua US1.1, US1.6 và US1.14: tạo dịch vụ → `POST /callbacks/{serviceCode}` → mapping → lưu PostgreSQL → tra cứu qua API, kiểm chứng bằng cURL (team practices). Phần này cũng cung cấp API quản lý dịch vụ mà nhóm 2 dùng.

### US1.1 — Nhận callback hợp lệ và trả response đã cấu hình

Là **P2 Lập trình viên**, tôi muốn gọi URL callback của một dịch vụ đang bật bằng JSON hợp lệ và nhận đúng response đã cấu hình, để hệ thống ngân hàng ở dev/UAT nhận được phản hồi như một TPP thật.

- **Ưu tiên:** Must Have · **Truy vết:** FR3.1, FR3.4, FR3.5, FR1.4, FR1.10
- **AC1.1.1** Given dịch vụ `THU_HO` đang bật, xác thực `NONE`, response `201 {"ok":true}`, When gọi `POST /callbacks/THU_HO` với `Content-Type: application/json` và body JSON object hợp lệ, Then nhận HTTP 201 với body `{"ok":true}`.
- **AC1.1.2** Given như trên, When gọi hai lần với cùng một body, Then có hai bản ghi callback riêng biệt; không bản ghi nào bị ghi đè hay gộp.
- **AC1.1.3** Given một callback vừa được nhận, When tra cứu bản ghi đó, Then bản ghi có payload gốc, headers (đã che), `receivedAt` do server tạo, kết quả mapping từng trường, response đã trả và tham chiếu tới snapshot cấu hình đã dùng.
- **AC1.1.4** Given Content-Type là `application/json; charset=UTF-8`, When gọi với JSON hợp lệ, Then được xử lý như `application/json`.

### US1.2 — Xác thực API key khi nhận callback

Là **P2 Lập trình viên**, tôi muốn endpoint từ chối request sai hoặc thiếu API key, để kiểm thử được luồng xác thực giống TPP thật.

- **Ưu tiên:** Must Have · **Truy vết:** FR3.1, FR3.2, FR1.5
- **AC1.2.1** Given dịch vụ dùng `API_KEY` với header `X-Api-Key` và khóa `k1`, When gọi với `X-Api-Key: k1`, Then nhận response đã cấu hình.
- **AC1.2.2** Given như trên, When gọi với `X-Api-Key: sai`, Then nhận 401 và không nhận response đã cấu hình.
- **AC1.2.3** Given như trên, When gọi không có header API key, Then nhận 401.
- **AC1.2.4** Given như trên, When gọi với tên header `x-api-key` (chữ thường) và khóa `k1`, Then được chấp nhận; When gọi với khóa `K1`, Then nhận 401 (giá trị so khớp chính xác).
- **AC1.2.5** Given dịch vụ xác thực `NONE`, When gọi không có header nào, Then không bị từ chối vì xác thực.

### US1.3 — Từ chối callback khi dịch vụ không nhận được

Là **P1 Người kiểm thử**, tôi muốn callback tới dịch vụ đang tắt, đã xóa hoặc không tồn tại trả đúng mã lỗi, để phân biệt "TPP từ chối" với "callback không đến".

- **Ưu tiên:** Must Have · **Truy vết:** FR3.1, FR1.11, FR1.12
- **AC1.3.1** Given `serviceCode` chưa từng tồn tại, When gọi `POST /callbacks/{serviceCode}`, Then nhận 404.
- **AC1.3.2** Given dịch vụ đã bị xóa mềm, When gọi URL callback của nó, Then nhận 404.
- **AC1.3.3** Given dịch vụ đang tắt và có dùng API key, When gọi với khóa sai, Then nhận 503 (kiểm tra trạng thái dịch vụ trước xác thực).
- **AC1.3.4** Given dịch vụ đang bật và có dùng API key, When gọi với khóa sai và body không phải JSON, Then nhận 401 (kiểm tra xác thực trước JSON).

### US1.4 — Từ chối body không hợp lệ hoặc quá lớn

Là **P2 Lập trình viên**, tôi muốn request có body không phải JSON, sai Content-Type hoặc quá lớn bị từ chối rõ ràng, để biết ngay lỗi nằm ở định dạng gửi.

- **Ưu tiên:** Must Have · **Truy vết:** FR3.1, FR3.3, FR3.9
- **AC1.4.1** Given dịch vụ đang bật, xác thực hợp lệ, When gửi body `{"a":` (JSON hỏng) với `Content-Type: application/json`, Then nhận 400.
- **AC1.4.2** Given như trên, When gửi JSON hợp lệ với `Content-Type: text/plain`, Then nhận 400.
- **AC1.4.3** Given như trên, When gửi request không có Content-Type, Then nhận 400.
- **AC1.4.4** Given như trên, When gửi body lớn hơn 1 MB, Then nhận 413 và không có bản ghi callback nào được tạo.
- **AC1.4.5** Given như trên, When gửi body đúng 1 MB là JSON hợp lệ, Then được xử lý bình thường.

### US1.5 — Lưu lại các request bị từ chối

Là **P1 Người kiểm thử**, tôi muốn các request bị từ chối tới một dịch vụ có thật vẫn được lưu kèm mã lỗi và lý do, để tự tìm ra vì sao callback "không vào" mà không cần xem log server.

- **Ưu tiên:** Must Have · **Truy vết:** FR3.8, FR3.9, FR10.1
- **AC1.5.1** Given dịch vụ dùng API key, When gọi với khóa sai, Then có một bản ghi callback với mã HTTP 401 và lý do "sai API key"; thiếu khóa thì lý do "thiếu API key".
- **AC1.5.2** Given dịch vụ đang tắt, When gọi, Then có bản ghi với mã 503 và lý do "dịch vụ tắt"; dịch vụ đã xóa thì mã 404 và lý do "dịch vụ đã xóa".
- **AC1.5.3** Given dịch vụ đang bật, When gửi body `not json` với `Content-Type: text/plain`, Then có bản ghi với mã 400, lý do JSON/Content-Type không hợp lệ, và body được lưu nguyên văn dạng văn bản.
- **AC1.5.4** Given các bản ghi bị từ chối ở trên, When xem giao dịch, Then không bản ghi nào được nhóm vào giao dịch, kể cả khi body có transactionId.
- **AC1.5.5** Given `serviceCode` chưa từng tồn tại hoặc body quá 1 MB, When gọi, Then không có bản ghi nào được lưu.

### US1.6 — Ánh xạ transactionId, status, timestamp từ payload

Là **P2 Lập trình viên**, tôi muốn mỗi callback được ánh xạ theo đường dẫn JSON đã cấu hình, để đọc được giao dịch và trạng thái từ các cấu trúc JSON khác nhau.

- **Ưu tiên:** Must Have · **Truy vết:** FR1.7, FR4.1, FR4.2, FR4.3, FR4.5
- **AC1.6.1** Given mapping `$.transId`, `$.code`, `$.time`, When nhận `{"transId":"T1","code":"00","time":"2026-10-19T10:00:00+07:00"}`, Then transactionId `T1`, status `00`.
- **AC1.6.2** Given mapping `$.data.transId`, When nhận `{"data":{"transId":"T2"}}`, Then transactionId `T2`.
- **AC1.6.3** Given `"code": 0` (số) hoặc `"code": true`, When mapping, Then status được lưu nguyên văn là `"0"` hoặc `"true"`; status không bị diễn giải thành SUCCESS/FAILED.
- **AC1.6.4** Given transactionId hoặc status không tìm thấy, là `null`, chuỗi rỗng, object hoặc mảng, When mapping, Then trường đó có lỗi mapping cụ thể (không tìm thấy, rỗng, sai kiểu), các trường còn lại vẫn được ánh xạ.
- **AC1.6.5** Given payload gốc là mảng `[1,2]`, When mapping, Then cả ba trường đều có lỗi mapping.

### US1.7 — Chuẩn hóa timestamp nghiệp vụ về UTC

Là **P2 Lập trình viên**, tôi muốn timestamp nghiệp vụ được đọc theo định dạng của từng dịch vụ và chuẩn hóa về UTC, để so sánh thời gian giữa các dịch vụ dùng định dạng khác nhau.

- **Ưu tiên:** Must Have · **Truy vết:** FR1.8, FR1.9, FR4.4, FR4.6, FR4.7
- **AC1.7.1** Given định dạng ISO 8601, When nhận `2026-10-19T10:00:00+07:00`, Then timestamp UTC là `2026-10-19T03:00:00Z`.
- **AC1.7.2** Given định dạng Unix giây, When nhận `1760850000`, Then timestamp UTC là `2025-10-19T05:00:00Z`; định dạng Unix mili giây với `1760850000000` cho cùng kết quả.
- **AC1.7.3** Given mẫu `yyyy-MM-dd HH:mm:ss` và múi giờ `Asia/Ho_Chi_Minh`, When nhận `2026-10-19 10:00:00`, Then timestamp UTC là `2026-10-19T03:00:00Z`.
- **AC1.7.4** Given payload không có trường timestamp, When mapping, Then chỉ ghi cảnh báo, không phải lỗi mapping; callback vẫn được nhóm vào giao dịch nếu transactionId hợp lệ.
- **AC1.7.5** Given định dạng Unix giây, When nhận `"abc"`, Then trường timestamp có lỗi "không đọc được theo định dạng".
- **AC1.7.6** Given một callback bất kỳ, When lưu, Then timestamp nghiệp vụ và `receivedAt` được lưu riêng.

### US1.8 — Vẫn trả response đã cấu hình khi mapping lỗi

Là **P2 Lập trình viên**, tôi muốn TPP giả lập vẫn trả response đã cấu hình khi payload thiếu trường mapping, để lỗi mapping không làm hỏng luồng của hệ thống gửi.

- **Ưu tiên:** Must Have · **Truy vết:** FR3.6
- **AC1.8.1** Given dịch vụ đang bật, xác thực hợp lệ, response `200 {"code":"00"}`, When gửi JSON hợp lệ thiếu transactionId, Then nhận `200 {"code":"00"}`.
- **AC1.8.2** Given như trên, When gửi JSON có status là object, Then nhận response đã cấu hình và bản ghi callback có lỗi mapping ở status.
- **AC1.8.3** Given như trên, When gửi JSON hợp lệ có timestamp sai định dạng, Then nhận response đã cấu hình và bản ghi có lỗi ở trường timestamp.

### US1.9 — Báo lỗi khi không lưu được callback

Là **P1 Người kiểm thử**, tôi muốn nhận 500 thay vì response thành công khi TPP không lưu được callback, để không tưởng nhầm là callback đã được ghi nhận.

- **Ưu tiên:** Must Have · **Truy vết:** FR3.7
- **AC1.9.1** Given database không ghi được, When gửi callback hợp lệ, Then nhận 500.
- **AC1.9.2** Given như trên, When gửi callback, Then body trả về không phải response đã cấu hình của dịch vụ.
- **AC1.9.3** Given database hoạt động lại, When gửi callback hợp lệ, Then nhận response đã cấu hình và callback được lưu.

### US1.10 — Gom callback thành giao dịch

Là **P1 Người kiểm thử**, tôi muốn các callback cùng dịch vụ và cùng transactionId được gom thành một giao dịch với trạng thái của lần nhận gần nhất, để biết ngay trạng thái hiện tại của giao dịch.

- **Ưu tiên:** Must Have · **Truy vết:** FR5.1, FR5.2, FR5.3, FR5.4
- **AC1.10.1** Given 3 callback `T1` của `THU_HO` với status `A`, `B`, `C` theo thứ tự nhận, When xem giao dịch `THU_HO`/`T1`, Then status `C`, tổng 3 callback.
- **AC1.10.2** Given `T1` của `THU_HO` và `T1` của `CHI_HO`, When xem giao dịch, Then là hai giao dịch riêng.
- **AC1.10.3** Given callback mới nhất của `T1` có timestamp nghiệp vụ sớm hơn callback trước, When xem giao dịch, Then status vẫn lấy từ callback nhận sau theo `receivedAt`.
- **AC1.10.4** Given callback thứ 4 của `T1` thiếu status, When xem giao dịch, Then status hiển thị trống kèm lỗi mapping, không lấy status cũ, tổng 4.
- **AC1.10.5** Given callback thiếu hoặc lỗi transactionId, When lưu, Then callback có trong danh sách callback nhưng không thuộc giao dịch nào.

### US1.11 — Xử lý đúng các callback đến đồng thời

Là **P1 Người kiểm thử**, tôi muốn nhiều callback cùng giao dịch gửi đồng thời đều được ghi nhận đúng, để kiểm thử được tình huống ngân hàng gửi lại liên tục.

- **Ưu tiên:** Must Have · **Truy vết:** FR5.5, NFR2
- **AC1.11.1** Given dịch vụ đang bật, When gửi đồng thời 50 callback `T1`, Then có đúng 50 bản ghi callback và đúng một giao dịch `T1` với tổng 50.
- **AC1.11.2** Given như trên, When xử lý xong, Then status của giao dịch là status của callback có `receivedAt` muộn nhất; hòa nhau thì theo mã bản ghi lớn nhất.
- **AC1.11.3** Given gửi đồng thời 50 callback cho 50 transactionId khác nhau, When xử lý xong, Then có đúng 50 giao dịch, mỗi giao dịch tổng 1.

### US1.12 — Che thông tin nhạy cảm trong lịch sử

Là **P2 Lập trình viên**, tôi muốn header chứa thông tin xác thực được che khi lưu, để dữ liệu lịch sử dùng chung không làm lộ khóa.

- **Ưu tiên:** Must Have · **Truy vết:** FR6.1, FR6.2, NFR3
- **AC1.12.1** Given gửi callback có `Authorization: Bearer x`, `Proxy-Authorization: y`, `Cookie: z`, When xem chi tiết, Then cả ba header hiện `***`.
- **AC1.12.2** Given dịch vụ dùng header `X-Api-Key`, When gửi callback với khóa `k` (đúng hoặc sai), Then header đó được lưu là `***`.
- **AC1.12.3** Given các callback trên, When kiểm tra database, log ứng dụng và mọi response API, Then không có `x`, `y`, `z` hay `k` nguyên văn.
- **AC1.12.4** Given gửi header `X-Request-Id: abc`, When xem chi tiết, Then header đó giữ nguyên `abc`.

### US1.13 — Giữ cấu hình đã dùng cho từng callback

Là **P2 Lập trình viên**, tôi muốn mỗi callback giữ cấu hình đã dùng để xử lý nó, để sửa cấu hình không làm sai kết quả của các callback cũ.

- **Ưu tiên:** Must Have · **Truy vết:** FR1.13
- **AC1.13.1** Given mapping transactionId là `$.transId` và đã nhận callback C1, When đổi thành `$.data.transId` rồi nhận callback C2, Then C1 vẫn hiển thị kết quả theo `$.transId`, C2 theo `$.data.transId`.
- **AC1.13.2** Given đã nhận callback với response `200`, When đổi response thành `202`, Then response đã trả của callback cũ vẫn là `200`; callback mới nhận `202`.
- **AC1.13.3** Given đổi định dạng thời gian hoặc múi giờ, When xem callback cũ, Then timestamp đã chuẩn hóa của nó không đổi.

### US1.14 — Tra cứu giao dịch và callback qua API

Là **P2 Lập trình viên**, tôi muốn tra cứu danh sách giao dịch, danh sách callback và chi tiết qua API có lọc và phân trang, để kiểm chứng backend bằng cURL trước khi có giao diện.

- **Ưu tiên:** Must Have · **Truy vết:** FR8.1, FR8.2, FR8.3, FR10.2, FR10.3, NFR1
- **AC1.14.1** Given đã nhận callback hợp lệ cho `THU_HO`/`T1`, When gọi API danh sách giao dịch, Then có dòng `THU_HO`/`T1` với status, timestamp nghiệp vụ, thời điểm nhận gần nhất và tổng số callback.
- **AC1.14.2** Given 25 giao dịch, When gọi API không có tham số trang, Then nhận 20 dòng mới nhất trước kèm tổng số 25; trang 2 có 5 dòng; kích thước trang chỉ nhận 20, 50 hoặc 100.
- **AC1.14.3** Given có callback bị từ chối và callback lỗi mapping, When gọi API danh sách callback lọc theo kết quả xử lý, Then lọc đúng thành công, lỗi mapping, bị từ chối (kèm lý do).
- **AC1.14.4** Given tham số lọc hoặc phân trang không hợp lệ (ví dụ kích thước trang 30), When gọi API, Then nhận 400 kèm thông báo lỗi rõ ràng.
- **AC1.14.5** Given 100.000 callback trong database, When gọi các API danh sách có lọc và phân trang, Then p95 thời gian phản hồi dưới 1 giây trên máy local.

---

## Nhóm 2 — Cấu hình dịch vụ, thử mapping, gửi thử

> Phần giao hàng 2 (frontend cấu hình). Dùng API quản lý dịch vụ có từ phần 1.

### US2.1 — Xem danh sách dịch vụ

Là **P2 Lập trình viên**, tôi muốn xem mọi dịch vụ đang dùng cùng URL callback, để biết nhanh cần cấu hình hệ thống ngân hàng gọi tới đâu.

- **Ưu tiên:** Must Have · **Truy vết:** FR1.1, FR1.4
- **AC2.1.1** Given có dịch vụ `THU_HO` và `CHI_HO`, When mở danh sách dịch vụ, Then mỗi dòng hiện mã, tên, mô tả, URL callback `/callbacks/{serviceCode}`, kiểu xác thực, trạng thái bật/tắt.
- **AC2.1.2** Given một dòng dịch vụ, When bấm nút sao chép URL, Then URL đầy đủ được chép vào clipboard và có thông báo đã chép.
- **AC2.1.3** Given có một dịch vụ đã xóa mềm, When mở danh sách, Then dịch vụ đó không hiện.
- **AC2.1.4** Given chưa có dịch vụ nào, When mở danh sách, Then hiện thông báo danh sách trống kèm nút tạo dịch vụ, khác với thông báo lỗi tải.

### US2.2 — Tạo dịch vụ mới bằng cấu hình

Là **P2 Lập trình viên**, tôi muốn tạo dịch vụ mới chỉ bằng form cấu hình, để thêm dịch vụ có cấu trúc JSON khác mà không sửa code.

- **Ưu tiên:** Must Have · **Truy vết:** FR1.2, FR1.4, NFR7
- **AC2.2.1** Given chưa có `THU_HO`, When tạo dịch vụ `THU_HO` với đủ trường hợp lệ, Then danh sách hiện dịch vụ mới với URL `/callbacks/THU_HO`, và gọi URL đó được xử lý theo cấu hình vừa tạo.
- **AC2.2.2** Given đã có hoặc đã xóa `THU_HO`, When tạo `thu_ho`, Then bị từ chối với thông báo mã đã tồn tại.
- **AC2.2.3** Given nhập mã có ký tự ngoài chữ, số, `-`, `_` hoặc dài hơn 50 ký tự hoặc để trống, When lưu, Then bị từ chối với thông báo cạnh ô mã.
- **AC2.2.4** Given một cấu trúc JSON mới (ví dụ `$.payload.ref`), When tạo dịch vụ với mapping tương ứng và gửi callback, Then callback được ánh xạ đúng mà không cần sửa code.

### US2.3 — Sửa cấu hình dịch vụ

Là **P2 Lập trình viên**, tôi muốn sửa cấu hình một dịch vụ đã có, để điều chỉnh theo thay đổi của hệ thống ngân hàng mà không phải tạo lại.

- **Ưu tiên:** Must Have · **Truy vết:** FR1.3, FR1.13
- **AC2.3.1** Given dịch vụ `THU_HO`, When mở form sửa, Then ô mã dịch vụ chỉ đọc; các trường khác sửa được.
- **AC2.3.2** Given sửa tên và mapping rồi lưu, When gửi callback mới, Then callback mới dùng cấu hình mới; callback cũ giữ kết quả cũ.
- **AC2.3.3** Given sửa với dữ liệu không hợp lệ, When lưu, Then không có thay đổi nào được lưu và lỗi hiện cạnh từng ô.

### US2.4 — Cấu hình xác thực API key mà không lộ khóa

Là **P2 Lập trình viên**, tôi muốn đặt tên header và giá trị khóa cho dịch vụ mà khóa không bao giờ hiện lại trên trình duyệt, để dùng chung công cụ không làm lộ khóa.

- **Ưu tiên:** Must Have · **Truy vết:** FR1.5, FR1.6, FR6.2, NFR3
- **AC2.4.1** Given tạo dịch vụ chọn `API_KEY`, When không nhập tên header hoặc giá trị khóa, Then bị từ chối khi lưu.
- **AC2.4.2** Given dịch vụ đã lưu với khóa `k1`, When mở form sửa, Then ô khóa hiện dạng che và response API cấu hình không chứa `k1`.
- **AC2.4.3** Given form sửa, When để trống ô khóa rồi lưu, Then khóa cũ được giữ; gọi callback với `k1` vẫn được chấp nhận.
- **AC2.4.4** Given form sửa, When nhập khóa mới `k2` rồi lưu, Then `k1` bị từ chối 401, `k2` được chấp nhận.
- **AC2.4.5** Given đổi từ `API_KEY` sang `NONE`, When lưu và gọi callback không có khóa, Then không bị từ chối vì xác thực.

### US2.5 — Cấu hình mapping và định dạng thời gian

Là **P2 Lập trình viên**, tôi muốn khai báo đường dẫn JSON và định dạng thời gian cho dịch vụ, với lỗi cú pháp được báo ngay khi lưu, để không phát hiện cấu hình sai khi callback đã đến.

- **Ưu tiên:** Must Have · **Truy vết:** FR1.7, FR1.8, FR1.9
- **AC2.5.1** Given nhập `$.data.transId`, `$.status`, `$.date`, When lưu, Then được chấp nhận.
- **AC2.5.2** Given nhập đường dẫn sai cú pháp như `data.transId`, `$.items[0].id` hoặc `$..id`, When lưu, Then bị từ chối với thông báo chỉ hỗ trợ dạng `$.a.b.c`.
- **AC2.5.3** Given chọn định dạng mẫu chuỗi và nhập `yyyy-MM-dd HH:mm:ss`, When lưu, Then được chấp nhận; nhập mẫu sai cú pháp thì bị từ chối.
- **AC2.5.4** Given tạo dịch vụ mới, When mở form, Then múi giờ mặc định là `Asia/Ho_Chi_Minh`; chọn được ISO 8601, Unix giây, Unix mili giây hoặc mẫu chuỗi.
- **AC2.5.5** Given không nhập đường dẫn transactionId hoặc status, When lưu, Then bị từ chối; đường dẫn timestamp được để trống.

### US2.6 — Cấu hình response trả về

Là **P2 Lập trình viên**, tôi muốn đặt HTTP status và JSON body mà dịch vụ trả về, để giả lập đúng phản hồi TPP mà hệ thống ngân hàng mong đợi.

- **Ưu tiên:** Must Have · **Truy vết:** FR1.10
- **AC2.6.1** Given nhập status `201` và body `{"ok":true}`, When lưu, Then gọi callback hợp lệ nhận đúng `201 {"ok":true}`.
- **AC2.6.2** Given nhập status `199` hoặc `600`, When lưu, Then bị từ chối với thông báo khoảng hợp lệ 200–599.
- **AC2.6.3** Given nhập body `{ok:true}` (JSON không hợp lệ), When lưu, Then bị từ chối với thông báo JSON không hợp lệ.

### US2.7 — Bật và tắt dịch vụ

Là **P1 Người kiểm thử**, tôi muốn tắt tạm một dịch vụ, để kiểm thử cách hệ thống ngân hàng xử lý khi TPP không sẵn sàng.

- **Ưu tiên:** Must Have · **Truy vết:** FR1.11
- **AC2.7.1** Given dịch vụ đang bật, When tắt trong danh sách hoặc trang cấu hình, Then trạng thái hiển thị là tắt và gọi callback nhận 503.
- **AC2.7.2** Given dịch vụ đang tắt, When bật lại, Then callback hợp lệ nhận response đã cấu hình.
- **AC2.7.3** Given bật/tắt không thành công vì lỗi mạng, When thao tác, Then trạng thái hiển thị không đổi và có thông báo lỗi.

### US2.8 — Xóa mềm dịch vụ

Là **P2 Lập trình viên**, tôi muốn xóa dịch vụ không dùng nữa mà vẫn giữ lịch sử, để danh sách gọn mà không mất bằng chứng kiểm thử cũ.

- **Ưu tiên:** Must Have · **Truy vết:** FR1.12
- **AC2.8.1** Given dịch vụ `THU_HO`, When bấm xóa, Then hiện hộp thoại xác nhận; chọn hủy thì không có gì thay đổi.
- **AC2.8.2** Given xác nhận xóa, When xong, Then dịch vụ biến khỏi danh sách cấu hình và URL callback của nó trả 404.
- **AC2.8.3** Given `THU_HO` đã xóa và có callback cũ, When mở màn hình theo dõi, Then lịch sử vẫn tra cứu được và bộ lọc dịch vụ ghi rõ "đã xóa".
- **AC2.8.4** Given `THU_HO` đã xóa, When tạo dịch vụ mới mã `THU_HO`, Then bị từ chối vì mã đã tồn tại.

### US2.9 — Thử mapping với JSON mẫu

Là **P2 Lập trình viên**, tôi muốn dán JSON mẫu và xem ngay ba giá trị ánh xạ được, để kiểm tra cấu hình trước khi hệ thống thật gửi tới.

- **Ưu tiên:** Must Have · **Truy vết:** FR2.1, FR2.2, FR2.3
- **AC2.9.1** Given mapping thu hộ, When dán `{"transId":"T1","code":"00","time":"2026-10-19T10:00:00+07:00"}` và bấm thử, Then hiện `T1`, `00`, `2026-10-19T03:00:00Z` (kèm giờ Asia/Ho_Chi_Minh).
- **AC2.9.2** Given JSON thiếu `code`, When thử, Then trường status báo "không tìm thấy", hai trường còn lại vẫn hiện giá trị.
- **AC2.9.3** Given JSON mẫu không hợp lệ, When thử, Then báo JSON không hợp lệ.
- **AC2.9.4** Given đã sửa đường dẫn trên form nhưng chưa lưu, When thử, Then kết quả dùng đường dẫn đang nhập.
- **AC2.9.5** Given vừa thử mapping, When mở màn hình theo dõi, Then không có callback hay giao dịch mới.

### US2.10 — Gửi callback thử từ giao diện

Là **P1 Người kiểm thử**, tôi muốn gửi callback thử cho một dịch vụ ngay trên giao diện và xem phản hồi, để tái hiện tình huống mà không cần cURL hay nhờ lập trình viên.

- **Ưu tiên:** Must Have · **Truy vết:** FR7.1, FR7.2, FR7.3, FR7.4, FR7.5
- **AC2.10.1** Given dịch vụ thu hộ, When bấm "Gửi thử" ở danh sách hoặc trang cấu hình, Then mở trang gửi thử của đúng dịch vụ đó.
- **AC2.10.2** Given trang gửi thử, When gửi payload mẫu, Then hiện HTTP status, response body đã cấu hình và thời gian phản hồi tính bằng ms đo ở trình duyệt.
- **AC2.10.3** Given vừa gửi thử thành công, When mở màn hình theo dõi, Then callback mới có mặt như callback bình thường.
- **AC2.10.4** Given dịch vụ dùng API key, When mở trang gửi thử, Then tên header được điền sẵn, ô giá trị khóa để trống; trình duyệt không nhận giá trị khóa thật từ backend.
- **AC2.10.5** Given dịch vụ dùng API key, When gửi thử với khóa sai, Then hiện 401 và callback bị từ chối được lưu với lý do "sai API key".
- **AC2.10.6** Given người dùng thêm header tùy ý (ví dụ `X-Request-Id`), When gửi thử, Then header đó được gửi kèm request.

### US2.11 — Có sẵn cấu hình và payload mẫu

Là **P2 Lập trình viên**, tôi muốn có cấu hình và payload mẫu cho ba dịch vụ của brief, để dựng nhanh môi trường thử mà không phải tự viết từ đầu.

- **Ưu tiên:** Must Have · **Truy vết:** FR12.1, FR12.2, NFR7
- **AC2.11.1** Given bản checkout sạch, When mở `docs/samples/`, Then có cấu hình mẫu và payload thử cho thu hộ (`$.transId`, `$.code`, `$.time`), chi hộ (`$.processId`, `$.status`, `$.date`), biến động số dư (`$.trnId`, `$.stage`, `$.dateTime`).
- **AC2.11.2** Given backend đang chạy với database trống, When chạy script mẫu, Then ba dịch vụ được tạo qua API.
- **AC2.11.3** Given ba dịch vụ đã tạo, When chạy các lệnh cURL mẫu, Then mỗi dịch vụ nhận callback và ánh xạ đúng ba trường.
- **AC2.11.4** Given khởi động ứng dụng lần đầu, When mở danh sách dịch vụ, Then không có dịch vụ nào được tạo tự động.
- **AC2.11.5** Given ba dịch vụ đã tồn tại, When chạy lại script mẫu, Then script báo mã đã tồn tại cho từng dịch vụ và không tạo bản trùng.

---

## Nhóm 3 — Theo dõi giao dịch và callback

> Phần giao hàng 3 (frontend theo dõi). Dùng API tra cứu của US1.14.

### US3.1 — Xem danh sách giao dịch

Là **P1 Người kiểm thử**, tôi muốn xem mỗi giao dịch một dòng với trạng thái gần nhất, để biết ngay callback của giao dịch mình vừa làm đã đến chưa.

- **Ưu tiên:** Must Have · **Truy vết:** FR8.1, FR8.4
- **AC3.1.1** Given có callback cho `THU_HO`/`T1`, When mở tab "Giao dịch", Then có một dòng với dịch vụ, mã giao dịch, status gần nhất, timestamp nghiệp vụ của callback đó, thời điểm nhận gần nhất, tổng số callback.
- **AC3.1.2** Given status nghiệp vụ bất kỳ (`00`, `FAILED`), When hiển thị, Then dùng cùng một màu trung tính; chỉ mã HTTP và lỗi mapping có màu.
- **AC3.1.3** Given callback mới nhất của giao dịch thiếu status, When hiển thị, Then ô status trống kèm dấu lỗi mapping có chữ, không chỉ bằng màu.
- **AC3.1.4** Given chưa có giao dịch nào, When mở tab, Then hiện thông báo chưa có dữ liệu, khác với thông báo lỗi tải.

### US3.2 — Lọc danh sách giao dịch

Là **P1 Người kiểm thử**, tôi muốn lọc giao dịch theo dịch vụ, mã giao dịch, status và thời gian nhận, để tìm nhanh giao dịch của ca kiểm thử.

- **Ưu tiên:** Must Have · **Truy vết:** FR8.2
- **AC3.2.1** Given có giao dịch `T100`, `T200`, When lọc transactionId `t1`, Then chỉ `T100` hiện (chứa chuỗi, không phân biệt hoa thường).
- **AC3.2.2** Given có status `00` và `10`, When lọc status `0`, Then cả hai hiện.
- **AC3.2.3** Given có dịch vụ đã xóa, When mở bộ lọc dịch vụ, Then dịch vụ đó có trong danh sách với chữ "đã xóa".
- **AC3.2.4** Given lọc thời gian nhận từ 10:00 đến 11:00 (giờ Asia/Ho_Chi_Minh), When có giao dịch nhận gần nhất đúng 10:00 và đúng 11:00, Then cả hai hiện (tính cả hai đầu).
- **AC3.2.5** Given bộ lọc không khớp dữ liệu nào, When áp dụng, Then hiện "không có dữ liệu khớp bộ lọc", khác với thông báo lỗi tải.

### US3.3 — Phân trang danh sách giao dịch

Là **P1 Người kiểm thử**, tôi muốn danh sách giao dịch phân trang và mới nhất trước, để xem được dữ liệu tích lũy lâu ngày mà màn hình vẫn nhanh.

- **Ưu tiên:** Must Have · **Truy vết:** FR8.3, NFR1
- **AC3.3.1** Given 25 giao dịch, When mở tab, Then thấy 20 dòng; trang 2 có 5 dòng.
- **AC3.3.2** Given chọn 50 dòng mỗi trang, When có 60 giao dịch, Then trang 1 có 50 dòng; lựa chọn chỉ gồm 20, 50, 100.
- **AC3.3.3** Given hai giao dịch có cùng thời điểm nhận gần nhất, When hiển thị, Then thứ tự ổn định giữa các lần tải.
- **AC3.3.4** Given 100.000 callback trong database, When chuyển trang hoặc đổi bộ lọc, Then dữ liệu hiện trong dưới 1 giây (p95) trên máy local.

### US3.4 — Xem chi tiết và lịch sử một giao dịch

Là **P1 Người kiểm thử**, tôi muốn mở một giao dịch để xem từng lần callback đến, để đối chiếu payload và response với kết quả mong đợi.

- **Ưu tiên:** Must Have · **Truy vết:** FR9.1, FR9.2
- **AC3.4.1** Given giao dịch `T1` có 3 callback, When mở chi tiết, Then bảng trượt bên phải hiện 3 lần nhận theo thứ tự nhận.
- **AC3.4.2** Given một lần nhận trong chi tiết, When xem, Then có payload gốc, headers đã che, kết quả mapping từng trường (giá trị hoặc lỗi), HTTP response đã trả cho lần đó.
- **AC3.4.3** Given đang ở trang 2 với bộ lọc, When mở rồi đóng chi tiết, Then danh sách, bộ lọc và trang giữ nguyên.
- **AC3.4.4** Given bảng chi tiết đang mở, When nhấn Esc hoặc nút đóng, Then bảng đóng và tiêu điểm bàn phím trở về dòng vừa mở.

### US3.5 — Xem tất cả callback đã nhận

Là **P1 Người kiểm thử**, tôi muốn xem mọi lần nhận, kể cả callback lỗi và bị từ chối, để không bỏ sót callback nào không vào được giao dịch.

- **Ưu tiên:** Must Have · **Truy vết:** FR10.1, FR10.3
- **AC3.5.1** Given có callback thành công, callback lỗi mapping thiếu transactionId và callback bị từ chối 401, When mở tab "Tất cả callback", Then cả ba có mặt, mỗi lần nhận một dòng.
- **AC3.5.2** Given callback lỗi mapping thiếu transactionId, When mở tab "Giao dịch", Then callback đó không có ở đó.
- **AC3.5.3** Given mỗi dòng, When hiển thị, Then có dịch vụ, transactionId (nếu có), thời điểm nhận, mã HTTP đã trả và kết quả xử lý.
- **AC3.5.4** Given 25 callback, When mở tab, Then phân trang như danh sách giao dịch (20 dòng mặc định, mới nhất trước).

### US3.6 — Lọc tất cả callback theo kết quả xử lý

Là **P1 Người kiểm thử**, tôi muốn lọc callback theo dịch vụ, mã giao dịch, thời gian và kết quả xử lý, để tìm ngay các lần bị từ chối hoặc lỗi mapping.

- **Ưu tiên:** Must Have · **Truy vết:** FR10.2
- **AC3.6.1** Given có callback thành công, lỗi mapping và bị từ chối, When lọc "bị từ chối", Then chỉ callback bị từ chối hiện, mỗi dòng có lý do (sai API key, thiếu API key, JSON không hợp lệ, dịch vụ tắt, dịch vụ đã xóa).
- **AC3.6.2** Given như trên, When lọc "lỗi mapping", Then chỉ callback có ít nhất một trường lỗi mapping hiện.
- **AC3.6.3** Given lọc theo dịch vụ và transactionId cùng lúc, When áp dụng, Then chỉ dòng thỏa cả hai điều kiện hiện.
- **AC3.6.4** Given bộ lọc không khớp, When áp dụng, Then hiện "không có dữ liệu khớp bộ lọc".

### US3.7 — Xem chi tiết một lần nhận

Là **P2 Lập trình viên**, tôi muốn mở một dòng callback để xem toàn bộ request và response của lần đó, để chẩn đoán lỗi tích hợp.

- **Ưu tiên:** Must Have · **Truy vết:** FR10.4
- **AC3.7.1** Given callback thành công, When mở chi tiết, Then thấy payload JSON, headers đã che, kết quả mapping từng trường và response đã trả.
- **AC3.7.2** Given callback bị từ chối với body không phải JSON, When mở chi tiết, Then thấy body văn bản gốc, mã HTTP và lý do từ chối.
- **AC3.7.3** Given callback có lỗi timestamp, When mở chi tiết, Then thấy giá trị gốc của timestamp và thông báo lỗi định dạng.
- **AC3.7.4** Given đóng chi tiết, When quay lại danh sách, Then bộ lọc và trang giữ nguyên.

### US3.8 — Tự cập nhật màn hình theo dõi

Là **P1 Người kiểm thử**, tôi muốn màn hình theo dõi tự cập nhật mà không làm mất chỗ đang xem, để để mở màn hình và chờ callback đến.

- **Ưu tiên:** Must Have · **Truy vết:** FR11.1, FR11.2
- **AC3.8.1** Given mở màn hình theo dõi, When không thao tác gì, Then tự cập nhật đang bật và dữ liệu được tải lại mỗi 5 giây.
- **AC3.8.2** Given đang ở trang 2, lọc theo dịch vụ, mở chi tiết, When có callback mới và qua 5 giây, Then dữ liệu cập nhật; trang, bộ lọc và chi tiết đang mở giữ nguyên.
- **AC3.8.3** Given tắt tự cập nhật, When có callback mới, Then dữ liệu chỉ đổi khi bấm nút tải lại.
- **AC3.8.4** Given bất kỳ lúc nào, When bấm nút tải lại, Then dữ liệu được tải ngay.

### US3.9 — Hiển thị đúng khi tải dữ liệu chậm hoặc lỗi

Là **P1 Người kiểm thử**, tôi muốn biết khi dữ liệu không tải được mà vẫn giữ dữ liệu cũ trên màn hình, để không tưởng nhầm là không có callback mới.

- **Ưu tiên:** Must Have · **Truy vết:** FR11.3
- **AC3.9.1** Given backend tạm dừng, When tới lần tự cập nhật, Then dữ liệu cũ vẫn hiển thị kèm thông báo lỗi và thời điểm cập nhật thành công gần nhất.
- **AC3.9.2** Given backend hoạt động lại, When tới lần tự cập nhật kế tiếp, Then dữ liệu mới hiện và thông báo lỗi biến mất.
- **AC3.9.3** Given một lần tải mất hơn 5 giây, When tới lần kế tiếp, Then lần đó được bỏ qua; không có hai lần tải chồng nhau.

---

## Nhóm 4 — Won't Have (MVP)

> Ghi lại để ranh giới rõ khi lập kế hoạch (Q4). Không có tiêu chí chấp nhận. Nguồn: `requirements.md` §6.

- **US4.1** Gọi API nghiệp vụ từ TPP sang ngân hàng [B§7].
- **US4.2** Khai báo giao dịch dự kiến và phát hiện callback chưa đến [B§7].
- **US4.3** Đăng nhập và phân quyền [B§7].
- **US4.4** Response động hoặc phản hồi theo điều kiện [B§7].
- **US4.5** Giả lập timeout, độ trễ, lỗi N lần [B§7].
- **US4.6** Triển khai production, dịch vụ đám mây, cho hệ thống ngân hàng thật gọi tới [B§7] [FS] [SD].
- **US4.7** Đường dẫn JSON dạng wildcard, filter, mảng; WebSocket [IC].
- **US4.8** Tự động xóa dữ liệu cũ [SD].
- **US4.9** Các phần thiết kế Stitch ngoài brief: retry policy, IP whitelist/firewall, mTLS, chứng chỉ SSL, nút Replay, "Nhật ký nhận", số liệu thống kê [RM].
- **US4.10** Tự tạo dịch vụ mẫu khi khởi động [Q4 của Requirements Analysis].

---

## Phụ thuộc giữa các story

| Story | Phụ thuộc giao hàng | Ghi chú |
|---|---|---|
| US1.2–US1.13 | US1.1 | Cùng endpoint nhận callback; kiểm thử độc lập bằng dịch vụ tạo sẵn |
| US1.14 | US1.1, US1.10 | Walking skeleton kết thúc ở đây |
| US2.1–US2.8 | API quản lý dịch vụ (phần 1) | |
| US2.9 | US2.5 | Dùng cấu hình đang nhập trên form |
| US2.10 | US1.1–US1.5 | Gửi qua chính endpoint callback |
| US3.1–US3.9 | US1.14 | Dùng API tra cứu |
| US3.8, US3.9 | US3.1, US3.5 | Áp dụng cho cả hai tab |

## Ghi chú INVEST

- **Independent:** mỗi story kiểm thử được bằng dữ liệu chuẩn bị sẵn; phụ thuộc chỉ là thứ tự giao hàng.
- **Negotiable:** tiêu chí chấp nhận mô tả hành vi, không quy định thành phần giao diện cụ thể ngoài những gì Rough Mockups đã chốt (bảng trượt chi tiết, màu trung tính cho status).
- **Valuable:** mọi story nêu lợi ích cho P1 hoặc P2; không có story kỹ thuật thuần (NFR5, NFR6 được truy vết sang stage sau).
- **Estimable / Small:** mỗi story là một khả năng, ước lượng 1–3 ngày; US1.1 và US1.14 lớn nhất vì nằm trong walking skeleton.
- **Testable:** mọi tiêu chí có kết quả quan sát được (mã HTTP, giá trị, số dòng, thời gian).
