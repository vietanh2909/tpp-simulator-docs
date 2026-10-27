# Functional Design — U2 `u2-backend-core` — Câu hỏi làm rõ

> Phạm vi: hoàn thiện bốn thành phần backend trên nền U1 (ServiceCatalog, MappingEngine, CallbackIngestion, CallbackLedger): xác thực API key, ghi các lần nhận bị từ chối, toàn bộ thứ tự kiểm tra, ba định dạng timestamp còn lại, phiên bản cấu hình khi sửa, API quản lý dịch vụ đầy đủ, API thử mapping, bộ lọc và danh sách callback, che header API key, tài sản mẫu và công cụ nạp 100.000 callback. Story: US1.2, US1.3, US1.4, US1.5, US1.7, US1.8, US1.9, US1.11, US1.12, US1.13, US1.14, US2.11 (tiêu chí AC1.2.x đến AC1.14.5 và AC2.11.x theo `stories.md`).
>
> Đã chốt, không hỏi lại: Java 21, Spring Boot, Maven, PostgreSQL JSONB (brief mục 2); thứ tự kiểm tra 413, mã chưa từng có, đã xóa, tắt, khóa API, Content-Type, JSON (FR3.1, AC1.3.3, AC1.3.4); tên header API key không phân biệt hoa thường, giá trị so khớp chính xác (FR3.2); lưu và không lưu các lần từ chối, kể cả 413 và mã chưa từng có (FR3.8, FR3.9); xóa mềm, mã đã xóa không dùng lại, sửa dịch vụ đã xóa trả 404 (FR1.12, R-11); phiên bản cấu hình tạo khi mapping, định dạng thời gian, múi giờ hoặc response đổi, còn tên, mô tả, xác thực, khóa và bật/tắt thì không (ADR-004); thử mapping dùng cấu hình đang nhập và do server tính (FR2.3, ADR-005); phân trang 20/50/100, sắp xếp cố định, danh sách mã lỗi, tên tham số lọc (Contract Design Q1 đến Q8 và `contract-summary.md` đã sửa ở U1); header `X-Simulator-Error` (U1 Q3 A); mã dịch vụ khớp không phân biệt hoa thường (U1 Q5 A); không dịch vụ mẫu tự tạo khi khởi động (FR12.2); thực hành test-after, JUnit 5 và Testcontainers (`team.md`).
>
> Để các bước sau, không hỏi ở đây: cách lưu khóa API (NFR Requirements); cách bảo đảm đồng thời, chỉ mục và giới hạn kích thước phản hồi chi tiết (NFR Design); cách đo NFR1 với 100.000 callback (NFR Requirements). Ở đây chỉ chốt hình dạng dữ liệu thử.
>
> Việc U1 để lại cho bước này và có trong câu hỏi: "không ghi được một request bị từ chối thì trả mã gốc hay 500" (Q1). Các việc U1 từ chối tạm thời (`authType` là `API_KEY`, `timestampFormat` khác `ISO_8601`, tham số lọc) được U2 gỡ bỏ, ghi ở phần giả định.
>
> Tám câu hỏi dưới đây là những chỗ cần bạn quyết; phần còn lại tôi đề xuất sẵn ở "Assumptions & Open Questions". Theo bảng góc cạnh (`corner-checklist.md`, mức Standard), các góc đã được yêu cầu chốt được mang sang; chỉ các góc còn mở mới thành câu hỏi.

## Q1. Request bị từ chối mà không ghi được bản ghi thì trả mã nào?

Lý do hỏi: FR3.7 chỉ nói lỗi ghi một callback được chấp nhận trả 500. Với request bị từ chối (ví dụ 401 vì sai khóa), nếu database không ghi được lần nhận thì có hai điều đều đúng nhưng mâu thuẫn: bên gửi cần thấy mã từ chối thật (401), còn người kiểm thử cần biết bản ghi sẽ không xuất hiện trong "Tất cả callback". U1 đã để câu hỏi này cho bước này.

A. (Recommended) Trả đúng mã từ chối gốc (401, 503, 404, 400) kèm header `X-Simulator-Record-Failed: true`, ghi log mức ERROR (mã dịch vụ, lý do, không có body và không có khóa). Bên gửi nhận mã đúng như một TPP thật; người kiểm thử có dấu hiệu máy đọc được rằng bản ghi không được lưu. Header mới là mở rộng tương thích của hợp đồng, ghi vào `openapi.yaml`
B. Trả 500 `INTERNAL_ERROR` giống FR3.7: nhất quán "không giả vờ đã ghi", nhưng che mất mã từ chối thật, nên bên gửi tưởng lỗi nằm ở server thay vì ở khóa hay trạng thái dịch vụ
C. Trả mã từ chối gốc, chỉ ghi log, không có dấu hiệu nào ở response. Đơn giản nhất, nhưng người kiểm thử không biết vì sao không thấy bản ghi
X. Other (please specify)

[Answer]:A

## Q2. Đường dẫn mapping hợp lệ gồm những ký tự nào? (FR1.7)

Lý do hỏi: FR1.7 yêu cầu "đường dẫn sai cú pháp bị từ chối khi lưu" nhưng brief chỉ nêu `$.a.b.c` cho root và object lồng nhau. U1 mới chỉ kiểm tra bắt đầu bằng `$.`. Cần chốt tên khóa (đoạn giữa hai dấu chấm) được dùng ký tự nào, vì khóa của ngân hàng có thể là `trans_id`, `trn-id`, `TransID`, hoặc có dấu chấm trong tên.

A. (Recommended) Mỗi đoạn gồm chữ cái, chữ số, dấu gạch dưới và dấu gạch ngang (`[A-Za-z0-9_-]+`); bắt đầu bằng `$.`; không có đoạn rỗng (`$.a..b`, `$.a.`); `$` đứng riêng bị từ chối (nó là cả payload); tối đa 10 đoạn. Khóa có dấu chấm, dấu cách hay ký tự khác chưa hỗ trợ và bị từ chối khi lưu với thông báo nêu đúng ký tự. Phủ các khóa thường gặp, đúng giới hạn brief
B. Cho phép mọi ký tự trừ dấu chấm, dấu ngoặc vuông, dấu nháy và khoảng trắng (kể cả chữ có dấu, `$`, `@`). Phủ nhiều khóa hơn nhưng khó giải thích lỗi và dễ nhầm với cú pháp mảng và bộ lọc mà brief loại trừ
C. Như A và thêm cú pháp ngoặc `$['a.b']` cho khóa chứa dấu chấm hay ký tự đặc biệt. Phủ mọi khóa nhưng vượt phạm vi brief ("chưa cần wildcard, filter hoặc mapping mảng"), thêm việc cho MappingEngine, thử mapping và biểu mẫu U3
X. Other (please specify)

[Answer]:A

## Q3. Timestamp Unix giây và mili giây được chấp nhận ở dạng nào? (US1.7)

Lý do hỏi: AC1.7.2 chỉ nêu `1760850000`. Chưa nói chuỗi `"1760850000"`, số có phần thập phân (`1760850000.123`) có được nhận không, và nếu ngân hàng gửi nhầm đơn vị (mili giây vào dịch vụ cấu hình giây) thì ra năm 57.000 mà vẫn "hợp lệ". Bảng góc cạnh yêu cầu timestamp bất thường (epoch 0, tương lai xa) được đánh dấu chứ không hiện như thật.

A. (Recommended) Nhận số JSON hoặc chuỗi chỉ gồm chữ số, cho phép phần thập phân (giữ đến micro giây, thừa thì cắt). Sau khi đổi, thời điểm phải nằm trong khoảng 1970-01-01 đến 2100-01-01 UTC; ngoài khoảng là lỗi `UNPARSEABLE` của trường timestamp (bắt được nhầm giây/mili giây). Boolean là `UNPARSEABLE`, object và mảng là `WRONG_TYPE`
B. Chỉ nhận số nguyên (số JSON hoặc chuỗi chữ số), không giới hạn khoảng. Đơn giản, nhưng nhầm đơn vị cho ra thời điểm vô nghĩa và được lưu như thật
C. Chỉ nhận số JSON (không nhận chuỗi chữ số), có giới hạn khoảng như A. Chặt nhất, nhưng ngân hàng nào gửi timestamp dạng chuỗi sẽ luôn báo lỗi
X. Other (please specify)

[Answer]:A

## Q4. Mẫu chuỗi ngày giờ (`PATTERN`) hiểu thế nào khi thiếu giờ, thiếu múi giờ hoặc có chữ tháng? (FR1.8, FR1.9)

Lý do hỏi: AC1.7.3 chỉ có mẫu đầy đủ `yyyy-MM-dd HH:mm:ss`. Cú pháp `DateTimeFormatter` cho phép mẫu chỉ có ngày, mẫu có múi giờ ngay trong chuỗi, mẫu có tên tháng (`dd/MMM/yyyy`), và chuỗi dư ký tự phía sau. Mỗi trường hợp cho kết quả UTC khác nhau, nên cần một quy tắc duy nhất.

A. (Recommended) Mẫu phải có ngày và giờ (ít nhất năm, tháng, ngày, giờ, phút), kiểm tra khi lưu; mẫu chỉ có ngày bị từ chối với 400 `VALIDATION_FAILED`, field `timestampPattern`. Nếu mẫu có thành phần múi giờ hay offset thì dùng nó, nếu không thì dùng `defaultTimeZone`. Chuỗi phải khớp toàn bộ mẫu (dư ký tự là `UNPARSEABLE`); ngày không tồn tại như `2026-02-30` là `UNPARSEABLE`; tên tháng và thứ theo tiếng Anh. Kết quả luôn chuẩn hóa UTC
B. Như A nhưng cho phép mẫu chỉ có ngày, hiểu là 00:00:00 trong `defaultTimeZone`. Thuận tiện cho hệ thống chỉ gửi ngày, nhưng dễ che lỗi cấu hình (quên phần giờ vẫn "chạy được")
C. Như A nhưng thêm một trường cấu hình ngôn ngữ (`en` hoặc `vi`) cho tên tháng và thứ của từng dịch vụ. Phủ được bank gửi tên tháng tiếng Việt, nhưng thêm trường vào hợp đồng, biểu mẫu U3 và phiên bản cấu hình
X. Other (please specify)

[Answer]:A

## Q5. Quy tắc cho tên header và giá trị khóa API khi lưu cấu hình là gì? (FR1.5, US1.2)

Lý do hỏi: hợp đồng chỉ nói `apiKeyHeaderName` tối đa 100 ký tự và có khóa khi chọn `API_KEY`. Chưa nói tên header phải hợp lệ thế nào, khóa dài bao nhiêu, ký tự nào. Khóa có khoảng trắng đầu cuối hay ký tự điều khiển (xuống dòng) sẽ không bao giờ khớp được qua HTTP, và tên header như `Content-Type` hay `Host` sẽ làm xác thực xung đột với chính giao thức nhận callback.

A. (Recommended) Tên header theo ký tự hợp lệ của HTTP (chữ cái, chữ số và `-_.!#$%&'*+^`|~`, không khoảng trắng), 1 đến 100 ký tự, và không được là header dành riêng `Host`, `Content-Type`, `Content-Length`, `Transfer-Encoding`, `Connection`. Khóa dài 1 đến 256 ký tự ASCII in được (có thể có khoảng trắng ở giữa, ví dụ `Bearer abc`), không có khoảng trắng đầu hoặc cuối. Lưu nguyên văn, không cắt. Vi phạm: 400 `VALIDATION_FAILED` nêu từng trường
B. Chặt hơn: khóa chỉ gồm chữ, số và `-_.~+/=` (không khoảng trắng nào). Đơn giản nhất để so khớp nhưng không thử được kiểu khóa `Bearer abc` đặt trong header riêng
C. Rộng: chỉ cần khác rỗng và tối đa 256 ký tự, không kiểm tra ký tự. Dễ nhập nhưng cho phép cấu hình khóa không bao giờ khớp được (khoảng trắng đầu cuối, xuống dòng) và tên header xung đột giao thức
X. Other (please specify)

[Answer]:A

## Q6. Hai người sửa cùng một dịch vụ cùng lúc thì xử lý ra sao?

Lý do hỏi: dữ liệu và cấu hình dùng chung cho cả nhóm, không đăng nhập (brief mục 7). Bảng góc cạnh nêu "không thay đổi nào bị mất lặng lẽ khi sửa đồng thời". Hợp đồng `PUT /api/services/{serviceCode}` hiện không mang số phiên bản của biểu mẫu, nên người lưu sau ghi đè người lưu trước mà không ai biết. Quyết định này đổi hợp đồng (và biểu mẫu U3) nếu chọn B, nên nên chốt trước khi U3 bắt đầu.

A. (Recommended) Người lưu sau thắng, không phát hiện xung đột. Phần việc phía server vẫn bảo đảm số phiên bản cấu hình tăng liên tục, không trùng, không hụt dù hai lần sửa chạy đồng thời (khóa theo từng dịch vụ khi sửa). Hợp đồng giữ nguyên. Đủ cho một nhóm nhỏ dùng môi trường thử; rủi ro: một bản sửa có thể bị ghi đè mà không báo
B. Khóa lạc quan: `PUT` phải kèm `currentVersionNumber` và `updatedAt` mà biểu mẫu đã đọc; không khớp thì 409 `SERVICE_CONFLICT` kèm cấu hình hiện hành để biểu mẫu hỏi người dùng. Không mất thay đổi nào, nhưng thêm mã lỗi và trường vào hợp đồng, thêm một màn hình xử lý xung đột ở U3
C. Như A, kèm cảnh báo mềm: phản hồi `PUT` có thêm cờ `overwroteNewerChange` khi bản đang sửa đã cũ hơn bản lưu, để U3 hiện thông báo sau khi lưu. Không chặn ai, nhưng U3 phải gửi thêm dữ liệu đã đọc
X. Other (please specify)

[Answer]:A

## Q7. Ba dịch vụ mẫu dùng cấu hình nào? (US2.11, FR12.1)

Lý do hỏi: brief chỉ cho đường dẫn mapping của ba dịch vụ (`$.transId`/`$.code`/`$.time`, `$.processId`/`$.status`/`$.date`, `$.trnId`/`$.stage`/`$.dateTime`), chưa nói mã dịch vụ, kiểu xác thực, định dạng timestamp và response của từng cái. Bộ mẫu là cách nhanh nhất để người dùng nhìn thấy mọi tính năng (API key, bốn định dạng thời gian) hoạt động, và AC2.11.3 yêu cầu cURL mẫu ánh xạ đúng ba trường.

A. (Recommended) Mã dịch vụ `THU_HO`, `CHI_HO`, `BIEN_DONG_SO_DU`. `THU_HO`: `NONE`, `ISO_8601` (`2026-10-19T10:00:00+07:00`), response `200 {"code":"00"}`. `CHI_HO`: `API_KEY` header `X-Api-Key` với khóa giả công khai `sample-key-chi-ho`, `PATTERN` `yyyy-MM-dd HH:mm:ss` múi giờ `Asia/Ho_Chi_Minh`, response `200 {"status":"OK"}`. `BIEN_DONG_SO_DU`: `NONE`, `UNIX_MILLIS`, response `202 {"received":true}`. Mỗi dịch vụ kèm hai payload (một hợp lệ, một thiếu hoặc sai trường để thấy lỗi mapping). Bộ mẫu trình diễn đủ API key và ba trong bốn định dạng thời gian; `UNIX_SECONDS` được kiểm bằng kiểm thử tích hợp
B. Cả ba dịch vụ đều `NONE`, `ISO_8601`, response `200 {"ok":true}`. Dễ hiểu nhất và không có khóa nào trong tệp mẫu, nhưng không trình diễn xác thực hay định dạng thời gian khác
C. Như A nhưng thêm dịch vụ thứ tư `UNIX_SECONDS` để phủ đủ bốn định dạng. Phủ hết, nhưng brief nói ba dịch vụ và AC2.11.2 đếm ba dịch vụ
X. Other (please specify)

[Answer]:A

## Q8. Công cụ nạp 100.000 callback tạo dữ liệu bằng cách nào và đặt ở đâu? (NFR1, AC1.14.5)

Lý do hỏi: U2 chịu trách nhiệm NFR1 nên phải có công cụ nạp (cách đo chốt ở NFR Requirements, không hỏi ở đây). Còn lại hai điều cần bạn quyết: dữ liệu nạp có tuân đúng quy tắc nghiệp vụ không (giao dịch gom đúng, phiên bản cấu hình, bản ghi bị từ chối), và có lẫn vào dữ liệu thử thật của bạn không. 100.000 dòng sẽ làm màn hình theo dõi của U4 ngập nếu để chung.

A. (Recommended) Một lệnh riêng trong `tpp-simulator-app` (không bao giờ chạy lúc khởi động), đi qua chính logic nhận callback của ứng dụng (cùng quy tắc ánh xạ, che header, gom giao dịch) nhưng không qua HTTP, ghi vào một database riêng cùng PostgreSQL của `compose.yaml` (tên database cấu hình được, mặc định tách khỏi database thử thật). Tham số: `--callbacks` (mặc định 100000), `--seed` (cố định để lặp lại), `--days` (30), `--services` (3, mã `LOAD_01`...). Bảo vệ dữ liệu thật; dữ liệu nạp tuân đúng quy tắc; hơi thêm việc cấu hình database thứ hai
B. Cùng một lệnh như A nhưng ghi vào cùng database thử thật với dịch vụ có tiền tố `LOAD_`. Đơn giản hơn, nhưng dữ liệu nạp lẫn vào màn hình theo dõi và không xóa được (callback không bao giờ bị xóa; chỉ dọn bằng cách đặt lại volume Docker)
C. Chèn hàng loạt bằng SQL trực tiếp vào bảng (nhanh nhất, vài giây), cùng database thử thật. Nhanh, nhưng đi vòng quy tắc nghiệp vụ nên dữ liệu có thể không giống dữ liệu thật (giao dịch, phiên bản cấu hình), làm số đo kém đáng tin
X. Other (please specify)

[Answer]:A

## Assumptions & Open Questions

Các điểm dưới đây tôi tự quyết theo mặc định hợp lý; bạn chỉ đọc và sửa nếu không đồng ý. Mỗi mục có thẻ nguồn: `[desc]` mô tả ban đầu và brief, `[scope]` phạm vi đã duyệt của workflow, `[assumption]` suy luận của tôi, `[Q<n>]` câu trả lời ở câu hỏi tương ứng trong tệp này.

**Nhận callback và ghi lần từ chối (CallbackIngestion)**

1. **Thứ tự kiểm tra giữ nguyên như hợp đồng:** 413, mã chưa từng có (404), đã xóa (404), tắt (503), khóa API (401), Content-Type (400), JSON (400), rồi ánh xạ, ghi và trả response đã cấu hình. Kiểm tra trạng thái dịch vụ đứng trước xác thực, xác thực đứng trước JSON. U1 đã làm các mã này nhưng chưa ghi; U2 thêm 401 và việc ghi. `[desc]` FR3.1, AC1.3.3, AC1.3.4
2. **Dịch vụ vừa tắt vừa đã xóa:** đã xóa thắng (404, lý do `SERVICE_DELETED`). `[assumption]` BR2.3 của U1
3. **Trạng thái dịch vụ đọc một lần ở đầu xử lý:** đã xóa, tắt, khóa, phiên bản cấu hình hiện hành đều đọc một lần. Một callback đã qua kiểm tra vẫn được ghi theo đúng phiên bản đã đọc, dù dịch vụ bị sửa hoặc xóa ngay sau đó. `[assumption]` FR1.13, NFR2
4. **Hình dạng bản ghi bị từ chối:** `outcome` là `REJECTED`; `rejectionReason` theo danh sách C4 (`INVALID_API_KEY`, `MISSING_API_KEY`, `INVALID_JSON`, `UNSUPPORTED_CONTENT_TYPE`, `SERVICE_DISABLED`, `SERVICE_DELETED`); `httpStatusReturned`, `responseStatusReturned` và `responseBodyReturned` là mã và `ErrorResponse` đã trả; `transactionId`, `status`, `businessTimestamp` để trống; `mappingFieldResults` rỗng (không đánh giá trường nào); không tạo hay cập nhật Transaction, kể cả khi body có transactionId. `[desc]` FR3.8, AC1.5.1 đến AC1.5.4
5. **Bản ghi bị từ chối tham chiếu phiên bản cấu hình hiện hành lúc nhận** (cột tham chiếu bắt buộc trong lược đồ V1). `[assumption]`
6. **Payload của lần từ chối:** body phân tích được thành JSON thì lưu `payloadJson`, nếu không thì lưu `payloadRawText` (UTF-8, byte không hợp lệ thay bằng U+FFFD); không lưu cả hai; body rỗng lưu chuỗi rỗng. Request quá 1.048.576 byte và mã dịch vụ chưa từng có không ghi gì. `[desc]` FR3.8, FR3.9, AC1.5.3, AC1.5.5
7. **Che header API key:** khi dịch vụ dùng `API_KEY`, header mang tên hiện hành trong cấu hình (không phân biệt hoa thường) luôn lưu là `***` cho mọi lần nhận, kể cả lần bị từ chối vì dịch vụ tắt hay đã xóa; nhiều giá trị cùng tên thành một `***`; dịch vụ `NONE` không che thêm header nào ngoài ba header chuẩn. Việc che làm ở CallbackIngestion trước khi giao cho CallbackLedger. `[desc]` FR6.1, AC1.12.1, AC1.12.2, ADR-007
8. **So khớp khóa:** tên header không phân biệt hoa thường; giá trị so khớp chính xác từng byte, dùng phép so sánh thời gian không đổi; header vắng hoặc giá trị rỗng là `MISSING_API_KEY`; sai là `INVALID_API_KEY`; header xuất hiện nhiều lần (nhiều giá trị) coi là sai. Dịch vụ `NONE` không bị từ chối vì xác thực dù có hay không có header. `[desc]` FR3.2, AC1.2.1 đến AC1.2.5; `[assumption]` cho phần nhiều giá trị
9. **Không lộ khóa:** khóa API không bao giờ có trong thân lỗi, log, header đã lưu hay response API. Mỗi lần từ chối ghi một dòng log gồm mã dịch vụ, `recordId` và lý do; không ghi body hay giá trị header. Kiểm chứng bằng kiểm thử tích hợp quét database, log và response. `[desc]` FR6.2, NFR3, AC1.12.3
10. **Ánh xạ lỗi vẫn trả response đã cấu hình** (kể cả timestamp sai định dạng), `outcome` là `MAPPING_ERROR` như BR3.8 của U1; lỗi ghi lần nhận được chấp nhận trả 500 `INTERNAL_ERROR` và không trả response đã cấu hình (BR2.8). `[desc]` FR3.6, FR3.7, AC1.8.1 đến AC1.8.3, AC1.9.1 đến AC1.9.3
11. **Lần từ chối được ghi trong một giao dịch cơ sở dữ liệu độc lập** với giao dịch nhận callback; hai callback đồng thời tới dịch vụ đang tắt tạo hai bản ghi từ chối riêng. Việc ghi lỗi của lần từ chối xử lý theo Q1. `[assumption]` NFR2

**Quản lý dịch vụ (ServiceCatalog)**

12. **Gỡ các từ chối tạm của U1:** `authType` là `API_KEY` và bốn giá trị `timestampFormat` được nhận; tham số lọc của danh sách giao dịch được nhận. Thông báo "chưa hỗ trợ ở bản skeleton" bị bỏ. `[scope]` `unit-of-work.md` mục U1/U2
13. **Kiểm tra đầy đủ khi tạo và sửa:** mọi lỗi trường gom trong một `fieldErrors`; `PATTERN` bắt buộc có `timestampPattern` biên dịch được (Q4); khi định dạng không phải `PATTERN` thì `timestampPattern` bị bỏ, không lưu; `API_KEY` bắt buộc có `apiKeyHeaderName` và khóa (Q5); đường dẫn mapping theo Q2; `NONE` bỏ qua `apiKeyHeaderName` và `apiKeySecret` gửi lên. `[desc]` FR1.5 đến FR1.10
14. **Đổi `authType` sang `NONE` xóa tên header và khóa đã lưu;** quay lại `API_KEY` phải nhập khóa mới (khớp R-11). Sửa dịch vụ đang `API_KEY` mà để trống ô khóa thì giữ khóa cũ. `[desc]` FR1.6, R-11 trong `contract-summary.md`
15. **`PUT` thay toàn bộ trường cấu hình;** `serviceCode` không có trong thân sửa, trường lạ bị bỏ qua, `serviceCode` không đổi. `[desc]` FR1.3
16. **Quy tắc tạo phiên bản (ADR-004) áp dụng ở mức giá trị:** phiên bản mới chỉ khi đường dẫn mapping, định dạng và mẫu thời gian, múi giờ, mã hoặc nội dung response thật sự đổi. Body response so sánh theo JSON tương đương: chỉ đổi khoảng trắng hoặc thứ tự khóa thì không tạo phiên bản. Sửa mà không đổi gì thì vẫn 200 và không tạo phiên bản. Số phiên bản tăng liên tục theo từng dịch vụ, không hụt, không dùng lại. Callback cũ giữ nguyên kết quả đã lưu, không tính lại. `[desc]` FR1.13, ADR-004, AC1.13.1 đến AC1.13.3
17. **Bật/tắt idempotent:** bật dịch vụ đang bật vẫn trả 200 với cấu hình hiện hành. Xóa mềm không khôi phục được trong MVP (FR1.12: mã đã xóa không dùng lại, không có story khôi phục); `GET` dịch vụ đã xóa vẫn trả với `deleted` bằng true; sửa, bật/tắt, xóa lại dịch vụ đã xóa trả 404. `[desc]` FR1.11, FR1.12
18. **Danh sách dịch vụ:** mặc định không gồm dịch vụ đã xóa (`includeDeleted` bằng true thì gồm), sắp theo `serviceCode` tăng dần không phân biệt hoa thường, không phân trang (số dịch vụ nhỏ). `[desc]` FR1.1, C2

**Ánh xạ và thử mapping (MappingEngine)**

19. **Thử mapping dùng đúng MappingEngine như callback thật** (ADR-005): cùng quy tắc tìm giá trị, lỗi từng trường, chuẩn hóa UTC. Cấu hình sai cú pháp (đường dẫn, mẫu thời gian, định dạng) trả 400 `VALIDATION_FAILED` kèm `fieldErrors`; JSON mẫu hỏng trả 200 với `sampleJsonValid` bằng false và `sampleJsonError`; payload gốc không phải object thì cả ba trường báo `PAYLOAD_NOT_OBJECT`; `timestampPath` vắng thì không đọc, có đường dẫn mà thiếu giá trị thì chỉ `warning`. `[desc]` FR2.1 đến FR2.3, AC1.7.4, C3
20. **Thử mapping không ghi gì,** không tạo callback, giao dịch hay phiên bản, và không cần response cố định hay khóa API trong yêu cầu. `sampleJson` tối đa 1.048.576 byte như giới hạn callback; vượt thì 400 `VALIDATION_FAILED`, field `sampleJson`. `[desc]` FR2.2; `[assumption]` giới hạn kích thước
21. **Mọi định dạng cho kết quả giống nhau về hình dạng:** timestamp hợp lệ chuẩn hóa UTC đến micro giây; object và mảng ở trường timestamp là `WRONG_TYPE`; giá trị không đọc được là `UNPARSEABLE`; lỗi timestamp không ảnh hưởng `transactionId`, `status` và việc vào giao dịch (BR3.6 của U1). Lưu riêng timestamp nghiệp vụ và `receivedAt`. `[desc]` FR4.4, FR4.6, FR4.7, AC1.7.5, AC1.7.6

**Tra cứu giao dịch và callback (CallbackLedger)**

22. **Bộ lọc kết hợp bằng AND:** `/api/transactions` nhận `serviceCode`, `transactionId`, `status`, `receivedFrom`, `receivedTo`; `/api/callbacks` nhận `serviceCode`, `transactionId`, `outcome`, `rejectionReason`, `receivedFrom`, `receivedTo`. Giá trị rỗng (`status=`) coi như không lọc. `serviceCode` khớp trọn mã, không phân biệt hoa thường, kể cả dịch vụ đã xóa; mã chưa tồn tại trả trang rỗng, không 404. `transactionId` và `status` khớp chuỗi chứa, không phân biệt hoa thường, ký tự `%`, `_`, `\` trong ô lọc là ký tự thường. Giao dịch có status trống không khớp bộ lọc `status` nào. `[desc]` FR8.2, FR10.2, AC1.14.3
23. **Kiểm tra tham số:** `receivedFrom` và `receivedTo` là ISO 8601 có múi giờ, tính cả hai đầu; thiếu múi giờ hoặc sai định dạng là 400; `receivedFrom` lớn hơn `receivedTo` là 400 (field `receivedTo`); `outcome` hoặc `rejectionReason` ngoài danh sách là 400; `rejectionReason` kèm `outcome` khác `REJECTED` không bị 400, kết quả đơn giản là rỗng. `page` nhỏ hơn 1 hoặc `size` ngoài 20/50/100 là 400. `[desc]` AC1.14.4, R-05
24. **Phân trang vượt cuối:** `page` lớn hơn `totalPages` trả 200 với `items` rỗng và `totalItems`, `totalPages` đúng. Thứ tự cố định `receivedAt` rồi `recordId` mới trước (callback) và `latestReceivedAt` rồi `latestCallbackId` (giao dịch); không có tham số sắp xếp. `[desc]` FR8.3, AC1.14.2
25. **Danh sách callback gồm cả ba loại kết quả** (`SUCCESS`, `MAPPING_ERROR`, `REJECTED`), kể cả callback thiếu `transactionId`; callback `MAPPING_ERROR` có thể vẫn có `transactionId`; lần từ chối không có `transactionId`. `GET /api/callbacks/{recordId}` trả chi tiết hoặc 404 `CALLBACK_NOT_FOUND`; `recordId` không phải số nguyên là 400. `payloadJson` là dạng chuẩn hóa của JSONB (BR5.3 của U1). `[desc]` FR10.1, FR10.4, AC1.10.5
26. **Đồng thời:** quy tắc cập nhật giao dịch có điều kiện (BR4.4 của U1) giữ nguyên; U2 chỉ thêm kiểm chứng 50 callback cùng `transactionId` (đúng 50 bản ghi, một giao dịch, tổng 50) và 50 callback cho 50 `transactionId` khác nhau (50 giao dịch, mỗi giao dịch tổng 1). Cách bảo đảm do NFR Design chọn. `[desc]` NFR2, AC1.11.1 đến AC1.11.3

**Tài sản mẫu (US2.11)**

27. **Cấu trúc `docs/samples/` trong `tpp-simulator-app/`:** mỗi dịch vụ một tệp `<mã>.service.json` (thân của `POST /api/services`) và hai tệp payload; một script tạo ba dịch vụ mẫu bằng API (bản PowerShell và bản bash, cùng đọc các tệp JSON); lệnh cURL mẫu cho PowerShell (`curl.exe`) và bash trong README của thư mục. Ứng dụng không tạo dịch vụ nào khi khởi động. `[desc]` brief mục 4, FR12.1, FR12.2, AC2.11.1, AC2.11.4
28. **Script chạy lại được (AC2.11.5):** mỗi dịch vụ đã có thì in "đã tồn tại" (nhận 409 `SERVICE_CODE_DUPLICATE`) và tiếp tục, không tạo bản trùng, mã thoát 0; chỉ lỗi khác (không kết nối được, 400, 500) mới mã thoát khác 0. Khóa mẫu là giá trị giả công khai ghi rõ "chỉ để thử", không bao giờ là khóa thật. `[desc]` AC2.11.2, AC2.11.5; `[assumption]` mã thoát
29. **Hình dạng dữ liệu nạp (cho Q8):** trung bình khoảng 4 callback mỗi giao dịch (có giao dịch tới 20), tỷ lệ kết quả 85% `SUCCESS`, 10% `MAPPING_ERROR`, 5% `REJECTED` với đủ các lý do, thời điểm nhận rải đều `--days` ngày gần nhất, payload khoảng 1 KB, `--seed` cố định cho cùng một dữ liệu mỗi lần. Nếu các dịch vụ `LOAD_*` đã có thì công cụ dừng với thông báo thay vì nhân đôi lặng lẽ, trừ khi có `--append`. Công cụ in số bản ghi, số giao dịch và thời gian nạp. `[assumption]` NFR1, AC1.14.5

**Chuyển cho các bước sau (câu hỏi mở không thuộc bước này)**

30. **NFR Requirements:** cách lưu khóa API (cột `api_key_secret` hiện lưu nguyên văn, U1 đã ghi chú); cách đo p95 dưới 1 giây với 100.000 callback. **NFR Design:** cách bảo đảm đồng thời, chỉ mục cho bộ lọc "chứa chuỗi" trên `transactionId`, `status` (rủi ro hiệu năng, quy tắc nghiệp vụ vẫn là "chứa" theo FR8.2), giới hạn kích thước phản hồi chi tiết giao dịch (R-10). `[assumption]` ADR-004, NFR1

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/units-generation/unit-of-work.md` và `unit-of-work-story-map.md` (phạm vi U2, story, ghi chú sau Functional Design của U1) `[scope]`
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/requirements-analysis/requirements.md` (FR1 đến FR6, FR8, FR10, FR12, NFR1 đến NFR3) `[desc]`
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/user-stories/stories.md` (AC1.2.x đến AC1.14.x, AC2.11.x) `[desc]`
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/domain-design/components.md` và `decisions.md` (ADR-004, ADR-005, ADR-007)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-summary.md` (C1 đến C4, đã sửa ở U1) và `tpp-simulator-app/docs/api/openapi.yaml`
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/functional-design/rules.md`, `entities.md`, `functional-spec.md`, `functional-design-questions.md` (quyết định của U1 và các từ chối tạm)
- `tpp-simulator-app/src/main/resources/db/migration/V1__init_schema.sql` và mã nguồn U1 trong `tpp-simulator-app/src/main/java/com/tpp/simulator/` (hiện trạng, chỉ đọc)
- `docs/brief.md` (mục 2, 3, 4, 7, 9) `[desc]`
- `.claude/knowledge/aidlc-product-agent/corner-checklist.md` (mức Standard)

## Assumption Confirmation

Bạn đồng ý dùng các giả định trên chứ?

A. Accept assumptions
B. Convert to follow-up questions
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]:
