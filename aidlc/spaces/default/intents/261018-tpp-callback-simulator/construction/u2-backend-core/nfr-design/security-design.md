# Thiết kế bảo mật: U2 `u2-backend-core`

> Nguồn: `security-requirements.md` (NFR3.21 đến NFR3.29), `tech-stack-decisions.md` (NFR6.21), `reliability-requirements.md` (NFR2.26, NFR2.30) và `observability-requirements.md` (NFR5.21) của U2; `rules.md` của U2 (BR11.5, BR11.6, BR12.3, BR13.5, BR14.4, BR14.10, BR15.6, BR16.1, BR16.2, BR18.3, BR19.1, BR22.2, BR22.5); thiết kế bảo mật của U1; các quyết định cuối Q2 A, Q4 A và giả định 14 đến 18 trong `nfr-design-questions.md` của U2. Mức thiết kế: mẫu và quyết định, không phải mã triển khai.
>
> **Quy ước mã.** Quyết định của tệp này đánh số `SD-nn`; mỗi quyết định ghi NFR và quy tắc nghiệp vụ nó thỏa. Tệp mở rộng `security-design.md` của U1 và không mâu thuẫn với nó: `NFR3.1` đến `NFR3.10` (loopback, làm sạch nhật ký, kiểu header đã che, phản hồi `Service` không có khóa, khóa lưu nguyên văn, kết nối qua biến môi trường, Actuator chỉ `health`, bộ lọc 1 MiB, rủi ro Spring Boot 3.5.16, cảnh báo dữ liệu cá nhân) **giữ nguyên hiệu lực**; U2 chỉ thêm đường mới.

## Mô hình và nguyên tắc

Giữ mô hình của U1: công cụ local, một người dùng, không đăng nhập, API chỉ lắng nghe `127.0.0.1`, không Spring Security. Rủi ro mới do khóa API có giá trị thật: (1) lộ khóa hay giá trị header nhạy cảm qua dữ liệu lưu, nhật ký, phản hồi hoặc đầu ra của công cụ nạp, **kể cả trên đường lỗi** khi thông điệp thô của PostgreSQL chứa cả dòng dữ liệu; (2) so sánh khóa làm lộ thông tin qua thời gian; (3) công cụ nạp 100.000 callback ghi nhầm vào database thật; (4) tiêm câu lệnh qua giá trị bộ lọc mới và qua tên database của công cụ nạp. Lớp bảo vệ thêm: một điểm duy nhất che header, một điểm duy nhất đọc **giá trị** khóa, một kiểu nhật ký không nhận header hay thân, và một hàm kiểm tra tên database chặn trước mọi kết nối.

## Che header và không lộ khóa (NFR3.21, NFR3.22)

**`SD-01`: che header ở một chỗ, kể cả lần nhận bị từ chối và header khóa của dịch vụ.** Thỏa `NFR3.22`, `NFR3.21`; BR16.1, ADR-007.

- `MaskedHeaders` (gói `config`, kiểu của U1) nhận thêm tham số tên header khóa: `MaskedHeaders(rawHeaders, apiKeyHeaderName)`. Tập nhạy cảm là `{authorization, proxy-authorization, cookie}` hợp với tên header khóa (chữ thường hóa bằng `Locale.ROOT`; `null` với dịch vụ `NONE`). Hàm tạo một tham số của U1 giữ nguyên (gọi hàm mới với `null`) nên kiểm thử và mã U1 không đổi.
- Giá trị che luôn là `***`; **nhiều giá trị hoặc nhiều dòng cùng tên (không phân biệt hoa thường) thành đúng một `***`**. Hàm gộp hiện tại của U1 (`a + ", " + b`) sẽ sinh `***, ***` khi hai khóa tên chỉ khác chữ hoa thường, nên hàm gộp của tên nhạy cảm trả lại `***`. Tên header giữ chữ gốc.
- Tên header khóa lấy từ **ảnh dịch vụ** của request đang xử lý (BR14.1), nên được che dù khóa đúng, sai, thiếu, và dù dịch vụ đang tắt hay đã xóa. Việc che chạy ở `CallbackIngestion` **trước** khi giao cho `CallbackLedger`, cho mọi đường ghi (được chấp nhận, bị từ chối, và công cụ nạp). `CallbackLedger` chỉ nhận kiểu `MaskedHeaders`; không có đường tạo kiểu từ giá trị đã che sẵn.
- Kiểm chứng (`NFR3.22`): kiểm thử tích hợp đọc cột `request_headers_masked` sau mỗi kết quả `SUCCESS`, `MAPPING_ERROR` và từng lý do trong sáu lý do `REJECTED`, với các header `Authorization`, `Proxy-Authorization`, `Cookie`, header khóa (viết hoa thường khác nhau) mang giá trị mẫu duy nhất, và khẳng định `***` thay cho mỗi giá trị còn header khác nguyên vẹn.

**`SD-03`: duy nhất ảnh dịch vụ của đường nhận callback đọc giá trị khóa.** Thỏa `NFR3.29`, `NFR3.21`; BR13.5, BR14.1, BR16.2.

- Giá trị `api_key_secret` chỉ xuất hiện trong **ba loại** (đúng `NFR3.29`): (1) câu `INSERT`/`UPDATE` ghi cột (tạo dịch vụ, đổi khóa khi sửa); (2) biểu thức boolean `api_key_secret IS [NOT] NULL` (tính `apiKeyConfigured`, kiểm tra dịch vụ `API_KEY` còn khóa khi sửa, quyết định giữ hay xóa khóa theo BR12.3); (3) một truy vấn `SELECT` giá trị duy nhất, hằng `SELECT_SNAPSHOT` của `ServiceCatalog`, dùng cho ảnh dịch vụ của đường nhận callback. Không `RETURNING api_key_secret`. Không có ngoại lệ nào phát sinh ở NFR Design.
- Ảnh dịch vụ là kiểu bất biến `ServiceRuntimeSnapshot` (thay `ServiceRuntimeConfig` của U1, thêm `authType`, `apiKeyHeaderName`, `apiKeySecret`). `toString()` của nó che khóa (`apiKeySecret=***`), và kiểu không được ghi vào nhật ký (`SD-04`). Phản hồi `Service` (`ServiceView`) vẫn chỉ có `apiKeyConfigured`.
- **Kiểm thử phân loại tĩnh `ApiKeyColumnRulesTest`** thay `noQuerySelectsTheApiKeySecretColumn` của U1 (kiểm thử đó cấm mọi lần xuất hiện ngoài `V1`, nên không còn dùng được). Nó quét `src/main/java` và `src/main/resources`, phân loại **từng** lần xuất hiện của `api_key_secret` vào ba loại trên bằng quy tắc cụ thể: loại (1) khi nằm trong câu bắt đầu bằng `INSERT INTO services` hoặc `UPDATE services` và không có `RETURNING`; loại (2) khi ngay sau là `IS NULL` hoặc `IS NOT NULL`; loại (3) khi nằm trong hằng `SELECT_SNAPSHOT` của `ServiceCatalog.java` và là đúng một lần. Lần xuất hiện ngoài ba loại, và mọi lần xuất hiện trong các gói `web`, `ledger`, `ingestion`, `loadtool`, đều làm kiểm thử đỏ. Kiểm thử in bảng (vị trí, loại) để Code Generation chép vào báo cáo.

**`SD-05`: đường lỗi ghi không bao giờ phát ra thông điệp thô của kho dữ liệu.** Thỏa `NFR3.21` (các tình huống ép lỗi ghi); BR14.8, BR14.10, BR15.6.

- Thông điệp thô của PostgreSQL/JDBC có thể chứa cả dòng (ví dụ lỗi từ `RAISE EXCEPTION ... NEW::text` chứa khóa). Quy tắc cho mọi mã `src/main`: (1) nhật ký lỗi và phản hồi chỉ dùng **lớp ngoại lệ và SQLSTATE** (`DbErrors`), không `getMessage()` của ngoại lệ truy cập dữ liệu; (2) không truyền ngoại lệ làm tham số cuối của lệnh gọi `log.error(...)`/`log.warn(...)` (nó in thông điệp); (3) thân lỗi dựng từ mẫu cố định, `X-Simulator-Error` chỉ chứa mã lỗi; (4) vi phạm khóa duy nhất của tạo dịch vụ dịch thành `409` với thông báo cố định, không lặp "Key (...)=(...) already exists"; (5) hết thời gian khóa của sửa dịch vụ (`lock_timeout`, SQLSTATE `55P03`) thành `500 INTERNAL_ERROR` với thông báo chung.
- Kiểm thử tĩnh mở rộng `logCallsNeverReferencePayloadOrHeaderVariables` của U1: thêm các tên biến `apiKey`, `secret`, `password`, `sampleJson`, `rawText`, và khẳng định không có `log.(error|warn)(..., <ngoại lệ>)`.
- Kiểm chứng bằng các kịch bản ép lỗi ghi ở `reliability-design.md` (`RD-04`) kèm bài quét ở `SD-10`.

## So sánh khóa và nhật ký (NFR3.23, NFR3.24)

**`SD-02`: so sánh khóa thời gian không đổi bằng thư viện chuẩn.** Thỏa `NFR3.23`; BR14.4, W17.

- `ApiKeyVerifier` (gói `ingestion`) nhận ảnh dịch vụ và các header thô của request. Bước: (1) gom giá trị của mọi header có tên `equalsIgnoreCase` với `apiKeyHeaderName`; (2) không có giá trị nào, hoặc có đúng một giá trị rỗng (servlet đã bỏ khoảng trắng đầu cuối) → `MISSING_API_KEY`; (3) từ hai giá trị trở lên → `INVALID_API_KEY` mà không so sánh; (4) đúng một giá trị → `MessageDigest.isEqual(khóaĐãLưu.getBytes(UTF_8), giáTrịNhận.getBytes(UTF_8))`, đúng thì qua, sai thì `INVALID_API_KEY`.
- **Thứ tự đối số có chủ ý:** khóa đã lưu là đối số thứ nhất, để vòng so sánh của JDK chạy theo độ dài của khóa đã lưu chứ không theo độ dài do bên gọi gửi. Không dùng `String.equals`, `Arrays.equals` hay so sánh `hashCode`.
- Kết quả là kiểu liệt kê (`ApiKeyCheck.OK|MISSING|INVALID`); khóa và giá trị nhận không rời hàm, không vào nhật ký (`SD-04`) hay thông báo lỗi. Thông báo 401 dùng cùng một câu cho thiếu và sai (BR14.6).
- Kiểm chứng: rà soát mã ở Code Generation và review (không kiểm bằng phép đo thời gian vì kết quả đo không ổn định). Kiểm thử tự động chỉ khẳng định đúng/sai các tình huống của W17: `k1` khớp, `K1` sai, thiếu, rỗng, hai header (một đúng một sai), tên header `x-api-key` so với `X-Api-Key` khớp, dịch vụ `NONE` không header nào vẫn qua.

**`SD-04`: nhật ký an toàn bằng kiểu, không bằng quy ước.** Thỏa `NFR3.24`, `NFR3.21`; BR14.10, BR16.2.

- Dòng nhật ký callback do kiểu `CallbackLogEntry` dựng (xem `observability-design.md`, `OD-01`). Kiểu này chỉ có phương thức nhận: chuỗi mã dịch vụ, `Long recordId`, kiểu liệt kê `outcome`/`rejectionReason`, `int` mã HTTP, và `Throwable` (chỉ lấy tên lớp và SQLSTATE). Nó **không có** phương thức nhận map header, mảng byte, hay chuỗi tùy ý ngoài mã dịch vụ, nên không thể ghi header, thân hay khóa kể cả khi có người sửa mã sau này.
- Mã dịch vụ lấy từ đường dẫn đi qua `LogSanitizer.clean` của U1: ký tự điều khiển (kể cả `\r`, `\n`, U+2028, U+2029) thay bằng khoảng trắng, cắt ở 100 ký tự. Một request cho đúng một dòng vật lý, không chèn được dòng giả.
- Kiểm chứng: kiểm thử tích hợp bắt nhật ký, gửi callback tới mã dịch vụ có `%0A`/`%0D` và dài hơn 100 ký tự, khẳng định đúng một dòng của logger endpoint, mã bị cắt ở 100 ký tự, không xuống dòng thêm, không tên hay giá trị header, không khóa, không thông điệp thô.

## Bộ lọc và thử mapping (NFR3.27)

**`SD-06`: giá trị bộ lọc luôn là tham số có tên.** Thỏa `NFR3.27`; BR19.1 đến BR19.3.

- Bộ dựng `ListQueryBuilder` (xem `performance-design.md`, `PD-02`) chỉ ghép các **hằng** đoạn SQL cố định; mọi giá trị (`serviceCode`, `transactionId`, `status`, `outcome`, `rejectionReason`, `receivedFrom`, `receivedTo`, `page`, `size`) là tham số có tên và ép kiểu tường minh. Kiểm thử tĩnh `sqlIsNeverBuiltByConcatenatingStringsInTheMainCode` của U1 tiếp tục chạy; thêm quy tắc: lớp `ListQueryBuilder` chỉ được nối các hằng `static final String` (kiểm bằng quét tên biến được nối).
- `transactionId`/`status` dùng `position(lower(...) IN lower(cột)) > 0` nên `%`, `_`, `\` là ký tự thường: lọc `100%` chỉ khớp chuỗi chứa đúng `100%`, không khớp `1000`.
- Kiểm thử tích hợp với giá trị chứa `'`, `;`, `--`, `%`, `_`, `\` và `' OR '1'='1`: không `500`, không dữ liệu ngoài ý muốn, kết quả đúng ngữ nghĩa chuỗi chứa.

**`SD-09`: thử mapping không lặp lại nội dung mẫu và không giữ gì.** Thỏa `NFR3.21`; BR18.1, BR18.3.

- `sampleJsonError` (khi `sampleJsonValid` là false) dựng từ **từ vựng cố định** theo loại lỗi của bộ đọc luồng (kết thúc đột ngột, ký tự không hợp lệ, vượt giới hạn cấu trúc, rỗng) cộng dòng và cột (`JsonLocation`). Nó **không** dùng `getMessage()` hay `getOriginalMessage()` của ngoại lệ Jackson vì chúng trích đoạn nội dung mẫu ("Unrecognized token 'abc'"). Thử mapping không ghi cơ sở dữ liệu, không lưu mẫu, không ghi nhật ký nội dung mẫu.

## Công cụ nạp (NFR3.25, NFR3.26)

**`SD-07`: công cụ nạp chỉ chạm database `_load`, chặn trước mọi kết nối.** Thỏa `NFR3.25`, `NFR3.26`; BR22.2, BR22.5.

- **Hàm kiểm tra tên `DatabaseNameGuard.validate(name)`** (thuần, không kết nối): tên hợp lệ khi khớp `^[a-z][a-z0-9_]*_load$`, dài tối đa 63 ký tự. Từ chối: `tpp_simulator`, `tpp_simulator_test`, `other_project`, `tpp_simulator_load_old` (không kết thúc `_load`), `TPP_Simulator_load` (chữ hoa), tên rỗng, tên 64 ký tự, tên có dấu cách, dấu nháy, chấm phẩy, `_load` đứng đầu hay `load` không có gạch dưới. Chấp nhận: `tpp_simulator_load`, `perf_2026_load`. Tập ký tự chặt này cũng là lý do `CREATE DATABASE "<tên>"` an toàn (tên đã qua kiểm tra ký tự nên không thể thoát khỏi dấu nháy kép).
- **Tên database là tham số `--database=<tên>`** (mặc định `tpp_simulator_load`). BR22.3 không liệt kê tham số này nhưng W25 bước 1 nhắc tới tên database đích, và `NFR3.25` cần một cách đặt tên khác mặc định; đây là chi tiết NFR Design chốt (xem Assumptions & Open Questions). Tên đích **không bao giờ** suy ra từ biến môi trường hay từ database mà `SPRING_DATASOURCE_URL` trỏ tới.
- **Thứ tự khởi chạy của `LoadCommand` (giả định 11):** (1) phân tích tham số, tham số sai hay lạ → dừng; (2) `DatabaseNameGuard.validate` **trước khi mở bất kỳ kết nối nào**; (3) mở một kết nối JDBC ngắn tới **database mà ứng dụng đã cấu hình** (`SPRING_DATASOURCE_URL`, `USERNAME`, `PASSWORD`) chỉ để kiểm tra tồn tại bằng truy vấn tham số hóa trên `pg_database` và, khi chưa có, chạy `CREATE DATABASE "<tên đã kiểm tra>"`; (4) khởi động ngữ cảnh Spring với URL đích (cùng URL cấu hình, **chỉ thay tên database**, giữ nguyên máy chủ, cổng và tham số truy vấn), Flyway áp lược đồ; (5) trước khi ghi, kiểm tra lần hai `SELECT current_database()` bằng đúng tên đích đã kiểm tra, khác thì dừng, không ghi; (6) nạp (`LoadRunner`). Không có lệnh `DROP` ở bất kỳ đâu trong mã; công cụ không tự xóa database nạp sau khi xong.
- **Không tạo được database** (ví dụ role không có `CREATEDB`): dừng, không ghi gì, mã thoát 2, in đúng câu lệnh để người dùng tự chạy: `psql -h <host> -p <cổng> -U <người dùng> -d <database cấu hình> -c "CREATE DATABASE <tên>;"`. Câu lệnh gợi ý **không chứa mật khẩu**; máy chủ, cổng, người dùng lấy từ URL và biến môi trường đã cấu hình. URL đầy đủ (có thể chứa `password=` trong tham số truy vấn) **không bao giờ được in**.
- **Không lộ mật khẩu:** thông tin kết nối lấy từ `SPRING_DATASOURCE_URL`/`USERNAME`/`PASSWORD`; ngữ cảnh Spring của công cụ đặt mức `WARN` cho `org.flywaydb`, `com.zaxxer.hikari` và `com.tpp.simulator` (Flyway ghi URL ở mức `INFO`); ngoại lệ ở mức cao nhất của công cụ chỉ in **tên lớp và SQLSTATE**, không in thông điệp hay vết ngăn xếp (thông điệp lỗi kết nối có thể chứa địa chỉ). Giá trị mật khẩu nằm ngoài `args` của tiến trình (biến môi trường), nên không hiện trong danh sách tiến trình.
- **Không mở cổng mạng:** ngữ cảnh dựng với `WebApplicationType.NONE` và chỉ nạp các bean cần (`logical-components.md`, `LC-04`); không `ServerSocket`, không máy chủ HTTP trong đường chạy của công cụ.
- **Ngoại lệ có kiểm soát (`NFR3.26`):** kiểm thử nạp quy mô nhỏ gọi trực tiếp `LoadRunner` trên `tpp_simulator_test` với dịch vụ `LOAD_`, không qua `LoadCommand` và không qua hàm kiểm tra tên. Điều đó chỉ an toàn vì `LoadRunner` không tự kết nối hay tạo database và `LoadCommand` là lối vào duy nhất từ dòng lệnh (`LoadToolMain.main` chỉ gọi `LoadCommand`).
- Kiểm chứng: kiểm thử đơn vị `DatabaseNameGuard` với bộ giá trị trên; kiểm thử `LoadCommand` với một "bộ mở kết nối" giả đếm số lần mở, khẳng định tên bị từ chối thì bộ đếm bằng 0 và mã thoát khác 0; kiểm thử thông điệp in câu lệnh khi không tạo được database; tích hợp nhỏ với mật khẩu mẫu duy nhất quét stdout, stderr và nhật ký, kể cả khi buộc lỗi kết nối; rà soát tĩnh `src/main` không có `DROP DATABASE`, `ServerSocket`. Chạy tay một lần trong Build and Test: tạo thật `tpp_simulator_load`.

## Không giới hạn tốc độ, không CORS (NFR3.28)

**`SD-08`: không thêm cơ chế nào.** Thỏa `NFR3.28`; Q4 A. Không bộ lọc giới hạn tốc độ, không mã `429`, không cấu hình CORS (không `@CrossOrigin`, `CorsRegistry`, `addCorsMappings`), không xác thực. API vẫn chỉ lắng nghe `127.0.0.1` (kiểm thử cấu hình mặc định của U1 giữ). Kiểm chứng bằng rà soát: `openapi.yaml` không có phản hồi `429` cho `/callbacks/{serviceCode}`; kiểm thử tĩnh khẳng định không có lớp hay chú thích CORS hoặc giới hạn tốc độ trong `src/main`. Rủi ro đĩa đầy do vòng lặp gửi sai khóa ghi ở `scalability-design.md` (`SC-08`).

## Bài quét "không lộ khóa" (NFR3.21)

**`SD-10`: một bài quét dùng chung cho đường thường và đường lỗi ghi.** Thỏa `NFR3.21`.

- Giá trị mẫu duy nhất cho mỗi lần chạy (tiền tố cố định cộng UUID), chia **hai nhóm** vì payload hợp lệ được lưu và trả lại theo thiết kế (BR16.2) còn bí mật thì không:
  - **Nhóm BÍ MẬT (`NFR3.21`):** khóa dịch vụ, khóa mới khi sửa, giá trị `Authorization`, `Proxy-Authorization`, `Cookie`, giá trị header khóa. **Không được xuất hiện ở bất kỳ nguồn nào trong bốn nguồn dưới đây**, ở mọi tình huống.
  - **Nhóm PAYLOAD mẫu:** một giá trị duy nhất đặt trong thân callback gửi đi. Theo BR16.2 payload được **lưu nguyên** trong `callbacks` và **trả lại** ở chi tiết callback, và `NFR3.21` không liệt kê payload trong các giá trị phải giấu, nên nhóm này **không** nằm trong bài quét bảng và phản hồi chi tiết callback (quét ở đó sẽ đỏ vì chính dữ liệu hợp lệ). Nhóm này chỉ quét ở nguồn (2) nhật ký ứng dụng, nguồn (4) đầu ra công cụ nạp và các **phản hồi lỗi** (bảng ngay dưới), và chỉ trong **tình huống ép lỗi ghi** (không quét ở tình huống thường, nơi phản hồi và bảng hợp lệ chứa payload).
- Bốn nguồn quét và phạm vi theo nhóm:

| Nguồn | Nhóm BÍ MẬT | Nhóm PAYLOAD |
|---|---|---|
| (1) Mọi dòng của mọi bảng ở dạng JSON văn bản, **trừ** cột `api_key_secret` của `services` (loại bằng `to_jsonb(s) - 'api_key_secret'`) | Quét | **Loại khỏi quét** (BR16.2 lưu payload nguyên văn trong `callbacks`) |
| (2) Mọi sự kiện nhật ký ứng dụng (appender trong bộ nhớ gắn vào logger gốc trong suốt kịch bản) | Quét | Quét, **chỉ trong tình huống ép lỗi ghi** |
| (3) Thân **và** header của mọi phản hồi API mà kiểm thử nhận (lớp trợ giúp gửi lưu lại từng phản hồi), kể cả `POST /api/mapping-tests` | Quét mọi phản hồi, kể cả chi tiết callback | Chỉ quét **phản hồi lỗi** (`4xx`, `5xx`) trong tình huống ép lỗi ghi; **loại khỏi quét** phản hồi chi tiết callback và danh sách trả lại payload hợp lệ |
| (4) stdout và stderr của công cụ nạp quy mô nhỏ có dịch vụ `API_KEY` | Quét | Quét, chỉ trong tình huống ép lỗi ghi (lỗi nạp giữa chừng của `RD-07`) |
- Tình huống thường: tạo dịch vụ `API_KEY`; gửi callback đúng khóa, sai khóa, thiếu khóa kèm các header nhạy cảm (và một payload mẫu); sửa khóa; gọi mọi API đọc (liệt kê, đọc dịch vụ, hai danh sách, chi tiết callback, chi tiết giao dịch, thử mapping, các phản hồi lỗi). **Chỉ quét nhóm BÍ MẬT** ở cả bốn nguồn; nhóm PAYLOAD không quét ở tình huống này, và kiểm thử khẳng định thêm điều ngược lại để bài quét không thành vô nghĩa: chi tiết callback **có** trả đúng payload mẫu (BR16.2) và cột `payload_json` của `callbacks` **có** chứa nó.
- Tình huống ép lỗi ghi (R-05), dùng `FailureTrigger` của `RD-04` với thông điệp `RAISE EXCEPTION 'test failure: %', NEW::text`: (a) **tạo** dịch vụ `API_KEY` khi trigger `BEFORE INSERT` trên `services` đang bật; (b) **sửa** dịch vụ đổi sang khóa mới khi trigger `BEFORE UPDATE` trên `services` bật, và lần nữa khi trigger `BEFORE INSERT` trên `service_config_versions` bật; (c) gửi callback sai khóa kèm header nhạy cảm và payload mẫu khi trigger `BEFORE INSERT` trên `callbacks` bật (đường `401` kèm `X-Simulator-Record-Failed` và đường `500`). (d) lần chạy nạp quy mô nhỏ bị ép lỗi ghi của `RD-07` (nguồn (4)). Mỗi tình huống khẳng định phản hồi đúng hợp đồng (`500 INTERNAL_ERROR` cho (a), (b); mã tương ứng cho (c); mã thoát `1` cho (d)), dữ liệu không đổi, rồi quét theo bảng trên: **nhóm BÍ MẬT không xuất hiện ở bất kỳ nguồn nào**; **nhóm PAYLOAD không xuất hiện ở nhật ký ứng dụng, đầu ra công cụ nạp và các phản hồi lỗi** (đây là chỗ duy nhất nhóm này được quét: thông điệp thô `NEW::text` của PostgreSQL chứa cả dòng, nên payload dễ rò qua nhật ký hoặc phản hồi lỗi). Trigger và hàm bị xóa sau mỗi tình huống.

## Rủi ro còn lại đã chấp nhận

- Không xác thực, khóa API lưu nguyên văn, Spring Boot 3.5.16 hết hỗ trợ (U1: Q1 B, Q2 C, `NFR3.1`, `NFR3.5`, `NFR3.9`): giữ nguyên; U2 không thêm thư viện nên không làm rủi ro `NFR3.9` lớn hơn (`NFR6.21`).
- So sánh khóa không có phép đo thời gian tự động (`NFR3.23`): dựa vào hàm chuẩn của JDK và rà soát mã.
- Công cụ nạp có thể ghi vào một database mà chính người dùng đặt tên theo quy ước `_load` dù đó là database họ muốn giữ: kiểm tra tên chỉ biết hậu tố; README nêu rõ quy ước.

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/nfr-requirements/security-requirements.md` (security-requirements: NFR3.21 đến NFR3.29), `reliability-requirements.md` (NFR2.26, NFR2.30), `observability-requirements.md` (NFR5.21) và `tech-stack-decisions.md` (NFR6.21)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/functional-design/rules.md` (rules: BR11.5, BR11.6, BR12.3, BR13.5, BR14.1, BR14.4, BR14.6, BR14.10, BR15.6, BR16.1, BR16.2, BR18.3, BR19.1, BR22.2, BR22.3, BR22.5) và `functional-spec.md` (functional-spec: W17, W25)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/nfr-design/nfr-design-questions.md` (Q2 A, Q4 A, giả định 11, 14 đến 18)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-design/security-design.md` (NFR3.1 đến NFR3.10)
- `tpp-simulator-app/src/main/java/com/tpp/simulator/config/MaskedHeaders.java`, `.../config/DbErrors.java`, `.../config/LogSanitizer.java`, `.../catalog/ServiceCatalog.java`, `tpp-simulator-app/src/test/java/com/tpp/simulator/SourceRulesTest.java` (mã U1, chỉ đọc)

## Assumptions & Open Questions

- **Tham số `--database` (`SD-07`)** là mở rộng nhỏ so với danh sách tham số của BR22.3; `NFR3.25` đã ghi rõ "cách truyền tên database do NFR Design chốt". Nếu bạn muốn truyền bằng biến môi trường thay vì tham số, đổi ở `LoadParameters` mà không ảnh hưởng thiết kế còn lại.
- **`%0A` trong đường dẫn (`SD-04`):** chưa kiểm chứng việc Tomcat có để request có `%0A`/`%0D` trong đường dẫn tới bộ điều khiển hay từ chối `400` ngay ở tầng container. Nếu bị từ chối ở container thì request đó không tới endpoint callback; kiểm thử `NFR3.24` khi đó dùng các ký tự điều khiển được container chuyển tiếp (ví dụ `%09`, `%1F`) và ghi lại hành vi quan sát được vào báo cáo.
- **Tên biến môi trường kết nối:** văn bản `NFR3.6` trong thiết kế U1 viết `TPP_DB_URL`, `TPP_DB_USER`, `TPP_DB_PASSWORD`, còn `application.yml` đã duyệt của U1 và yêu cầu U2 dùng `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`. Thiết kế U2 theo mã thật (tên `SPRING_DATASOURCE_*`); tệp U1 đã duyệt không sửa.
- **`MessageDigest.isEqual` (`SD-02`):** tính thời gian không đổi của nó theo tài liệu JDK, chưa đo; `NFR3.23` cũng không đòi đo.
- **Tên lớp và gói** (`ApiKeyVerifier`, `ServiceRuntimeSnapshot`, `CallbackLogEntry`, `DatabaseNameGuard`, `ApiKeyColumnRulesTest`) là đề xuất; Code Generation có thể đổi tên nhưng giữ ranh giới và quy tắc.
- Không có câu hỏi mở nào khác.
