# Nhật ký quyết định kiến trúc — Domain Design

> Mỗi ADR theo cấu trúc Context, Decision, Consequences, Alternatives Rejected. ADR-001 đến ADR-003 là quyết định của bạn (Q1–Q3 chọn A); ADR-004 đến ADR-008 là các giả định G2–G10 bạn đã chấp nhận, mỗi cái được ghi lại ở đây kèm hệ quả. Danh mục thành phần ở `components.md`.

## ADR-001: Backend gồm bốn thành phần

- **Context.** Brief chốt một backend, một database (mục 2). Bên trong cần tách các mối quan tâm khác nhau: cấu hình dịch vụ (ít đổi, do con người sửa), ánh xạ và chuẩn hóa thời gian (dùng ở ba nơi), quy trình nhận callback (hợp đồng HTTP với ngân hàng), và dữ liệu callback, giao dịch (tăng mãi, có yêu cầu đồng thời và hiệu năng).
- **Decision.** Bốn thành phần: ServiceCatalog, MappingEngine, CallbackIngestion, CallbackLedger. CallbackLedger vừa ghi vừa truy vấn Callback và Transaction.
- **Consequences.**
  - (+) Mỗi thành phần có đúng một chủ dữ liệu và một lý do thay đổi; thực thể có đúng một chủ.
  - (+) Ghi nguyên tử Callback và Transaction nằm trong một thành phần, nên bảo đảm đồng thời (NFR2) chỉ cần xử lý ở một chỗ.
  - (+) MappingEngine không trạng thái nên kiểm thử đơn vị đơn giản, đúng trọng tâm kiểm thử của team (mapping, timestamp).
  - (−) CallbackLedger gánh cả ghi lẫn đọc; nếu phía đọc lớn lên sau này thì phải tách.
  - (−) Phải giữ kỷ luật phụ thuộc một chiều (không vòng) ở mức mã nguồn; Units Generation quyết định có chia thành module riêng hay không.
- **Alternatives Rejected.**
  - Năm thành phần, tách MonitoringQuery chỉ truy vấn: hai thành phần cùng dùng hai bảng, cần phân định lại quyền sở hữu và tăng công mà MVP chưa cần.
  - Ba thành phần, gộp CallbackIngestion và CallbackLedger: quy trình nhận (hợp đồng HTTP) dính vào lưu và truy vấn, khó kiểm thử riêng và khó đổi một bên.

## ADR-002: Giao dịch là bản ghi riêng, cập nhật nguyên tử với việc ghi callback

- **Context.** Giao dịch là cặp (serviceCode, transactionId); status lấy từ callback nhận gần nhất (không xét timestamp nghiệp vụ); phải đúng khi 50 callback cùng giao dịch đến đồng thời (NFR2); danh sách giao dịch có lọc và phân trang phải dưới 1 giây (p95) với 100.000 callback (NFR1).
- **Decision.** Transaction là thực thể riêng do CallbackLedger sở hữu, được cập nhật trong cùng một giao dịch cơ sở dữ liệu với việc ghi Callback. Transaction giữ status, timestamp nghiệp vụ, thời điểm nhận và mã bản ghi của lần nhận gần nhất, cờ lỗi mapping của lần đó, và tổng số callback. "Gần nhất" xét theo `receivedAt` rồi tới mã bản ghi lớn nhất. `receivedAt` do server gán khi bắt đầu nhận request; mã bản ghi do cơ sở dữ liệu sinh, tăng dần.
- **Consequences.**
  - (+) Danh sách giao dịch đọc thẳng một bảng đã tổng hợp, có chỉ mục, nên đạt mục tiêu hiệu năng mà không gộp trên 100.000 dòng mỗi lần.
  - (+) Quy tắc "callback mới nhất thiếu status thì giao dịch thiếu status" nằm ở một chỗ (lúc cập nhật).
  - (−) Hai nơi cùng giữ thông tin (Callback và Transaction); phải bảo đảm nhất quán khi ghi đồng thời. Cách bảo đảm (khóa dòng hay upsert có điều kiện theo `receivedAt` và mã bản ghi) để NFR Design chọn.
  - (−) `receivedAt` gán lúc bắt đầu nhận, nên hai callback đến gần nhau có thể được lưu ngược thứ tự so với `receivedAt`; quy tắc "gần nhất" xét theo `receivedAt` rồi mã bản ghi nên kết quả vẫn xác định.
- **Alternatives Rejected.**
  - Giao dịch chỉ là cách nhìn tính từ bảng callback mỗi lần truy vấn: ghi đơn giản hơn nhưng danh sách phải gộp trên toàn bảng, rủi ro với mục tiêu 1 giây ở 100.000 callback và khó đảm bảo hòa nhau xác định.

## ADR-003: Frontend gồm ba thành phần

- **Context.** Có hai khu vực người dùng (quản lý dịch vụ và theo dõi) với người dùng chính khác nhau, cùng chia sẻ khung ứng dụng và nhiều thành phần giao diện (khung xem JSON, bảng, bộ lọc, hộp thoại, ngăn trượt). Brief không cho xây design system riêng nên phần dùng chung phải mỏng.
- **Decision.** Ba thành phần: AppShell (khung và phần dùng chung), ServiceConsole (S1, S2, S3), Monitoring (S4, S5).
- **Consequences.**
  - (+) Phần dùng chung ở một chỗ, hai khu vực không phụ thuộc lẫn nhau.
  - (+) Khớp cách giao hàng của brief: phần 2 (ServiceConsole) và phần 3 (Monitoring) kiểm chứng riêng.
  - (−) AppShell dễ phình thành "kho tiện ích"; giữ quy tắc chỉ đưa vào AppShell những thứ ít nhất hai khu vực cùng dùng.
- **Alternatives Rejected.**
  - Một thành phần frontend duy nhất: không có ranh giới, phần dùng chung lẫn với màn hình.
  - Mỗi màn hình một thành phần cộng thành phần chung: S1–S3 và S4–S5 luôn đổi cùng nhau, thêm ranh giới không đem lợi ích.

## ADR-004: Phiên bản cấu hình bất biến, Callback tham chiếu phiên bản đã dùng

- **Context.** Sửa cấu hình chỉ áp dụng cho callback mới; mỗi callback lưu kèm phiên bản hoặc snapshot cấu hình đã dùng (mapping, định dạng thời gian, múi giờ, response) (FR1.13, US1.13). Mockups hiển thị "phiên bản N" ở chi tiết.
- **Decision.** ServiceCatalog tạo một ServiceConfigVersion bất biến mỗi khi phần cấu hình dùng để xử lý callback thay đổi (đường dẫn mapping, định dạng thời gian và mẫu chuỗi, múi giờ, response). Số phiên bản tăng dần theo từng dịch vụ. Sửa chỉ tên, mô tả, xác thực hay bật/tắt không tạo phiên bản. Mỗi Callback giữ tham chiếu `configVersionId`. Khóa API và tên header xác thực không nằm trong phiên bản.
- **Consequences.**
  - (+) Lịch sử luôn giải thích được bằng đúng cấu hình lúc đó; tiết kiệm lưu trữ so với sao chép cấu hình vào từng callback.
  - (+) Không có phiên bản thừa cho các thay đổi không ảnh hưởng xử lý.
  - (−) Callback phụ thuộc tham chiếu chéo thành phần (CallbackLedger trỏ tới thực thể của ServiceCatalog); phiên bản không bao giờ bị xóa hay sửa.
  - (−) Xóa mềm dịch vụ không xóa phiên bản; dung lượng tăng chậm theo số lần sửa.
- **Alternatives Rejected.**
  - Sao chép toàn bộ cấu hình vào từng Callback: đơn giản khi đọc nhưng lặp dữ liệu rất nhiều và khó nêu "phiên bản N".
  - Tạo phiên bản ở mọi lần lưu: sinh phiên bản thừa cho các thay đổi không ảnh hưởng xử lý.

## ADR-005: Mọi logic ánh xạ ở MappingEngine; thử mapping do server tính

- **Context.** Cùng một bộ quy tắc ánh xạ được dùng ở ba nơi: kiểm tra cú pháp khi lưu cấu hình, áp dụng lên callback thật, và thử mapping với cấu hình đang nhập. Lần xem lại Refined Mockups ghi nhận rủi ro nếu trình duyệt tự tính: kết quả có thể khác lúc nhận thật, trái mục đích của US2.9 và FR2.1. Cú pháp mẫu thời gian là `DateTimeFormatter` của Java, trình duyệt không đánh giá được.
- **Decision.** Toàn bộ quy tắc nằm trong MappingEngine. Thử mapping là một việc của MappingEngine, nhận cấu hình đang nhập và JSON mẫu, không ghi dữ liệu. Trình duyệt không tự ánh xạ.
- **Consequences.**
  - (+) Kết quả thử luôn đúng bằng kết quả thật; một nơi duy nhất cần kiểm thử mapping và timestamp.
  - (−) Thử mapping cần gọi server mỗi lần bấm "Kiểm tra mapping"; không dùng được khi backend không chạy.
- **Alternatives Rejected.**
  - Sao chép logic sang trình duyệt: hai bản logic dễ lệch nhau, và cú pháp mẫu thời gian Java không có sẵn ở trình duyệt.
  - Một thành phần riêng chỉ để thử mapping: chỉ gọi lại MappingEngine nên thừa một ranh giới.

## ADR-006: Request bị từ chối tới dịch vụ có thật vẫn là một Callback

- **Context.** Người kiểm thử cần biết vì sao "callback không đến" (FR3.8, FR10.1). Request tới `serviceCode` chưa từng có hoặc quá 1 MB thì không có chỗ gắn hoặc quá lớn để lưu (FR3.9).
- **Decision.** CallbackIngestion yêu cầu CallbackLedger ghi một Callback với kết quả "bị từ chối", mã HTTP đã trả và lý do (sai API key, thiếu API key, JSON hoặc Content-Type không hợp lệ, dịch vụ tắt, dịch vụ đã xóa) cho mọi request tới một dịch vụ có thật mà bị từ chối. Body không phải JSON hợp lệ lưu dạng văn bản gốc. Các Callback này không thuộc giao dịch nào. Request tới `serviceCode` chưa từng có và request quá 1 MB không tạo gì.
- **Consequences.**
  - (+) Người kiểm thử tự chẩn đoán được; lịch sử đầy đủ.
  - (−) Dữ liệu tăng nhanh hơn khi bị gọi sai nhiều; cần chỉ mục lọc theo kết quả xử lý (NFR1).
  - (−) Request tới dịch vụ đã xóa vẫn được ghi, nên dịch vụ đã xóa vẫn có thể phát sinh lịch sử mới; đây là hành vi mong muốn nhưng cần giải thích ở giao diện (đã có nhãn "đã xóa").
- **Alternatives Rejected.**
  - Chỉ ghi log server cho request bị từ chối: người kiểm thử không có giao diện để xem.
  - Ghi cả request tới `serviceCode` chưa từng có: không có dịch vụ để gắn và dễ làm đầy dữ liệu bằng mã bất kỳ.

## ADR-007: Khóa API do ServiceCatalog giữ; che header ở CallbackIngestion

- **Context.** Khóa không được lộ ra giao diện, log, header lịch sử hay response API (FR1.6, FR6, NFR3). Cần so khớp khóa khi nhận callback.
- **Decision.** ServiceCatalog giữ khóa, chỉ nhận khi tạo hoặc thay (không bao giờ trả ra qua API quản lý) và chỉ đưa cho CallbackIngestion để so khớp. CallbackIngestion che các header `Authorization`, `Proxy-Authorization`, `Cookie` và header API key của dịch vụ thành ba dấu sao trước khi giao cho CallbackLedger; CallbackLedger không bao giờ nhận giá trị chưa che. Cách lưu khóa (băm hay mã hóa) chốt ở NFR Requirements.
- **Consequences.**
  - (+) Giá trị nhạy cảm có đúng hai chỗ chạm: nơi lưu khóa và nơi so khớp.
  - (+) CallbackLedger đơn giản hơn, không phải biết quy tắc che.
  - (−) Quy tắc che nằm ở CallbackIngestion nên mọi đường ghi mới vào CallbackLedger sau này phải đi qua nó.
- **Alternatives Rejected.**
  - CallbackLedger tự che: phải biết cấu hình dịch vụ, tạo phụ thuộc không cần thiết.
  - Lưu header nguyên văn và che khi đọc: giá trị nhạy cảm nằm trong dữ liệu, vi phạm NFR3.

## ADR-008: Tương tác đồng bộ, không sự kiện hay hàng đợi

- **Context.** Brief loại trừ microservices, Kafka và hàng đợi (mục 2); mọi luồng cần kết quả ngay (callback phải trả response, danh sách phải có dữ liệu mới sau khi ghi).
- **Decision.** Mọi tương tác giữa thành phần là gọi đồng bộ trong cùng tiến trình backend, hoặc gọi HTTP đồng bộ từ frontend. PostgreSQL là phụ thuộc ngoài của ServiceCatalog và CallbackLedger, không phải thành phần. Đồ thị phụ thuộc không có vòng.
- **Consequences.**
  - (+) Đơn giản, dễ kiểm thử, đúng ràng buộc của brief.
  - (+) Ghi Callback và cập nhật Transaction nguyên tử chỉ cần một giao dịch cơ sở dữ liệu.
  - (−) Tốc độ nhận callback phụ thuộc vào thời gian ghi vào cơ sở dữ liệu; đủ cho mục đích kiểm thử nội bộ, nhưng không dùng cho tải lớn.
- **Alternatives Rejected.**
  - Nhận trước rồi ghi bất đồng bộ qua hàng đợi: loại theo brief, và làm lỗi ghi không thể trả 500 cho người gọi (FR3.7).

## Câu hỏi để lại cho các bước sau

| Câu hỏi | Bước chốt |
|---|---|
| Giới hạn 1 MB là 1.000.000 hay 1.048.576 byte, và kiểm tra 413 đứng ở đâu trong thứ tự kiểm tra | Contract Design |
| Nội dung body response cho các mã lỗi 401, 400, 503, 404, 413, 500 | Contract Design |
| Danh sách dịch vụ kể cả đã xóa phục vụ bộ lọc là một endpoint riêng hay tham số của endpoint danh sách | Contract Design |
| Khi không ghi được một request bị từ chối, trả mã từ chối gốc hay 500 (góp ý từ lần xem lại User Stories) | Functional Design |
| Cách lưu khóa API (băm hay mã hóa) | NFR Requirements |
| Cách bảo đảm đúng khi ghi đồng thời (khóa dòng hay upsert có điều kiện) và chỉ mục cho 100.000 callback | NFR Design |
| Địa chỉ gốc hiển thị trong URL callback ở frontend | Code Generation |
