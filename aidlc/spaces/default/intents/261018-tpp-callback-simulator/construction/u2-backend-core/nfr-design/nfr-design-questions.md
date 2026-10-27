# NFR Design — U2 `u2-backend-core` — Câu hỏi làm rõ

> Phạm vi: chọn cách thiết kế (làm thế nào) cho các yêu cầu phi chức năng đã duyệt của U2: tuần tự hóa sửa dịch vụ, ép lỗi ghi khi kiểm thử, chỉ mục cho bộ lọc, lối vào của công cụ nạp và cách phân tích timestamp. Dữ liệu vào: `performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `observability-requirements.md`, `tech-stack-decisions.md` của U2 (NFR Requirements), `functional-spec.md` và `rules.md` của U2 (BR11.x đến BR22.x), NFR Design của U1 và mã U1 trong `tpp-simulator-app/src/main/java`.
>
> Đã chốt, không hỏi lại:
> - Công nghệ: Java 21, Spring Boot 3.5.16, PostgreSQL 16 với JSONB, `JdbcClient`, Flyway, một backend một database, chỉ lắng nghe `127.0.0.1`; không thêm phụ thuộc hay plugin (`NFR6.21`); không dùng Docker trên máy này.
> - Ghi dữ liệu: một câu `INSERT ... ON CONFLICT` với so sánh cặp (`receivedAt`, `recordId`) (U1 NFR Design Q1 A); không trần kích thước chi tiết giao dịch (U1 NFR Design Q2 B); đọc hết rồi trả kết nối về pool; pool 10 kết nối, chờ 5 giây; không bộ nhớ đệm cấu hình dịch vụ.
> - Đo và kiểm chứng: NFR1 chỉ đo một kịch bản (Q1 C); NFR2 chỉ bằng một script chạy tay `check-concurrency.ps1` một tiến trình, `maxInFlight` từ 25 (Q2 C); không `pg_trgm` mặc định (Q3 A); không giới hạn tốc độ và không trần số bản ghi (Q4 A); công cụ nạp chỉ ghi vào database có đuôi `_load` (Q5 A); bốn script mới nằm trong `tpp-simulator-app/scripts/`.
> - Từ Functional Design: ngữ nghĩa lọc, sắp xếp và phân trang cố định (BR19.x, không đổi để tăng tốc, vẫn `page`/`size`); so sánh khóa thời gian không đổi (BR14.4); một dòng nhật ký cho mỗi request callback (BR14.10); ghi lần nhận bị từ chối trong giao dịch riêng, thử một lần (BR15.5, BR15.6); công cụ nạp chỉ gom các lần nhận được chấp nhận và chỉ khi đo thấy quá 30 phút (`NFR1.26`).
>
> Năm câu dưới đây là những chỗ còn mở thật sự và cần bạn quyết; phần còn lại tôi đề xuất sẵn ở "Giả định đề xuất". Tôi không hỏi lại yêu cầu hay chức năng nào.

## Q1. Dùng cơ chế nào để tuần tự hóa sửa, bật/tắt và xóa mềm của cùng một dịch vụ? (BR12.6, NFR2.24)

Lý do hỏi: số phiên bản phải liên tục, không trùng, không hụt khi nhiều thao tác trên cùng một dịch vụ chạy song song, mà không làm chậm việc nhận callback đang ghi vào chính dịch vụ đó.

A. (Recommended) Khóa dòng PostgreSQL mức `FOR NO KEY UPDATE` trên dòng `services` của dịch vụ, là câu đầu tiên trong giao dịch (`SELECT ... WHERE lower(service_code) = lower(:code) FOR NO KEY UPDATE`); bốn bước (1) đến (4) của BR12.6 chạy trên dòng đã khóa. Mức này không chặn kiểm tra khóa ngoại của callback đang ghi (`FOR KEY SHARE`) nên nhận callback không phải chờ; dịch vụ khác không chờ nhau; khóa tự nhả khi giao dịch kết thúc. Ràng buộc duy nhất (`service_code`, `version_number`) là lưới an toàn. Lý do chọn: ít mã nhất, nằm đúng trong dữ liệu và không đụng callback
B. Khóa tư vấn theo giao dịch `pg_advisory_xact_lock(hashtextextended(lower(code), 0))`: không đụng dòng nên cũng không chặn callback. Nhược: khóa theo băm nên hai dịch vụ hiếm khi trùng băm sẽ chờ nhau nhầm, và khóa nằm ngoài dữ liệu nên khó thấy khi gỡ lỗi
C. Khóa dòng `FOR UPDATE` thường (mạnh nhất, đơn giản nhất): chặn cả kiểm tra khóa ngoại nên callback tới dịch vụ đang sửa phải chờ hết giao dịch sửa. Chấp nhận được ở quy mô này nhưng không cần thiết khi có A
D. Khóa lạc quan: thêm cột số phiên bản dòng (bản chuyển `V2`) và vòng thử lại khi cập nhật bị từ chối. Trái BR12.6 (chạy trọn bên trong phần tuần tự trên trạng thái mới nhất, "người lưu sau thắng, không phát hiện xung đột") vì phải xử lý xung đột và thử lại
X. Other (please specify)

[Answer]: A

## Q2. Thiết kế "trigger ép lỗi" chỉ dùng cho kiểm thử thế nào để không bao giờ làm hỏng các kiểm thử khác? (NFR2.26, NFR2.30, NFR3.21)

Lý do hỏi: một trigger còn sót lại trên database kiểm thử dùng chung (`tpp_simulator_test`) làm mọi kiểm thử ghi sau đó lỗi, và tôi cần chọn cách chặn việc đó ngay từ thiết kế.

A. (Recommended) Trigger có phạm vi hẹp và tự dọn nhiều lớp: mỗi trigger chỉ kích hoạt cho mã dịch vụ duy nhất của kiểm thử đó (`WHEN (NEW.service_code = '<mã kiểm thử>')`) nên nếu sót lại cũng không chạm dữ liệu của kiểm thử khác; được tạo qua một lớp hỗ trợ `AutoCloseable` (dùng `try-with-resources`); lớp cha của kiểm thử tích hợp quét rồi xóa mọi trigger và hàm có tiền tố `test_fail_` ở `@BeforeAll` và `@AfterAll`; các kiểm thử ép lỗi không chạy song song. Thông điệp `RAISE EXCEPTION ... NEW::text` của `NFR3.21` giữ nguyên. Lý do chọn: sót cũng vô hại, và cùng cách dùng được cho bước chạy tay bằng `psql` trên database phát triển
B. Trigger áp cho mọi dòng, chỉ xóa trong `finally`/`@AfterEach`. Đơn giản nhất, nhưng nếu JVM bị dừng giữa chừng thì trigger còn lại làm hỏng mọi kiểm thử ghi cho tới khi bạn tự tay xóa
C. Database riêng cho các kiểm thử ép lỗi (ví dụ `tpp_simulator_test_fail`). Cô lập hoàn toàn, nhưng cần quyền `CREATEDB` mà `tech-stack-decisions.md` đã chốt là không bắt buộc cho bộ kiểm thử thường
D. Không dùng trigger: bọc `DataSource` của kiểm thử bằng lớp ném `SQLException` ở câu `INSERT` được chỉ định. Không đụng database dùng chung, nhưng không dùng được cho bước chạy tay bằng `psql` và không tái hiện thông điệp lỗi thô chứa nội dung dòng mà `NFR3.21` cố ý dùng để kiểm tra rò rỉ
X. Other (please specify)

[Answer]: A

## Q3. Bộ chỉ mục `V2` nào phục vụ bộ lọc, sắp xếp và phân trang ở 100.000 callback? (NFR1.23, BR19.x)

Lý do hỏi: `NFR1.23` đòi không quét tuần tự bảng `callbacks` ở ba nhóm truy vấn chọn lọc (chuỗi chứa được miễn); cần bộ chỉ mục nhỏ nhất vẫn đạt, giữ `OFFSET`/`LIMIT` và ngữ nghĩa BR19.x.

A. (Recommended) Bốn chỉ mục btree thường trong `V2__list_filter_indexes.sql`: `callbacks (received_at DESC, record_id DESC)` cho danh sách không lọc; `callbacks (outcome, received_at DESC, record_id DESC)`; `callbacks (rejection_reason, received_at DESC, record_id DESC) WHERE rejection_reason IS NOT NULL`; `transactions (service_code, latest_received_at DESC, latest_callback_id DESC)`. Lọc `serviceCode` kèm khoảng thời gian của callback dùng `ix_callbacks_service_received` có sẵn ở `V1` (quét ngược). Lý do chọn: phủ `NFR1.23` (a) và (b), planner chọn chỉ mục dù giá trị lọc là tham số, ghi thêm không đáng kể ở khoảng 5 giao dịch/giây
B. Như A nhưng dùng chỉ mục một phần cho giá trị hiếm (`WHERE outcome = 'REJECTED'` và `WHERE outcome = 'MAPPING_ERROR'`). Nhỏ hơn, nhưng planner dễ không chọn chỉ mục một phần khi giá trị là tham số, và lọc riêng `rejectionReason` không chứng minh được `outcome = 'REJECTED'`
C. Chỉ hai chỉ mục sắp xếp (`callbacks (received_at DESC, record_id DESC)` và `transactions (service_code, latest_received_at DESC, latest_callback_id DESC)`), để planner tự quyết cho `outcome`/`rejectionReason`. Ít chỉ mục nhất nhưng khó đạt khẳng định `NFR1.23` (b) với giá trị hiếm
D. A cộng chỉ mục ghép cho lọc đồng thời (`callbacks (service_code, outcome, received_at DESC, record_id DESC)`). Phủ chắc hơn nhưng tốn ghi và dung lượng, trong khi chỉ có một kịch bản được đo (Q1 C) nên không có số liệu ủng hộ
X. Other (please specify)

[Answer]: A

## Q4. Công cụ nạp 100.000 callback: mã đặt ở đâu và chạy bằng cách nào? (BR22.1, NFR6.21)

Lý do hỏi: BR22.1 đòi một lệnh riêng, không bao giờ chạy lúc khởi động, đi qua logic nhận callback nhưng không qua HTTP, và không được thêm phụ thuộc hay plugin.

A. (Recommended) Gói `com.tpp.simulator.loadtool` trong cùng module và cùng JAR. Lớp `LoadToolMain` có `main` riêng, tự dựng một Spring context không có máy chủ web (`WebApplicationType.NONE`) chỉ nạp các bean cần (catalog, mapping, ingestion, ledger, Flyway, DataSource). Lõi `LoadRunner` (kiểm tra tham số và tên database, sinh dữ liệu, ghi) là lớp thường để kiểm thử gọi trực tiếp (`NFR6.22`). Chạy bằng một lệnh trong README: `java -cp <jar> -Dloader.main=com.tpp.simulator.loadtool.LoadToolMain org.springframework.boot.loader.launch.PropertiesLauncher --callbacks=100000 ...`. Ứng dụng chính không có đường nào gọi `LoadToolMain`. Lý do chọn: không thể chạy nhầm lúc khởi động, không thêm gì vào `pom.xml`
B. Như A và thêm script bọc `scripts/load-data.ps1` (kiểm tra có JAR, truyền tham số, in lệnh). Tiện hơn khi gõ, nhưng thêm script thứ năm ngoài bốn script đã chốt và thêm một thứ phải kiểm thử, giữ đồng bộ
C. Profile Spring `loadtool` trong chính `TppSimulatorApplication` kèm `CommandLineRunner` rồi thoát. Một điểm vào duy nhất, nhưng đặt nhầm profile hoặc quên tắt web sẽ vừa mở cổng vừa nạp dữ liệu, mong manh so với "không bao giờ chạy lúc khởi động"
D. Chạy qua Maven (`mvn spring-boot:run -Dspring-boot.run.main-class=...`). Không cần JAR và không thêm plugin, nhưng chậm hơn, buộc có Maven khi đo và biên dịch lại làm nhiễu thời gian nạp
X. Other (please specify)

[Answer]: A

## Q5. Phân tích chặt timestamp `PATTERN` bằng `java.time` theo chiến lược nào? (BR11.3, BR17.3)

Lý do hỏi: BR17.3 đòi phân tích chặt (30/2, tháng 13, giờ 24 là UNPARSEABLE, không tự điều chỉnh) nhưng mẫu quen thuộc `yyyy-MM-dd HH:mm:ss` vẫn phải chạy, mà `ResolverStyle.STRICT` từ chối `yyyy` (năm theo kỷ nguyên) khi thiếu kỷ nguyên.

A. (Recommended) `DateTimeFormatterBuilder().appendPattern(p).parseDefaulting(ChronoField.ERA, 1).toFormatter(Locale.ENGLISH).withResolverStyle(ResolverStyle.STRICT)` rồi `parseBest` sang thời điểm có múi giờ hoặc `LocalDateTime` (dùng `defaultTimeZone` khi mẫu không có múi giờ). Việc kiểm tra "đủ năm, tháng, ngày, giờ, phút" của BR11.3 bằng phép thử định dạng: định dạng một thời điểm mẫu cố định rồi phân tích lại; không ra `LocalDateTime` (kể cả mẫu 12 giờ thiếu sáng/chiều) thì từ chối. Một bộ biên dịch dùng chung cho lúc lưu hoặc thử mapping và lúc nhận callback nên hai nơi không thể lệch nhau. Lý do chọn: giữ nguyên mẫu người dùng viết, ít mã nhất, không tự viết bộ tách mẫu
B. Tự viết bộ tách mẫu nhận biết dấu nháy, đổi `y` thành `u` (năm tiên đoán) rồi dùng `STRICT`; kiểm tra đủ trường bằng tập chữ cái của mẫu. Không phụ thuộc mẹo kỷ nguyên, nhưng phải viết và kiểm thử bộ tách (dấu nháy, `''`, chữ cái lặp), nhiều mã hơn
C. `ResolverStyle.SMART` rồi phát hiện ngày bị kẹp (31/4 thành 30/4) bằng lần phân tích thứ hai. Giữ nguyên mẫu, nhưng hai lần phân tích mỗi giá trị, dễ sót ca (SMART nhận giờ `24:00` là 00:00 ngày kế) và trái "không tự điều chỉnh" nên không khuyên dùng
X. Other (please specify)

[Answer]: A

## Giả định đề xuất

Các điểm dưới đây tôi tự quyết theo mặc định hợp lý; bạn chỉ đọc và sửa nếu không đồng ý. Mỗi mục có thẻ nguồn: `[desc]` mô tả ban đầu và brief, `[scope]` phạm vi đã duyệt của workflow (Functional Design và NFR Requirements của U2, thiết kế U1), `[assumption]` suy luận của tôi, `[Q<n>]` câu trả lời ở câu hỏi tương ứng trong tệp này, `[memory:M<n>]` quy tắc nhớ của team/project (liệt kê ở mục Sources). Mỗi mục ghi NFR hoặc BR mà nó cụ thể hóa.

**Sửa dịch vụ và đồng thời (NFR2)**

1. **Khóa dịch vụ nằm trong ServiceCatalog:** một phương thức nội bộ `lockService(code)` là câu đầu tiên của mọi giao dịch sửa, bật/tắt, xóa mềm; kiểm tra 415, thân hỏng và kiểu trường (BR13.2, BR13.6) chạy trước, ngoài giao dịch. Giao dịch đặt `SET LOCAL lock_timeout = '5s'`; hết hạn thì 500 `INTERNAL_ERROR` kèm `X-Simulator-Error`, khớp thời gian chờ pool. Số phiên bản mới là `current_version_number + 1` đọc sau khi đã khóa. `[assumption]` BR12.5, BR12.6; `[Q1]`
2. **Đường nhận callback không khóa:** truy vấn ảnh dịch vụ của đường nhận callback vẫn là một truy vấn đọc thường như U1, không `FOR ...`, nên không chờ thao tác sửa. Callback chạy trong lúc sửa dùng ảnh đã ghi bền trước đó hoặc sau đó, không bao giờ ảnh ghi dở. `[scope]` U1 NFR1.1; `[Q1]`
3. **Ghi lần nhận bị từ chối:** dùng một `TransactionTemplate` riêng cho mỗi lần ghi (không gộp với bất kỳ giao dịch nào), thử một lần; lỗi thì bắt, thêm hai header `X-Simulator-Record-Failed: true` và `X-Simulator-Error`, trả mã từ chối gốc. Không vòng thử lại, không hàng đợi. `[scope]` BR15.5, BR15.6; `NFR2.26`

**Hiệu năng và truy vấn danh sách (NFR1)**

4. **Dựng truy vấn danh sách:** một lớp dựng truy vấn trong CallbackLedger ghép các đoạn SQL cố định cho từng bộ lọc có mặt, mọi giá trị là tham số có tên; không nối chuỗi giá trị vào SQL. `[scope]` `NFR3.27`
5. **Chuỗi chứa:** dùng `position(lower(:v) in lower(cột)) > 0` thay cho `LIKE`, nên `%`, `_`, `\` tự động là ký tự thường (BR19.1) mà không cần thoát ký tự. Bộ lọc này không dùng chỉ mục (Q3 A của NFR Requirements). `[assumption]` BR19.1, `NFR3.27`
6. **Bộ lọc thời gian:** phân tích `receivedFrom`/`receivedTo` bằng `OffsetDateTime`, đổi sang UTC, cắt về micro giây; không có phần thập phân thì cận dưới là đầu giây, cận trên là `.999999`; truyền vào truy vấn như tham số `timestamptz` với so sánh `>=` và `<=`. `[scope]` BR19.1, BR19.3
7. **Trang và tổng số:** một truy vấn đếm và một truy vấn trang chạy trong cùng một giao dịch chỉ-đọc `REPEATABLE_READ` (như W5 của U1) để `totalItems` khớp `items`; giữ `OFFSET`/`LIMIT`, trang vượt `totalPages` trả `items` rỗng. Thứ tự luôn kết thúc bằng khóa duy nhất (`record_id`, hoặc `latest_callback_id`) nên ổn định. `[scope]` BR19.4; U1 NFR Design
8. **Kiểm thử `EXPLAIN` (NFR1.23):** kiểm thử tạo khoảng 30.000 dòng `callbacks` trực tiếp bằng `INSERT ... SELECT generate_series(...)` (chỉ trong kiểm thử, dùng mã dịch vụ riêng, khoảng 1% dòng `REJECTED` với một lý do hiếm), chạy `ANALYZE`, khẳng định kế hoạch không có `Seq Scan` trên `callbacks` ở các truy vấn (a), (b), (c) của `NFR1.23`, rồi dọn dữ liệu. Không đổi `enable_seqscan`. `[assumption]` `NFR1.23`
9. **Công cụ nạp tuần tự, một luồng, một giao dịch cho mỗi lần nhận:** đi qua đúng lối vào nội bộ của logic nhận callback (mỗi lần nhận được chấp nhận một `TransactionTemplate` như ứng dụng thật, mỗi lần nhận bị từ chối một giao dịch riêng), không gom giao dịch theo mặc định. Ước lượng khoảng 5 đến 10 phút cho 100.000 lần nhận, trong kỳ vọng 15 phút. Nếu đo thấy quá 30 phút thì áp `NFR1.26`: chỉ vòng lặp ghi của công cụ được đổi để gom các lần nhận được chấp nhận, không đụng quy tắc nhận callback. Pool của công cụ chỉ cần 2 kết nối. `[assumption]` `NFR1.26`, BR15.5, BR22.1
10. **Sinh dữ liệu lặp lại được:** dùng `java.util.SplittableRandom(seed)`; seed mặc định là hằng số cố định; thời điểm nhận rải đều trong `--days` ngày tính từ lúc chạy (BR22.4); sau khi ghi xong chạy `ANALYZE` và in dòng tổng kết. `[scope]` BR22.3, BR22.4, `NFR1.27`

**Công cụ nạp (Q4 và an toàn)**

11. **Thứ tự khởi chạy của công cụ:** (1) phân tích tham số; (2) kiểm tra tên database `_load` bằng hàm kiểm tra tên (trước mọi kết nối, `NFR3.25`); (3) mở một kết nối JDBC ngắn tới chính database của ứng dụng đã cấu hình (chắc chắn tồn tại và role đã được phép nối) để kiểm tra và thử `CREATE DATABASE "<tên>"` với tên đã qua kiểm tra ký tự; (4) mới khởi động Spring context với URL trỏ database đích, Flyway chạy lược đồ; (5) nạp. Không bao giờ `DROP`. `[assumption]` BR22.2, `NFR3.25`, `NFR3.26`
12. **Đầu ra công cụ:** lớp `LoadReport` in tiến độ mỗi 10.000 lần nhận và một dòng tổng kết (số Callback, số giao dịch, thời gian, callback/giây) qua đầu ra chuẩn; ngưỡng tiến độ truyền từ ngoài để kiểm thử đơn vị. Không dòng nhật ký theo từng request vì dòng BR14.10 do tầng web ghi (giả định 15), còn công cụ đi vào ngay dịch vụ nhận callback. Mức nhật ký của gói `com.tpp.simulator` trong công cụ đặt `WARN`. `[scope]` BR22.5, `NFR5.24`
13. **Phụ thuộc gói:** gói `loadtool` được phép phụ thuộc `ingestion`, `catalog`, `ledger`, `mapping`, `config`; không gói nào phụ thuộc `loadtool`. Kiểm thử đọc lệnh `import` của U1 được mở rộng cho quy tắc này. `[scope]` ADR-001; U1 NFR Design

**Bảo mật và quan sát**

14. **So sánh khóa API:** tên header khớp không phân biệt hoa thường bằng API header của servlet; giá trị so bằng `MessageDigest.isEqual` trên byte UTF-8 của khóa đã lưu và khóa nhận được (thư viện chuẩn, thời gian không đổi theo nội dung). Giá trị khóa chỉ nằm trong một bản ghi dữ liệu bất biến có `toString` che khóa, không đi vào nhật ký hay thông điệp lỗi. `[scope]` BR14.4, `NFR3.23`
15. **Một dòng nhật ký mỗi request:** một lớp nhỏ ở ranh giới controller của endpoint callback dựng và ghi đúng một dòng ở khối `finally`; mức INFO khi không có lỗi ghi, ERROR khi có (thay thế, không đứng cạnh). Dạng `key=value` theo thứ tự cố định: mã dịch vụ đã làm sạch, `recordId`, `outcome` hoặc `rejectionReason`, mã HTTP, và khi lỗi thì lớp ngoại lệ cùng SQLSTATE; không bao giờ ghi thông điệp ngoại lệ, header, body hay khóa. Kiểm thử bắt nhật ký bằng appender trong bộ nhớ. `[scope]` BR14.10, `NFR3.24`, `NFR5.21`
16. **Che header:** dùng kiểu "header đã che" của U1 (ADR-007); tập nhạy cảm gồm `Authorization`, `Proxy-Authorization`, `Cookie` và tên header khóa API của dịch vụ (không phân biệt hoa thường), áp cho cả lần nhận bị từ chối. Tầng lưu chỉ nhận kiểu đã che. `[scope]` `NFR3.22`, ADR-007
17. **Phân loại truy vấn chạm cột khóa:** chỉ ba loại ở `NFR3.29`; truy vấn chọn **giá trị** khóa nằm đúng một chỗ (truy vấn ảnh dịch vụ của đường nhận callback). Một kiểm thử tĩnh quét `src/main` tìm tên cột khóa và đối chiếu danh sách cho phép (vị trí, loại), cùng kiểu với kiểm thử rà soát `UPDATE`/`DELETE` của U1. `[assumption]` `NFR3.29`, `NFR2.28`

**Thử mapping và timestamp**

18. **Giới hạn của thử mapping:** controller thử mapping không có `@Transactional` và không tiêm `JdbcClient` hay bean truy cập dữ liệu (nền của `NFR1.28`). `sampleJson` đo bằng byte UTF-8 sau khi giải mã; quá 1.048.576 byte thì 400 `VALIDATION_FAILED` với `fieldErrors` ở `sampleJson` (BR18.3). Để bảo vệ bộ nhớ, bộ lọc kích thước của U1 mở rộng cho đường này với trần thân yêu cầu 8 MiB (đủ cho chuỗi 1 MiB bị thoát ký tự ở mức xấu nhất), đọc dừng ở trần cộng một byte, vượt trần cũng trả 400 `VALIDATION_FAILED` ở `sampleJson` để không thêm mã trạng thái mới vào hợp đồng. `[assumption]` BR18.1, BR18.3, `NFR1.28`
19. **Timestamp Unix:** đọc số từ văn bản gốc bằng `BigDecimal` (chính xác, kể cả phần thập phân và số mũ, BR17.1), kiểm tra khoảng 1970-01-01 đến 2100-01-01 tính cả hai đầu (BR17.2), đổi sang micro giây và cắt về phía 0 (không làm tròn, nhất quán với `truncatedTo(MICROS)` của đường ISO ở U1). `[assumption]` BR17.1, BR17.2, BR17.4
20. **Timestamp ISO và `PATTERN`:** đường ISO 8601 của U1 giữ nguyên. Với `PATTERN`, bộ định dạng được biên dịch lại mỗi lần gọi, không bộ nhớ đệm (MappingEngine không trạng thái; chi phí biên dịch cỡ micro giây, xem lại nếu `NFR1.25` đo thấy chậm); ký tự thừa ở đầu hoặc cuối bị từ chối vì `parse` đòi khớp toàn bộ chuỗi; năm hai chữ số quy về 2000 đến 2099 theo mặc định của `yy`. Cách ra bộ biên dịch theo Q5. `[assumption]` BR17.3; `[Q5]`

**Script PowerShell**

21. **Các script không gọi công cụ nạp:** cả ba script (`measure-list-latency.ps1`, `check-concurrency.ps1`, `create-sample-services.ps1`) chỉ gọi API HTTP của backend đang chạy, có tham số `-BaseUrl` (mặc định `http://127.0.0.1:8080`). Công cụ nạp do bạn chạy bằng lệnh ở README (Q4); script đo chỉ cần backend trỏ vào database `_load` đã nạp. Bấm giờ bằng `System.Diagnostics.Stopwatch` quanh một lần `HttpClient.GetAsync` kèm đọc hết thân; `check-concurrency.ps1` giữ đúng thiết kế `NFR2.21` (một tiến trình, rào chắn bắt đầu, `maxInFlight`). Mã thoát theo `NFR2.21`; `create-sample-services.ps1` gửi thân bằng byte UTF-8 đọc từ tệp để không hỏng tiếng Việt trên Windows PowerShell 5.1. `[assumption]` `NFR1.21`, `NFR2.21`, `NFR7.22`

## Assumptions & Open Questions

- **Chưa kiểm chứng trên máy này:** (a) chế độ khóa ở Q1 A và việc `FOR NO KEY UPDATE` không chặn kiểm tra khóa ngoại dựa vào tài liệu PostgreSQL, sẽ được kiểm bằng kiểm thử đồng thời `NFR2.24` kèm một callback chạy song song ở Code Generation; (b) mẹo `parseDefaulting(ERA, 1)` ở Q5 A cần các ví dụ của BR17.3 (`yyyy-MM-dd HH:mm:ss`, 30/2, giờ 24, tháng 13, năm hai chữ số) làm kiểm thử đơn vị trước khi coi là đạt; (c) quyền tạo và xóa trigger của role kết nối (đã ghi ở `tech-stack-decisions.md`, Code Generation xác nhận).
- **Trần thân 8 MiB cho thử mapping (giả định 18)** là con số tôi chọn, không có trong đầu vào; không đổi hợp đồng vì dùng lại 400 `VALIDATION_FAILED`.
- **Cách đặt tên** `LoadToolMain`, `LoadRunner`, `LoadReport` và gói `loadtool` là đề xuất; Code Generation có thể đổi tên nhưng giữ ranh giới và hướng phụ thuộc.
- Không có câu hỏi mở nào khác.

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/requirements-analysis/requirements.md` (NFR1, NFR2, NFR3, NFR5, NFR6, NFR7) `[desc]`
- `docs/brief.md` (mục 2, 6, 8, 9) `[desc]`
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/nfr-requirements/` (`nfr-requirements-questions.md` và năm tệp yêu cầu cùng `tech-stack-decisions.md`: `NFR1.21` đến `NFR1.28`, `NFR2.21` đến `NFR2.30`, `NFR3.21` đến `NFR3.29`, `NFR5.21` đến `NFR5.26`, `NFR6.21` đến `NFR6.24`, `NFR7.21`, `NFR7.22`) `[scope]`
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/functional-design/` (`rules.md`: BR11.3, BR12.4 đến BR12.6, BR14.4, BR14.10, BR15.5, BR15.6, BR17.1 đến BR17.5, BR18.1 đến BR18.3, BR19.1 đến BR19.7, BR20.1 đến BR20.3, BR22.1 đến BR22.5; `functional-spec.md`; `entities.md`) `[scope]`
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-design/` (`nfr-design-questions.md`, `performance-design.md`, `logical-components.md`) và `construction/u1-backend-skeleton/code-generation/code-summary.md`
- `tpp-simulator-app/src/main/resources/db/migration/V1__init_schema.sql` (chỉ mục và ràng buộc hiện có) và mã U1 trong `tpp-simulator-app/src/main/java/com/tpp/simulator/` (`ServiceCatalog`, `CallbackLedger`, `CallbackIngestionService`, `MappingEngine`, `RequestSizeLimitFilter`, `ClockConfig`)
- `[memory:M1]` `aidlc/spaces/default/memory/team.md`, mục Testing Posture: test-after, JUnit 5, tối thiểu 80% line coverage backend bằng JaCoCo, CI bằng GitHub Actions
- `[memory:M2]` `aidlc/spaces/default/memory/project.md`, mục Forbidden: không hỏi lại các quyết định đã chốt trong `docs/brief.md`

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
