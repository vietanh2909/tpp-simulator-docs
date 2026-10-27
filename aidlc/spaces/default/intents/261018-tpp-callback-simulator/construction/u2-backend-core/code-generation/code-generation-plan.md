# Kế hoạch Code Generation — U2 `u2-backend-core`

## Summary

- Builds: phần còn lại của backend: xác thực khóa API, ghi lần nhận bị từ chối, bốn định dạng timestamp, API quản lý dịch vụ đầy đủ (sửa, bật/tắt, xóa mềm, phiên bản cấu hình), thử mapping, bộ lọc và danh sách callback, công cụ nạp 100.000 callback, script đo và dịch vụ mẫu
- Touches: `tpp-simulator-app/` (`src/main/java/com/tpp/simulator/...` gồm gói mới `loadtool`, bản chuyển `V2__list_filter_indexes.sql`, `src/test/java/...`, `scripts/`, `docs/api/openapi.yaml`, `docs/samples/`, `README.md`); không đụng `tpp-simulator-portal/`, không đổi `pom.xml`
- Tests: khoảng 250 đến 350 kiểm thử mới (đơn vị cho mapping, timestamp, bộ lọc, công cụ nạp; tích hợp PostgreSQL thật cho xác thực, từ chối, lỗi ghi, sửa đồng thời, danh sách, `EXPLAIN`, quét lộ khóa; kiểm thử tĩnh về gói và cột khóa), cộng toàn bộ kiểm thử của U1 vẫn xanh; ngưỡng bao phủ 80% dòng không hạ

## Phạm vi và nguồn

Phần "U2 làm" của `unit-of-work.md`: story US1.2, US1.3, US1.4, US1.5, US1.7, US1.8, US1.9, US1.11, US1.12, US1.13, US1.14 (AC1.14.2 đến AC1.14.5), US2.11 và phần còn lại của US1.1, US1.3, US1.6, US1.10. Nguồn thiết kế: Functional Design U2 (`functional-spec.md`, `rules.md` BR11.x đến BR22.x, `entities.md`, 50 tiêu chí trong `traceability.json`), NFR Requirements U2 (NFR1.21 đến NFR7.22, các khoảng trống đã chấp nhận), NFR Design U2 (quyết định PD, SD, SC, RD, OD, LC trong `logical-components.md`; Q1 đến Q5 đều A) và hợp đồng `contract-summary.md` / `openapi.yaml`. Mã đặt ở `tpp-simulator-app/` (kho git riêng); chỉ các tệp bàn giao của stage này nằm trong thư mục record.

Phương pháp kiểm thử (Testing Contract của team): **test-after**: với mỗi lớp có thể kiểm thử, viết xong lớp đó rồi viết và chạy kiểm thử của lớp đó trước khi sang lớp tiếp theo. Kiểm thử tích hợp chạy trên PostgreSQL cài sẵn qua `TPP_TEST_DB_URL`, `TPP_TEST_DB_USER`, `TPP_TEST_DB_PASSWORD` (tên database phải chứa `test`; Testcontainers chỉ khi thiếu các biến này, tức CI). **Docker không dùng được trên máy này**: không bước nào được phụ thuộc Docker. Không đổi `pom.xml`, không thêm phụ thuộc hay plugin (LC-09); không hạ ngưỡng JaCoCo 80% hay thêm loại trừ.

## Quyết định triển khai và độ lệch cần bạn xem khi duyệt kế hoạch

1. **Truy cập dữ liệu giữ JDBC tường minh (`JdbcClient`)** như U1; bản chuyển mới chỉ là `V2__list_filter_indexes.sql` với bốn chỉ mục btree (không `pg_trgm`, Q3 A của NFR Requirements).
2. **Một nơi duy nhất bắt lỗi ghi** là `CallbackIngestionService`, trả `IngestionResult` mang `WriteStatus` (`WRITTEN`, `ACCEPTED_WRITE_FAILED`, `REJECTED_RECORD_FAILED`, `SNAPSHOT_READ_FAILED`); controller chỉ ánh xạ sang HTTP; công cụ nạp coi mọi trạng thái khác `WRITTEN` là lỗi đầu tiên (RD-02, LC-03).
3. **Công cụ nạp** nằm trong gói `com.tpp.simulator.loadtool` cùng JAR, chạy bằng `PropertiesLauncher` (có sẵn trong JAR), không script bọc; chỉ ghi vào database có tên kết thúc `_load`.
4. **Script đồng thời** dùng một tiến trình PowerShell với `HttpClient` và chốt xuất phát chung, đo số request đồng thời tối đa (PASS cần ít nhất 25, nếu không là INCONCLUSIVE). Đây là tinh chỉnh công cụ trong cùng quyết định "một script chạy tay" (Q2 C); bạn xác nhận ở cổng duyệt.
5. **Mục mang sang từ các lần review** được đưa thành bước cụ thể: thêm phản hồi 500 cho `GET /api/services` và `GET /api/callbacks/{recordId}` vào `openapi.yaml`; body có byte UTF-8 hỏng là `INVALID_JSON` và khi bị từ chối được lưu ở `payloadRawText` với byte hỏng thay bằng U+FFFD; công cụ nạp không `--append` chỉ xét `LOAD_01` đến `LOAD_<--services>`; ghi chú Minor của PD-08 trong `nfr-design/reviews/review-02.md`.
6. **Các tệp đã duyệt của U1 không bị sửa** ngoài `QueryPlanTest` (chỉ đổi nguồn SQL danh sách giao dịch sang bộ dựng truy vấn, giữ nguyên mọi khẳng định) và `PackageDependencyTest`/`SourceRulesTest` (mở rộng theo LC-02).

## Kế hoạch các bước (test-after theo từng lớp)

- [x] **Step 1: Chuẩn bị chạy kiểm thử và xác nhận nền U1**
  - Xác nhận biến `TPP_TEST_DB_URL`, `TPP_TEST_DB_USER`, `TPP_TEST_DB_PASSWORD` trỏ vào `tpp_simulator_test`; chạy `mvn -B -f tpp-simulator-app/pom.xml verify` trên nền U1 hiện có để chắc toàn bộ 390 kiểm thử xanh trước khi sửa.
  - Thêm hạ tầng kiểm thử dùng chung: `FailureTrigger` (AutoCloseable, trigger theo mã dịch vụ của riêng kiểm thử, tiền tố `test_fail_`), quét dọn trigger/hàm `test_fail_` ở `@BeforeAll`, `@AfterAll`, `@BeforeEach` của lớp cơ sở kiểm thử tích hợp, `LogCapture` (ListAppender), bộ gửi song song.
  - Truy vết: NFR6.21, NFR6.22, NFR2.26, NFR5.22 (RD-04, OD-02).
- [x] **Step 2: Bản chuyển `V2__list_filter_indexes.sql` và kiểm thử lược đồ**
  - Bốn chỉ mục btree theo PD-03: `callbacks (received_at DESC, record_id DESC)`; `callbacks (outcome, received_at DESC, record_id DESC)`; `callbacks (rejection_reason, received_at DESC, record_id DESC) WHERE rejection_reason IS NOT NULL`; `transactions (service_code, latest_received_at DESC, latest_callback_id DESC)`. Không `CREATE EXTENSION`. `V1__init_schema.sql` không đổi (kiểm thử SHA-256 cố định, RD-06).
  - Kiểm thử: Flyway áp dụng V1 rồi V2 trên PostgreSQL thật; bốn chỉ mục tồn tại; V1 không đổi; không có `CREATE EXTENSION` trong thư mục bản chuyển.
  - Truy vết: NFR1.23, NFR6.24, BR19.x.
- [x] **Step 3: Cấu hình và tiện ích dùng chung (`config`, `web` hạ tầng)**
  - `ErrorCode` thêm `UNAUTHORIZED`, `CALLBACK_NOT_FOUND` và mã còn thiếu theo hợp đồng; `ApiErrors` hỗ trợ header phụ `X-Simulator-Record-Failed`; `MaskedHeaders` che thêm header khóa của dịch vụ (đối chiếu tên header trong ảnh dịch vụ lúc nhận, BR16.1); `RequestSizeLimitFilter` có bảng chính sách theo đường dẫn: `/callbacks/**` trần 1.048.576 byte trả 413, `POST /api/mapping-tests` trần 8 MiB trả 400 (PD-07).
  - Kiểm thử: che header khóa không phân biệt hoa thường; chính sách kích thước theo đường dẫn; mã lỗi mới ánh xạ đúng mã HTTP.
  - Truy vết: BR14.x, BR16.x, NFR3.21 đến NFR3.24, SD-01.
- [x] **Step 4: MappingEngine mở rộng: bốn định dạng timestamp**
  - `mapping`: `TimestampPatterns` (`compile`, `validate` bằng phép thử định dạng, `DateTimeFormatterBuilder` + `ERA` mặc định + `ResolverStyle.STRICT` + `Locale.ENGLISH`, RD-08), `UnixTimestampParser` (giây và mili giây chính xác, chuỗi số hoặc số JSON, phần thập phân đến micro giây, kiểm tra khoảng 1970 đến 2100 trước khi khai triển số mũ), `MappingEngine`/`MappingConfig` nhận `timestampFormat`, `timestampPattern`; cú pháp đường dẫn mapping `$.a.b` (đoạn `[A-Za-z0-9_-]+`, tối đa 10 đoạn) kiểm tra ở `ServiceValidator` (Step 5).
  - Kiểm thử đơn vị (không cơ sở dữ liệu): AC1.7.x, `1760850000`, mili giây, `"1760850000."` và `".5"` là `UNPARSEABLE`, `1e999999999` không khai triển, ngày 30/2, tháng 13, giờ 24, mẫu thiếu giờ bị từ chối khi lưu, tên tháng tiếng Anh, offset trong mẫu, giờ chuyển mùa (BR17.4), mẫu `yyyy-MM-dd HH:mm:ss` chạy được.
  - Truy vết: BR11.3, BR17.1 đến BR17.4, AC1.7.x, NFR1.28.
- [x] **Step 5: ServiceCatalog đầy đủ và kiểm thử**
  - `catalog`: `ServiceValidator` đầy đủ (BR11.1 đến BR11.8, BR12.3: tên header khóa, khóa 1 đến 256 ký tự ASCII in được, không trắng đầu cuối, đường dẫn mapping, mẫu timestamp, `responseBody`), `ServiceConfigComparator` (BR12.4), `ServiceRuntimeSnapshot` (thay `ServiceRuntimeConfig`, che khóa trong `toString`), `ServiceUpdateRequest`, `ServiceEnabledRequest`, `ServiceView` (`apiKeyConfigured` bằng `IS NOT NULL`, không trả khóa); `ServiceCatalog`: tạo, sửa, bật/tắt, xóa mềm, liệt kê (`includeDeleted`), đọc; mỗi thao tác sửa/bật-tắt/xóa là một giao dịch có khóa dòng `FOR NO KEY UPDATE` trên dòng `services` là câu đầu tiên, các bước (1) đến (4) của BR12.6 chạy trên dòng đã khóa; `lock_timeout` 5 giây; phiên bản cấu hình chỉ tăng khi mapping, định dạng thời gian, múi giờ hoặc response đổi (ADR-004); dịch vụ đã xóa không sửa được, mã đã xóa không dùng lại.
  - Kiểm thử tích hợp: mọi lỗi trường gom cùng lúc, phiên bản tăng liên tục khi sửa song song (30 luồng, không trùng không hụt), sửa không bao giờ ghi `enabled`/`deleted`, chuyển `API_KEY` sang `NONE` xóa khóa, `API_KEY` để trống ô khóa giữ khóa cũ, sửa dịch vụ vừa xóa mềm là 404, nguyên tử khi lỗi giữa chừng (`FailureTrigger`), ca chính tách "khóa dòng không chặn kiểm tra khóa ngoại" khỏi đói pool và ca phụ về đói pool theo SC-01.
  - Truy vết: BR11.x, BR12.x, BR13.x, NFR2.24, NFR2.30, NFR3.29, AC1.13.x.
- [x] **Step 6: CallbackLedger: ghi lần từ chối, danh sách và chi tiết**
  - `ledger`: `appendRejected` (giao dịch riêng, độc lập, BR15.5), `ListQueryBuilder`, `TransactionFilter`, `CallbackFilter`, `TimeBounds` (ngữ nghĩa thời gian theo giây: giá trị không có phần thập phân là cả giây, `receivedTo` tính tới hết giây; kẹp cận; bỏ số 0 đầu của `page`/`size`; mọi `DateTimeException` thành 400 đúng trường, PD-04, PD-05), `listTransactions(filter)`, `listCallbacks(filter)`, `findCallback(recordId)`, `CallbackListItem`, `CallbackDetail`; thay hằng `CallbackLedger.LIST_TRANSACTIONS` bằng bộ dựng truy vấn (bản không lọc sinh đúng câu cũ).
  - Kiểm thử tích hợp: từng bộ lọc và tổ hợp, trang 20/50/100, `size` sai là 400, giá trị rỗng coi như vắng, ví dụ biên thời gian (nhận lúc 11:00:00.400 được tính khi `receivedTo=11:00:00`), chống tiêm qua bộ lọc, `ListQueryPlanTest` (lớp độc lập, khoảng 30.000 callback và 7.500 giao dịch, `ANALYZE`, không `Seq Scan` ở ba nhóm truy vấn chọn lọc; chuỗi chứa được miễn), cập nhật `QueryPlanTest` của U1 chỉ ở dòng lấy SQL danh sách giao dịch.
  - Truy vết: BR15.x, BR19.x, AC1.14.2 đến AC1.14.5, NFR1.23, NFR3.27.
- [x] **Step 7: CallbackIngestion: xác thực, từ chối, trạng thái ghi**
  - `ingestion`: `ApiKeyVerifier` (so khớp thời gian không đổi, tên header không phân biệt hoa thường, W17), `RejectedPayloadClassifier` (quyết định `payloadJson` hay `payloadRawText` một lần trước khi ghi; điều kiện xác định trước: chuỗi thoát U+0000, nửa cặp thay thế, số ngoài miền; body JSON `null` lưu là giá trị JSON null; **byte UTF-8 hỏng là `INVALID_JSON` và khi bị từ chối lưu ở `payloadRawText` với byte hỏng thay bằng U+FFFD**), `IngestionResult`/`WriteStatus`/`RejectionReason`, `CallbackIngestionService` với `receive` và `receiveForLoad` dùng chung `process`, thứ tự kiểm tra đầy đủ (413, mã chưa từng có 404, đã xóa 404, tắt 503, khóa API 401, Content-Type 415, JSON 400), ghi lần từ chối cho mọi trường hợp trừ khi mã chưa từng có và 413 theo FR3.8/FR3.9, ba khối bắt lỗi ghi (RD-02).
  - Kiểm thử tích hợp: từng lý do từ chối ghi đúng bản ghi và đúng response, header khóa đúng/sai/thiếu/sai tên, so khớp không phân biệt hoa thường của tên header, mapping lỗi vẫn trả response cấu hình, lỗi ghi lần từ chối trả mã gốc kèm `X-Simulator-Record-Failed` và một dòng ERROR (`FailureTrigger` trên `callbacks`), lỗi ghi callback được chấp nhận trả 500, đọc ảnh dịch vụ lỗi trả 500 không header (pool hỏng), `IngestionWriteStatusTest` cho cả hai lối vào.
  - Truy vết: BR14.x, BR15.x, BR16.x, BR17.x, AC1.2.x đến AC1.5.x, AC1.8.x, AC1.9.x, NFR2.26.
- [x] **Step 8: Lớp web: controller và xử lý lỗi**
  - `web`: `CallbackController` chỉ ánh xạ `IngestionResult` sang HTTP và ghi đúng một dòng nhật ký qua `CallbackAccessLog` (dòng ERROR thay dòng INFO khi lỗi ghi, OD-01); `ServiceController` thêm `GET` danh sách, `PUT` sửa, `PUT .../enabled`, `DELETE`; `TransactionController` nhận bộ lọc; `CallbackQueryController` (`GET /api/callbacks`, `GET /api/callbacks/{recordId}`), `ListParams`; `MappingTestController` + `MappingTester` + `SampleJsonDiagnostics` cho `POST /api/mapping-tests` (không chạm cơ sở dữ liệu, thông điệp lỗi mẫu từ từ vựng cố định, không lặp nội dung mẫu); `ApiExceptionAdvice` thêm mã `CALLBACK_NOT_FOUND`, 415, 500 cho các thao tác mới và không ghi dòng thứ hai cho endpoint callback.
  - Kiểm thử API: hình dạng khớp hợp đồng, thứ tự kiểm tra 415 hoặc thân hỏng rồi 404 rồi lỗi trường cho `PUT` sửa và `PUT /enabled`, không bao giờ trả khóa API ở bất kỳ phản hồi nào, thử mapping không ghi gì vào database, mọi mã lỗi có `X-Simulator-Error`.
  - Truy vết: BR12.x, BR13.x, BR14.10, BR18.x, BR19.x, NFR1.28, NFR5.21, NFR5.22.
- [x] **Step 9: Công cụ nạp 100.000 callback (`loadtool`)**
  - Gói `com.tpp.simulator.loadtool`: `LoadToolMain` (một dòng), `LoadCommand`, `LoadBootstrap`, `LoadToolContext` (không chú thích Spring, `WebApplicationType.NONE`, chỉ bean cần), `LoadParameters` (`--callbacks`, `--seed`, `--days`, `--services`, `--append`, `--database`, tự phân tích, không thư viện), `DatabaseNameGuard` (chỉ tên kết thúc `_load`, mặc định `tpp_simulator_load`), `LoadRunner` (`validateTarget`, `run`), `LoadDataGenerator`, `LoadServiceDefinitions` (bảng gán cố định theo số thứ tự: `LOAD_01` NONE + ISO_8601, `LOAD_02` API_KEY + PATTERN, `LOAD_03` NONE + UNIX_MILLIS, lặp lại; biến thể ảnh `SERVICE_DISABLED`, `SERVICE_DELETED`, `API_KEY`), `LoadReport`, `LoadRefusedException`. Không `--append` thì chỉ xét `LOAD_01` đến `LOAD_<--services>`. Chỉ nhóm lần nhận được chấp nhận được gom giao dịch; mọi `WriteStatus` khác `WRITTEN` dừng ngay, mã thoát 1, báo số bằng `COUNT(*)`.
  - Kiểm thử: `DatabaseNameGuardTest`, `LoadCommandTest` (lệnh bị từ chối không mở kết nối), `LoadRunnerSmallRunTest` (500 callback, hai dịch vụ gồm một dịch vụ `API_KEY`, gọi `LoadRunner.run` trực tiếp trên `tpp_simulator_test` với dịch vụ `LOAD_` được dọn trước và sau), `LoadRunnerWriteFailureTest` và `LoadRunnerStopsOnFirstFailureTest` (ép lỗi qua `CallbackIngestionService` thật, cả lần chấp nhận và lần từ chối), `LoadReportTest`, `LoadToolContextTest`.
  - Truy vết: BR22.1 đến BR22.5, NFR1.26, NFR1.27, NFR2.27, NFR2.29, NFR3.25, NFR3.26, NFR5.24.
- [x] **Step 10: Script chạy tay, dịch vụ mẫu và tài sản mẫu**
  - `tpp-simulator-app/scripts/`: `measure-list-latency.ps1` (một kịch bản: không lọc, trang 1, `size=20`, 200 lần tuần tự, p95 dưới 1000 ms; ghi rõ các kịch bản không được đo), `check-concurrency.ps1` (một tiến trình, `HttpClient` + chốt xuất phát chung, hai kịch bản BR20.1 và BR20.2, đo `maxInFlight`, PASS/FAIL/INCONCLUSIVE, mã thoát 0/1/2), `create-sample-services.ps1` và `create-sample-services.sh`; PowerShell tương thích Windows PowerShell 5.1, UTF-8 có BOM; bash LF. `docs/samples/` có ba dịch vụ mẫu `THU_HO`, `CHI_HO` (khóa giả công khai `sample-key-chi-ho`), `BIEN_DONG_SO_DU`, mỗi dịch vụ hai payload (hợp lệ và thiếu/sai trường). Ứng dụng không tự tạo dịch vụ mẫu lúc khởi động.
  - Kiểm thử: `ScriptsTest` (BOM, cú pháp bị cấm, LF), `SampleServicesTest`, `StartupDoesNotSeedTest`.
  - Truy vết: AC2.11.x, NFR1.21, NFR2.21, NFR2.22, NFR7.21, NFR7.22.
- [x] **Step 11: Kiểm thử tĩnh và quét bảo mật, nhật ký**
  - `ApiKeyColumnRulesTest` (chỉ ghi cột khóa bằng `INSERT`/`UPDATE`, `IS NOT NULL` được phép, chọn giá trị khóa chỉ trong truy vấn ảnh dịch vụ của đường nhận), `SourceRulesTest` mở rộng, `PackageDependencyTest` mở rộng (thêm `loadtool`; không gói nào phụ thuộc `loadtool`; `loadtool` không có chú thích Spring; `receiveForLoad` chỉ ở `ingestion`/`loadtool`; chỉ `CallbackIngestionService` bắt lỗi ghi; `MappingTestController` không có bean dữ liệu), `SecretLeakScanTest` (nhóm bí mật quét bốn nguồn; nhóm payload mẫu chỉ quét nhật ký, đầu ra công cụ nạp và phản hồi lỗi ở tình huống ép lỗi ghi, gồm ép lỗi ghi khi tạo/sửa dịch vụ `API_KEY`), `CallbackLoggingTest`, `DatabaseDownLoggingTest` (đếm đúng 20 dòng ERROR của logger endpoint callback, gửi song song hoặc rút ngắn thời gian chờ chỉ trong kiểm thử).
  - Truy vết: NFR3.21 đến NFR3.29, NFR5.21, NFR5.22, NFR6.24.
- [x] **Step 12: OpenAPI và README**
  - `docs/api/openapi.yaml` cập nhật mọi thay đổi hợp đồng ở mục 5 của `functional-spec.md` (header `X-Simulator-Record-Failed`, mã lỗi mới, API quản lý dịch vụ đầy đủ, `POST /api/mapping-tests`, `GET /api/callbacks`, `GET /api/callbacks/{recordId}`) **và các phản hồi 500 `INTERNAL_ERROR` còn thiếu của `GET /api/services` và `GET /api/callbacks/{recordId}`**, kèm nhật ký thay đổi. `README.md` (tiếng Việt) bảy mục của LC-07: ba dịch vụ mẫu và cURL, lệnh chạy công cụ nạp và quy ước `_load`, script đo độ trễ (kèm phần không được đo), script đồng thời, rủi ro đầy đĩa và cách dọn bằng xóa database (không dựa Docker), điều kiện `pg_trgm` nếu có, điều kiện môi trường (Windows PowerShell 5.1, `curl.exe`, `CREATEDB` chỉ cần cho lệnh nạp thật), ghi chú nhật ký và giới hạn payload không lưu được.
  - Truy vết: NFR5.25, NFR5.26, NFR3.10, AC2.11.x.
- [x] **Step 13: Chạy kiểm chứng đầy đủ và dọn**
  - Chạy `scripts/verify.ps1` ở gốc workspace (lệnh kiểm chứng đã duyệt) với biến `TPP_TEST_DB_*`: Spotless (`mvn spotless:apply` khi cần), mọi kiểm thử của U1 và U2, ngưỡng JaCoCo 80% đạt, frontend lint/test/build của portal vẫn xanh; sửa cho tới khi `VERIFY OK`, không hạ ngưỡng. Kiểm tra `pom.xml` không đổi.
  - Chạy tay một lần mỗi script trên backend thật khi có thể; nếu không chạy được ở môi trường của worker thì ghi rõ trong `code-summary.md` là chưa chạy.
  - Truy vết: NFR6.1 đến NFR6.6, NFR6.21 đến NFR6.23.
- [x] **Step 14: Tài liệu bàn giao của Code Generation**
  - Viết `code-summary.md`, `source-manifest.json` (mọi đường dẫn nguồn do Unit này tạo hoặc sửa, tương đối với `tpp-simulator-app/`, kể cả `compose.yaml` nếu đổi), `traceability.json` (AC, NFRx.y và BRx.y trỏ tới một tệp thật trong kho). Không sửa các tệp bàn giao của U1.
  - Truy vết: toàn bộ.

## Truy vết story đến bước

| Story | Tiêu chí | Bước |
|---|---|---|
| US1.2 | AC1.2.x | Step 3, Step 7, Step 8 |
| US1.3 | AC1.3.x | Step 7, Step 8 |
| US1.4 | AC1.4.x | Step 3, Step 7, Step 8 |
| US1.5 | AC1.5.x | Step 6, Step 7 |
| US1.7 | AC1.7.x | Step 4, Step 7 |
| US1.8 | AC1.8.x | Step 7 |
| US1.9 | AC1.9.x | Step 7, Step 8 |
| US1.11 | AC1.11.x | Step 5, Step 10 |
| US1.12 | AC1.12.x | Step 3, Step 11 |
| US1.13 | AC1.13.x | Step 5, Step 8 |
| US1.14 | AC1.14.2 đến AC1.14.5 | Step 2, Step 6, Step 8 |
| US2.11 | AC2.11.x | Step 9, Step 10, Step 12 |

## Ngoài phạm vi của kế hoạch này

Mọi giao diện (U3, U4); đo lọc chuỗi chứa và trang sâu (khoảng trống đã chấp nhận ở NFR Requirements Q1 C); kiểm thử đồng thời tự động cho 50 callback (Q2 C: một script chạy tay); giới hạn tốc độ và trần số bản ghi (Q4 A: không có); `pg_trgm` (Q3 A: chỉ khi phép đo yêu cầu); CI mới (đã có `ci.yml`, xem lại ở CI Pipeline); đổi quyết định đã chốt của U1.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "Viết xong từng lớp có thể kiểm thử, sau đó viết và chạy kiểm thử của lớp đó trước khi sang lớp tiếp theo.",
  "scope": "mvp",
  "test_strategy": "standard",
  "project_type": "greenfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Methodology evidence**: người dùng chọn Q3-A; khớp mặc định của org và brief mục 9.\n- **Ordering**: Viết xong từng lớp có thể kiểm thử, sau đó viết và chạy kiểm thử của lớp đó trước khi sang lớp tiếp theo.\n- Backend: JUnit 5 + Spring Boot Test; kiểm thử tích hợp chạy PostgreSQL thật qua Testcontainers (vì dùng JSONB).\n- Frontend: Vitest + React Testing Library cho các phần có logic (form cấu hình, bộ lọc, polling).\n- Trọng tâm theo brief: mapping, timestamp, xác thực, lịch sử, xử lý đồng thời và API tích hợp; không viết test chỉ lặp lại getter/setter hoặc chi tiết triển khai.\n- Coverage: tối thiểu 80% line coverage cho backend, đo bằng JaCoCo (Q4); frontend không đặt ngưỡng cứng.\n- CI: GitHub Actions build và chạy test backend và frontend khi đẩy code lên GitHub; test phải xanh trước khi gộp vào `main` (Q4)."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Meet an 80% line-coverage floor.",
      "Run the selected tests in CI before merge."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:4bfdbdb64312e7034ae5ed64b00b2e6b8b898211e456ce9dca996fe5e6afdfce",
  "contract_sha256": "sha256:c40748ae7947098622610ee74b89f8cfde88b947373a91ca77f1733dba8f1532"
}
```
