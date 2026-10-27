# Quy tắc nghiệp vụ — U1 `u1-backend-skeleton`

> Nguồn: `requirements.md` (FR1, FR3 đến FR6, NFR3), `components.md` (hành vi từng thành phần), `unit-of-work.md` và `unit-of-work-story-map.md` (phạm vi U1), `contract-summary.md` (C1, C2, C4) đã cập nhật theo Q1 A, và `functional-design-questions.md` (Q1 đến Q5, giả định 1 đến 19). Mã quy tắc theo dạng `BR{nhóm}.{số}`.
>
> Phạm vi: chỉ những gì U1 làm. Phần của U2 (khóa API, ghi request bị từ chối, bốn định dạng thời gian còn lại, bộ lọc, đồng thời có kiểm chứng) chỉ được nhắc ở cột "Ghi chú" khi cần giải thích ranh giới.

## Nguồn sự thật (YAML)

```yaml
rules:
  # Nhóm 1 — Tạo và đọc dịch vụ (ServiceCatalog)
  - id: BR1.1
    statement: "Mã dịch vụ có 1 đến 50 ký tự, chỉ gồm chữ, số, dấu gạch ngang và gạch dưới."
    category: validation
    applies_to: "Service.serviceCode khi tạo"
    trigger: "POST /api/services"
    logic: "IF serviceCode không khớp mẫu hoặc dài ngoài khoảng THEN từ chối."
    violation: "400 VALIDATION_FAILED, fieldErrors có field serviceCode."
    source: "FR1.2"
  - id: BR1.2
    statement: "Mã dịch vụ là duy nhất không phân biệt hoa thường, kể cả với dịch vụ đã xóa; hai yêu cầu tạo cùng mã gần như đồng thời chỉ một bên thành công."
    category: constraint
    applies_to: "Service.serviceCode"
    trigger: "POST /api/services"
    logic: "IF đã có dịch vụ có mã trùng khi so sánh chữ thường THEN từ chối; việc phát hiện trùng do ràng buộc duy nhất của cơ sở dữ liệu bảo đảm, không chỉ do kiểm tra trước."
    violation: "409 SERVICE_CODE_DUPLICATE."
    source: "FR1.2"
  - id: BR1.3
    statement: "Các trường bắt buộc có mặt và nằm trong giới hạn độ dài: name 1 đến 100; description tối đa 500; transactionIdPath, statusPath, timestampPath tối đa 200; timestampPattern tối đa 100; responseBody tối đa 64 KB."
    category: validation
    applies_to: "ServiceConfigVersion và Service khi tạo"
    trigger: "POST /api/services"
    logic: "IF thiếu trường bắt buộc (serviceCode, name, authType, transactionIdPath, statusPath, timestampFormat, responseHttpStatus, responseBody) hoặc vượt giới hạn THEN từ chối, nêu từng trường lỗi."
    violation: "400 VALIDATION_FAILED, fieldErrors liệt kê mọi trường lỗi cùng lúc."
    source: "FR1.1, giả định 1 và 2 của Functional Design"
  - id: BR1.4
    statement: "Các đường dẫn ánh xạ không rỗng và bắt đầu bằng $. ; kiểm tra cú pháp đầy đủ thuộc U2."
    category: validation
    applies_to: "transactionIdPath, statusPath, timestampPath"
    trigger: "POST /api/services"
    logic: "IF đường dẫn bắt buộc rỗng hoặc không bắt đầu bằng $. THEN từ chối; timestampPath được phép vắng, vắng nghĩa là không đọc timestamp."
    violation: "400 VALIDATION_FAILED, fieldErrors có tên trường."
    source: "FR1.7"
  - id: BR1.5
    statement: "Response cố định hợp lệ: HTTP status từ 200 đến 599 trừ 204, 205, 304 (HTTP không cho phép body ở các mã này), và body là JSON hợp lệ."
    category: validation
    applies_to: "responseHttpStatus, responseBody"
    trigger: "POST /api/services"
    logic: "IF responseHttpStatus ngoài 200 đến 599, hoặc là 204, 205, 304, hoặc responseBody không phải JSON hợp lệ THEN từ chối, nêu rõ lý do ở thông báo của trường."
    violation: "400 VALIDATION_FAILED, fieldErrors có tên trường."
    source: "FR1.10"
  - id: BR1.6
    statement: "U1 từ chối rõ ràng những lựa chọn cấu hình chưa làm: authType khác NONE và timestampFormat khác ISO_8601."
    category: constraint
    applies_to: "authType, timestampFormat"
    trigger: "POST /api/services"
    logic: "IF authType là API_KEY THEN từ chối với thông báo chưa hỗ trợ ở bản skeleton. IF timestampFormat khác ISO_8601 THEN từ chối tương tự. Với authType NONE, apiKeyHeaderName và apiKeySecret nếu có thì bỏ qua và không lưu."
    violation: "400 VALIDATION_FAILED, fieldErrors có field authType hoặc timestampFormat. Không bao giờ có dịch vụ cấu hình API_KEY mà không được bảo vệ."
    source: "Q4 A (Functional Design); US1.2 và US1.7 thuộc U2"
  - id: BR1.7
    statement: "Giá trị mặc định khi tạo: enabled là true; defaultTimeZone là Asia/Ho_Chi_Minh; defaultTimeZone phải là múi giờ hợp lệ."
    category: validation
    applies_to: "Service.enabled, ServiceConfigVersion.defaultTimeZone"
    trigger: "POST /api/services"
    logic: "IF trường vắng THEN dùng mặc định. IF defaultTimeZone không phải mã múi giờ hợp lệ THEN từ chối."
    violation: "400 VALIDATION_FAILED, fieldErrors có field defaultTimeZone."
    source: "FR1.9"
  - id: BR1.8
    statement: "Tạo dịch vụ tạo luôn phiên bản cấu hình số 1 trong cùng một giao dịch cơ sở dữ liệu; phản hồi có callbackPath, apiKeyConfigured và không bao giờ có apiKeySecret."
    category: policy
    applies_to: "Service, ServiceConfigVersion"
    trigger: "POST /api/services thành công"
    logic: "THEN ghi Service (currentVersionNumber là 1) và ServiceConfigVersion số 1 cùng lúc; callbackPath là /callbacks/ cộng serviceCode đúng chữ gốc; apiKeyConfigured là false ở U1; phản hồi 201."
    violation: "Lỗi ghi: 500 INTERNAL_ERROR, không dịch vụ nào được tạo một nửa."
    source: "FR1.4, FR1.13, FR1.6, NFR3"
  - id: BR1.9
    statement: "Đọc một dịch vụ theo mã không phân biệt hoa thường; phản hồi dùng mã đúng chữ gốc lúc tạo."
    category: policy
    applies_to: "Service"
    trigger: "GET /api/services/{serviceCode}"
    logic: "IF có dịch vụ khớp THEN trả cấu hình hiện hành kèm cờ deleted, không có apiKeySecret. ELSE 404."
    violation: "404 SERVICE_NOT_FOUND."
    source: "FR1.1, Q5 A (Functional Design)"

  # Nhóm 2 — Nhận callback (CallbackIngestion)
  - id: BR2.1
    statement: "Mã dịch vụ trong đường dẫn được khớp không phân biệt hoa thường; không khớp dịch vụ nào thì trả 404 và không ghi gì."
    category: policy
    applies_to: "POST /callbacks/{serviceCode}"
    trigger: "Mỗi request tới endpoint callback, sau kiểm tra kích thước"
    logic: "IF không có dịch vụ nào có mã khớp (chữ thường) THEN 404 SERVICE_NOT_FOUND, không ghi Callback."
    violation: "Không áp dụng (đây là kết quả từ chối)."
    source: "FR3.1, FR3.8, Q5 A (Functional Design)"
  - id: BR2.2
    statement: "Body lớn hơn 1.048.576 byte bị từ chối trước mọi kiểm tra khác, không đọc hết body và không ghi gì."
    category: constraint
    applies_to: "POST /callbacks/{serviceCode}"
    trigger: "Mỗi request tới endpoint callback"
    logic: "IF kích thước body vượt 1.048.576 byte THEN 413 PAYLOAD_TOO_LARGE; kiểm tra dựa trên độ dài khai báo hoặc cắt đọc khi vượt giới hạn."
    violation: "Không áp dụng (đây là kết quả từ chối)."
    source: "FR3.3, FR3.9, Contract Design Q3 A"
  - id: BR2.3
    statement: "Dịch vụ tắt hoặc đã xóa không xử lý callback; U1 trả mã tương ứng nhưng chưa ghi lần nhận bị từ chối."
    category: policy
    applies_to: "POST /callbacks/{serviceCode}"
    trigger: "Sau khi khớp dịch vụ"
    logic: "IF Service.deleted là true THEN 404 SERVICE_NOT_FOUND. ELSE IF Service.enabled là false THEN 503 SERVICE_DISABLED. U2 thêm việc ghi lần nhận bị từ chối."
    violation: "Không áp dụng (đây là kết quả từ chối)."
    source: "FR3.1, FR3.8"
  - id: BR2.4
    statement: "Chỉ nhận body JSON hợp lệ có Content-Type application/json; so khớp loại phương tiện không phân biệt hoa thường và bỏ qua mọi tham số như charset."
    category: validation
    applies_to: "POST /callbacks/{serviceCode}"
    trigger: "Sau kiểm tra dịch vụ"
    logic: "IF media type khác application/json THEN 400 UNSUPPORTED_CONTENT_TYPE. ELSE IF body không phân tích được thành JSON hoặc rỗng THEN 400 INVALID_JSON. Mọi giá trị JSON hợp lệ (object, mảng, số, chuỗi) đều được chấp nhận ở bước này. U1 chưa ghi các lần nhận bị từ chối này (U2 ghi)."
    violation: "Không áp dụng (đây là kết quả từ chối)."
    source: "FR3.1, AC1.1.4"
  - id: BR2.5
    statement: "Mọi response lỗi do ứng dụng sinh ra có header X-Simulator-Error mang mã lỗi và thân JSON ErrorResponse; response đã cấu hình không bao giờ có header này."
    category: policy
    applies_to: "Mọi response lỗi của ứng dụng (endpoint callback, API quản lý, API tra cứu)"
    trigger: "Khi ứng dụng tự sinh một lỗi"
    logic: "THEN đặt X-Simulator-Error bằng đúng giá trị trường error của thân lỗi; thân lỗi không chứa khóa API hay dữ liệu nhạy cảm. Response thành công cấu hình theo dịch vụ không có header này kể cả khi mã HTTP trùng một mã lỗi."
    violation: "Không áp dụng."
    source: "Q3 A (Functional Design), góp ý R-02"
  - id: BR2.6
    statement: "Thời điểm nhận do server gán lúc bắt đầu nhận request, theo UTC, độ chính xác micro giây."
    category: constraint
    applies_to: "Callback.receivedAt"
    trigger: "Bắt đầu mỗi request tới endpoint callback"
    logic: "THEN receivedAt là đồng hồ server tại thời điểm bắt đầu; không dùng thời điểm kết thúc xử lý và không nhận giá trị từ client."
    violation: "Không áp dụng."
    source: "FR3.5, ADR-002"
  - id: BR2.7
    statement: "Mỗi callback dùng phiên bản cấu hình hiện hành của dịch vụ lúc xử lý và ghi tham chiếu tới phiên bản đó."
    category: policy
    applies_to: "Callback.configVersionId"
    trigger: "Xử lý callback được chấp nhận"
    logic: "THEN đọc ServiceConfigVersion có versionNumber bằng Service.currentVersionNumber; dùng nó để ánh xạ và lấy response; ghi configVersionId vào Callback."
    violation: "Không áp dụng."
    source: "FR1.13, ADR-004"
  - id: BR2.8
    statement: "Callback được chấp nhận luôn nhận response đã cấu hình (mã HTTP và body JSON của phiên bản cấu hình, Content-Type application/json), kể cả khi ánh xạ lỗi."
    category: policy
    applies_to: "Response của endpoint callback"
    trigger: "Sau khi ghi thành công"
    logic: "THEN trả responseHttpStatus và responseBody của phiên bản đã dùng. IF việc ghi lỗi THEN không trả response đã cấu hình mà trả 500 INTERNAL_ERROR."
    violation: "Lỗi ghi: 500 INTERNAL_ERROR kèm X-Simulator-Error."
    source: "FR3.6, FR3.7, AC1.1.1"
  - id: BR2.9
    statement: "Mỗi lần nhận được ghi thành một Callback riêng; không khử trùng, không ghi đè, không xóa."
    category: constraint
    applies_to: "Callback"
    trigger: "Mỗi callback được chấp nhận"
    logic: "THEN luôn tạo bản ghi mới với recordId mới, kể cả khi hai lần nhận có cùng body."
    violation: "Không áp dụng."
    source: "FR3.4, AC1.1.2"
  - id: BR2.10
    statement: "Header của request được lưu đầy đủ; Authorization, Proxy-Authorization và Cookie được che thành ba dấu sao trước khi giao cho CallbackLedger."
    category: constraint
    applies_to: "Callback.requestHeadersMasked"
    trigger: "Trước khi ghi Callback"
    logic: "THEN lưu mọi header, tên giữ chữ gốc, nhiều giá trị cùng tên nối bằng dấu phẩy và khoảng trắng; IF tên header (không phân biệt hoa thường) là một trong ba header chuẩn THEN giá trị là ***. Che header API key thuộc U2. CallbackLedger không bao giờ nhận giá trị chưa che."
    violation: "Giá trị chưa che xuất hiện trong dữ liệu hoặc log là lỗi bảo mật (NFR3)."
    source: "FR6.1, ADR-007"
  - id: BR2.11
    statement: "Ghi Callback và cập nhật Transaction nằm trong một giao dịch cơ sở dữ liệu: cả hai cùng thành công hoặc cùng không được ghi."
    category: constraint
    applies_to: "Callback, Transaction"
    trigger: "Mỗi callback được chấp nhận"
    logic: "IF bất kỳ bước ghi nào lỗi THEN hủy cả hai và trả 500 INTERNAL_ERROR."
    violation: "500 INTERNAL_ERROR."
    source: "ADR-002, FR3.7"
  - id: BR2.12
    statement: "Nhật ký ứng dụng không bao giờ chứa giá trị header nhạy cảm hay toàn bộ payload; mỗi callback nhận ghi một dòng gồm mã dịch vụ, mã bản ghi và kết quả."
    category: constraint
    applies_to: "Nhật ký ứng dụng"
    trigger: "Mỗi callback được xử lý"
    logic: "THEN chỉ ghi mã dịch vụ, recordId, outcome và mã HTTP đã trả."
    violation: "Lộ giá trị nhạy cảm trong log là lỗi bảo mật (NFR3)."
    source: "FR6.2, NFR3"

  # Nhóm 3 — Ánh xạ (MappingEngine)
  - id: BR3.1
    statement: "Đường dẫn ánh xạ có dạng $ theo sau bởi các tên khóa nối bằng dấu chấm, đi qua các object lồng nhau; khóa so khớp chính xác và phân biệt hoa thường."
    category: calculation
    applies_to: "MappingEngine, ba trường transactionId, status, timestamp"
    trigger: "Mỗi callback được chấp nhận"
    logic: "IF mỗi đoạn của đường dẫn tồn tại trong object tương ứng THEN trả giá trị tại đó. IF một đoạn không tồn tại, hoặc đi qua giá trị không phải object (kể cả mảng) THEN không tìm thấy. Không hỗ trợ wildcard, bộ lọc hay chỉ số mảng. IF object có khóa trùng THEN giá trị xuất hiện sau cùng được dùng."
    violation: "Lỗi NOT_FOUND của trường đó."
    source: "FR1.7, AC1.6.2, giả định 5"
  - id: BR3.2
    statement: "Giá trị chuỗi, số, boolean được lấy thành chuỗi nguyên văn: chuỗi giữ nguyên (kể cả khoảng trắng đầu cuối), số giữ đúng văn bản gốc trong payload, boolean là true hoặc false."
    category: calculation
    applies_to: "Giá trị đã ánh xạ"
    trigger: "Sau khi tìm thấy giá trị"
    logic: "IF giá trị là chuỗi THEN dùng đúng chuỗi. IF là số THEN dùng đúng văn bản số như trong payload (1.50 vẫn là 1.50, 1e3 vẫn là 1e3, số nguyên rất lớn không bị làm tròn). IF là boolean THEN true hoặc false. Quy tắc này áp dụng cho GIÁ TRỊ ĐÃ ÁNH XẠ; payload gốc lưu kèm là dạng chuẩn hóa của JSONB nên có thể hiện khác (xem BR5.3)."
    violation: "Không áp dụng."
    source: "FR4.1, AC1.6.3, giả định 4"
  - id: BR3.3
    statement: "transactionId và status mỗi trường được đánh giá độc lập; một trường lỗi không làm hỏng trường kia."
    category: validation
    applies_to: "transactionId, status"
    trigger: "Mỗi callback được chấp nhận"
    logic: "IF không tìm thấy THEN lỗi NOT_FOUND. IF giá trị là null, chuỗi rỗng hoặc chỉ khoảng trắng THEN lỗi EMPTY. IF là object hoặc mảng THEN lỗi WRONG_TYPE. IF dài hơn 255 ký tự THEN lỗi TOO_LONG. Mỗi lỗi kèm câu mô tả ngắn tiếng Việt."
    violation: "Lỗi ánh xạ của đúng trường đó; callback vẫn được chấp nhận và ghi."
    source: "FR4.2, AC1.6.4, giả định 6 và 7"
  - id: BR3.4
    statement: "Payload gốc không phải object thì cả ba trường đã cấu hình đều lỗi."
    category: validation
    applies_to: "transactionId, status, timestamp"
    trigger: "Mỗi callback được chấp nhận"
    logic: "IF giá trị JSON gốc là mảng, số, chuỗi, boolean hoặc null THEN transactionId, status và timestamp (nếu có cấu hình đường dẫn) đều có lỗi PAYLOAD_NOT_OBJECT."
    violation: "Lỗi PAYLOAD_NOT_OBJECT của cả ba trường."
    source: "FR4.3, AC1.6.5"
  - id: BR3.5
    statement: "Timestamp là trường tùy chọn: không cấu hình đường dẫn thì bỏ qua; có cấu hình mà không có giá trị thì chỉ cảnh báo."
    category: validation
    applies_to: "timestamp"
    trigger: "Mỗi callback được chấp nhận"
    logic: "IF timestampPath rỗng THEN không đọc, không lỗi, không cảnh báo. IF có đường dẫn nhưng không tìm thấy, null hoặc rỗng THEN không có giá trị và có cảnh báo, không lỗi."
    violation: "Không áp dụng."
    source: "FR4.4"
  - id: BR3.6
    statement: "Timestamp ISO 8601 được chuẩn hóa về UTC; chuỗi không có múi giờ dùng defaultTimeZone của phiên bản cấu hình; giá trị không đọc được là lỗi của riêng trường timestamp."
    category: calculation
    applies_to: "businessTimestampUtc"
    trigger: "Khi timestamp có giá trị"
    logic: "IF giá trị là chuỗi ISO 8601 có offset hoặc Z THEN đổi sang UTC. IF là ngày giờ ISO không có múi giờ THEN giải thích theo defaultTimeZone rồi đổi sang UTC. IF là object hoặc mảng THEN lỗi WRONG_TYPE. IF là bất kỳ giá trị nào khác không đọc được (kể cả chỉ có ngày, số) THEN lỗi UNPARSEABLE. Lỗi timestamp không ảnh hưởng transactionId, status và không ngăn việc vào giao dịch."
    violation: "Lỗi UNPARSEABLE hoặc WRONG_TYPE của trường timestamp; Callback có outcome MAPPING_ERROR."
    source: "FR4.4, FR4.6, FR4.7, AC1.6.1"
  - id: BR3.7
    statement: "Giá trị status giữ nguyên; không diễn giải thành thành công hay thất bại và không gán ý nghĩa cho mã."
    category: policy
    applies_to: "status"
    trigger: "Mọi nơi dùng status"
    logic: "THEN lưu, so sánh và hiển thị status đúng như đã ánh xạ."
    violation: "Không áp dụng."
    source: "FR4.5, AC1.6.3"
  - id: BR3.8
    statement: "Kết quả xử lý của Callback được chấp nhận: SUCCESS khi cả ba trường đều không có lỗi; MAPPING_ERROR khi có ít nhất một trường lỗi."
    category: calculation
    applies_to: "Callback.outcome"
    trigger: "Sau khi ánh xạ"
    logic: "IF transactionId, status và timestamp đều không lỗi (cảnh báo không tính) THEN SUCCESS. ELSE MAPPING_ERROR. Cả hai kết quả đều nhận response đã cấu hình."
    violation: "Không áp dụng."
    source: "FR3.6, FR4.4, giả định 9"

  # Nhóm 4 — Gom giao dịch (CallbackLedger)
  - id: BR4.1
    statement: "Giao dịch được xác định bằng cặp (serviceCode, transactionId); transactionId trùng ở hai dịch vụ khác nhau là hai giao dịch riêng."
    category: constraint
    applies_to: "Transaction"
    trigger: "Mỗi callback có transactionId hợp lệ"
    logic: "THEN khóa giao dịch là cặp đó; transactionId so khớp chính xác và phân biệt hoa thường; serviceCode là mã đúng chữ gốc của dịch vụ đã khớp."
    violation: "Không áp dụng."
    source: "FR5.1, AC1.10.2, giả định 6"
  - id: BR4.2
    statement: "Chỉ callback có transactionId hợp lệ mới thuộc một giao dịch; callback thiếu hoặc lỗi transactionId vẫn được lưu nhưng không thuộc giao dịch nào."
    category: policy
    applies_to: "Callback, Transaction"
    trigger: "Mỗi callback được chấp nhận"
    logic: "IF transactionId có lỗi ánh xạ THEN chỉ ghi Callback, không tạo hay cập nhật Transaction. ELSE ghi Callback và tạo hoặc cập nhật Transaction. Lỗi ở status hay timestamp không ngăn việc vào giao dịch."
    violation: "Không áp dụng."
    source: "FR5.2, AC1.10.5, giả định 10"
  - id: BR4.3
    statement: "Giao dịch được tạo ở callback đầu tiên của cặp; mỗi callback sau đều tăng tổng số callback thêm 1."
    category: calculation
    applies_to: "Transaction.callbackCount"
    trigger: "Mỗi callback có transactionId hợp lệ"
    logic: "IF chưa có giao dịch cho cặp THEN tạo với callbackCount là 1. ELSE tăng callbackCount thêm 1, bất kể thứ tự nhận."
    violation: "Không áp dụng."
    source: "FR5.1, AC1.10.1"
  - id: BR4.4
    statement: "Trạng thái của giao dịch lấy từ lần nhận gần nhất, là lần có cặp (receivedAt, recordId) lớn nhất; timestamp nghiệp vụ không tham gia."
    category: calculation
    applies_to: "Transaction.latest*"
    trigger: "Mỗi callback có transactionId hợp lệ"
    logic: "IF cặp (receivedAt, recordId) của callback đang ghi lớn hơn cặp đang lưu trong Transaction THEN thay latestStatus, latestBusinessTimestampUtc, latestReceivedAt, latestCallbackId và latestHasMappingError bằng giá trị của callback này. ELSE giữ nguyên các trường latest và chỉ tăng callbackCount. Nhờ vậy kết quả đúng kể cả khi hai callback ghi theo thứ tự ngược với thứ tự nhận."
    violation: "Không áp dụng."
    source: "FR5.3, FR5.5, AC1.10.1, AC1.10.3, ADR-002"
  - id: BR4.5
    statement: "Nếu lần nhận gần nhất thiếu hoặc lỗi status thì giao dịch hiển thị status trống kèm lỗi ánh xạ; không giữ status cũ."
    category: calculation
    applies_to: "Transaction.latestStatus, Transaction.latestHasMappingError"
    trigger: "Khi lần nhận gần nhất được xác định"
    logic: "THEN latestStatus bằng status của lần nhận gần nhất (rỗng nếu lỗi); latestHasMappingError là true khi lần nhận gần nhất có outcome MAPPING_ERROR."
    violation: "Không áp dụng."
    source: "FR5.4, AC1.10.4"
  - id: BR4.6
    statement: "Hai callback cùng giao dịch đến đồng thời không làm mất callback nào và không làm sai tổng số; U1 bảo đảm tính đúng của từng giao dịch cơ sở dữ liệu, U2 kiểm chứng với 50 callback đồng thời."
    category: constraint
    applies_to: "Transaction, Callback"
    trigger: "Callback đồng thời cùng cặp"
    logic: "THEN mỗi lần ghi hoặc cùng thành công hoặc cùng hủy (BR2.11), và quy tắc cập nhật có điều kiện của BR4.4 cho kết quả đúng bất kể thứ tự hoàn tất. Cách thực hiện cụ thể (khóa dòng hay upsert có điều kiện) do NFR Design chọn."
    violation: "Mất callback hoặc tổng số sai là lỗi dữ liệu nghiêm trọng (NFR2)."
    source: "NFR2, FR5.5, ADR-002"

  # Nhóm 5 — API đọc tối giản (CallbackLedger)
  - id: BR5.1
    statement: "Danh sách giao dịch trả mỗi giao dịch một dòng gồm dịch vụ, transactionId, status gần nhất, timestamp nghiệp vụ của lần đó, thời điểm nhận gần nhất và tổng số callback, theo hình dạng Page."
    category: policy
    applies_to: "GET /api/transactions"
    trigger: "Mỗi lần gọi danh sách"
    logic: "THEN sắp latestReceivedAt mới nhất trước, hòa nhau theo latestCallbackId lớn hơn; page bắt đầu từ 1 (mặc định 1); size chỉ nhận 20, 50 hoặc 100 (mặc định 20); phản hồi có items, page, size, totalItems, totalPages; serviceCode trong phản hồi là mã đúng chữ gốc; mọi thời điểm là ISO 8601 UTC."
    violation: "page nhỏ hơn 1 hoặc size ngoài tập cho phép: 400 VALIDATION_FAILED."
    source: "FR8.1, FR8.3, AC1.14.1"
  - id: BR5.2
    statement: "Tham số lọc chưa được U1 hỗ trợ bị từ chối rõ ràng thay vì bị bỏ qua lặng lẽ."
    category: constraint
    applies_to: "GET /api/transactions"
    trigger: "Request có serviceCode, transactionId, status, receivedFrom hoặc receivedTo"
    logic: "IF có một trong các tham số lọc đó THEN từ chối với thông báo chưa hỗ trợ ở bản skeleton. U2 gỡ quy tắc này khi làm bộ lọc."
    violation: "400 VALIDATION_FAILED, fieldErrors có tên từng tham số."
    source: "Q4 A (Functional Design); US1.14 phần lọc thuộc U2"
  - id: BR5.3
    statement: "Chi tiết giao dịch nhận serviceCode và transactionId qua tham số truy vấn và trả giao dịch cùng toàn bộ lần nhận theo thứ tự nhận, mỗi lần nhận có đủ chi tiết."
    category: policy
    applies_to: "GET /api/transactions/detail"
    trigger: "Mỗi lần gọi chi tiết"
    logic: "IF thiếu serviceCode hoặc transactionId THEN 400. IF không có giao dịch THEN 404 TRANSACTION_NOT_FOUND. ELSE trả TransactionSummary và danh sách CallbackDetail cũ nhất trước (receivedAt rồi recordId tăng dần), mỗi phần tử có payload gốc, header đã che, receivedAt, kết quả ánh xạ từng trường, response đã trả và configVersionNumber. serviceCode khớp không phân biệt hoa thường; transactionId khớp chính xác. Payload gốc trong CallbackDetail là dạng đã chuẩn hóa của JSONB (số như 1e3 có thể hiện thành 1000, thứ tự khóa và khóa trùng không được giữ), có thể khác với giá trị đã ánh xạ ở cùng bản ghi (BR3.2)."
    violation: "400 VALIDATION_FAILED hoặc 404 TRANSACTION_NOT_FOUND."
    source: "FR9.2, AC1.1.3, Q2 A (Functional Design), Q5 A (Functional Design)"

  # Nhóm 6 — Quy ước chung
  - id: BR6.1
    statement: "API quản lý và tra cứu không có xác thực theo brief; backend mặc định chỉ lắng nghe 127.0.0.1."
    category: policy
    applies_to: "Cấu hình khởi động backend"
    trigger: "Khởi động backend"
    logic: "THEN địa chỉ lắng nghe mặc định là 127.0.0.1; README nêu cảnh báo khi đổi sang địa chỉ khác vì mọi người cùng mạng sẽ đọc được lịch sử và đổi được cấu hình."
    violation: "Không áp dụng."
    source: "Brief mục 7 (không đăng nhập), góp ý R-12, Q1 A (Functional Design)"
  - id: BR6.2
    statement: "Mọi thời điểm trong API là ISO 8601 UTC dạng 2026-10-19T03:00:00Z; tên trường camelCase; enum viết hoa."
    category: policy
    applies_to: "Mọi phản hồi JSON"
    trigger: "Mỗi phản hồi"
    logic: "THEN định dạng như trên; phía nhận bỏ qua trường lạ."
    violation: "Không áp dụng."
    source: "Contract Design Q6 và giả định 3, 7"
```

## Tóm tắt quy tắc

| Nhóm | Mã | Nội dung chính | Loại |
|---|---|---|---|
| 1. Dịch vụ | BR1.1 đến BR1.9 | Định dạng và trùng mã, giới hạn độ dài, đường dẫn, response cố định, từ chối lựa chọn chưa làm, giá trị mặc định, phiên bản số 1, đọc dịch vụ | validation, constraint, policy |
| 2. Nhận callback | BR2.1 đến BR2.12 | Khớp mã, 413, tắt/xóa, Content-Type và JSON, header X-Simulator-Error, receivedAt, phiên bản cấu hình, response, không khử trùng, che header, ghi nguyên tử, nhật ký | policy, constraint, validation |
| 3. Ánh xạ | BR3.1 đến BR3.8 | Đường dẫn, nguyên văn số, lỗi từng trường, payload không phải object, timestamp tùy chọn và ISO 8601, status không diễn giải, SUCCESS hay MAPPING_ERROR | calculation, validation, policy |
| 4. Giao dịch | BR4.1 đến BR4.6 | Cặp khóa, chỉ transactionId hợp lệ, đếm, lần nhận gần nhất có điều kiện, status trống khi lỗi, đồng thời | constraint, calculation, policy |
| 5. API đọc | BR5.1 đến BR5.3 | Danh sách phân trang, từ chối bộ lọc, chi tiết giao dịch bằng tham số truy vấn | policy, constraint |
| 6. Chung | BR6.1 đến BR6.2 | Chỉ lắng nghe 127.0.0.1, định dạng thời gian và tên trường | policy |

Mỗi quy tắc đều truy được về một yêu cầu (cột `source` trong khối YAML). Tiêu chí chấp nhận của U1 ánh xạ vào quy tắc ở `traceability.json`; các quy tắc không ứng với tiêu chí nào của U1 được giải thích ở mục `reverse` của tệp đó.

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/units-generation/unit-of-work.md` và `unit-of-work-story-map.md` (phạm vi, tập con tiêu chí của U1)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/requirements-analysis/requirements.md` (FR1, FR3 đến FR6, NFR2, NFR3)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/domain-design/components.md` (hành vi thành phần)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-summary.md` (C1, C2, C4, đã cập nhật theo Q1 A)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/functional-design/functional-design-questions.md` (Q1 đến Q5 và giả định 1 đến 19)

## Assumptions & Open Questions

- Giả định 8 trong `functional-design-questions.md` ghi "không lỗi, không cảnh báo" khi timestamp thiếu. BR3.5 theo FR4.4 và trường `warning` của hợp đồng: không cấu hình đường dẫn thì im lặng, có cấu hình mà thiếu giá trị thì cảnh báo. Đây là chỗ tôi làm rõ giả định 8; cần bạn xác nhận ở cổng duyệt.
- BR2.2, BR2.3 và BR2.4 đưa vào U1 các mã từ chối 413, 404, 503, 400 ở mức "trả mã, chưa ghi lần nhận". Lý do: nếu không có thì U1 sẽ xử lý body khổng lồ, dịch vụ tắt hoặc body không phải JSON như callback bình thường. U2 vẫn làm phần ghi lần nhận bị từ chối, kiểm tra khóa API và che header API key. Phạm vi này rộng hơn một chút so với `unit-of-work.md` (mục "Không bao gồm" của U1); nếu bạn muốn giữ đúng ranh giới cũ, hãy yêu cầu thay đổi ở cổng duyệt.
- Cách bảo đảm đồng thời và chỉ mục (BR4.6) do NFR Design chốt; cách lưu khóa API do NFR Requirements chốt.
- Kích thước phản hồi chi tiết giao dịch (BR5.3, mỗi lần nhận tới 1 MiB payload) do NFR Design chốt giới hạn (góp ý R-10).
