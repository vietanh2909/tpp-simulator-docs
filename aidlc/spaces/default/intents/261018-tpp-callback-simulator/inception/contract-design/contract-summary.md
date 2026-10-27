# Tóm tắt hợp đồng — TPP Callback Simulator (MVP)

> Nguồn: `unit-of-work.md`, `unit-of-work-dependency.md`, `components.md`, `decisions.md`, `requirements.md` và 8 câu trả lời trong `contract-design-questions.md` (Q1 đến Q8 chọn A, 7 giả định chấp nhận). Tài liệu này chốt hình dạng các hợp đồng HTTP và các ranh giới nội bộ giữa Unit. Logic nghiệp vụ chi tiết (kiểu dữ liệu cột, giới hạn độ dài) thuộc Functional Design.
>
> Thuật ngữ: Unit U1 đến U4 theo `unit-of-work.md`. "Backend" là `tpp-simulator-app/`, "Portal" là `tpp-simulator-portal/`.

## Sửa đổi sau rà soát (2026-10-20, theo Functional Design của U1, Q1 A)

Bản rà soát `reviews/review-01.md` còn 12 góp ý chưa xử lý. Functional Design của U1 xử lý 11 góp ý bằng cách sửa đúng các đoạn dưới đây; R-10 để NFR Design. Chi tiết ở `construction/u1-backend-skeleton/functional-design/functional-spec.md` mục 5.

| Góp ý | Chỗ đã sửa trong tài liệu này |
|---|---|
| R-01 | C4: chi tiết giao dịch là `GET /api/transactions/detail` với tham số truy vấn |
| R-02 | Quy ước chung và C1: header `X-Simulator-Error`; bỏ câu phân biệt bằng trường `error` |
| R-03 | C2: `apiKeySecret` chỉ có ở `ServiceCreate` và `ServiceUpdate`, không có ở `Service` |
| R-04 | Quy ước chung: bảng mã lỗi; C2: mã 409 `SERVICE_CODE_DUPLICATE`; C3 và C4: `FieldResult` thêm `errorCode` (NOT_FOUND, EMPTY, WRONG_TYPE, TOO_LONG, PAYLOAD_NOT_OBJECT, UNPARSEABLE) |
| R-05 | C4: `rejectionReason` thêm `null`, tham số lọc cùng danh sách giá trị |
| R-06 | C5: danh sách export viết lại dạng khối |
| R-07 | C4: `receivedFrom` và `receivedTo` lọc theo `latestReceivedAt` ở danh sách giao dịch, gửi UTC có `Z` |
| R-08 | Quy ước chung, C1, C2, C4: khớp mã dịch vụ không phân biệt hoa thường |
| R-09 | Quy ước chung: đường dẫn trang giao diện không dùng `/api` và `/callbacks` |
| R-10 | Không sửa; NFR Design chốt giới hạn kích thước phản hồi chi tiết giao dịch |
| R-11 | C2: hành vi thao tác trên dịch vụ đã xóa và đổi sang `API_KEY` |
| R-12 | Quy ước chung: không xác thực theo brief, backend mặc định chỉ lắng nghe `127.0.0.1` |

## Bảng hợp đồng

| # | Provider Unit | Consumer | Mechanism | Owner |
|---|---|---|---|---|
| C1 | U1 (nền), U2 (đầy đủ): CallbackIngestion | External: hệ thống ngân hàng (dev/UAT); U3 (gửi thử) | REST HTTP đồng bộ `POST /callbacks/{serviceCode}` | Backend (`tpp-simulator-app/`) |
| C2 | U1 (tạo tối giản), U2 (đầy đủ): ServiceCatalog | U3 (ServiceConsole), U4 (danh sách dịch vụ cho bộ lọc) | REST JSON `/api/services` | Backend |
| C3 | U2: MappingEngine | U3 (ServiceConsole) | REST JSON `POST /api/mapping-tests` | Backend |
| C4 | U1 (đọc tối giản), U2 (đầy đủ): CallbackLedger | U4 (Monitoring); cURL kiểm chứng skeleton | REST JSON `/api/transactions`, `/api/callbacks` | Backend |
| C5 | U3: AppShell | U4 (Monitoring) | Import module TypeScript trong cùng ứng dụng frontend | Portal (`tpp-simulator-portal/`) |
| C6 | U1: lược đồ cơ sở dữ liệu | U2 | Lược đồ dùng chung, bản chuyển lược đồ đánh số | Backend |

Không có hợp đồng sự kiện hay hàng đợi (ADR-008). Hệ thống ngân hàng chỉ gọi vào C1; ứng dụng không gọi ra ngoài.

## Quy ước chung cho C1 đến C4

- Thân yêu cầu và phản hồi là `application/json; charset=utf-8`, tên trường camelCase, enum viết hoa.
- Mọi thời điểm là ISO 8601 UTC dạng `2026-10-19T03:00:00Z`. Giao diện đổi sang Asia/Ho_Chi_Minh khi hiển thị.
- Tiền tố `/api` cho C2 đến C4. Khi chạy dev, Vite chuyển tiếp `/api` và `/callbacks` tới backend, không cấu hình CORS.
- Định dạng lỗi (cả C1 đến C4):

```yaml
shared-schema: ErrorResponse
type: object
required: [error, message]
properties:
  error:
    type: string
    description: Mã lỗi viết hoa, ổn định (VALIDATION_FAILED, SERVICE_NOT_FOUND, ...)
  message:
    type: string
    description: Mô tả ngắn cho người đọc, không chứa khóa API hay dữ liệu nhạy cảm
  fieldErrors:
    type: array
    description: Chỉ có khi error là VALIDATION_FAILED
    items:
      type: object
      required: [field, message]
      properties:
        field: {type: string}
        message: {type: string}
```

- Phân trang: `page` bắt đầu từ 1 (mặc định 1), `size` chỉ nhận 20, 50 hoặc 100 (mặc định 20); khác thì 400 `VALIDATION_FAILED`. Phản hồi:

```yaml
shared-schema: Page
type: object
required: [items, page, size, totalItems, totalPages]
properties:
  items: {type: array, items: {}}
  page: {type: integer, minimum: 1}
  size: {type: integer, enum: [20, 50, 100]}
  totalItems: {type: integer, format: int64, minimum: 0}
  totalPages: {type: integer, minimum: 0}
```

- Thay đổi thêm (trường mới, endpoint mới) là tương thích; phía nhận bỏ qua trường lạ.
- **Header đánh dấu lỗi hệ thống (R-02):** mọi response lỗi do chính ứng dụng sinh ra có header `X-Simulator-Error: <MÃ LỖI>` với giá trị bằng trường `error` của thân. Response đã cấu hình của dịch vụ không bao giờ có header này, kể cả khi mã HTTP trùng một mã lỗi; đây là dấu hiệu máy đọc được để phân biệt hai loại.
- **Bảng mã lỗi (R-04):** `error` chỉ nhận một trong các mã sau; `ErrorResponse` và `FieldResult` có cùng định nghĩa ở mọi khối.

| Mã | HTTP | Dùng ở |
|---|---|---|
| `VALIDATION_FAILED` | 400 | C2, C3, C4 (kèm `fieldErrors`) |
| `UNSUPPORTED_CONTENT_TYPE`, `INVALID_JSON` | 400 | C1 |
| `UNAUTHORIZED` | 401 | C1 |
| `SERVICE_NOT_FOUND`, `TRANSACTION_NOT_FOUND`, `CALLBACK_NOT_FOUND` | 404 | C1, C2, C4 |
| `SERVICE_CODE_DUPLICATE` | 409 | C2 |
| `PAYLOAD_TOO_LARGE` | 413 | C1 |
| `INTERNAL_ERROR` | 500 | C1 đến C4 |
| `SERVICE_DISABLED` | 503 | C1 |

- **Mã dịch vụ không phân biệt hoa thường (R-08):** `serviceCode` trong đường dẫn, trong tham số truy vấn và trong bộ lọc được khớp không phân biệt hoa thường (tính duy nhất cũng không phân biệt hoa thường). Mọi phản hồi trả `serviceCode` đúng chữ gốc lúc tạo.
- **Không xác thực (R-12):** API quản lý và tra cứu không có xác thực theo brief (không đăng nhập). Backend mặc định chỉ lắng nghe `127.0.0.1`; README cảnh báo khi đổi sang địa chỉ khác vì mọi người cùng mạng sẽ đọc được lịch sử và đổi được cấu hình.
- **Đường dẫn trang giao diện (R-09):** Portal không dùng tiền tố `/api` và `/callbacks` cho đường dẫn trang (ví dụ dùng `/services`, `/monitoring`), vì Vite chuyển tiếp hai tiền tố đó sang backend và tải lại trang sẽ đi nhầm.

## C1 — Nhận callback

Thứ tự xử lý (sau Q3 và FR3.1):

1. Body lớn hơn 1.048.576 byte thì 413 `PAYLOAD_TOO_LARGE`, không đọc hết body, không ghi gì.
2. `serviceCode` chưa từng có thì 404 `SERVICE_NOT_FOUND`, không ghi gì.
3. Dịch vụ đã xóa thì 404 `SERVICE_NOT_FOUND`; dịch vụ tắt thì 503 `SERVICE_DISABLED`. Cả hai được ghi như một lần nhận bị từ chối.
4. API key sai hoặc thiếu thì 401 `UNAUTHORIZED` (tên header không phân biệt hoa thường, giá trị so khớp chính xác); được ghi.
5. Content-Type không phải JSON thì 400 `UNSUPPORTED_CONTENT_TYPE`; JSON hỏng thì 400 `INVALID_JSON`; được ghi, body không phải JSON lưu dạng văn bản gốc.
6. Mapping, ghi Callback và Transaction trong một giao dịch cơ sở dữ liệu, rồi trả response đã cấu hình (kể cả khi mapping lỗi).
7. Lỗi ghi một callback được chấp nhận thì 500 `INTERNAL_ERROR`, không trả response đã cấu hình.

Ghi chú: response đã cấu hình có thể trùng một mã lỗi ở trên (ví dụ dịch vụ cấu hình trả 401). Người gọi phân biệt bằng header: mọi response lỗi do ứng dụng sinh có `X-Simulator-Error: <MÃ LỖI>`, còn response đã cấu hình không bao giờ có header này (R-02). `serviceCode` trong đường dẫn khớp không phân biệt hoa thường (R-08): `/callbacks/thu_ho` vào dịch vụ đã tạo là `THU_HO`.

Ở U1 (Functional Design): bước 1 đến 5 trả mã tương ứng nhưng chưa ghi lần nhận bị từ chối, bước 4 (API key) chưa có; U2 thêm ghi lần nhận bị từ chối và kiểm tra khóa API.

```yaml
openapi: 3.0.3
info:
  title: TPP Callback Simulator — Callback endpoint (C1)
  version: "1.0"
  description: >
    Mọi response lỗi do ứng dụng sinh ra (400, 401, 404, 413, 500, 503) có header
    X-Simulator-Error mang mã lỗi (R-02). Response đã cấu hình không bao giờ có header này.
paths:
  /callbacks/{serviceCode}:
    post:
      operationId: receiveCallback
      summary: Nhận callback từ hệ thống ngân hàng
      parameters:
        - name: serviceCode
          in: path
          required: true
          schema: {type: string, minLength: 1, maxLength: 50, pattern: "^[A-Za-z0-9_-]+$"}
      requestBody:
        required: true
        content:
          application/json:
            schema: {description: "Bất kỳ JSON nào, tối đa 1.048.576 byte"}
      responses:
        default:
          description: >
            Response đã cấu hình của dịch vụ: HTTP status 200 đến 599 và body JSON cố định.
            Trả cả khi mapping lỗi.
          content:
            application/json:
              schema: {description: "Nội dung do người dùng cấu hình"}
        "400":
          description: Content-Type không phải JSON hoặc JSON hỏng (INVALID_JSON, UNSUPPORTED_CONTENT_TYPE)
          content:
            application/json:
              schema: {$ref: "#/components/schemas/ErrorResponse"}
        "401":
          description: API key sai hoặc thiếu (UNAUTHORIZED)
          content:
            application/json:
              schema: {$ref: "#/components/schemas/ErrorResponse"}
        "404":
          description: Dịch vụ không tồn tại hoặc đã xóa (SERVICE_NOT_FOUND)
          content:
            application/json:
              schema: {$ref: "#/components/schemas/ErrorResponse"}
        "413":
          description: Body lớn hơn 1.048.576 byte (PAYLOAD_TOO_LARGE); không ghi
          content:
            application/json:
              schema: {$ref: "#/components/schemas/ErrorResponse"}
        "500":
          description: Lỗi ghi cơ sở dữ liệu (INTERNAL_ERROR); không trả response đã cấu hình
          content:
            application/json:
              schema: {$ref: "#/components/schemas/ErrorResponse"}
        "503":
          description: Dịch vụ đang tắt (SERVICE_DISABLED)
          content:
            application/json:
              schema: {$ref: "#/components/schemas/ErrorResponse"}
components:
  schemas:
    ErrorResponse:
      type: object
      required: [error, message]
      properties:
        error: {type: string}
        message: {type: string}
```

## C2 — Quản lý dịch vụ

Tập trường tối thiểu của U1 (việc R-07 từ Units Generation) cũng là tập trường đầy đủ của hợp đồng: U1 triển khai tạo và đọc với kiểm tra tối giản, U2 hoàn thiện kiểm tra, sửa, bật/tắt, xóa mềm và phiên bản cấu hình. Phản hồi không bao giờ chứa `apiKeySecret`; có cờ `apiKeyConfigured` thay thế. Khi sửa, `apiKeySecret` vắng hoặc rỗng nghĩa là giữ khóa cũ.

Hành vi các trường hợp biên (R-11): sửa, bật/tắt hoặc xóa một dịch vụ đã xóa trả 404 `SERVICE_NOT_FOUND`; xóa lại dịch vụ đã xóa cũng trả 404; đổi `authType` sang `API_KEY` mà không có `apiKeySecret` thì 400 `VALIDATION_FAILED` (không có khóa cũ để giữ). `GET /api/services/{serviceCode}` vẫn trả dịch vụ đã xóa với `deleted` bằng true. `serviceCode` khớp không phân biệt hoa thường (R-08).

Ở U1 (Functional Design): chỉ `POST /api/services` và `GET /api/services/{serviceCode}`; `authType` khác `NONE` hoặc `timestampFormat` khác `ISO_8601` bị từ chối với 400 `VALIDATION_FAILED` ghi rõ "chưa hỗ trợ ở bản skeleton". Giới hạn độ dài: `serviceCode` 1 đến 50; `name` 1 đến 100; `description` tối đa 500; ba đường dẫn tối đa 200; `timestampPattern` tối đa 100; `apiKeyHeaderName` tối đa 100; `responseBody` tối đa 64 KB.

Giá trị `timestampFormat`: `ISO_8601`, `UNIX_SECONDS`, `UNIX_MILLIS`, `PATTERN` (khi đó bắt buộc `timestampPattern` theo cú pháp `DateTimeFormatter` của Java).

```yaml
openapi: 3.0.3
info:
  title: TPP Callback Simulator — Service management (C2)
  version: "1.0"
paths:
  /api/services:
    get:
      operationId: listServices
      summary: Danh sách dịch vụ
      parameters:
        - name: includeDeleted
          in: query
          schema: {type: boolean, default: false}
          description: true để kèm dịch vụ đã xóa (phục vụ bộ lọc theo dõi)
      responses:
        "200":
          description: Danh sách dịch vụ, sắp theo serviceCode tăng dần
          content:
            application/json:
              schema:
                type: array
                items: {$ref: "#/components/schemas/Service"}
    post:
      operationId: createService
      requestBody:
        required: true
        content:
          application/json:
            schema: {$ref: "#/components/schemas/ServiceCreate"}
      responses:
        "201":
          description: Đã tạo
          content:
            application/json:
              schema: {$ref: "#/components/schemas/Service"}
        "400": {$ref: "#/components/responses/ValidationFailed"}
        "409":
          description: Mã dịch vụ trùng (SERVICE_CODE_DUPLICATE; không phân biệt hoa thường, kể cả đã xóa)
          content:
            application/json:
              schema: {$ref: "#/components/schemas/ErrorResponse"}
  /api/services/{serviceCode}:
    parameters:
      - name: serviceCode
        in: path
        required: true
        schema: {type: string}
    get:
      operationId: getService
      responses:
        "200":
          description: Dịch vụ (kể cả đã xóa; trường deleted cho biết)
          content:
            application/json:
              schema: {$ref: "#/components/schemas/Service"}
        "404": {$ref: "#/components/responses/NotFound"}
    put:
      operationId: updateService
      summary: Sửa cấu hình (serviceCode không đổi)
      requestBody:
        required: true
        content:
          application/json:
            schema: {$ref: "#/components/schemas/ServiceUpdate"}
      responses:
        "200":
          description: Đã sửa
          content:
            application/json:
              schema: {$ref: "#/components/schemas/Service"}
        "400": {$ref: "#/components/responses/ValidationFailed"}
        "404": {$ref: "#/components/responses/NotFound"}
    delete:
      operationId: deleteService
      summary: Xóa mềm
      responses:
        "204": {description: Đã xóa mềm}
        "404": {$ref: "#/components/responses/NotFound"}
  /api/services/{serviceCode}/enabled:
    put:
      operationId: setServiceEnabled
      parameters:
        - name: serviceCode
          in: path
          required: true
          schema: {type: string}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [enabled]
              properties:
                enabled: {type: boolean}
      responses:
        "200":
          description: Đã đổi trạng thái
          content:
            application/json:
              schema: {$ref: "#/components/schemas/Service"}
        "404": {$ref: "#/components/responses/NotFound"}
components:
  responses:
    ValidationFailed:
      description: Dữ liệu không hợp lệ (VALIDATION_FAILED kèm fieldErrors)
      content:
        application/json:
          schema: {$ref: "#/components/schemas/ErrorResponse"}
    NotFound:
      description: Không có dịch vụ với mã này (SERVICE_NOT_FOUND)
      content:
        application/json:
          schema: {$ref: "#/components/schemas/ErrorResponse"}
  schemas:
    ErrorResponse:
      type: object
      required: [error, message]
      properties:
        error: {type: string}
        message: {type: string}
        fieldErrors:
          type: array
          items:
            type: object
            required: [field, message]
            properties:
              field: {type: string}
              message: {type: string}
    ServiceConfig:
      type: object
      description: >
        Cấu hình dùng chung cho yêu cầu và phản hồi. Không chứa apiKeySecret (R-03):
        khóa chỉ có ở ServiceCreate và ServiceUpdate, không bao giờ có ở Service.
      required: [name, authType, transactionIdPath, statusPath, timestampFormat, responseHttpStatus, responseBody]
      properties:
        name: {type: string, minLength: 1, maxLength: 100}
        description: {type: string, maxLength: 500}
        authType: {type: string, enum: [NONE, API_KEY], description: "U1 chỉ chấp nhận NONE"}
        apiKeyHeaderName: {type: string, maxLength: 100, description: Bắt buộc khi authType là API_KEY}
        transactionIdPath: {type: string, example: "$.transId"}
        statusPath: {type: string, example: "$.code"}
        timestampPath: {type: string, nullable: true, example: "$.time"}
        timestampFormat: {type: string, enum: [ISO_8601, UNIX_SECONDS, UNIX_MILLIS, PATTERN]}
        timestampPattern: {type: string, nullable: true, example: "yyyy-MM-dd HH:mm:ss"}
        defaultTimeZone: {type: string, default: Asia/Ho_Chi_Minh}
        responseHttpStatus: {type: integer, minimum: 200, maximum: 599, description: "Không nhận 204, 205, 304 vì HTTP không cho phép body; các mã này trả 400 VALIDATION_FAILED"}
        responseBody: {description: "JSON hợp lệ bất kỳ, ví dụ {\"ok\":true}"}
    ServiceCreate:
      allOf:
        - $ref: "#/components/schemas/ServiceConfig"
        - type: object
          required: [serviceCode]
          properties:
            serviceCode: {type: string, minLength: 1, maxLength: 50, pattern: "^[A-Za-z0-9_-]+$"}
            enabled: {type: boolean, default: true}
            apiKeySecret:
              type: string
              writeOnly: true
              description: Chỉ ghi. Bắt buộc khi tạo với API_KEY (U1 chưa hỗ trợ API_KEY)
    ServiceUpdate:
      allOf:
        - $ref: "#/components/schemas/ServiceConfig"
        - type: object
          properties:
            apiKeySecret:
              type: string
              writeOnly: true
              description: Chỉ ghi. Vắng hoặc rỗng nghĩa là giữ khóa cũ; đổi authType sang API_KEY mà không có khóa thì 400 VALIDATION_FAILED
    Service:
      allOf:
        - $ref: "#/components/schemas/ServiceConfig"
        - type: object
          required: [serviceCode, enabled, deleted, apiKeyConfigured, callbackPath, currentVersionNumber, createdAt, updatedAt]
          properties:
            serviceCode: {type: string}
            enabled: {type: boolean}
            deleted: {type: boolean}
            apiKeyConfigured: {type: boolean}
            callbackPath: {type: string, example: "/callbacks/THU_HO"}
            currentVersionNumber: {type: integer, minimum: 1}
            createdAt: {type: string, format: date-time}
            updatedAt: {type: string, format: date-time}
```

## C3 — Thử mapping

Nhận cấu hình đang nhập (có thể chưa lưu) và JSON mẫu dạng chuỗi. Không ghi dữ liệu. Cấu hình sai cú pháp (đường dẫn, mẫu thời gian) thì 400 `VALIDATION_FAILED` kèm `fieldErrors`. JSON mẫu hỏng thì 200 với `sampleJsonValid` bằng false và `sampleJsonError`. Lỗi từng trường nằm trong `transactionId`, `status`, `timestamp`.

```yaml
openapi: 3.0.3
info:
  title: TPP Callback Simulator — Mapping test (C3)
  version: "1.0"
paths:
  /api/mapping-tests:
    post:
      operationId: testMapping
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [transactionIdPath, statusPath, timestampFormat, sampleJson]
              properties:
                transactionIdPath: {type: string}
                statusPath: {type: string}
                timestampPath: {type: string, nullable: true}
                timestampFormat: {type: string, enum: [ISO_8601, UNIX_SECONDS, UNIX_MILLIS, PATTERN]}
                timestampPattern: {type: string, nullable: true}
                defaultTimeZone: {type: string, default: Asia/Ho_Chi_Minh}
                sampleJson: {type: string, description: JSON mẫu dưới dạng chuỗi}
      responses:
        "200":
          description: Kết quả thử
          content:
            application/json:
              schema:
                type: object
                required: [sampleJsonValid]
                properties:
                  sampleJsonValid: {type: boolean}
                  sampleJsonError: {type: string, nullable: true}
                  transactionId: {$ref: "#/components/schemas/FieldResult"}
                  status: {$ref: "#/components/schemas/FieldResult"}
                  timestamp: {$ref: "#/components/schemas/FieldResult"}
        "400":
          description: Cấu hình sai cú pháp (VALIDATION_FAILED kèm fieldErrors)
          content:
            application/json:
              schema: {$ref: "#/components/schemas/ErrorResponse"}
components:
  schemas:
    FieldResult:
      type: object
      properties:
        value: {type: string, nullable: true, description: "Giá trị lấy được; timestamp là ISO 8601 UTC"}
        errorCode:
          type: string
          nullable: true
          enum: [NOT_FOUND, EMPTY, WRONG_TYPE, TOO_LONG, PAYLOAD_NOT_OBJECT, UNPARSEABLE, null]
          description: "Mã lỗi ổn định của đúng trường này; null nếu không lỗi"
        error: {type: string, nullable: true, description: "Câu mô tả lỗi cho người đọc; null nếu không lỗi"}
        warning: {type: string, nullable: true, description: "Chỉ dùng cho timestamp đã cấu hình đường dẫn mà không có giá trị"}
    ErrorResponse:
      type: object
      required: [error, message]
      properties:
        error: {type: string}
        message: {type: string}
        fieldErrors:
          type: array
          items:
            type: object
            required: [field, message]
            properties:
              field: {type: string}
              message: {type: string}
```

## C4 — Tra cứu giao dịch và callback

U1 cung cấp `GET /api/transactions` (chỉ `page` và `size`; tham số lọc bị từ chối với 400 `VALIDATION_FAILED` cho tới khi U2 làm) và `GET /api/transactions/detail`; U2 thêm bộ lọc và `/api/callbacks` mà không đổi đường dẫn đã có. Chi tiết callback trả kèm `configVersionNumber` (đáp ứng AC1.1.3).

Chi tiết giao dịch nhận `serviceCode` và `transactionId` qua tham số truy vấn (R-01) vì `transactionId` là chuỗi tùy ý của ngân hàng, có thể chứa `/`, `?`, `#`, `%` hoặc khoảng trắng. Cả hai tham số phải mã hóa phần trăm. Ví dụ cURL: `curl -G "http://127.0.0.1:8080/api/transactions/detail" --data-urlencode "serviceCode=THU_HO" --data-urlencode "transactionId=2026/10/001"`.

Bộ lọc thời gian `receivedFrom` và `receivedTo` của `/api/transactions` lọc theo `latestReceivedAt` (R-07); của `/api/callbacks` lọc theo `receivedAt`. Giao diện gửi thời điểm dạng UTC có chữ `Z`; khi viết tay có múi giờ `+07:00`, dấu `+` phải mã hóa phần trăm thành `%2B`. Bộ lọc `serviceCode` khớp không phân biệt hoa thường (R-08). `rejectionReason` dùng cùng danh sách giá trị ở tham số lọc và ở phản hồi; giá trị sai trả 400 `VALIDATION_FAILED` (R-05).

Giá trị `outcome`: `SUCCESS`, `MAPPING_ERROR`, `REJECTED`. Giá trị `rejectionReason` khi `REJECTED`: `INVALID_API_KEY`, `MISSING_API_KEY`, `INVALID_JSON`, `UNSUPPORTED_CONTENT_TYPE`, `SERVICE_DISABLED`, `SERVICE_DELETED`. Sắp xếp cố định: `receivedAt` mới nhất trước, hòa nhau theo `recordId` lớn hơn. Bộ lọc `serviceCode` khớp không phân biệt hoa thường (R-08); `transactionId` và `status` khớp chuỗi chứa, không phân biệt hoa thường; `receivedFrom` và `receivedTo` là thời điểm ISO 8601 có múi giờ, tính cả hai đầu.

```yaml
openapi: 3.0.3
info:
  title: TPP Callback Simulator — Query API (C4)
  version: "1.0"
paths:
  /api/transactions:
    get:
      operationId: listTransactions
      parameters:
        - {name: serviceCode, in: query, schema: {type: string}}
        - {name: transactionId, in: query, schema: {type: string}}
        - {name: status, in: query, schema: {type: string}}
        - {name: receivedFrom, in: query, schema: {type: string, format: date-time}}
        - {name: receivedTo, in: query, schema: {type: string, format: date-time}}
        - {name: page, in: query, schema: {type: integer, minimum: 1, default: 1}}
        - {name: size, in: query, schema: {type: integer, enum: [20, 50, 100], default: 20}}
      responses:
        "200":
          description: Một trang giao dịch
          content:
            application/json:
              schema:
                type: object
                required: [items, page, size, totalItems, totalPages]
                properties:
                  items:
                    type: array
                    items: {$ref: "#/components/schemas/TransactionSummary"}
                  page: {type: integer}
                  size: {type: integer}
                  totalItems: {type: integer, format: int64}
                  totalPages: {type: integer}
        "400": {$ref: "#/components/responses/ValidationFailed"}
  /api/transactions/detail:
    get:
      operationId: getTransaction
      parameters:
        - {name: serviceCode, in: query, required: true, schema: {type: string}, description: "Khớp không phân biệt hoa thường; mã hóa phần trăm"}
        - {name: transactionId, in: query, required: true, schema: {type: string}, description: "Khớp chính xác, phân biệt hoa thường; mã hóa phần trăm"}
      responses:
        "400": {$ref: "#/components/responses/ValidationFailed"}
        "200":
          description: Giao dịch kèm lịch sử callback theo thứ tự nhận (cũ nhất trước)
          content:
            application/json:
              schema:
                type: object
                required: [transaction, callbacks]
                properties:
                  transaction: {$ref: "#/components/schemas/TransactionSummary"}
                  callbacks:
                    type: array
                    items: {$ref: "#/components/schemas/CallbackDetail"}
        "404":
          description: Không có giao dịch (TRANSACTION_NOT_FOUND)
          content:
            application/json:
              schema: {$ref: "#/components/schemas/ErrorResponse"}
  /api/callbacks:
    get:
      operationId: listCallbacks
      parameters:
        - {name: serviceCode, in: query, schema: {type: string}}
        - {name: transactionId, in: query, schema: {type: string}}
        - {name: outcome, in: query, schema: {type: string, enum: [SUCCESS, MAPPING_ERROR, REJECTED]}}
        - {name: rejectionReason, in: query, schema: {$ref: "#/components/schemas/RejectionReason"}, description: "Giá trị ngoài danh sách trả 400 VALIDATION_FAILED"}
        - {name: receivedFrom, in: query, schema: {type: string, format: date-time}}
        - {name: receivedTo, in: query, schema: {type: string, format: date-time}}
        - {name: page, in: query, schema: {type: integer, minimum: 1, default: 1}}
        - {name: size, in: query, schema: {type: integer, enum: [20, 50, 100], default: 20}}
      responses:
        "200":
          description: Một trang callback
          content:
            application/json:
              schema:
                type: object
                required: [items, page, size, totalItems, totalPages]
                properties:
                  items:
                    type: array
                    items: {$ref: "#/components/schemas/CallbackSummary"}
                  page: {type: integer}
                  size: {type: integer}
                  totalItems: {type: integer, format: int64}
                  totalPages: {type: integer}
        "400": {$ref: "#/components/responses/ValidationFailed"}
  /api/callbacks/{recordId}:
    get:
      operationId: getCallback
      parameters:
        - {name: recordId, in: path, required: true, schema: {type: integer, format: int64}}
      responses:
        "200":
          description: Chi tiết một lần nhận
          content:
            application/json:
              schema: {$ref: "#/components/schemas/CallbackDetail"}
        "404":
          description: Không có lần nhận (CALLBACK_NOT_FOUND)
          content:
            application/json:
              schema: {$ref: "#/components/schemas/ErrorResponse"}
components:
  responses:
    ValidationFailed:
      description: Tham số sai (VALIDATION_FAILED)
      content:
        application/json:
          schema: {$ref: "#/components/schemas/ErrorResponse"}
  schemas:
    ErrorResponse:
      type: object
      required: [error, message]
      properties:
        error: {type: string}
        message: {type: string}
        fieldErrors:
          type: array
          items:
            type: object
            required: [field, message]
            properties:
              field: {type: string}
              message: {type: string}
    FieldResult:
      type: object
      properties:
        value: {type: string, nullable: true}
        errorCode:
          type: string
          nullable: true
          enum: [NOT_FOUND, EMPTY, WRONG_TYPE, TOO_LONG, PAYLOAD_NOT_OBJECT, UNPARSEABLE, null]
          description: "Mã lỗi ổn định của đúng trường này; null nếu không lỗi"
        error: {type: string, nullable: true, description: "Câu mô tả lỗi cho người đọc"}
        warning: {type: string, nullable: true}
    RejectionReason:
      type: string
      nullable: true
      enum: [INVALID_API_KEY, MISSING_API_KEY, INVALID_JSON, UNSUPPORTED_CONTENT_TYPE, SERVICE_DISABLED, SERVICE_DELETED, null]
      description: "null khi lần nhận không bị từ chối"
    TransactionSummary:
      type: object
      required: [serviceCode, transactionId, callbackCount, latestReceivedAt, latestHasMappingError]
      properties:
        serviceCode: {type: string}
        serviceDeleted: {type: boolean}
        transactionId: {type: string}
        latestStatus: {type: string, nullable: true, description: "null khi callback gần nhất thiếu status"}
        latestBusinessTimestamp: {type: string, format: date-time, nullable: true}
        latestReceivedAt: {type: string, format: date-time}
        latestCallbackId: {type: integer, format: int64}
        latestHasMappingError: {type: boolean}
        callbackCount: {type: integer, minimum: 1}
    CallbackSummary:
      type: object
      required: [recordId, serviceCode, receivedAt, outcome, httpStatusReturned]
      properties:
        recordId: {type: integer, format: int64}
        serviceCode: {type: string}
        serviceDeleted: {type: boolean}
        receivedAt: {type: string, format: date-time}
        outcome: {type: string, enum: [SUCCESS, MAPPING_ERROR, REJECTED]}
        rejectionReason: {$ref: "#/components/schemas/RejectionReason"}
        httpStatusReturned: {type: integer}
        transactionId: {type: string, nullable: true}
        status: {type: string, nullable: true}
        businessTimestamp: {type: string, format: date-time, nullable: true}
    CallbackDetail:
      allOf:
        - $ref: "#/components/schemas/CallbackSummary"
        - type: object
          properties:
            configVersionNumber: {type: integer, nullable: true, description: "Số phiên bản cấu hình đã dùng"}
            requestHeaders:
              type: object
              additionalProperties: {type: string}
              description: "Header đã che: Authorization, Proxy-Authorization, Cookie và header API key hiện ***"
            payloadJson: {description: "Payload JSON gốc; vắng khi body không phải JSON"}
            payloadRawText: {type: string, nullable: true, description: "Body văn bản gốc khi không phải JSON"}
            mappingFieldResults:
              type: object
              properties:
                transactionId: {$ref: "#/components/schemas/FieldResult"}
                status: {$ref: "#/components/schemas/FieldResult"}
                timestamp: {$ref: "#/components/schemas/FieldResult"}
            responseStatusReturned: {type: integer, nullable: true}
            responseBodyReturned: {description: "Body đã trả; vắng khi lỗi ghi"}
```

## C5 — Bề mặt module AppShell (nội bộ frontend)

Chỉ những thứ ít nhất hai khu vực cùng dùng được đưa vào AppShell (ADR-003). U4 không sửa AppShell mà dùng qua các export dưới đây; muốn thêm thì sửa trong U3 hoặc ghi một thay đổi có chủ đích.

```yaml
shared-schema: AppShellExports
module: src/shell
exports:
  layout:
    - AppLayout
    - SidebarNav
    - "Header: nhãn UAT và múi giờ GMT+7"
    - NarrowWindowBanner
    - SkipLink
  components:
    - DataTable
    - FilterBar
    - Toggle
    - ConfirmDialog
    - SlideOver
    - CopyButton
    - "JsonViewer: chỉ đọc"
    - Toast
  api:
    - "apiClient: fetch có thời gian chờ 30 giây, không tự thử lại, ném lỗi theo ErrorResponse"
  time:
    - "formatDateTime: UTC sang Asia/Ho_Chi_Minh kèm nhãn GMT+7"
rules:
  - Không chứa logic nghiệp vụ
  - Kiểu TypeScript của C2 đến C4 nằm trong src/api/types.ts, viết tay theo openapi.yaml
```

## C6 — Lược đồ cơ sở dữ liệu dùng chung (U1 tới U2)

Bốn bảng do U1 tạo bằng bản chuyển lược đồ đánh số; U2 mở rộng bằng bản chuyển mới, không sửa bản đã áp dụng. Kiểu cột và ràng buộc chi tiết thuộc Functional Design.

```yaml
shared-schema: Database
migration_tool: numbered migrations (V1, V2, ...)
tables:
  services:        {key: service_code (so khớp không phân biệt hoa thường), owner: ServiceCatalog}
  service_config_versions: {key: version_id, unique: [service_code, version_number], owner: ServiceCatalog}
  callbacks:       {key: record_id (tăng dần), refs: [services, service_config_versions], payload: JSONB, owner: CallbackLedger}
  transactions:    {key: [service_code, transaction_id], refs: [callbacks], owner: CallbackLedger}
rules:
  - callbacks không bao giờ bị sửa hay xóa
  - Ghi callbacks và cập nhật transactions trong cùng một giao dịch cơ sở dữ liệu
```

## Quy tắc sở hữu hợp đồng

- Backend là chủ của C1 đến C4 và C6. Bản nguồn là file OpenAPI `docs/api/openapi.yaml` trong `tpp-simulator-app/`, do Code Generation của U1 tạo từ các khối ở đây và cập nhật khi đổi hợp đồng. Cho đến lúc đó, tài liệu này là nguồn.
- Portal là chủ của C5. Kiểu TypeScript của C2 đến C4 viết tay theo `openapi.yaml`, không sinh mã tự động.
- Không đặt phiên bản trong đường dẫn. Thay đổi thêm là tương thích; phía nhận bỏ qua trường lạ.
- Thay đổi phá vỡ (đổi tên hay xóa trường, đổi ý nghĩa, đổi mã HTTP) phải cập nhật file hợp đồng và cả hai kho trong cùng một đợt làm việc, và ghi vào nhật ký thay đổi của `openapi.yaml`.
- Kiểm thử tích hợp của backend dùng đúng hình dạng trong hợp đồng; kiểm thử frontend mô phỏng API theo cùng hình dạng.
- Thời gian chờ và thử lại: backend không tự thử lại; trình duyệt chờ tối đa 30 giây mỗi lời gọi, không tự thử lại; tự cập nhật của màn hình theo dõi thử lại ở nhịp 5 giây kế tiếp.

## Câu hỏi còn mở

| Contract | Question | Blocks |
|---|---|---|
| C1 | Khi không ghi được một request bị từ chối, trả mã từ chối gốc hay 500 | U2 (Functional Design của U2 chốt) |
| C2 | Cách lưu `apiKeySecret` (băm hay mã hóa) | U2 (NFR Requirements chốt) |
| C4 | Chỉ mục và cách ghi đồng thời để đạt NFR1 và NFR2 | U2 (NFR Design chốt) |
| C4 | Giới hạn kích thước phản hồi chi tiết giao dịch (mỗi lần nhận có thể tới 1 MiB payload) (R-10) | Đã chốt ở NFR Design của U1 (Q2 B): không đặt trần ở U1, chấp nhận rủi ro; U2 xem xét thêm API chi tiết từng lần nhận để rút gọn danh sách |

Đã chốt ở Functional Design của U1 (2026-10-20): giới hạn độ dài trường của C2; kiểu cột, ràng buộc và tên bản chuyển lược đồ `V1__init_schema` của C6 (`construction/u1-backend-skeleton/functional-design/entities.md`).

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/units-generation/unit-of-work.md` (Unit, kho git, phân bổ thành phần)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/units-generation/unit-of-work-dependency.md` (cạnh U1 đến U4, điểm tích hợp)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/domain-design/components.md` và `decisions.md` (thực thi, thực thể, ADR-001 đến ADR-008)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/requirements-analysis/requirements.md` (FR1 đến FR12, NFR1 đến NFR7)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-design-questions.md` (Q1 đến Q8 và 7 giả định)

## Assumptions & Open Questions

- Các giả định 1 đến 7 trong `contract-design-questions.md` đã được chấp nhận theo quyền tự quyết bạn giao; ghi lại ở `docs/auto-decisions.md`.
- Các câu hỏi còn mở nằm ở bảng "Câu hỏi còn mở" phía trên, mỗi câu có bước chốt.
