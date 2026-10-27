# Hướng dẫn kiểm thử — U2 `u2-backend-core`

> Phương pháp: **test-after** theo từng lớp (Testing Contract của team). Chiến lược kiểm thử: Standard (khoảng 5 đến 8 kiểm thử cho mỗi thành phần cộng kiểm thử tích hợp cho các ranh giới chính), cộng sàn 80% line coverage của scope `mvp`. Mục tiêu bao phủ không bao giờ bị hạ để qua kiểm tra. Toàn bộ kiểm thử của U1 (390 kiểm thử) vẫn phải xanh.

## Khung kiểm thử

| Hạng mục | Lựa chọn |
|---|---|
| Ngôn ngữ và công cụ xây dựng | Java 21, Maven 3.9.x (chạy bằng `mvn` từ thư mục gốc `d:\pet-pj-dlc`) |
| Khung kiểm thử | JUnit 5 và Spring Boot Test (`spring-boot-starter-test`); `java.net.http.HttpClient` cho kiểm thử HTTP song song |
| Cơ sở dữ liệu cho kiểm thử tích hợp | PostgreSQL thật. **Máy này không dùng được Docker**: đặt biến `TPP_TEST_DB_URL` (ví dụ `jdbc:postgresql://localhost:5432/tpp_simulator_test`), `TPP_TEST_DB_USER`, `TPP_TEST_DB_PASSWORD`; tên database phải chứa `test` vì kiểm thử xóa sạch dữ liệu. Khi thiếu các biến này thì dùng Testcontainers (chỉ CI GitHub Actions). Mật khẩu chỉ nằm trong biến môi trường của tiến trình, không ghi vào tệp nào. |
| Bao phủ | JaCoCo 0.8.15, luật tối thiểu 80% line coverage ở phase `verify`; mã công cụ nạp **được tính** vào ngưỡng; không thêm loại trừ |
| Định dạng | Spotless với google-java-format đã ghim ở phase `validate`; sửa bằng `mvn -f tpp-simulator-app/pom.xml spotless:apply` |
| Quy ước tên | Mọi lớp kiểm thử đặt tên kết thúc bằng `Test` để Surefire chạy chúng |
| Không đổi `pom.xml` | Không thêm phụ thuộc hay plugin (LC-09) |

## Lệnh chạy kiểm thử của Unit này

Mọi lệnh dưới đây giới hạn trong U2 bằng bộ lọc lớp của Surefire (`-Dtest`), chạy từ thư mục gốc của workspace, sau khi đặt ba biến `TPP_TEST_DB_*` ở trên.

**Lệnh chạy được trước bước kiểm thử đầu tiên (Step 1; hạ tầng kiểm thử dùng chung):**

```text
mvn -B -f tpp-simulator-app/pom.xml test -Dtest=FailureTriggerTest,SchemaMigrationTest -Dsurefire.failIfNoSpecifiedTests=false
```

**Theo lớp (chạy sau khi viết xong lớp tương ứng):**

| Lớp | Lệnh |
|---|---|
| Lược đồ V2 và chỉ mục (Step 2) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=SchemaMigrationTest` |
| Cấu hình, header đã che, chính sách kích thước (Step 3) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=MaskedHeadersTest,RequestSizeLimitTest,ErrorCodeMappingTest` |
| Timestamp và MappingEngine (Step 4) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=TimestampPatternsTest,UnixTimestampParserTest,MappingEngineTest` |
| ServiceCatalog (Step 5) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=ServiceValidatorTest,ServiceCatalogTest,ServiceEditTest,ServiceEditConcurrencyTest,ServiceEditAtomicityTest` |
| CallbackLedger và danh sách (Step 6) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=CallbackLedgerTest,ListFilterTest,ListPagingTest,ListInjectionTest,ListQueryPlanTest,QueryPlanTest` |
| CallbackIngestion (Step 7) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=CallbackOrderingTest,ApiKeyAuthTest,ApiKeyVerifierTest,RejectedReceiptTest,RejectedPayloadClassifierTest,RejectionWriteFailureTest,IngestionWriteStatusTest,CallbackIngestionTest` |
| Lớp web (Step 8) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=ServiceApiTest,TransactionApiTest,CallbackQueryApiTest,MappingTestApiTest,ErrorHandlingTest` |
| Công cụ nạp (Step 9) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=DatabaseNameGuardTest,LoadCommandTest,LoadRunnerSmallRunTest,LoadRunnerWriteFailureTest,LoadRunnerStopsOnFirstFailureTest,LoadReportTest,LoadToolContextTest` |
| Script và dịch vụ mẫu (Step 10) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=ScriptsTest,SampleServicesTest,StartupDoesNotSeedTest` |
| Tĩnh, quét bảo mật, nhật ký (Step 11) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=ApiKeyColumnRulesTest,SourceRulesTest,PackageDependencyTest,SecretLeakScanTest,CallbackLoggingTest,DatabaseDownLoggingTest` |

**Kiểm thử cũ của U1 phải còn xanh (chạy ở Step 13 cùng toàn bộ):** `TransactionConcurrencyTest`, `ReliabilityTest`, `ConfigurationTest`, `SkeletonEndToEndTest`, `StartupFailureTest`, v.v.

**Toàn bộ kiểm thử kèm bao phủ và định dạng (Step 13, lệnh kiểm chứng đã được duyệt):**

```text
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1
```

Đặt ba biến `TPP_TEST_DB_*` trong chính phiên chạy lệnh này. Không chạy hai lần `verify.ps1` hay `mvn` cùng lúc trên cùng database (sẽ gây deadlock và lỗi khóa ngoại giả).

Tên lớp kiểm thử có thể chỉnh nhẹ khi viết mã; tệp này được cập nhật cho khớp nhưng bộ lọc luôn giới hạn trong các lớp của U1 và U2.

## Mục tiêu bao phủ và trọng tâm

- Tối thiểu 80% line coverage cho backend (lớp `TppSimulatorApplication` đã loại trừ trong khung); mã `loadtool` được tính, phần cần database `_load` thật nằm trong `LoadBootstrap` nhỏ.
- Trọng tâm theo team: mapping và timestamp, xác thực khóa API, lịch sử (lần nhận bị từ chối), xử lý đồng thời khi sửa dịch vụ, API tích hợp. Không viết kiểm thử chỉ lặp lại getter/setter hay chi tiết triển khai.
- Mỗi lớp có ít nhất đường vui và hai tình huống lỗi hoặc biên.

## Ghi chú theo lớp

- **Hạ tầng ép lỗi (`FailureTrigger`):** tạo trigger chỉ chạy cho mã dịch vụ riêng của kiểm thử (`WHEN (NEW.service_code = '<mã>')`), qua `AutoCloseable` + `try-with-resources`; lớp cơ sở kiểm thử tích hợp quét và xóa mọi trigger/hàm tiền tố `test_fail_` ở `@BeforeAll`, `@AfterAll`, `@BeforeEach`. Dùng cho: lần từ chối không ghi được (401 + `X-Simulator-Record-Failed`, một dòng ERROR), callback được chấp nhận không ghi được (500), ghi lỗi khi tạo/sửa dịch vụ `API_KEY` (quét không lộ khóa), công cụ nạp lỗi giữa chừng (qua `CallbackIngestionService` thật).
- **Pool hỏng toàn bộ:** chỉ dùng cho tình huống đọc ảnh dịch vụ lỗi (500 không header, một dòng ERROR); đếm đúng 20 dòng ERROR của logger endpoint callback, loại dòng của Hikari/Spring/JDBC, gửi 20 request song song hoặc rút ngắn thời gian chờ chỉ trong kiểm thử.
- **Timestamp:** kiểm thử đơn vị thuần, không cơ sở dữ liệu; có ca mẫu thiếu giờ bị từ chối khi lưu, `1e999999999`, `"1760850000."`, `".5"`, 30/2, tháng 13, giờ 24, offset trong mẫu, chuyển mùa.
- **Danh sách và bộ lọc:** dữ liệu nhiều giá trị `outcome`/`rejectionReason`/mã dịch vụ; ca biên thời gian theo giây (nhận lúc 11:00:00.400 được tính khi `receivedTo=2026-10-19T11:00:00Z`; lúc 11:00:01.000 không); giá trị rỗng coi như vắng; `page`/`size` có số 0 đầu; năm cực lớn với offset biên là 400, không phải 500. `ListQueryPlanTest` là lớp độc lập (khoảng 30.000 callback và 7.500 giao dịch, `ANALYZE`, không `Seq Scan` ở ba nhóm truy vấn chọn lọc; bộ lọc chuỗi chứa được miễn).
- **Sửa dịch vụ đồng thời:** 30 luồng sửa cùng dịch vụ cho số phiên bản liên tục, không trùng, không hụt; ca chính tách "khóa dòng không chặn kiểm tra khóa ngoại" khỏi đói pool bằng số thao tác chờ nhỏ hơn kích thước pool; ca phụ kiểm chứng hành vi đói pool.
- **Công cụ nạp:** `LoadRunnerSmallRunTest` gọi `LoadRunner.run` trực tiếp trên `tpp_simulator_test` (500 callback, hai dịch vụ gồm một dịch vụ `API_KEY`), dọn dịch vụ `LOAD_` trước và sau; lệnh thật của công cụ không bao giờ chạm `tpp_simulator_test` (kiểm thử `DatabaseNameGuardTest`, `LoadCommandTest`). Không cần database `_load` hay quyền `CREATEDB` cho `verify.ps1`.
- **Script:** `ScriptsTest` đọc tệp (BOM UTF-8 cho `.ps1`, LF cho `.sh`, không cú pháp PowerShell 7 như `??`, `?.`, `-Parallel`). Không chạy script đo độ trễ và script đồng thời trong bộ kiểm thử thường hay CI; chúng chạy tay ở Build and Test.
- **Kiểm thử tĩnh:** đọc `import` và tên, không thêm thư viện; không gói nào ngoài `loadtool` được nhắc `com.tpp.simulator.loadtool` trong `src/main`; tệp `loadtool` không có chú thích Spring (`@Component`, `@Service`, `@Repository`, `@Configuration`, `@Controller`, `@RestController`, `@SpringBootApplication`).
- **Đồng hồ:** thay `Clock` bằng đồng hồ cố định để kiểm thử `receivedAt` và thứ tự "gần nhất" xác định.
- **Log:** bắt đầu ra log bằng `LogCapture`; khẳng định mỗi request callback đúng một dòng, không có giá trị khóa, `Authorization`, `Cookie`, payload hay thông điệp thô của ngoại lệ.

## Dữ liệu kiểm thử

- Ba dịch vụ mẫu: `THU_HO` (NONE, ISO_8601, response `200 {"code":"00"}`), `CHI_HO` (API_KEY, header `X-Api-Key`, khóa giả công khai `sample-key-chi-ho`, mẫu `yyyy-MM-dd HH:mm:ss`, múi giờ `Asia/Ho_Chi_Minh`, response `200 {"status":"OK"}`), `BIEN_DONG_SO_DU` (NONE, UNIX_MILLIS, response `202 {"received":true}`), mỗi dịch vụ kèm hai payload (hợp lệ, và một thiếu/sai trường). `UNIX_SECONDS` được phủ bằng kiểm thử tích hợp.
- Dịch vụ `LOAD_01` đến `LOAD_0n` theo bảng gán cố định của công cụ nạp cho kiểm thử nạp nhỏ.
- Khóa API dùng trong kiểm thử là giá trị giả cố định; không dùng dữ liệu cá nhân thật; mật khẩu database không bao giờ ghi vào tệp.
