# Mô hình thực thể — U2 `u2-backend-core`

> Nguồn: `entities.md` của U1 (bốn thực thể và lược đồ ban đầu), `unit-of-work.md` (phần "U2 làm"), `requirements.md` (FR1 đến FR6, FR8, FR10, FR12, NFR1 đến NFR3), `contract-summary.md` đã sửa ở U1 cùng `openapi.yaml`, và các câu trả lời trong `functional-design-questions.md` của U2 (Q1 đến Q8 chọn A, 30 giả định chấp nhận).
>
> Mô tả ở mức logic, không phụ thuộc ngôn ngữ hay cơ sở dữ liệu. U2 **không thêm thực thể và không thêm cột nào** vào bốn thực thể của U1: lược đồ của U1 đã có sẵn mọi cột U2 cần (`deleted`, `api_key_secret`, `rejection_reason`, `payload_raw_text`...). U2 chỉ làm cho các cột ấy có giá trị thật, và thêm một số **đối tượng giá trị** (hình dạng dữ liệu trao đổi, không có bảng riêng). Dạng lưu khóa API đã chốt từ U1 (Q2 C, NFR3.5: nguyên văn ở cột `api_key_secret` của Service). Chỉ mục hiệu năng và cơ chế tuần tự hóa theo dịch vụ cho sửa, bật/tắt, xóa mềm (ranh giới đã chốt ở BR12.6) thuộc NFR Requirements và NFR Design, không nằm ở đây. Nếu Code Generation cần một thay đổi lược đồ (ví dụ chỉ mục), đó là việc của NFR Design.

## Nguồn sự thật (YAML)

```yaml
entities:
  - name: Service
    owner: ServiceCatalog
    description: "Một dịch vụ callback do người dùng cấu hình. U2 làm đầy đủ vòng đời: tạo, sửa, bật/tắt, xóa mềm, liệt kê. Mở rộng thực thể Service của U1, không đổi các thuộc tính đã có."
    identifier: serviceCode
    attributes:
      - name: serviceCode
        type: string
        required: true
        unique: "không phân biệt hoa thường (khóa so khớp là chữ thường của serviceCode); chữ gốc lúc tạo được giữ và dùng trong mọi phản hồi; mã của dịch vụ đã xóa không bao giờ dùng lại"
        constraints: "1 đến 50 ký tự, chỉ chữ, số, dấu gạch ngang, gạch dưới; không đổi sau khi tạo (kể cả khi sửa)"
      - name: name
        type: string
        required: true
        constraints: "1 đến 100 ký tự; sửa tên không tạo phiên bản cấu hình mới"
      - name: description
        type: string
        required: false
        constraints: "tối đa 500 ký tự; sửa mô tả không tạo phiên bản cấu hình mới"
      - name: enabled
        type: boolean
        required: true
        default: true
        constraints: "đổi bằng thao tác bật/tắt; đặt lại giá trị đang có là thao tác hợp lệ và không đổi gì"
      - name: deleted
        type: boolean
        required: true
        default: false
        constraints: "chuyển một chiều từ false sang true khi xóa mềm; không có thao tác khôi phục trong MVP; dịch vụ đã xóa giữ nguyên mọi thông tin khác kể cả enabled, tên header và khóa"
      - name: authType
        type: enum
        allowed_values: [NONE, API_KEY]
        required: true
        constraints: "U2 nhận cả hai giá trị (U1 chỉ nhận NONE); đổi được khi sửa"
      - name: apiKeyHeaderName
        type: string
        required: false
        constraints: "bắt buộc khi authType là API_KEY, rỗng (null) khi NONE; 1 đến 100 ký tự thuộc tập ký tự hợp lệ của tên header HTTP (chữ cái, chữ số và các dấu ! # $ % & ' * + - . ^ _ ` | ~); không được là Host, Content-Type, Content-Length, Transfer-Encoding, Connection (so sánh không phân biệt hoa thường); lưu đúng chữ gốc; so khớp lúc nhận không phân biệt hoa thường; đổi tên header không tạo phiên bản cấu hình mới"
      - name: apiKeySecret
        type: string
        required: false
        constraints: "bắt buộc khi authType là API_KEY, rỗng (null) khi NONE; 1 đến 256 ký tự ASCII in được (mã 32 đến 126), cho phép khoảng trắng ở giữa, không có khoảng trắng đầu hoặc cuối; lưu nguyên văn, không cắt, không chuẩn hóa; dạng lưu đã chốt ở U1 (Q2 C, NFR3.5): nguyên văn trong cột api_key_secret của Service, là nơi duy nhất trong dữ liệu đã lưu có giá trị khóa; chỉ ghi vào, không bao giờ có trong bất kỳ phản hồi, nhật ký hay header đã lưu nào"
      - name: currentVersionNumber
        type: integer
        required: true
        constraints: "không nhỏ hơn 1; chỉ tăng thêm đúng 1 mỗi lần tạo phiên bản mới khi sửa; luôn bằng versionNumber lớn nhất của dịch vụ"
      - name: createdAt
        type: instant
        required: true
      - name: updatedAt
        type: instant
        required: true
        constraints: "đổi khi một lần lưu thật sự thay đổi dữ liệu của dịch vụ (sửa, bật/tắt đổi giá trị, xóa mềm); lần lưu không đổi gì thì giữ nguyên"
    entity_constraints:
      - "Không bao giờ xóa vật lý một Service (xóa mềm) để lịch sử vẫn tra cứu được"
      - "apiKeyHeaderName và apiKeySecret cùng có giá trị khi authType là API_KEY, cùng rỗng khi authType là NONE"
      - "Sửa, bật/tắt và xóa mềm của cùng một dịch vụ dùng chung một phần tuần tự hóa theo dịch vụ (BR12.6): kiểm tra tồn tại và chưa xóa, quyết định giữ hay xóa khóa, so sánh để sinh phiên bản và ghi của một lần sửa đều chạy trọn bên trong phần đó trên trạng thái đã ghi bền mới nhất; kết quả bằng chạy lần lượt từng thao tác theo thứ tự hoàn tất; người lưu sau thắng, không có phát hiện xung đột (Q6 A)"
      - "Thao tác sửa không bao giờ ghi lại enabled hay deleted; chỉ bật/tắt đổi enabled và chỉ xóa mềm đổi deleted"
      - "Dịch vụ đã xóa không nhận thao tác sửa, bật/tắt, xóa nào nữa (trả 404)"
    relationships:
      - {target: ServiceConfigVersion, cardinality: "1 - n", direction: "Service sở hữu các phiên bản của nó; số phiên bản liên tục từ 1 đến currentVersionNumber"}
      - {target: Callback, cardinality: "1 - n", direction: "Service có nhiều Callback, kể cả lần nhận bị từ chối"}
      - {target: Transaction, cardinality: "1 - n", direction: "Service có nhiều Transaction"}

  - name: ServiceConfigVersion
    owner: ServiceCatalog
    description: "Phiên bản cấu hình xử lý callback, bất biến. U2 tạo phiên bản mới mỗi khi sửa làm đổi phần cấu hình dùng để xử lý callback (ADR-004)."
    identifier: versionId
    attributes:
      - name: versionId
        type: integer64
        required: true
        unique: true
        constraints: "do cơ sở dữ liệu sinh, tăng dần"
      - name: serviceCode
        type: string
        required: true
        references: Service
      - name: versionNumber
        type: integer
        required: true
        constraints: "không nhỏ hơn 1; duy nhất theo cặp (serviceCode, versionNumber); trong một dịch vụ các số tạo thành dãy liên tục 1, 2, 3... không hụt, không trùng, không dùng lại"
      - name: transactionIdPath
        type: string
        required: true
        constraints: "đường dẫn mapping hợp lệ theo cú pháp ở BR11.2: bắt đầu bằng $. , mỗi đoạn gồm chữ, số, gạch dưới, gạch ngang, không đoạn rỗng, tối đa 10 đoạn; tối đa 200 ký tự"
      - name: statusPath
        type: string
        required: true
        constraints: "như transactionIdPath"
      - name: timestampPath
        type: string
        required: false
        constraints: "như transactionIdPath khi có; rỗng nghĩa là không đọc timestamp; chuỗi rỗng và null được coi là một (không có đường dẫn)"
      - name: timestampFormat
        type: enum
        allowed_values: [ISO_8601, UNIX_SECONDS, UNIX_MILLIS, PATTERN]
        required: true
        constraints: "U2 nhận cả bốn giá trị (U1 chỉ nhận ISO_8601)"
      - name: timestampPattern
        type: string
        required: false
        constraints: "bắt buộc khi timestampFormat là PATTERN; null khi định dạng khác (giá trị gửi lên bị bỏ, không lưu); tối đa 100 ký tự; phải là mẫu ngày giờ hợp lệ theo cú pháp mẫu của Java và có đủ năm, tháng, ngày, giờ, phút (BR11.3)"
      - name: defaultTimeZone
        type: string
        required: true
        default: "Asia/Ho_Chi_Minh"
        constraints: "phải là mã múi giờ hợp lệ; chỉ dùng khi chuỗi ngày giờ không tự mang múi giờ hoặc offset"
      - name: responseHttpStatus
        type: integer
        required: true
        min: 200
        max: 599
        constraints: "không nhận 204, 205, 304"
      - name: responseBody
        type: json_text
        required: true
        constraints: "JSON hợp lệ bất kỳ, tối đa 64 KB, không chứa ký tự NUL; lưu dạng văn bản JSON và trả đúng nguyên văn"
      - name: createdAt
        type: instant
        required: true
    entity_constraints:
      - "Bất biến: không bao giờ sửa hay xóa một phiên bản đã tạo"
      - "Khóa API, tên header xác thực, tên, mô tả và trạng thái bật/tắt không nằm trong phiên bản (ADR-004), nên thay đổi chúng không sinh phiên bản"
      - "Phiên bản mới chỉ sinh khi ít nhất một trong các trường sau thật sự đổi giá trị hiệu lực: transactionIdPath, statusPath, timestampPath, timestampFormat, timestampPattern (khi PATTERN), defaultTimeZone, responseHttpStatus, responseBody (so sánh theo JSON tương đương, BR12.4)"
    relationships:
      - {target: Service, cardinality: "n - 1", direction: "mỗi phiên bản thuộc đúng một Service"}
      - {target: Callback, cardinality: "1 - n", direction: "mỗi Callback tham chiếu đúng một phiên bản đã dùng"}

  - name: Callback
    owner: CallbackLedger
    description: "Một lần nhận callback. Bất biến: không bao giờ sửa hay xóa. U2 ghi thêm lần nhận bị từ chối (outcome REJECTED) bên cạnh SUCCESS và MAPPING_ERROR của U1."
    identifier: recordId
    attributes:
      - name: recordId
        type: integer64
        required: true
        unique: true
        constraints: "do cơ sở dữ liệu sinh, tăng dần"
      - name: serviceCode
        type: string
        required: true
        references: Service
      - name: configVersionId
        type: integer64
        required: true
        references: ServiceConfigVersion
        constraints: "phiên bản cấu hình hiện hành tại thời điểm đọc trạng thái dịch vụ ở đầu xử lý; với lần nhận bị từ chối cũng vậy"
      - name: receivedAt
        type: instant
        required: true
        constraints: "server gán lúc bắt đầu nhận request, UTC, độ chính xác micro giây; áp dụng cho cả lần nhận bị từ chối"
      - name: outcome
        type: enum
        allowed_values: [SUCCESS, MAPPING_ERROR, REJECTED]
        required: true
        constraints: "U2 ghi đủ ba giá trị"
      - name: rejectionReason
        type: enum
        allowed_values: [INVALID_API_KEY, MISSING_API_KEY, INVALID_JSON, UNSUPPORTED_CONTENT_TYPE, SERVICE_DISABLED, SERVICE_DELETED]
        required: false
        constraints: "có giá trị khi và chỉ khi outcome là REJECTED"
      - name: httpStatusReturned
        type: integer
        required: true
        constraints: "mã HTTP đã trả. SUCCESS và MAPPING_ERROR: responseHttpStatus của phiên bản đã dùng. REJECTED: mã từ chối (401, 503, 404, 400)"
      - name: requestHeadersMasked
        type: json_object
        required: true
        constraints: "mọi header của request; Authorization, Proxy-Authorization, Cookie và header API key hiện hành của dịch vụ (khi authType là API_KEY) có giá trị ***; nhiều giá trị cùng tên thành một ***; áp dụng cho mọi outcome kể cả REJECTED"
      - name: payloadJson
        type: json
        required: false
        constraints: "SUCCESS và MAPPING_ERROR: luôn có. REJECTED: có khi body là JSON hợp lệ và lưu trung thực được ở định dạng JSON của kho dữ liệu (điều kiện xác định trước khi ghi ở BR15.4), nếu không thì rỗng. 'Có giá trị' nghĩa là có một giá trị JSON được lưu, kể cả giá trị JSON null (body đúng chữ null); 'rỗng' nghĩa là không lưu gì (vắng mặt), khác với giá trị JSON null. Là dạng ĐÃ CHUẨN HÓA của kho dữ liệu (số như 1e3 có thể hiện thành 1000, thứ tự khóa và khóa trùng không được giữ)"
      - name: payloadRawText
        type: string
        required: false
        constraints: "chỉ dùng cho REJECTED khi payloadJson rỗng: body giải mã UTF-8, byte không hợp lệ và ký tự NUL thay bằng U+FFFD; body rỗng lưu chuỗi rỗng; với một Callback, đúng một trong hai trường payloadJson và payloadRawText có giá trị (payloadJson chứa JSON null vẫn là có giá trị); ở API chi tiết payloadRawText vắng nghĩa là payload nằm ở payloadJson, kể cả khi đó là null; SUCCESS và MAPPING_ERROR luôn rỗng"
      - name: transactionId
        type: string
        required: false
        constraints: "giá trị đã ánh xạ; rỗng khi lỗi ánh xạ; tối đa 255 ký tự; luôn rỗng khi REJECTED (không đánh giá mapping, kể cả khi body có transactionId)"
      - name: status
        type: string
        required: false
        constraints: "như transactionId"
      - name: businessTimestampUtc
        type: instant
        required: false
        constraints: "timestamp nghiệp vụ đã chuẩn hóa UTC (micro giây); rỗng khi thiếu, lỗi hoặc REJECTED; năm UTC trong khoảng 1 đến 9999"
      - name: mappingFieldResults
        type: json_object
        required: true
        constraints: "kết quả ba trường transactionId, status, timestamp (FieldResult); là đối tượng rỗng khi REJECTED"
      - name: responseStatusReturned
        type: integer
        required: false
        constraints: "mã HTTP đã trả cho lần nhận này (REJECTED: bằng httpStatusReturned)"
      - name: responseBodyReturned
        type: json
        required: false
        constraints: "body đã trả cho lần nhận này; REJECTED: thân ErrorResponse đã trả"
    entity_constraints:
      - "Bất biến: không bao giờ sửa hay xóa; không khử trùng"
      - "Callback được chấp nhận được ghi cùng cập nhật Transaction trong một giao dịch cơ sở dữ liệu; Callback bị từ chối được ghi trong một giao dịch riêng, độc lập, và không bao giờ chạm tới Transaction"
      - "requestHeadersMasked không bao giờ chứa giá trị chưa che của ba header chuẩn và header API key (NFR3)"
      - "outcome REJECTED thì: rejectionReason có giá trị; transactionId, status, businessTimestampUtc rỗng; mappingFieldResults là đối tượng rỗng; không thuộc Transaction nào"
    relationships:
      - {target: Service, cardinality: "n - 1", direction: "mỗi Callback thuộc một Service, kể cả Service đã xóa"}
      - {target: ServiceConfigVersion, cardinality: "n - 1", direction: "mỗi Callback tham chiếu một phiên bản đã dùng (hoặc phiên bản hiện hành lúc nhận, với lần nhận bị từ chối)"}
      - {target: Transaction, cardinality: "n - 0..1", direction: "quan hệ logic qua (serviceCode, transactionId), không có khóa ngoại từ Callback sang Transaction. Callback SUCCESS hoặc MAPPING_ERROR có transactionId hợp lệ thuộc đúng một Transaction; Callback khác (thiếu hoặc lỗi transactionId, hoặc REJECTED) không thuộc giao dịch nào"}

  - name: Transaction
    owner: CallbackLedger
    description: "Giao dịch tổng hợp cho một cặp (serviceCode, transactionId). U2 không đổi thực thể này; chỉ kiểm chứng đồng thời và thêm bộ lọc đọc."
    identifier: "(serviceCode, transactionId)"
    attributes:
      - name: serviceCode
        type: string
        required: true
        references: Service
      - name: transactionId
        type: string
        required: true
        constraints: "chuỗi mờ, so khớp chính xác và phân biệt hoa thường, tối đa 255 ký tự"
      - name: latestStatus
        type: string
        required: false
        constraints: "status của lần nhận gần nhất; rỗng khi lần đó thiếu hoặc lỗi status (không lấy status cũ)"
      - name: latestBusinessTimestampUtc
        type: instant
        required: false
        constraints: "timestamp nghiệp vụ của lần nhận gần nhất"
      - name: latestReceivedAt
        type: instant
        required: true
      - name: latestCallbackId
        type: integer64
        required: true
        references: Callback
      - name: latestHasMappingError
        type: boolean
        required: true
        constraints: "true khi lần nhận gần nhất có outcome MAPPING_ERROR"
      - name: callbackCount
        type: integer
        required: true
        min: 1
        constraints: "tổng số Callback thuộc giao dịch; luôn tăng 1 cho mỗi lần nhận được chấp nhận có transactionId hợp lệ; không bao giờ tính lần nhận bị từ chối"
    entity_constraints:
      - "Duy nhất theo cặp (serviceCode, transactionId)"
      - "Lần nhận gần nhất là lần có cặp (receivedAt, recordId) lớn nhất; timestamp nghiệp vụ không tham gia"
      - "Với 50 callback đồng thời cùng cặp: đúng một Transaction, callbackCount bằng 50, trường latest* là của callback có cặp (receivedAt, recordId) lớn nhất"
    relationships:
      - {target: Service, cardinality: "n - 1", direction: "mỗi Transaction thuộc một Service"}
      - {target: Callback, cardinality: "1 - n", direction: "Transaction có nhiều Callback (chỉ SUCCESS hoặc MAPPING_ERROR) và trỏ tới Callback gần nhất"}

value_objects:
  - name: FieldResult
    description: "Kết quả ánh xạ của một trong ba trường, lưu trong Callback.mappingFieldResults và trả ở thử mapping. Không đổi so với U1."
    attributes:
      - {name: value, type: string, required: false, constraints: "timestamp luôn là ISO 8601 UTC đến micro giây"}
      - {name: errorCode, type: enum, allowed_values: [NOT_FOUND, EMPTY, WRONG_TYPE, TOO_LONG, PAYLOAD_NOT_OBJECT, UNPARSEABLE], required: false}
      - {name: error, type: string, required: false, constraints: "câu mô tả ngắn tiếng Việt, không chứa dữ liệu nhạy cảm"}
      - {name: warning, type: string, required: false, constraints: "chỉ dùng cho timestamp đã cấu hình đường dẫn mà không có giá trị"}
  - name: ErrorResponse
    description: "Thân lỗi do ứng dụng sinh ra, luôn đi kèm header X-Simulator-Error. Không đổi so với U1."
    attributes:
      - {name: error, type: string, required: true}
      - {name: message, type: string, required: true, constraints: "dựng từ mẫu cố định; không bao giờ chứa khóa API; không lặp lại giá trị đầu vào (ngoại lệ duy nhất: một ký tự không hợp lệ của đường dẫn mapping, BR11.2)"}
      - {name: fieldErrors, type: list, required: false, constraints: "chỉ có khi error là VALIDATION_FAILED; mỗi phần tử có field và message; liệt kê mọi trường lỗi cùng lúc"}
  - name: ServiceRuntimeSnapshot
    description: "Ảnh chụp nhất quán trạng thái dịch vụ mà CallbackIngestion đọc MỘT lần ở đầu xử lý một request; mọi bước sau (kiểm tra, ánh xạ, ghi) chỉ dùng ảnh này."
    attributes:
      - {name: serviceCode, type: string, required: true, constraints: "chữ gốc lúc tạo"}
      - {name: deleted, type: boolean, required: true}
      - {name: enabled, type: boolean, required: true}
      - {name: authType, type: enum, allowed_values: [NONE, API_KEY], required: true}
      - {name: apiKeyHeaderName, type: string, required: false}
      - {name: apiKeySecret, type: string, required: false, constraints: "chỉ để so khớp trong bộ nhớ; không bao giờ ghi ra nhật ký hay phản hồi"}
      - {name: configVersion, type: ServiceConfigVersion, required: true, constraints: "phiên bản hiện hành (versionId, versionNumber, đường dẫn, định dạng thời gian, múi giờ, response)"}
  - name: MappingTestRequest
    description: "Thân yêu cầu thử mapping (POST /api/mapping-tests): cấu hình đang nhập, có thể chưa lưu, và JSON mẫu. Không bao giờ được lưu."
    attributes:
      - {name: transactionIdPath, type: string, required: true}
      - {name: statusPath, type: string, required: true}
      - {name: timestampPath, type: string, required: false}
      - {name: timestampFormat, type: enum, allowed_values: [ISO_8601, UNIX_SECONDS, UNIX_MILLIS, PATTERN], required: true}
      - {name: timestampPattern, type: string, required: false, constraints: "bắt buộc khi PATTERN; bị bỏ qua khi định dạng khác"}
      - {name: defaultTimeZone, type: string, required: false, default: "Asia/Ho_Chi_Minh"}
      - {name: sampleJson, type: string, required: true, constraints: "JSON mẫu dạng chuỗi, tối đa 1.048.576 byte UTF-8"}
  - name: MappingTestResult
    description: "Thân phản hồi thử mapping."
    attributes:
      - {name: sampleJsonValid, type: boolean, required: true}
      - {name: sampleJsonError, type: string, required: false, constraints: "chỉ khi sampleJsonValid là false; mô tả vị trí lỗi, không lặp lại nội dung mẫu"}
      - {name: transactionId, type: FieldResult, required: false, constraints: "vắng khi sampleJsonValid là false"}
      - {name: status, type: FieldResult, required: false, constraints: "vắng khi sampleJsonValid là false"}
      - {name: timestamp, type: FieldResult, required: false, constraints: "vắng khi sampleJsonValid là false hoặc khi không cấu hình timestampPath"}
  - name: TransactionFilter
    description: "Bộ lọc danh sách giao dịch; mọi điều kiện kết hợp bằng AND; giá trị rỗng của bất kỳ tham số nào (kể cả receivedFrom=, receivedTo=) coi như vắng, không phải lỗi (BR19.3)."
    attributes:
      - {name: serviceCode, type: string, required: false, constraints: "khớp trọn mã, không phân biệt hoa thường, kể cả dịch vụ đã xóa"}
      - {name: transactionId, type: string, required: false, constraints: "chứa chuỗi, không phân biệt hoa thường; dấu phần trăm, gạch dưới, gạch chéo ngược là ký tự thường"}
      - {name: status, type: string, required: false, constraints: "như transactionId; giao dịch có latestStatus rỗng không khớp bộ lọc này"}
      - {name: receivedFrom, type: instant, required: false, constraints: "ISO 8601 có múi giờ, nhận phần thập phân của giây; lọc theo latestReceivedAt, tính cả đầu, ở micro giây; không có phần thập phân nghĩa là từ đầu giây (.000000) (BR19.1)"}
      - {name: receivedTo, type: instant, required: false, constraints: "ISO 8601 có múi giờ, nhận phần thập phân của giây; lọc theo latestReceivedAt, tính cả đầu, ở micro giây; không có phần thập phân nghĩa là đến hết giây (.999999); cận dưới hiệu lực của receivedFrom không lớn hơn cận trên hiệu lực này (BR19.1, BR19.3)"}
  - name: CallbackFilter
    description: "Bộ lọc danh sách callback; mọi điều kiện kết hợp bằng AND; giá trị rỗng coi như không lọc."
    attributes:
      - {name: serviceCode, type: string, required: false, constraints: "như TransactionFilter"}
      - {name: transactionId, type: string, required: false, constraints: "chứa chuỗi, không phân biệt hoa thường; Callback có transactionId rỗng không khớp"}
      - {name: outcome, type: enum, allowed_values: [SUCCESS, MAPPING_ERROR, REJECTED], required: false}
      - {name: rejectionReason, type: enum, allowed_values: [INVALID_API_KEY, MISSING_API_KEY, INVALID_JSON, UNSUPPORTED_CONTENT_TYPE, SERVICE_DISABLED, SERVICE_DELETED], required: false, constraints: "kèm outcome khác REJECTED không phải lỗi, chỉ cho kết quả rỗng"}
      - {name: receivedFrom, type: instant, required: false, constraints: "lọc theo receivedAt, tính cả đầu; cùng ngữ nghĩa giây và phần thập phân như TransactionFilter (BR19.1, BR19.2)"}
      - {name: receivedTo, type: instant, required: false, constraints: "lọc theo receivedAt, tính cả đầu; cùng ngữ nghĩa như TransactionFilter (giá trị không có phần thập phân là đến hết giây); cận dưới hiệu lực của receivedFrom không lớn hơn cận trên này"}
  - name: PageRequest
    description: "Tham số phân trang chung của hai danh sách; giá trị rỗng (page=, size=) coi như vắng và dùng mặc định (BR19.3)."
    attributes:
      - {name: page, type: integer, required: false, default: 1, min: 1}
      - {name: size, type: integer, required: false, default: 20, allowed_values: [20, 50, 100]}
  - name: SampleServiceDefinition
    description: "Tệp mẫu của một dịch vụ trong thư mục docs/samples của tpp-simulator-app: thân của yêu cầu tạo dịch vụ, cộng hai payload thử. Không phải dữ liệu trong cơ sở dữ liệu."
    attributes:
      - {name: serviceDefinitionFile, type: file, required: true, constraints: "một tệp JSON cho mỗi dịch vụ mẫu, đúng hình dạng thân tạo dịch vụ"}
      - {name: validPayloadFile, type: file, required: true, constraints: "payload ánh xạ đúng ba trường"}
      - {name: faultyPayloadFile, type: file, required: true, constraints: "payload thiếu hoặc sai một trường để thấy lỗi mapping"}
  - name: LoadRunParameters
    description: "Tham số của lệnh nạp dữ liệu thử (BR22.3). Không lưu."
    attributes:
      - {name: callbacks, type: integer, required: false, default: 100000, min: 1}
      - {name: seed, type: integer64, required: false, constraints: "mặc định là một hằng số cố định để chạy lại cho cùng dữ liệu"}
      - {name: days, type: integer, required: false, default: 30, min: 1}
      - {name: services, type: integer, required: false, default: 3, min: 1}
      - {name: append, type: boolean, required: false, default: false, constraints: "true: dùng lại dịch vụ LOAD_ đã có trong khoảng --services, tạo thêm dịch vụ còn thiếu, bỏ qua (không sửa) dịch vụ đã có (BR22.5)"}
      - {name: targetDatabase, type: string, required: false, constraints: "tên database đích, cấu hình được; mặc định khác database thử thật; không được trùng database thật"}
```

## Tóm tắt

- **Không thêm thực thể.** Bốn thực thể của U1 giữ nguyên tên, chủ sở hữu và định danh. U2 chỉ làm các cột đã có sẵn trong lược đồ của U1 có giá trị: `deleted` đổi được, `apiKeyHeaderName` và `apiKeySecret` có giá trị với `API_KEY`, `outcome` có thêm `REJECTED` cùng `rejectionReason` và `payloadRawText`, và ServiceConfigVersion có nhiều phiên bản trên một dịch vụ.
- **Callback bị từ chối** là cùng một thực thể Callback, khác ở chỗ: không có kết quả ánh xạ, không thuộc giao dịch, `payloadJson` hoặc `payloadRawText` (đúng một), và tham chiếu phiên bản cấu hình hiện hành lúc nhận.
- **Khóa API** chỉ nằm ở `Service.apiKeySecret`, không bao giờ trong phiên bản cấu hình, header đã lưu, nhật ký hay phản hồi. API chỉ có cờ `apiKeyConfigured`.
- **Đối tượng giá trị** mới (`ServiceRuntimeSnapshot`, `MappingTestRequest`, `MappingTestResult`, `TransactionFilter`, `CallbackFilter`, `PageRequest`, `SampleServiceDefinition`, `LoadRunParameters`) chỉ mô tả hình dạng dữ liệu đi qua ranh giới thành phần; không có bảng riêng.
- Hợp đồng: các hình dạng `Service`, `TransactionSummary`, `CallbackSummary`, `CallbackDetail`, `FieldResult` trong `openapi.yaml` khớp thực thể ở trên; U2 chỉ cần thêm header `X-Simulator-Record-Failed` (xem `functional-spec.md`, mục 5).

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/units-generation/unit-of-work.md` và `unit-of-work-story-map.md` (phạm vi U2, story, tiêu chí) `[scope]`
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/requirements-analysis/requirements.md` (FR1 đến FR6, FR8, FR10, FR12, NFR1 đến NFR3) `[desc]`
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/domain-design/components.md` (thực thể, chủ sở hữu) và `decisions.md` (ADR-002, ADR-004, ADR-005, ADR-007)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-summary.md` và `tpp-simulator-app/docs/api/openapi.yaml` (C1 đến C4)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/functional-design/entities.md` (thực thể nền) và `tpp-simulator-app/src/main/resources/db/migration/V1__init_schema.sql` (hiện trạng, chỉ đọc)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/functional-design/functional-design-questions.md` (Q1 đến Q8 chọn A, giả định 1 đến 30 chấp nhận) `[Q1]` đến `[Q8]`
- `docs/brief.md` (mục 3, 4, 6) `[desc]`

## Assumptions & Open Questions

- Khóa API lưu nguyên văn (không cắt, không chuẩn hóa) trong cột `api_key_secret` của Service: dạng lưu đã chốt ở U1 (Q2 C, NFR3.5), không còn để NFR Requirements chốt. Thiết kế này yêu cầu: so khớp chính xác được, không bao giờ trả ra. AC1.12.3 được hiểu là "khóa không xuất hiện ở đâu ngoài cột khóa của Service"; cần bạn xác nhận ở cổng duyệt (giả định 11 của `functional-spec.md`). `[Q5]`, giả định 30.
- Lần nhận bị từ chối có body là JSON hợp lệ nhưng kho dữ liệu không lưu trung thực được ở định dạng JSON của nó (chuỗi chứa ký tự thoát U+0000, chuỗi thoát nửa cặp thay thế, số vượt miền số; các điều kiện xác định trước khi ghi ở BR15.4): lưu dạng văn bản gốc ở `payloadRawText` (ký tự NUL thay bằng U+FFFD), không bao giờ thử ghi hai lần. Callback được chấp nhận có payload như vậy vẫn trả 500 `INTERNAL_ERROR` như U1 đã ghi trong README (rủi ro đã chấp nhận ở U1). Cần bạn xác nhận ở cổng duyệt nếu muốn đổi sang 400. `[assumption]`
- Body đúng chữ `null` là JSON hợp lệ: lưu ở `payloadJson` dưới dạng giá trị JSON null, phân biệt với `payloadJson` để trống (vắng mặt); ở API, `payloadRawText` vắng là dấu hiệu payload nằm ở `payloadJson`. Khớp cách U1 chấp nhận `null` là một giá trị JSON hợp lệ. `[assumption]`
- `updatedAt` của Service giữ nguyên khi một lần lưu không đổi gì (giả định 16 chỉ nói "không tạo phiên bản"). `[assumption]`
- Không có bản chuyển lược đồ mới ở mức thiết kế; nếu NFR Design thêm chỉ mục hay ràng buộc, chúng là một thay đổi lược đồ mà không đổi thực thể ở đây.
- Chỉ mục cho bộ lọc "chứa chuỗi" trên `transactionId`, `status` và giới hạn kích thước phản hồi chi tiết giao dịch: NFR Design (giả định 30).
