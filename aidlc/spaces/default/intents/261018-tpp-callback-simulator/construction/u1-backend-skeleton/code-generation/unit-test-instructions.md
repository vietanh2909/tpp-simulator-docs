# Hướng dẫn kiểm thử — U1 `u1-backend-skeleton`

> Phương pháp: **test-after** theo từng lớp (Testing Contract của team). Chiến lược kiểm thử: Standard (khoảng 5 đến 8 kiểm thử cho mỗi thành phần cộng kiểm thử tích hợp cho các ranh giới chính), cộng sàn 80% line coverage của scope `mvp`. Mục tiêu bao phủ không bao giờ bị hạ để qua kiểm tra.

## Khung kiểm thử

| Hạng mục | Lựa chọn |
|---|---|
| Ngôn ngữ và công cụ xây dựng | Java 21, Maven 3.9.x (chạy bằng `mvn` từ thư mục gốc `d:\pet-pj-dlc`) |
| Khung kiểm thử | JUnit 5 và Spring Boot Test (`spring-boot-starter-test`) |
| Cơ sở dữ liệu cho kiểm thử tích hợp | PostgreSQL 16 thật qua Testcontainers (`junit-jupiter`, `postgresql`), một container dùng chung cho cả bộ kiểm thử; yêu cầu Docker đang chạy |
| Bao phủ | JaCoCo 0.8.15, luật tối thiểu 80% line coverage ở phase `verify`; báo cáo ở `tpp-simulator-app/target/site/jacoco/` |
| Định dạng | Spotless với google-java-format ở phase `validate`; sửa bằng `mvn -f tpp-simulator-app/pom.xml spotless:apply` |
| Quy ước tên | Mọi lớp kiểm thử đặt tên kết thúc bằng `Test` (kể cả kiểm thử tích hợp) để Surefire chạy chúng |

## Lệnh chạy kiểm thử của Unit này

Mọi lệnh dưới đây giới hạn trong U1 bằng bộ lọc lớp của Surefire (`-Dtest`), chạy từ thư mục gốc của workspace.

**Lệnh chạy được trước bước kiểm thử đầu tiên (kiểm tra khung, Step 1):**

```text
mvn -B -f tpp-simulator-app/pom.xml test -Dtest=TppSimulatorApplicationTests -Dsurefire.failIfNoSpecifiedTests=false
```

**Theo lớp (chạy sau khi viết xong lớp tương ứng):**

| Lớp | Lệnh |
|---|---|
| Lược đồ cơ sở dữ liệu (Step 2) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=SchemaMigrationTest` |
| Cấu hình, làm sạch log, header đã che (Step 3) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=LogSanitizerTest,MaskedHeadersTest,ConfigurationTest` |
| MappingEngine (Step 4) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=MappingEngineTest,TimestampParserTest` |
| ServiceCatalog (Step 5) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=ServiceCatalogTest,ServiceValidationTest` |
| CallbackLedger (Step 6) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=CallbackLedgerTest,TransactionConcurrencyTest,QueryPlanTest` |
| CallbackIngestion (Step 7) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=CallbackIngestionTest,RequestSizeLimitTest` |
| Lớp web (Step 8) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=ServiceApiTest,TransactionApiTest,ErrorHandlingTest` |
| Đầu-cuối, kiến trúc, độ tin cậy (Step 9) | `mvn -B -f tpp-simulator-app/pom.xml test -Dtest=SkeletonEndToEndTest,PackageDependencyTest,ReliabilityTest,SourceRulesTest` |

**Toàn bộ kiểm thử của U1 kèm bao phủ và định dạng (Step 11, lệnh kiểm chứng đã được duyệt):**

```text
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1
```

Tên lớp kiểm thử có thể chỉnh nhẹ khi viết mã; tệp này được cập nhật cho khớp nhưng bộ lọc luôn giới hạn trong các lớp của U1.

## Mục tiêu bao phủ và trọng tâm

- Tối thiểu 80% line coverage cho backend (lớp `TppSimulatorApplication` đã loại trừ trong khung).
- Trọng tâm theo team: ánh xạ (kể cả giữ nguyên văn số), timestamp, ghi nguyên tử và gom giao dịch, đồng thời, che header, mã lỗi của endpoint callback, API đọc. Không viết kiểm thử chỉ lặp lại getter/setter hay chi tiết triển khai.
- Mỗi lớp có ít nhất đường vui và hai tình huống lỗi hoặc biên.

## Ghi chú theo lớp

- **MappingEngine:** kiểm thử đơn vị thuần, không cơ sở dữ liệu, không Spring. Bảng dữ liệu kiểm thử theo AC1.6.x cộng các tình huống biên: số `1.50`, `1e3`, số rất lớn, khóa trùng, gốc không phải object, giá trị rỗng hoặc chỉ khoảng trắng, dài 256 ký tự, ba dạng ISO 8601.
- **Tích hợp (ServiceCatalog, CallbackLedger, CallbackIngestion, lớp web):** dùng chung container PostgreSQL; mỗi kiểm thử dọn dữ liệu của mình bằng mã dịch vụ riêng hoặc xóa bảng trong phần chuẩn bị, không phụ thuộc thứ tự chạy.
- **Đồng thời:** dùng nhiều luồng thật gọi cùng một cặp (`serviceCode`, `transactionId`) và `CountDownLatch` để bắt đầu cùng lúc; kiểm tra `callbackCount` bằng số lần ghi và trạng thái "gần nhất" đúng; chạy lặp nhiều vòng để giảm kết quả may rủi.
- **Đồng hồ:** thay `Clock` bằng đồng hồ cố định để kiểm thử `receivedAt` và thứ tự "gần nhất" xác định.
- **Log:** bắt đầu ra log bằng bộ ghi kiểm thử; khẳng định không có giá trị `Authorization`, `Cookie`, payload hay thông điệp thô của ngoại lệ, không có dòng log giả khi mã dịch vụ chứa xuống dòng.
- **Mô phỏng lỗi cơ sở dữ liệu:** dùng nguồn dữ liệu trỏ vào địa chỉ hỏng hoặc dừng container trong kiểm thử độ tin cậy; không dùng đối tượng giả cho cơ sở dữ liệu ở kiểm thử tích hợp.

## Dữ liệu kiểm thử

- Dịch vụ mẫu `THU_HO` (`$.transId`, `$.code`, `$.time`, response `201 {"ok":true}`) và một dịch vụ có cấu trúc JSON lồng (`$.data.transId`) cho AC1.6.2 và NFR7.1.
- Payload mẫu: `{"transId":"T1","code":"00","time":"2026-10-19T10:00:00+07:00"}`; biến thể thiếu `code`, `code` là số `0` và boolean `true`, `transId` là object hoặc mảng, gốc là mảng `[1,2]`.
- Dữ liệu chỉ là dữ liệu giả lập; không dùng dữ liệu cá nhân thật.
