# Mô hình thực thể — U1 `u1-backend-skeleton`

> Nguồn: `components.md` (bốn thực thể và chủ sở hữu), `unit-of-work.md` (phạm vi U1), `requirements.md` (FR1, FR3, FR4, FR5, FR6, NFR3), `contract-summary.md` (C2, C4, C6) đã cập nhật theo Q1 A, và các câu trả lời trong `functional-design-questions.md` (Q1 đến Q5 chọn A, 19 giả định chấp nhận).
>
> Mô tả ở mức logic, không phụ thuộc ngôn ngữ hay cơ sở dữ liệu cụ thể. Kiểu cột vật lý, chỉ mục hiệu năng và cách lưu khóa API thuộc các bước sau (NFR Requirements, NFR Design, Code Generation). Mọi thực thể do U1 tạo ra bằng bản chuyển lược đồ `V1__init_schema`; U2 mở rộng bằng `V2`, `V3`, không sửa bản đã áp dụng.

## Nguồn sự thật (YAML)

```yaml
entities:
  - name: Service
    owner: ServiceCatalog
    description: "Một dịch vụ callback do người dùng cấu hình. U1 chỉ tạo và đọc; sửa, bật/tắt, xóa mềm thuộc U2."
    identifier: serviceCode
    attributes:
      - name: serviceCode
        type: string
        required: true
        unique: "không phân biệt hoa thường (khóa so khớp là chữ thường của serviceCode); chữ gốc lúc tạo được giữ và dùng trong mọi phản hồi"
        constraints: "1 đến 50 ký tự, chỉ chữ, số, dấu gạch ngang, gạch dưới; không đổi sau khi tạo"
      - name: name
        type: string
        required: true
        constraints: "1 đến 100 ký tự"
      - name: description
        type: string
        required: false
        constraints: "tối đa 500 ký tự"
      - name: enabled
        type: boolean
        required: true
        default: true
      - name: deleted
        type: boolean
        required: true
        default: false
        constraints: "U1 luôn ghi false; chỉ U2 đổi thành true (xóa mềm)"
      - name: authType
        type: enum
        allowed_values: [NONE, API_KEY]
        required: true
        constraints: "U1 chỉ chấp nhận NONE; API_KEY bị từ chối rõ ràng (BR1.6)"
      - name: apiKeyHeaderName
        type: string
        required: false
        constraints: "tối đa 100 ký tự; U1 không lưu"
      - name: apiKeySecret
        type: string
        required: false
        constraints: "dạng lưu (băm hay mã hóa) do NFR Requirements chốt; U1 không lưu; không bao giờ có trong bất kỳ phản hồi nào"
      - name: currentVersionNumber
        type: integer
        required: true
        constraints: "không nhỏ hơn 1; U1 luôn là 1"
      - name: createdAt
        type: instant
        required: true
      - name: updatedAt
        type: instant
        required: true
    entity_constraints:
      - "Không bao giờ xóa vật lý một Service (xóa mềm ở U2) để lịch sử vẫn tra cứu được"
      - "Tạo Service và ServiceConfigVersion số 1 trong cùng một giao dịch cơ sở dữ liệu"
    relationships:
      - {target: ServiceConfigVersion, cardinality: "1 - n", direction: "Service sở hữu các phiên bản của nó"}
      - {target: Callback, cardinality: "1 - n", direction: "Service có nhiều Callback"}
      - {target: Transaction, cardinality: "1 - n", direction: "Service có nhiều Transaction"}

  - name: ServiceConfigVersion
    owner: ServiceCatalog
    description: "Phiên bản cấu hình xử lý callback, bất biến. U1 chỉ tạo phiên bản số 1 khi tạo dịch vụ."
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
        constraints: "không nhỏ hơn 1; duy nhất theo cặp (serviceCode, versionNumber)"
      - name: transactionIdPath
        type: string
        required: true
        constraints: "1 đến 200 ký tự, bắt đầu bằng $."
      - name: statusPath
        type: string
        required: true
        constraints: "1 đến 200 ký tự, bắt đầu bằng $."
      - name: timestampPath
        type: string
        required: false
        constraints: "tối đa 200 ký tự, bắt đầu bằng $. khi có; rỗng nghĩa là không đọc timestamp"
      - name: timestampFormat
        type: enum
        allowed_values: [ISO_8601, UNIX_SECONDS, UNIX_MILLIS, PATTERN]
        required: true
        constraints: "U1 chỉ chấp nhận ISO_8601 (BR1.6)"
      - name: timestampPattern
        type: string
        required: false
        constraints: "tối đa 100 ký tự; U1 không dùng"
      - name: defaultTimeZone
        type: string
        required: true
        default: "Asia/Ho_Chi_Minh"
        constraints: "phải là mã múi giờ hợp lệ"
      - name: responseHttpStatus
        type: integer
        required: true
        min: 200
        max: 599
        constraints: "không nhận 204, 205, 304 vì HTTP không cho phép body (BR1.5)"
      - name: responseBody
        type: json_text
        required: true
        constraints: "JSON hợp lệ bất kỳ, tối đa 64 KB, lưu dưới dạng văn bản JSON"
      - name: createdAt
        type: instant
        required: true
    entity_constraints:
      - "Bất biến: không bao giờ sửa hay xóa một phiên bản đã tạo"
      - "Khóa API và tên header xác thực không nằm trong phiên bản (ADR-004)"
    relationships:
      - {target: Service, cardinality: "n - 1", direction: "mỗi phiên bản thuộc đúng một Service"}
      - {target: Callback, cardinality: "1 - n", direction: "mỗi Callback tham chiếu đúng một phiên bản đã dùng"}

  - name: Callback
    owner: CallbackLedger
    description: "Một lần nhận callback. Bất biến: không bao giờ sửa hay xóa. U1 chỉ ghi lần nhận được chấp nhận (outcome SUCCESS hoặc MAPPING_ERROR)."
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
        constraints: "phiên bản cấu hình hiện hành lúc xử lý callback"
      - name: receivedAt
        type: instant
        required: true
        constraints: "server gán lúc bắt đầu nhận request, UTC, độ chính xác micro giây"
      - name: outcome
        type: enum
        allowed_values: [SUCCESS, MAPPING_ERROR, REJECTED]
        required: true
        constraints: "U1 chỉ ghi SUCCESS và MAPPING_ERROR"
      - name: rejectionReason
        type: enum
        allowed_values: [INVALID_API_KEY, MISSING_API_KEY, INVALID_JSON, UNSUPPORTED_CONTENT_TYPE, SERVICE_DISABLED, SERVICE_DELETED]
        required: false
        constraints: "luôn rỗng ở U1; có giá trị khi outcome là REJECTED (U2)"
      - name: httpStatusReturned
        type: integer
        required: true
        constraints: "mã HTTP đã trả; ở U1 là responseHttpStatus của phiên bản cấu hình"
      - name: requestHeadersMasked
        type: json_object
        required: true
        constraints: "mọi header của request; Authorization, Proxy-Authorization, Cookie có giá trị ***"
      - name: payloadJson
        type: json
        required: false
        constraints: "payload gốc lưu dạng JSONB nên là dạng ĐÃ CHUẨN HÓA của cơ sở dữ liệu (số như 1e3 có thể hiện thành 1000, thứ tự khóa và khóa trùng không được giữ); giá trị ánh xạ (BR3.2) luôn lấy từ văn bản gốc nên có thể khác dạng hiển thị này. Lưu thêm văn bản thô cho mọi callback hợp lệ là lựa chọn NFR Design cân nhắc; ở U1 luôn có vì chỉ ghi JSON hợp lệ"
      - name: payloadRawText
        type: string
        required: false
        constraints: "luôn rỗng ở U1; dùng cho body không phải JSON ở U2"
      - name: transactionId
        type: string
        required: false
        constraints: "giá trị đã ánh xạ; rỗng khi lỗi ánh xạ; tối đa 255 ký tự"
      - name: status
        type: string
        required: false
        constraints: "giá trị đã ánh xạ; rỗng khi lỗi ánh xạ; tối đa 255 ký tự"
      - name: businessTimestampUtc
        type: instant
        required: false
        constraints: "timestamp nghiệp vụ đã chuẩn hóa UTC; rỗng khi thiếu hoặc lỗi"
      - name: mappingFieldResults
        type: json_object
        required: true
        constraints: "kết quả ba trường transactionId, status, timestamp (FieldResult)"
      - name: responseStatusReturned
        type: integer
        required: false
        constraints: "mã HTTP đã trả cho lần nhận này"
      - name: responseBodyReturned
        type: json
        required: false
        constraints: "body đã trả cho lần nhận này"
    entity_constraints:
      - "Bất biến: không bao giờ sửa hay xóa; không khử trùng (AC1.1.2)"
      - "Ghi Callback và cập nhật Transaction trong cùng một giao dịch cơ sở dữ liệu (ADR-002)"
      - "requestHeadersMasked không bao giờ chứa giá trị chưa che của ba header chuẩn (NFR3)"
    relationships:
      - {target: Service, cardinality: "n - 1", direction: "mỗi Callback thuộc một Service"}
      - {target: ServiceConfigVersion, cardinality: "n - 1", direction: "mỗi Callback tham chiếu một phiên bản đã dùng"}
      - {target: Transaction, cardinality: "n - 0..1", direction: "quan hệ logic qua (serviceCode, transactionId), KHÔNG có khóa ngoại từ Callback sang Transaction (Callback được ghi trước để có recordId, rồi mới tạo hoặc cập nhật Transaction; chỉ Transaction.latestCallbackId là khóa ngoại thật). Callback có transactionId hợp lệ thuộc đúng một Transaction; các Callback khác không thuộc giao dịch nào"}

  - name: Transaction
    owner: CallbackLedger
    description: "Giao dịch tổng hợp cho một cặp (serviceCode, transactionId), cập nhật nguyên tử cùng việc ghi Callback."
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
        constraints: "tổng số Callback thuộc giao dịch; luôn tăng 1 cho mỗi lần nhận"
    entity_constraints:
      - "Duy nhất theo cặp (serviceCode, transactionId)"
      - "Lần nhận gần nhất là lần có cặp (receivedAt, recordId) lớn nhất; timestamp nghiệp vụ không tham gia"
      - "Các trường latest* chỉ được thay khi Callback đang ghi có cặp (receivedAt, recordId) lớn hơn cặp đang lưu"
    relationships:
      - {target: Service, cardinality: "n - 1", direction: "mỗi Transaction thuộc một Service"}
      - {target: Callback, cardinality: "1 - n", direction: "Transaction có nhiều Callback và trỏ tới Callback gần nhất"}

value_objects:
  - name: FieldResult
    description: "Kết quả ánh xạ của một trong ba trường, lưu trong Callback.mappingFieldResults"
    attributes:
      - {name: value, type: string, required: false}
      - {name: errorCode, type: enum, allowed_values: [NOT_FOUND, EMPTY, WRONG_TYPE, TOO_LONG, PAYLOAD_NOT_OBJECT, UNPARSEABLE], required: false}
      - {name: error, type: string, required: false, constraints: "câu mô tả ngắn tiếng Việt, không chứa dữ liệu nhạy cảm"}
      - {name: warning, type: string, required: false, constraints: "chỉ dùng cho timestamp đã cấu hình đường dẫn mà không có giá trị"}
  - name: ErrorResponse
    description: "Thân lỗi do ứng dụng sinh ra, luôn đi kèm header X-Simulator-Error"
    attributes:
      - {name: error, type: string, required: true}
      - {name: message, type: string, required: true}
      - {name: fieldErrors, type: list, required: false, constraints: "chỉ có khi error là VALIDATION_FAILED; mỗi phần tử có field và message"}
```

## Tóm tắt

- Bốn thực thể đúng như `components.md`: Service và ServiceConfigVersion do ServiceCatalog sở hữu; Callback và Transaction do CallbackLedger sở hữu. Không thêm thực thể nào; hai đối tượng giá trị `FieldResult` và `ErrorResponse` chỉ là hình dạng dữ liệu, không có bảng riêng.
- Bốn bảng tạo trong `V1__init_schema` gồm đủ các cột của cả U1 lẫn U2 (ví dụ `deleted`, `rejectionReason`, `payloadRawText`) để U2 không phải sửa bản chuyển đã áp dụng; U1 chỉ ghi giá trị mặc định ở các cột này.
- Khóa duy nhất không phân biệt hoa thường của `serviceCode` là ràng buộc cứng ở tầng cơ sở dữ liệu, để hai yêu cầu tạo cùng mã gần như đồng thời chỉ một bên thành công (BR1.2).
- Chuỗi `transactionId` và `status` là chuỗi mờ, tối đa 255 ký tự, nên khóa chính của Transaction luôn lập chỉ mục được.
- Chỉ mục phục vụ mục tiêu hiệu năng 100.000 callback (NFR1) không nằm ở đây: NFR Design chọn.

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/units-generation/unit-of-work.md` và `unit-of-work-story-map.md` (phạm vi và tiêu chí của U1)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/domain-design/components.md` (thực thể, chủ sở hữu, thuộc tính)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/requirements-analysis/requirements.md` (FR1, FR3 đến FR6, NFR3)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-summary.md` (C2, C4, C6, đã cập nhật theo Q1 A)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/functional-design/functional-design-questions.md` (Q1 đến Q5 và giả định 1 đến 19)

## Assumptions & Open Questions

- Dạng lưu của `apiKeySecret` do NFR Requirements chốt; U1 không lưu khóa nên không bị chặn.
- Chỉ mục và cách ghi đồng thời của Transaction do NFR Design chốt; thiết kế ở đây chỉ nêu ràng buộc cần thỏa.
- Giới hạn 64 KB cho `responseBody` và 255 ký tự cho `transactionId`, `status` là giả định 1 và 6 của Functional Design, đã được chấp nhận.
