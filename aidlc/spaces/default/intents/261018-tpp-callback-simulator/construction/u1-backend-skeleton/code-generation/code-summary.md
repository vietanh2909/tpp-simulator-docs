# Tóm tắt Code Generation - U1 `u1-backend-skeleton`

> Phương pháp: test-after theo từng lớp (Testing Contract của team), chiến lược Standard, sàn 80% line coverage.
> Mã nằm ở `tpp-simulator-app/` (kho git riêng, chưa commit: conductor lo git). Không đụng `tpp-simulator-portal/`.

## Kết quả kiểm chứng

| Hạng mục | Kết quả |
|---|---|
| Backend `mvn verify` (Spotless, 374 kiểm thử, JaCoCo) | **BUILD SUCCESS**, 374 kiểm thử, 0 lỗi, 0 bỏ qua |
| JaCoCo line coverage (luật `check` 0.80, không hạ, không thêm loại trừ) | **95,66%** (750 dòng được phủ, 34 dòng bỏ sót); branch 89,66% |
| `scripts/verify.ps1` | **`VERIFY OK`, `EXIT=0`** (chạy lại sau khi sửa script: bước frontend chỉ bỏ qua script chưa định nghĩa trong `package.json`; backend 374 kiểm thử đạt trên PostgreSQL thật `tpp_simulator_test` của người dùng, JaCoCo `All coverage checks have been met`; frontend lint, 45 kiểm thử, build đạt) |
| Chạy thật bằng cURL (`mvn spring-boot:run` + PostgreSQL) | Xem mục "Chạy thật bằng cURL" |

Cơ sở dữ liệu kiểm thử: PostgreSQL 16.14 **thật**. Máy này không dùng được Docker nên kiểm thử chạy trên một cụm PostgreSQL
tạm (cổng 54329, database `tpp_simulator_test`, auth trust, chỉ `127.0.0.1`) dựng bằng `initdb` của bản cài sẵn, qua biến
môi trường `TPP_TEST_DB_URL`. Khi không có biến này, lớp cơ sở `TestDatabase` dùng Testcontainers (PostgreSQL 16) như CI
GitHub Actions. Không dùng đối tượng giả cho cơ sở dữ liệu. Sau đó toàn bộ 374 kiểm thử cũng đã chạy lại và đạt trên database `tpp_simulator_test` của người dùng (PostgreSQL cài sẵn trên máy, `localhost:5432`) qua các biến `TPP_TEST_DB_*`; mật khẩu chỉ nằm trong biến môi trường, không ghi vào tệp nào.

### Số kiểm thử theo lớp (tổng 374)

| Lớp kiểm thử | Số | Loại |
|---|---|---|
| `MappingEngineTest` | 63 | đơn vị thuần (AC1.6.x, số nguyên văn, timestamp, khóa trùng) |
| `CallbackIngestionTest` | 63 | tích hợp HTTP (AC1.1.x, thứ tự kiểm tra, header, log, lỗi ghi, jsonb) |
| `TransactionApiTest` | 37 | tích hợp HTTP (AC1.14.1, AC1.1.3, phân trang, chi tiết, mã hóa phần trăm) |
| `ServiceApiTest` | 31 | tích hợp HTTP (tạo/đọc dịch vụ, lỗi trường, thân hỏng, 409) |
| `ServiceValidatorTest` | 30 | đơn vị |
| `PayloadDecoderTest` | 25 | đơn vị |
| `TransactionConcurrencyTest` | 21 | tích hợp, nhiều luồng thật (AC1.10.x đồng thời) |
| `CallbackLedgerTest` | 17 | tích hợp (AC1.10.1 đến AC1.10.5, đảo thứ tự, rollback, che header đã lưu) |
| `ErrorHandlingTest` | 15 | tích hợp (404/405/500, header, không CORS, không lộ nội bộ) |
| `ConfigurationTest` | 12 | tích hợp (loopback, health, actuator 404, log UTC) |
| `SchemaMigrationTest` | 9 | tích hợp (Flyway V1, ràng buộc, chỉ mục) |
| `SourceRulesTest` | 8 | quét mã nguồn (Callback bất biến, không xóa vật lý, không JPA, không ghép SQL) |
| `ServiceCatalogTest` | 8 | tích hợp (tạo trùng đồng thời, rollback) |
| `RequestSizeLimitTest` | 7 | tích hợp (1.048.576 byte, chunked, 413 trước mọi kiểm tra) |
| `PackageDependencyTest` | 5 | đọc import, phụ thuộc một chiều |
| `LogSanitizerTest` | 5 | đơn vị |
| `MaskedHeadersTest` | 5 | đơn vị |
| `QueryPlanTest` | 4 | tích hợp, `EXPLAIN` trên 40.000 dòng đã `ANALYZE` |
| `DbErrorsTest` | 3 | đơn vị |
| `ReliabilityTest` | 3 | tích hợp, proxy TCP: DB mất rồi trở lại, tự phục hồi |
| `SkeletonEndToEndTest` | 1 | đầu-cuối `RANDOM_PORT`: THU_HO -> `/callbacks/THU_HO` và `/callbacks/thu_ho` -> danh sách -> chi tiết |
| `StartupFailureTest` | 1 | khởi động thất bại rõ ràng khi không có DB, không lộ mật khẩu |
| `TppSimulatorApplicationSmokeTest` | 1 | khung có sẵn |

Tiêu chí U1 đã chứng minh bằng kiểm thử: AC1.1.1 đến 1.1.4, AC1.6.1 đến 1.6.5 (AC1.6.4 phần `transactionId` và AC1.6.5 đọc
thẳng bảng `callbacks`), AC1.10.1 đến 1.10.5, AC1.14.1.

## Chạy thật bằng cURL

Đã chạy một lần: `mvn spring-boot:run` (cổng 18080, `SPRING_DATASOURCE_*` trỏ vào PostgreSQL tạm) rồi gọi `curl.exe` đúng các lệnh trong README với
`docs/samples/*.json`. Lần này cơ sở dữ liệu còn dịch vụ `THU_HO` từ các kiểm thử trước nên bước tạo dịch vụ trả `409 SERVICE_CODE_DUPLICATE` (kèm
`X-Simulator-Error`); đường tạo `201` đã được kiểm thử tự động (`ServiceApiTest`, `SkeletonEndToEndTest`). Các bước còn lại đúng kỳ vọng:

- `POST /callbacks/THU_HO` và `POST /callbacks/thu_ho` (`charset=UTF-8`): `HTTP 201`, body `{"ok":true}`, `Content-Type: application/json;charset=UTF-8`, không có `X-Simulator-Error`.
- `GET /api/transactions`: một dòng `THU_HO`/`T1`, `latestStatus` `00`, `latestBusinessTimestamp` `2026-10-19T03:00:00Z`, `callbackCount` 2.
- `GET /api/transactions/detail` (tham số mã hóa phần trăm): hai lần nhận, `Authorization` hiện `***`, `configVersionNumber` 1, `mappingFieldResults` và `responseBodyReturned`.
- `POST /callbacks/NOPE`: `404 SERVICE_NOT_FOUND` kèm `X-Simulator-Error: SERVICE_NOT_FOUND`.

Lần chạy lại trên cơ sở dữ liệu sạch (để thấy `201` ở bước tạo) chưa hoàn tất do terminal chậm; không ảnh hưởng kết luận vì đã có kiểm thử tương đương.

## Tệp tạo hoặc sửa (đường dẫn tương đối với `tpp-simulator-app/`)

- **Cấu hình, build:** `pom.xml` (sửa), `src/main/resources/application.yml` (sửa), `src/main/resources/db/migration/V1__init_schema.sql`
  (mới; xóa `.gitkeep`), `README.md` (viết lại bằng tiếng Việt), `.github/workflows/ci.yml` (giữ nguyên: đã chạy `mvn -B verify`).
- **`config`:** `ErrorCode`, `FieldError`, `ApiException`, `LogSanitizer`, `MaskedHeaders`, `ClockConfig`, `DbErrors`, `JacksonConfig`.
- **`mapping`:** `MappingEngine`, `MappingConfig`, `MappingResult`, `FieldResult`, `MappingErrorCode`, `MappingOutcome`.
- **`catalog`:** `ServiceCatalog`, `ServiceValidator`, `ServiceCreateRequest`, `ServiceView`, `ServiceRuntimeConfig`.
- **`ledger`:** `CallbackLedger`, `NewCallback`, `TransactionSummary`, `TransactionDetail`, `CallbackDetail`, `PageResult`.
- **`ingestion`:** `CallbackIngestionService`, `PayloadDecoder`, `ConfiguredResponse`.
- **`web`:** `CallbackController`, `ServiceController`, `TransactionController`, `RequestSizeLimitFilter`, `ApiErrors`,
  `ApiExceptionAdvice`, `ContainerErrorController`, `ErrorBody`.
- **Gốc kho và tệp có sẵn:** mọi đường dẫn trong `source-manifest.json` tương đối với kho `tpp-simulator-app/`; `traceability.json` dùng đường dẫn tính từ gốc workspace (`tpp-simulator-app/...`; riêng NFR6.1 trỏ `scripts/verify.ps1` ở gốc workspace, ngoài kho ứng dụng, do conductor sửa). `compose.yaml` được sửa trong lượt này (cổng PostgreSQL chỉ loopback) và đã khai báo trong manifest; `.gitignore`, `.gitattributes`, `.mvn/jvm.config`, `.github/workflows/ci.yml` là tệp có sẵn từ khung ban đầu (chưa commit), đơn vị này không sửa nội dung.
- **Tài liệu:** `docs/api/openapi.yaml` (từ C1 đến C4 đã sửa, có nhật ký thay đổi), `docs/samples/thu-ho-service.json`,
  `docs/samples/thu-ho-callback.json`.
- **Kiểm thử:** 23 lớp kiểm thử và lớp hỗ trợ `support/` (`AbstractIntegrationTest`, `TestDatabase`, `TestClock`, `TestClockConfig`, `TcpProxy`).

## Quyết định chính

- Truy cập dữ liệu bằng SQL tường minh qua `JdbcClient`, không thực thể JPA; `spring.jpa.open-in-view=false` giữ nguyên. Giao dịch
  ở dịch vụ ứng dụng (`ServiceCatalog.create`, `CallbackIngestionService`), `CallbackLedger.append` yêu cầu giao dịch đã có.
- Ghi callback: một câu `INSERT ... ON CONFLICT (service_code, transaction_id) DO UPDATE` duy nhất, tăng `callback_count` và thay
  TẤT CẢ cột `latest_*` cùng nhau bằng `CASE` theo so sánh cặp `(received_at, record_id)`; READ COMMITTED đủ (kiểm chứng bằng 20 luồng
  x 5 vòng, 15 vòng hai callback đầu tiên cùng lúc, và kịch bản hoàn tất đảo thứ tự).
- `MappingEngine` đọc dòng bằng `JsonParser` của Jackson, không dựng cây; số lấy từ văn bản token; khóa trùng: lần cuối thắng (xóa mọi
  giá trị đã lấy dưới khóa bị ghi đè).
- `RequestSizeLimitFilter` đứng đầu chuỗi, đọc tối đa 1.048.576 + 1 byte (kể cả chunked) rồi bọc request bằng bản sao body; dùng chung
  `ApiErrors` với bộ xử lý lỗi nên 413 có cùng dạng và header `X-Simulator-Error`. `receivedAt` được gán ở bộ lọc, ngay lúc bắt đầu.
- Phụ thuộc gói một chiều có kiểm thử; `config` là gói dùng chung không phụ thuộc gói nào. Response đã cấu hình trả bằng `byte[]` UTF-8,
  không bao giờ có `X-Simulator-Error`.
- `JacksonConfig` + `accept-float-as-int=false` + `allow-coercion-of-scalars=false`: thân tạo dịch vụ sai kiểu (kể cả số cho trường chuỗi)
  luôn là 400 `VALIDATION_FAILED`. `spring.servlet.multipart.enabled=false` để `multipart/*` ra 400 `UNSUPPORTED_CONTENT_TYPE` thay vì 500.
- Log: UTC tường minh, tên bộ ghi đầy đủ; mọi giá trị bên gọi qua `LogSanitizer`; lỗi DB chỉ ghi lớp ngoại lệ và SQLSTATE.

## Độ lệch so với kế hoạch hoặc thiết kế (kèm lý do)

1. **`google-java-format` ghim 1.36.1 thay 1.37.0** trong `pom.xml`: 1.37.0 làm Spotless 3.10.4 lỗi `InvocationTargetException` trên JDK 21.0.11
   (đã thử cả với `--add-exports` của `.mvn/jvm.config`); 1.36.1 chạy ổn, cùng kiểu GOOGLE. Phiên bản vẫn ghim cố định (NFR6.6).
2. **`spring-boot-starter-data-jpa` đổi thành `spring-boot-starter-jdbc`**: không dùng thực thể JPA (quyết định 1 của kế hoạch, phương án kế hoạch đã nêu);
   bớt Hibernate không dùng.
3. **Ba mã lỗi bổ sung** `NOT_FOUND` (404), `METHOD_NOT_ALLOWED` (405), `UNSUPPORTED_MEDIA_TYPE` (415) ngoài bảng của `contract-summary.md`, để 404/405
   mức container và Content-Type sai ở API quản lý cũng ra `ErrorResponse` kèm header, đúng yêu cầu của brief. Đã ghi vào `openapi.yaml`.
4. **Biến môi trường kiểm thử `TPP_TEST_DB_URL`, `TPP_TEST_DB_USER`, `TPP_TEST_DB_PASSWORD`** (mới): chạy kiểm thử không cần Docker; tên DB bắt buộc chứa
   "test" vì kiểm thử xóa sạch dữ liệu. Không có biến thì Testcontainers (CI). README mô tả cách dựng PostgreSQL tạm.
5. Kiểm thử dựng thêm so với danh sách của `unit-test-instructions.md`: `PayloadDecoderTest`, `DbErrorsTest`, `StartupFailureTest`, `TcpProxy`/`TestClock` hỗ trợ.
   Tên lớp web đặt dưới `com.tpp.simulator.web`, ingestion dưới `ingestion`, v.v.
6. `Proxy-Authorization` không kiểm qua HTTP được vì JDK `HttpClient` không gửi header này; việc che được kiểm bằng `MaskedHeadersTest` và
   `CallbackLedgerTest` (header đã lưu).
7. **Biến cấu hình DB dùng `SPRING_DATASOURCE_URL/USERNAME/PASSWORD`** (chuẩn Spring Boot) thay cho `TPP_DB_URL`, `TPP_DB_USER`, `TPP_DB_PASSWORD` nêu trong `security-design.md` (NFR3.6); mật khẩu vẫn chỉ nằm ở biến môi trường. README ghi các tên này.
8. NFR1.1, NFR1.3, NFR1.6 trong `traceability.json` đặt `Deferred` sang `build-and-test` (đo tay hiệu năng; trần kích thước chi tiết giao dịch hoãn theo quyết định NFR Design Q2), không còn đánh `OK`.
9. `traceability.json` trỏ mỗi ID tới MỘT tệp chính hiện thực; bằng chứng kiểm thử nằm ở bảng trên.

## Khoảng trống đã biết

- **`scripts/verify.ps1` đã được sửa** (bởi conductor, ngoài `tpp-simulator-app/`): bước frontend (`lint`, `format:check`, `test`, `build`) chỉ bỏ qua khi script đó chưa được
  định nghĩa trong `tpp-simulator-portal/package.json` (portal chưa có `format:check`, việc của U3). Câu lệnh Construction Verification Command không đổi; chạy lại cho `VERIFY OK`.
  `npm ci` đã tạo `tpp-simulator-portal/node_modules`.
- `ContainerErrorController` chỉ được phủ nhánh 404 (3/16 dòng): các nhánh 400/405/413/415 mức container chưa có kiểm thử riêng (405 và 404 của MVC đã qua `ApiExceptionAdvice`).
- Kiểm thử độ tin cậy mô phỏng DB mất bằng proxy TCP, không dừng container PostgreSQL thật; khởi động thất bại được kiểm bằng ngoại lệ gốc của `SpringApplication.run`,
  chưa đo mã thoát tiến trình thực.
- NFR1.1 (p95 dưới 200 ms) và NFR1.3 (100.000 callback) là đo tay ở Build and Test, chưa đo ở đây; `QueryPlanTest` chỉ chứng minh truy vấn khóa dùng chỉ mục.
- Chi tiết giao dịch không có trần kích thước; jsonb từ chối `\u0000` và số vượt miền `numeric` (500 `INTERNAL_ERROR`): đã ghi trong README, có kiểm thử cho jsonb.
- Spring Boot 3.5.16 hết hỗ trợ mã nguồn mở (rủi ro đã chấp nhận, NFR3.9).
