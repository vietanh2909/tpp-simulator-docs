# Requirements — TPP Callback Simulator (MVP)

> Nguồn yêu cầu chính: `docs/brief.md`. Tài liệu này sắp xếp lại các yêu cầu đã chốt thành mục có mã ổn định để truy vết, bổ sung các quyết định ở Ideation và câu trả lời trong `requirements-analysis-questions.md` (Q1–Q5, 15 giả định đã được chấp nhận). Khi có khác biệt, brief thắng, trừ những điểm người dùng đã chốt lại sau đó (ghi rõ nguồn).
>
> Ký hiệu nguồn: **[B§n]** = brief mục n; **[IC]** = intent statement; **[SD]** = scope document; **[FS]** = feasibility; **[RM]** = rough mockups; **[PD]** = team practices; **[Qn]** = câu hỏi Requirements Analysis; **[An]** = giả định n đã được chấp nhận.

## 1. Intent analysis

Người kiểm thử và lập trình viên trên môi trường dev/UAT của ngân hàng cần một TPP giả lập để: biết callback ngân hàng gửi có đến hay không, xem trạng thái nghiệp vụ, payload và lịch sử các lần nhận, và thêm dịch vụ mới chỉ bằng cấu hình [B§1] [IC]. MVP hoàn thành khi đạt đủ 10 tiêu chí nghiệm thu ở brief mục 8; mọi chức năng trong phạm vi là Must-have [SD].

Người dùng: người kiểm thử và lập trình viên nội bộ, dùng chung dữ liệu, không đăng nhập [IC]. Thiết bị: trình duyệt trên máy tính [RM].

## 2. Functional requirements

### FR1 — Quản lý cấu hình dịch vụ

- **FR1.1** Hệ thống hiển thị danh sách dịch vụ chưa bị xóa với: mã dịch vụ, tên, mô tả, URL callback kèm nút sao chép, kiểu xác thực, trạng thái bật/tắt [B§3].
- **FR1.2** Người dùng tạo dịch vụ mới với `serviceCode` duy nhất: 1–50 ký tự gồm chữ, số, `-`, `_`; trùng được so sánh không phân biệt hoa thường, kể cả với mã đã xóa [B§3] [IC] [A9].
- **FR1.3** `serviceCode` không đổi được sau khi tạo; các trường khác sửa được [B§3].
- **FR1.4** URL callback tự sinh có dạng `POST /callbacks/{serviceCode}` [B§3].
- **FR1.5** Xác thực là `NONE` hoặc `API_KEY`. Với `API_KEY`, người dùng cấu hình tên header và giá trị khóa [B§3].
- **FR1.6** Giá trị khóa luôn hiển thị dạng che trên giao diện, không bao giờ được backend trả về trình duyệt; khi sửa, để trống ô khóa nghĩa là giữ khóa cũ [B§3] [Q3] [A4].
- **FR1.7** Mapping `transactionId`, `status`, `timestamp` bằng đường dẫn JSON dạng `$.a.b.c` (root và object lồng nhau). Đường dẫn sai cú pháp bị từ chối khi lưu. Không hỗ trợ wildcard, filter, mảng [B§3] [IC] [A6].
- **FR1.8** Định dạng timestamp: ISO 8601, Unix giây, Unix mili giây, hoặc mẫu chuỗi ngày giờ theo cú pháp `DateTimeFormatter` của Java; mẫu sai cú pháp bị từ chối khi lưu [B§3] [A7].
- **FR1.9** Múi giờ dùng khi chuỗi ngày giờ không có múi giờ; mặc định `Asia/Ho_Chi_Minh` [B§3] [A7].
- **FR1.10** Response cố định theo dịch vụ: HTTP status trong khoảng 200–599 và JSON body hợp lệ, được kiểm tra khi lưu [B§3] [A8].
- **FR1.11** Bật/tắt dịch vụ [B§3].
- **FR1.12** Xóa dịch vụ là xóa mềm, có hỏi xác nhận: chỉ đổi trạng thái, mọi thông tin khác giữ nguyên; dịch vụ biến khỏi danh sách cấu hình; URL callback trả 404; lịch sử vẫn tra cứu được; mã đã xóa không dùng lại [IC] [SD] [RM].
- **FR1.13** Sửa cấu hình chỉ áp dụng cho callback mới. Mỗi callback lưu kèm phiên bản hoặc snapshot cấu hình (mapping, định dạng thời gian, múi giờ, response) đã dùng để xử lý nó [B§6].

**Tiêu chí chấp nhận**

- Given chưa có dịch vụ `THU_HO`, When tạo dịch vụ `THU_HO`, Then danh sách hiện dịch vụ với URL `/callbacks/THU_HO`.
- Given đã có (hoặc đã xóa) dịch vụ `THU_HO`, When tạo dịch vụ `thu_ho`, Then bị từ chối với thông báo mã đã tồn tại.
- Given dịch vụ có mapping `$.transId`, When đổi thành `$.data.transId` rồi gửi callback mới, Then callback cũ vẫn hiển thị kết quả theo `$.transId`, callback mới theo `$.data.transId`.
- Given dịch vụ dùng API_KEY, When mở form sửa, Then giá trị khóa hiển thị dạng che và response API không chứa giá trị khóa.
- Given xóa dịch vụ đã có callback, When gọi URL callback của nó, Then nhận 404; lịch sử cũ vẫn tra cứu được.

### FR2 — Thử mapping

- **FR2.1** Trong trang cấu hình dịch vụ, người dùng dán JSON mẫu và xem ba giá trị ánh xạ cùng lỗi từng trường [B§3] [RM].
- **FR2.2** Thử mapping không tạo bản ghi callback hay giao dịch [B§3].
- **FR2.3** Thử mapping dùng cấu hình đang nhập trên form (kể cả chưa lưu) [assumption: cần để thử trước khi lưu; ghi ở mục 5].

**Tiêu chí chấp nhận**

- Given mapping thu hộ, When dán `{"transId":"T1","code":"00","time":"2026-10-19T10:00:00+07:00"}`, Then hiện `T1`, `00`, `2026-10-19T03:00:00Z` và không có dòng mới ở màn hình theo dõi.
- Given JSON thiếu `code`, When thử mapping, Then trường status báo lỗi "không tìm thấy", hai trường còn lại vẫn hiện giá trị.
- Given JSON mẫu không hợp lệ, When thử mapping, Then báo JSON không hợp lệ.

### FR3 — Nhận callback

- **FR3.1** Endpoint `POST /callbacks/{serviceCode}` kiểm tra theo thứ tự: dịch vụ không tồn tại hoặc đã xóa → 404; dịch vụ tắt → 503; API key sai hoặc thiếu → 401; Content-Type không phải JSON hoặc JSON không hợp lệ → 400; sau đó mapping, lưu, trả response đã cấu hình [B§6] [Q2] [A1].
- **FR3.2** Tên header API key so khớp không phân biệt hoa thường; giá trị so khớp chính xác [A2].
- **FR3.3** Body lớn hơn 1 MB trả 413 và không lưu [A10].
- **FR3.4** Mỗi callback được lưu riêng; không deduplicate, không ghi đè lịch sử [B§6].
- **FR3.5** Mỗi callback lưu: payload gốc (JSONB), headers đã che, `receivedAt` do server tạo, giá trị mapping lấy được, lỗi cụ thể từng trường, timestamp nghiệp vụ đã chuẩn hóa UTC (nếu hợp lệ), response đã trả, tham chiếu snapshot cấu hình [B§6] [B§5].
- **FR3.6** Mapping lỗi vẫn trả response đã cấu hình nếu request là JSON hợp lệ, dịch vụ đang bật và xác thực hợp lệ [B§6].
- **FR3.7** Lỗi lưu database trả 500, không trả response thành công theo cấu hình [B§6].
- **FR3.8** Request bị từ chối (401, 400, 503, 404 với dịch vụ đã xóa) tới một dịch vụ có thật vẫn được lưu vào danh sách callback, kèm mã HTTP đã trả và lý do từ chối; không nhóm vào giao dịch; body không phải JSON hợp lệ lưu dạng văn bản gốc. Request tới `serviceCode` chưa từng tồn tại không được lưu [Q1].
- **FR3.9** Request bị từ chối vì quá 1 MB (413) không được lưu [A10].

**Tiêu chí chấp nhận**

- Given dịch vụ bật, NONE, response `201 {"ok":true}`, When gọi bằng cURL với JSON hợp lệ, Then nhận đúng `201 {"ok":true}` và có một callback mới.
- Given dịch vụ API_KEY header `X-Api-Key`, When gọi với khóa đúng / sai / thiếu, Then lần lượt nhận response cấu hình / 401 / 401; hai lần 401 vẫn có trong "Tất cả callback" với lý do tương ứng.
- Given dịch vụ tắt, When gọi, Then nhận 503 và callback được lưu với lý do "dịch vụ tắt".
- Given `serviceCode` chưa từng tồn tại, When gọi, Then nhận 404 và không có bản ghi nào.
- Given body `not json` với Content-Type `text/plain`, When gọi dịch vụ đang bật, Then nhận 400 và callback được lưu với body văn bản gốc.
- Given database không ghi được, When gọi, Then nhận 500, không nhận response cấu hình.

### FR4 — Mapping và chuẩn hóa thời gian

- **FR4.1** Giá trị chuỗi, số, boolean được lưu dưới dạng chuỗi nguyên văn [A5].
- **FR4.2** Ở `transactionId` hoặc `status`: không tìm thấy, `null`, chuỗi rỗng, object hoặc mảng là lỗi mapping của trường đó [B§6] [A5].
- **FR4.3** Payload gốc không phải object (ví dụ mảng) thì cả ba trường đều lỗi mapping [A5].
- **FR4.4** `timestamp` là trường tùy chọn: thiếu thì chỉ cảnh báo; có nhưng không đọc được theo định dạng đã cấu hình là lỗi của trường timestamp [RM] [A7].
- **FR4.5** Giữ nguyên giá trị status; không diễn giải SUCCESS/FAILED hay gán ý nghĩa cho mã [B§6].
- **FR4.6** Thời gian hợp lệ được chuẩn hóa về UTC; giao diện hiển thị theo `Asia/Ho_Chi_Minh` và ghi rõ múi giờ [B§6].
- **FR4.7** Lưu riêng timestamp nghiệp vụ và `receivedAt` [B§6].

**Tiêu chí chấp nhận**

- Given định dạng Unix giây, When nhận `1760850000`, Then timestamp UTC là `2025-10-19T05:00:00Z`.
- Given mẫu `yyyy-MM-dd HH:mm:ss` và múi giờ `Asia/Ho_Chi_Minh`, When nhận `2026-10-19 10:00:00`, Then timestamp UTC là `2026-10-19T03:00:00Z`.
- Given `"code": 0` (số), When mapping, Then status là `"0"`.
- Given `"transId": {"a":1}`, When mapping, Then transactionId báo lỗi kiểu giá trị và callback không vào giao dịch.

### FR5 — Giao dịch

- **FR5.1** Giao dịch được xác định bằng `serviceCode` + `transactionId` [B§6].
- **FR5.2** Callback thiếu transactionId (hoặc lỗi transactionId) được lưu trong danh sách callback nhưng không nhóm vào giao dịch [B§6].
- **FR5.3** Trạng thái tổng hợp lấy từ callback nhận gần nhất theo `receivedAt`, không dựa vào timestamp nghiệp vụ [B§6].
- **FR5.4** Nếu callback mới nhất thiếu status thì giao dịch hiển thị thiếu giá trị và lỗi mapping; không lấy status cũ [B§6].
- **FR5.5** Nhiều callback cùng transactionId đến đồng thời: không mất callback nào, tổng số callback đúng, trạng thái tổng hợp là của callback có `receivedAt` muộn nhất (hòa nhau thì theo mã bản ghi lớn nhất) [B§6] [A12].

**Tiêu chí chấp nhận**

- Given 3 callback `T1` với status `A`, `B`, `C` theo thứ tự nhận, When xem giao dịch, Then status `C`, tổng 3, lịch sử đủ 3.
- Given callback thứ 4 của `T1` thiếu status, When xem, Then status trống kèm lỗi mapping, tổng 4.
- Given callback mới có timestamp nghiệp vụ sớm hơn callback cũ, When xem, Then status vẫn lấy từ callback nhận sau.
- Given 50 callback `T1` gửi đồng thời, When xử lý xong, Then có đúng một giao dịch `T1` với tổng 50.

### FR6 — Bảo mật dữ liệu lưu trữ

- **FR6.1** Headers lịch sử: `Authorization`, `Proxy-Authorization`, `Cookie` và header API key của dịch vụ được lưu thành `***`; các header khác giữ nguyên [B§6] [A3].
- **FR6.2** Không ghi giá trị API key vào log [B§3].

**Tiêu chí chấp nhận**

- Given gửi callback có `Authorization: Bearer x` và `X-Api-Key: k`, When xem chi tiết, Then cả hai hiện `***`; database và log không chứa `x` hay `k`.

### FR7 — Gửi callback thử

- **FR7.1** Trang gửi thử riêng của từng dịch vụ, mở từ nút "Gửi thử" ở danh sách hoặc trang cấu hình [RM].
- **FR7.2** Người dùng nhập payload và headers; với dịch vụ API_KEY, form điền sẵn tên header, người dùng tự nhập giá trị khóa [B§3] [Q3].
- **FR7.3** Gửi thử gọi chính endpoint `POST /callbacks/{serviceCode}`, đi qua đầy đủ xác thực, mapping, lưu và phản hồi; không có endpoint nhận riêng cho self-test [B§3].
- **FR7.4** Hiển thị HTTP status, response body và thời gian phản hồi đo ở trình duyệt [B§3] [A14].
- **FR7.5** Dữ liệu được lưu như callback bình thường [B§3].

**Tiêu chí chấp nhận**

- Given dịch vụ thu hộ, When gửi thử payload mẫu, Then thấy status và body đã cấu hình, thời gian phản hồi tính bằng ms, và callback mới xuất hiện ở màn hình theo dõi.
- Given dịch vụ API_KEY, When gửi thử với khóa sai, Then thấy 401 và callback bị từ chối được lưu.

### FR8 — Theo dõi: tab "Giao dịch"

- **FR8.1** Một dòng cho mỗi cặp `serviceCode` + `transactionId`, hiển thị: dịch vụ, mã giao dịch, status từ callback nhận gần nhất, timestamp nghiệp vụ của callback đó, thời điểm nhận gần nhất, tổng số callback [B§5].
- **FR8.2** Bộ lọc: dịch vụ (có cả dịch vụ đã xóa, ghi rõ "đã xóa"), transactionId và status (chứa chuỗi, không phân biệt hoa thường), khoảng thời gian nhận (giờ Asia/Ho_Chi_Minh, tính cả hai đầu) [B§5] [RM] [A11].
- **FR8.3** Phân trang phía server: mặc định 20 dòng, chọn 20/50/100; sắp xếp theo thời điểm nhận gần nhất mới trước, hòa nhau theo mã [B§5] [A12].
- **FR8.4** Status nghiệp vụ hiển thị bằng một màu trung tính; chỉ mã HTTP và lỗi mapping có màu [RM].

### FR9 — Theo dõi: chi tiết giao dịch

- **FR9.1** Mở trong bảng trượt bên phải; danh sách, bộ lọc và trang giữ nguyên [RM].
- **FR9.2** Lịch sử callback theo thứ tự nhận; mỗi lần nhận có payload gốc, headers đã che, kết quả mapping từng trường, HTTP response đã trả cho lần đó [B§5].

### FR10 — Theo dõi: tab "Tất cả callback"

- **FR10.1** Mỗi lần nhận một dòng, gồm cả callback lỗi mapping, thiếu transactionId và request bị từ chối (FR3.8) [B§5] [Q1].
- **FR10.2** Bộ lọc: dịch vụ, transactionId, khoảng thời gian nhận, kết quả xử lý (thành công, lỗi mapping, bị từ chối kèm lý do) [B§5] [Q1].
- **FR10.3** Phân trang phía server như FR8.3 [B§5].
- **FR10.4** Mở một dòng xem chi tiết lần nhận đó (payload hoặc body văn bản, headers đã che, kết quả mapping, response) [B§5].

**Tiêu chí chấp nhận (FR8–FR10)**

- Given 25 giao dịch, When mở tab "Giao dịch", Then thấy 20 dòng và trang 2 có 5 dòng.
- Given lọc status `0`, When có status `00` và `10`, Then cả hai hiện ra.
- Given một callback lỗi mapping thiếu transactionId, When mở "Tất cả callback", Then dòng đó có mặt với kết quả "lỗi mapping" và không có trong tab "Giao dịch".
- Given đã có kết quả lọc, When không có dữ liệu khớp, Then hiện thông báo "không có dữ liệu khớp bộ lọc", khác với thông báo lỗi tải.

### FR11 — Tự cập nhật

- **FR11.1** Polling mỗi 5 giây, bật sẵn khi mở màn hình theo dõi, có nút bật/tắt và nút tải lại thủ công [B§5] [A13].
- **FR11.2** Tự cập nhật không làm mất bộ lọc, trang hiện tại, và không đóng chi tiết đang mở [B§5].
- **FR11.3** Nếu lần polling trước chưa xong thì bỏ qua lần kế tiếp; khi tải lỗi, giữ dữ liệu cũ và hiện thông báo kèm thời điểm cập nhật thành công gần nhất [A13] [corner-checklist].

**Tiêu chí chấp nhận**

- Given đang ở trang 2, lọc theo dịch vụ, mở chi tiết, When có callback mới và qua 5 giây, Then dữ liệu cập nhật, vẫn ở trang 2, bộ lọc và chi tiết giữ nguyên.
- Given tắt tự cập nhật, When có callback mới, Then dữ liệu chỉ đổi khi bấm tải lại.

### FR12 — Dữ liệu mẫu

- **FR12.1** `docs/samples/` có cấu hình mẫu và payload thử cho ba dịch vụ: thu hộ (`$.transId`, `$.code`, `$.time`), chi hộ (`$.processId`, `$.status`, `$.date`), biến động số dư (`$.trnId`, `$.stage`, `$.dateTime`) [B§4].
- **FR12.2** Có script gọi API để tạo ba dịch vụ mẫu và lệnh cURL gửi payload mẫu; ứng dụng không tự tạo dịch vụ mẫu khi khởi động [Q4].

## 3. Non-functional requirements

- **NFR1 — Hiệu năng:** với 100.000 callback trong database, các API danh sách có lọc và phân trang (FR8, FR10) trả kết quả dưới 1 giây ở p95 trên máy local [Q5].
- **NFR2 — Toàn vẹn dữ liệu đồng thời:** gửi đồng thời 50 callback cùng `transactionId` không mất bản ghi nào và tổng hợp đúng như FR5.5 [B§6].
- **NFR3 — Bảo mật:** không có giá trị API key nguyên văn trong log, headers lịch sử hay response API; được kiểm chứng bằng kiểm thử tích hợp [B§3] [B§6].
- **NFR4 — Khả năng truy cập:** mức cơ bản: mọi chức năng dùng được bằng bàn phím, mọi ô nhập có nhãn, trạng thái lỗi không chỉ thể hiện bằng màu; không đặt mục tiêu WCAG chính thức [RM].
- **NFR5 — Khả năng chạy:** khởi động PostgreSQL (Docker Compose), backend và frontend theo README từ một bản checkout sạch [B§8].
- **NFR6 — Chất lượng:** build backend và frontend thành công; có kiểm thử tích hợp cho mapping, timestamp, xác thực, lịch sử, xử lý đồng thời và API; tối thiểu 80% line coverage backend (JaCoCo); CI chạy build và test [B§8] [B§9] [PD].
- **NFR7 — Mở rộng bằng cấu hình:** thêm dịch vụ có cấu trúc JSON khác (trong phạm vi HTTP POST JSON và đường dẫn đã hỗ trợ) mà không sửa code [B§1] [B§8].

## 4. Constraints

- Java 21, Spring Boot, Maven; PostgreSQL với payload JSONB; React, TypeScript, Vite; một backend, một frontend, một database; Docker Compose chạy PostgreSQL; ghi rõ phiên bản thư viện ổn định [B§2].
- Không microservices, Kafka, NoSQL, cache phân tán, workflow engine; không xây design system riêng [B§2].
- Cấu trúc thư mục: `backend/`, `frontend/`, `docs/`, `compose.yaml` [B§2].
- Chỉ chạy local; không triển khai production, không dùng dịch vụ đám mây để chạy ứng dụng [FS].
- Chỉ dữ liệu kiểm thử/giả lập; dữ liệu giữ vô thời hạn [FS].
- Giao hàng theo ba phần của brief mục 9, kiểm chứng xong phần nào mới chuyển phần đó; walking skeleton nằm trong phần backend [B§9] [PD].
- Bố cục và phong cách giao diện theo thiết kế Stitch trong `docs/design/stitch/`, chức năng theo brief [RM].

## 5. Assumptions

Mười lăm giả định trong `requirements-analysis-questions.md` đã được người dùng chấp nhận và được ghi vào các yêu cầu ở trên (ký hiệu [A1]–[A15]). Thêm:

- [assumption] Thử mapping dùng cấu hình đang nhập trên form, kể cả chưa lưu (FR2.3), để người dùng thử trước khi lưu. Lý do: thử mapping nằm ngay trong trang cấu hình [RM].
- [assumption] Kết nối frontend với backend khi chạy dev qua Vite proxy cho `/api` và `/callbacks`, không cấu hình CORS [A15].
- [assumption] Danh sách mặc định trống được hiển thị khác với lỗi tải (theo corner checklist), không cần quyết định thêm.

## 6. Out of scope

- Mọi mục loại trừ ở brief mục 7: gọi API nghiệp vụ sang ngân hàng; giao dịch dự kiến hoặc phát hiện callback chưa đến; Kafka, NoSQL, đồng bộ dữ liệu; đăng nhập và phân quyền; response động; giả lập timeout, độ trễ, lỗi N lần, phản hồi theo điều kiện; triển khai production [B§7].
- JSON path dạng wildcard, filter, mảng; WebSocket [IC].
- Để hệ thống ngân hàng thật gọi tới được TPP; tự động xóa dữ liệu cũ; dịch vụ đám mây [SD].
- Các phần thiết kế Stitch ngoài brief: retry policy, IP whitelist/firewall, mTLS, chứng chỉ SSL, nút Replay, "Nhật ký nhận", số liệu thống kê [RM].
- Tự tạo dịch vụ mẫu khi khởi động [Q4].
- Lưu request tới `serviceCode` chưa từng tồn tại; lưu request quá 1 MB [Q1] [A10].

## 7. Open questions

- Git chưa được cài trên máy và chưa có kho GitHub; cần có trước Construction để chạy CI (không chặn yêu cầu) [PD].
