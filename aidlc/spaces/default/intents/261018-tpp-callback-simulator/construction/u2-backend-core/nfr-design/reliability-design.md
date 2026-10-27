# Thiết kế độ tin cậy: U2 `u2-backend-core`

> Nguồn: `reliability-requirements.md` (NFR2.26 đến NFR2.30), `security-requirements.md` (NFR3.21), `observability-requirements.md` (NFR5.21), `performance-requirements.md` (NFR1.23) và `tech-stack-decisions.md` (NFR6.23, NFR6.24) của U2; `rules.md` của U2 (BR11.3, BR12.1, BR12.5, BR12.7, BR14.7 đến BR14.10, BR15.2 đến BR15.6, BR17.1 đến BR17.5, BR22.2, BR22.5) và `functional-spec.md` (W16, W18, W19, W25); thiết kế độ tin cậy của U1; các quyết định cuối Q2 A, Q5 A và giả định 1, 3, 12, 15, 20 trong `nfr-design-questions.md` của U2. Mức thiết kế: mẫu và quyết định.
>
> **Quy ước mã.** Quyết định đánh số `RD-nn`, mỗi quyết định ghi NFR và quy tắc nó thỏa. Tệp mở rộng `reliability-design.md` của U1 và không mâu thuẫn với nó.

## Nguyên tắc

Giữ nguyên U1: không SLA/SLO; tiêu chí là tính đúng đắn và tự phục hồi. **Không** ngắt mạch, thử lại tự động, hàng đợi hay ghi bù, vì chỉ có một phụ thuộc ngoài (PostgreSQL) và ghi đồng bộ là yêu cầu (ADR-008, FR3.7): thử lại ở phía ứng dụng sẽ che lỗi ghi mà người gọi phải thấy. Ba cam kết của U2: không bao giờ báo "thành công" cho callback chưa được ghi (BR14.8); không bao giờ để dữ liệu ghi một nửa, kể cả khi sửa dịch vụ (`NFR2.30`); lần nhận bị từ chối không ghi được phải **lộ ra** cho người gọi bằng header (`NFR2.26`).

## Quan hệ với thiết kế của U1

| Nội dung của U1 | Tình trạng ở U2 |
|---|---|
| Giao dịch ở dịch vụ ứng dụng, hủy toàn bộ khi lỗi (NFR2.1) | **Giữ**; mở rộng cho sửa dịch vụ và lần nhận bị từ chối (`RD-01`) |
| Pool 10 kết nối, chờ 5 giây, kiểm tra kết nối, tự phục hồi trong 30 giây (NFR2.4) | **Giữ nguyên chỉ tiêu và cấu hình**; chỉ đổi cách kiểm thử thủ công sang PostgreSQL cài sẵn (`RD-03`) |
| Flyway chạy trước khi nhận request, không sửa bản đã áp dụng (NFR2.5) | **Giữ**; thêm `V2` và công cụ nạp (`RD-06`) |
| Callback bất biến, không xóa vật lý Service (NFR2.6) | **Giữ**; mở rộng kiểm thử rà soát tĩnh (`RD-05`) |
| Không thử lại tự động; lỗi ghi là `500` | **Giữ cho callback được chấp nhận**; lần nhận bị từ chối trả mã gốc kèm header (`RD-02`) |

## Ranh giới giao dịch (NFR2.30, NFR2.1)

**`RD-01`: mỗi thao tác ghi nằm trọn trong một giao dịch ở dịch vụ ứng dụng.** Thỏa `NFR2.30`, `NFR2.1`; BR12.1, BR12.5, BR12.6, BR14.8, BR15.5.

| Thao tác | Giao dịch | Lỗi giữa chừng |
|---|---|---|
| Tạo dịch vụ (W11) | `ServiceCatalog.create`: `INSERT services` rồi `INSERT` phiên bản 1 (như U1) | Hủy cả hai; `500 INTERNAL_ERROR` kèm `X-Simulator-Error`; trùng mã → `409` |
| Sửa dịch vụ (W12) | **Một** giao dịch READ COMMITTED: khóa dòng (`scalability-design.md`, `SC-01`), `UPDATE services`, `INSERT service_config_versions` | Hủy cả hai: `services` giữ giá trị cũ, `currentVersionNumber` không tăng, không phiên bản mồ côi; `500 INTERNAL_ERROR` kèm `X-Simulator-Error` |
| Bật/tắt, xóa mềm (W13, W14) | Một giao dịch: khóa dòng, một câu `UPDATE` (bỏ qua nếu giá trị không đổi) | Hủy; `500` |
| Callback được chấp nhận (W16 bước 11) | `TransactionTemplate` mặc định: ghi `callbacks` rồi gom `transactions` | Hủy cả hai; `500 INTERNAL_ERROR`, không response đã cấu hình, không header `X-Simulator-Record-Failed` (BR14.8) |
| Lần nhận bị từ chối (W18) | `TransactionTemplate` **riêng** với `PROPAGATION_REQUIRES_NEW`, chỉ `INSERT callbacks` | Xem `RD-02` |

Chi tiết sửa dịch vụ (`NFR2.30`): thứ tự ghi là `UPDATE services` trước, `INSERT` phiên bản sau (không có khóa ngoại từ `services` sang phiên bản nên thứ tự này hợp lệ). Nếu `INSERT` phiên bản lỗi thì `UPDATE` đã chạy bị hủy cùng giao dịch. Lỗi `ApiException` ném bên trong giao dịch (`404`, `400`) cũng hủy giao dịch để **nhả khóa dòng ngay**. Ngoại lệ truy cập dữ liệu và `TransactionException` đi tới `ApiExceptionAdvice` rồi thành `500` với thông báo chung (`SD-05`).

## Lần nhận bị từ chối không ghi được (NFR2.26)

**`RD-02`: ba khối thử/bắt tách biệt, **một nơi duy nhất bắt lỗi ghi là `CallbackIngestionService`**, một lần thử, không bù.** Thỏa `NFR2.26`, `NFR2.27`; BR14.1, BR14.8, BR14.9, BR15.5, BR15.6, BR22.5.

**Nơi bắt lỗi (chốt một chỗ).** Ba khối (A), (B), (C) dưới đây nằm **trong `CallbackIngestionService`**, trên lối vào dùng chung (`receive` cho HTTP, `receiveForLoad` cho công cụ nạp, `logical-components.md` `LC-03`). Dịch vụ bắt mọi ngoại lệ của kho tại ba khối này, **không ném ra ngoài** và trả `IngestionResult` mang một **trạng thái ghi tường minh** kiểu liệt kê `WriteStatus`:

| `WriteStatus` | Ý nghĩa | Sinh ra bởi khối | Có ở `receive` | Có ở `receiveForLoad` |
|---|---|---|---|---|
| `WRITTEN` | Bản ghi (callback được chấp nhận hoặc lần nhận bị từ chối) đã commit | không (đường thành công) | Có | Có |
| `ACCEPTED_WRITE_FAILED` | Callback được chấp nhận không ghi được; giao dịch đã hủy | (B) | Có | Có |
| `REJECTED_RECORD_FAILED` | Lần nhận bị từ chối không ghi được; kết quả vẫn mang **mã từ chối gốc** (BR15.6) | (C) | Có | Có |
| `SNAPSHOT_READ_FAILED` | Không đọc được ảnh dịch vụ (BR14.9) | (A) | Có | **Không bao giờ** (công cụ nạp nhận sẵn ảnh dịch vụ, không đọc trong vòng lặp) |

`IngestionResult` mang thêm lớp ngoại lệ và SQLSTATE (chỉ tên lớp và mã, không thông điệp, `SD-05`) khi `WriteStatus` khác `WRITTEN`. Trường hợp mã dịch vụ **chưa từng có** (BR14.1, `404`) là một nhánh khác của kiểu kết quả (`IngestionResult.unknownService()`), không có thao tác ghi nên không mang `WriteStatus`; `receiveForLoad` không bao giờ trả nhánh này. `413` do `RequestSizeLimitFilter` trả trước khi tới dịch vụ.

**Controller chỉ ánh xạ kết quả sang HTTP, không bắt lỗi ghi của riêng nó.** `CallbackController` đọc `IngestionResult` rồi tự dựng response (không để ngoại lệ chạy tới `ApiExceptionAdvice`) theo bảng dưới; nó **không** có khối `catch` cho ngoại lệ truy cập dữ liệu, `TransactionException` hay `SQLException` (kiểm thử tĩnh ở dưới). Ngoại lệ không thuộc kho (ví dụ `IOException` khi đọc thân, lỗi lập trình) vẫn chỉ có lưới an toàn cuối của `OD-01` để ra đúng một dòng ERROR; đó không phải đường lỗi ghi.

| Khối (trong `CallbackIngestionService`) | Điều kiện lỗi | `WriteStatus` → phản hồi do controller dựng | Header `X-Simulator-Record-Failed` | Dòng nhật ký (controller phát từ `IngestionResult`, `OD-01`) |
|---|---|---|---|---|
| (A) Đọc ảnh dịch vụ | Mọi ngoại lệ (kho hỏng hoàn toàn, hết chờ pool 5 giây) | `SNAPSHOT_READ_FAILED` → `500 INTERNAL_ERROR`, không ghi gì, **không bao giờ `401`** hay `404` (BR14.9) | **Không** | Một dòng ERROR: mã dịch vụ, `500`, lớp lỗi, SQLSTATE; vắng `recordId`, `outcome`, `rejectionReason` |
| (B) Ghi callback được chấp nhận | Mọi ngoại lệ trong giao dịch | `ACCEPTED_WRITE_FAILED` → `500 INTERNAL_ERROR`, giao dịch hủy (không `callbacks`, không `transactions`) | **Không** | Một dòng ERROR: các trường đã biết (`outcome`), `500`, lớp lỗi, SQLSTATE |
| (C) Ghi lần nhận bị từ chối | Mọi ngoại lệ trong giao dịch riêng | `REJECTED_RECORD_FAILED` → **mã từ chối gốc** (`401`/`503`/`404`/`400`) với thân và `X-Simulator-Error` gốc | **Có** `X-Simulator-Record-Failed: true` | Một dòng ERROR thay dòng INFO: mã dịch vụ, `rejectionReason`, mã HTTP gốc, lớp lỗi, SQLSTATE |

- **Một lần thử.** Không vòng lặp, không hàng đợi, không tác vụ nền, không ghi bù về sau. Sau khi cơ sở dữ liệu trở lại, request kế tiếp được ghi bình thường; những lần đã lỗi không bao giờ xuất hiện về sau.
- Header chỉ gắn khi `WriteStatus = REJECTED_RECORD_FAILED`. Không có trên response đã cấu hình, `413`, `404` của mã chưa từng có, hay `500` của callback được chấp nhận (BR15.6).
- **Vì sao một nơi duy nhất.** Nếu (B) và (C) nuốt lỗi bên trong lối vào dùng chung mà kết quả không nói rõ, công cụ nạp không thể phân biệt "đã ghi" với "ghi lỗi", nhất là lần nhận bị từ chối còn mang mã gốc: vòng nạp 100.000 lần sẽ chạy tiếp (mỗi lần chờ tới 5 giây của pool) và số "đã ghi" báo sai, trái BR22.5 và `NFR2.27`. Vì vậy trạng thái ghi là một phần của kết quả, và `receiveForLoad`/`LoadRunner` coi mọi trạng thái khác `WRITTEN` là lỗi đầu tiên (`RD-07`).
- Thời gian trả lời trong tình huống lỗi bị chặn trên bởi thời gian chờ pool 5 giây của HikariCP (mỗi khối giữ nhiều nhất một lần chờ).
- Thêm hợp đồng: `X-Simulator-Record-Failed` vào `openapi.yaml` (mục 5 của `functional-spec.md`); `ApiErrors` nhận danh sách header phụ để dựng response.

**Kiểm chứng (ba kiểm thử tích hợp tách biệt, `NFR2.26`; nhãn (A), (B), (C) ở đây là nhãn kiểm thử, không phải khối của bảng trên):**

- **(A) Đọc được, ghi lỗi** (tình huống C và B): `FailureTrigger` (`RD-04`) `BEFORE INSERT` trên `callbacks` cho mã dịch vụ của kiểm thử. Callback **sai khóa** tới dịch vụ `API_KEY` → `401` kèm **cả hai** header `X-Simulator-Record-Failed: true` và `X-Simulator-Error`, đúng một dòng ERROR của logger endpoint; callback **được chấp nhận** → `500 INTERNAL_ERROR` kèm `X-Simulator-Error`, **không** có `X-Simulator-Record-Failed`, không bảng nào có dữ liệu mới (kể cả `transactions`), đúng một dòng ERROR. Trả lời không quá 5 giây cộng dư địa 2 giây của kiểm thử. Sau khi đóng trigger: callback sai khóa kế tiếp được ghi (không header) và chờ thêm 5 giây **không** có Callback nào xuất hiện thêm cho các lần đã lỗi.
- **(B) Pool hỏng toàn bộ** (tình huống A): dùng cách của kiểm thử NFR2.4 của U1 (proxy TCP `TcpProxy` bị ngắt hay pool trỏ địa chỉ hỏng); callback sai khóa → `500`, **không** có header `X-Simulator-Record-Failed`, đúng một dòng ERROR, trả lời không quá 5 giây cộng dư địa 2 giây.
- **(C) Trạng thái ghi ở lối vào dùng chung** (`IngestionWriteStatusTest`, gọi `CallbackIngestionService` thật, không qua HTTP): với `FailureTrigger` trên `callbacks` thì `receive` và `receiveForLoad` trả `ACCEPTED_WRITE_FAILED` cho callback được chấp nhận và `REJECTED_RECORD_FAILED` (kèm mã từ chối gốc `401`) cho lần nhận sai khóa; khi trigger đóng thì cả hai trả `WRITTEN`; với pool trỏ địa chỉ hỏng thì `receive` trả `SNAPSHOT_READ_FAILED`. Không trường hợp nào ném ngoại lệ ra ngoài dịch vụ.
- Rà soát mã: không có vòng thử lại hay hàng đợi. Kiểm thử tĩnh (đọc văn bản mã): `CallbackController` không chứa `catch` cho `DataAccessException`, `TransactionException`, `SQLException` hay `Exception` bao trùm đường ghi, và không gọi `CallbackLedger`/`JdbcClient`; chỉ `CallbackIngestionService` bắt lỗi ghi.

**`RD-03`: kho hỏng hoàn toàn và tự phục hồi trong 30 giây.** Thỏa `NFR2.26`; BR14.9.

- Cấu hình pool giữ nguyên U1 (`maximum-pool-size: 10`, `connection-timeout: 5000`, `validation-timeout: 3000`, kiểm tra kết nối khi cấp). Kết nối hỏng bị loại khỏi pool và tạo lại ở lần lấy kế tiếp; không cần khởi động lại backend.
- **Chạy tay một lần trong Build and Test** (database phát triển, không phải dữ liệu cần giữ), tách riêng hai nhóm: (1) bằng `psql` tạo trigger ép lỗi theo mẫu ở `RD-04` cho một dịch vụ `API_KEY`, gửi sai khóa → `401` kèm `X-Simulator-Record-Failed: true`, gửi đúng khóa → `500`; (2) xóa trigger và hàm, trong 30 giây gửi lại sai khóa và thấy nó được ghi (không header). Rồi: (3) dừng PostgreSQL cài sẵn (dịch vụ Windows hoặc cụm tạm bằng `pg_ctl`), gửi một callback và thấy `500 INTERNAL_ERROR` không header trong khoảng 5 giây (BR14.9); (4) bật lại, trong 30 giây gửi lại và thấy phục vụ bình thường. Không bước nào "dừng PostgreSQL rồi kỳ vọng `401`".

## Trigger ép lỗi chỉ dùng cho kiểm thử (NFR2.26, NFR2.30, NFR3.21)

**`RD-04`: trigger hẹp theo mã dịch vụ của kiểm thử, tạo bằng đối tượng `AutoCloseable`, quét dọn ở lớp cha (Q2 A).** Thỏa `NFR2.26`, `NFR2.30`, `NFR3.21`; BR15.6, BR12.1.

Lớp hỗ trợ `FailureTrigger` (thư mục kiểm thử, không nằm trong `src/main`) dùng với `try-with-resources`:

```sql
CREATE FUNCTION test_fail_fn_<id>() RETURNS trigger LANGUAGE plpgsql AS
$$ BEGIN RAISE EXCEPTION 'test failure: %', NEW::text; END $$;
CREATE TRIGGER test_fail_trg_<id> BEFORE INSERT ON callbacks FOR EACH ROW
  WHEN (NEW.service_code = 'MA_DICH_VU_CUA_KIEM_THU') EXECUTE FUNCTION test_fail_fn_<id>();
-- đóng: DROP TRIGGER IF EXISTS test_fail_trg_<id> ON callbacks; DROP FUNCTION IF EXISTS test_fail_fn_<id>();
```

- **Phạm vi hẹp:** mỗi trigger chỉ kích hoạt cho **mã dịch vụ duy nhất** của kiểm thử (`WHEN (NEW.service_code = '<mã>')`); cả ba bảng `services`, `service_config_versions`, `callbacks` đều có cột `service_code`. Nếu trigger sót lại, nó cũng không chạm dữ liệu của kiểm thử khác. Thông điệp `RAISE EXCEPTION ... NEW::text` giữ nguyên để bài quét của `NFR3.21` thấy ngay nếu thông điệp thô bị ghi hay trả về.
- **Tạo và đóng:** `FailureTrigger.on(table, event, serviceCode)` (hoặc `FailureTrigger.on(table, event, serviceCode, outcome)` khi cần chỉ ép lỗi một loại kết quả của `callbacks`, ví dụ công cụ nạp ở `RD-07`: điều kiện `WHEN` thành `NEW.service_code = '<mã>' AND NEW.outcome = '<outcome>'`) tạo hàm rồi trigger (`<id>` là hậu tố ngẫu nhiên chỉ gồm chữ thường, số, gạch dưới); `close()` luôn chạy `DROP TRIGGER IF EXISTS` rồi `DROP FUNCTION IF EXISTS`, kể cả khi kiểm thử lỗi. Vì DDL không tham số hóa được, hàm trợ giúp **kiểm tra** `serviceCode` theo `^[A-Za-z0-9_-]{1,50}$`, bảng/sự kiện và `outcome` (chỉ `SUCCESS`, `MAPPING_ERROR`, `REJECTED`) theo danh sách cho phép trước khi nối chuỗi; tên bắt đầu bằng tiền tố `test_fail_`.
- **Quét dọn (đúng Q2 A, kèm một lớp mạnh hơn):** lớp cha `AbstractIntegrationTest` thêm một bước quét ở **`@BeforeAll` và `@AfterAll`** (tĩnh, kết nối trực tiếp qua `TestDatabase`), đúng quyết định Q2 A của `nfr-design-questions.md`; `@AfterAll` dọn trigger mà một lớp kiểm thử để sót trước khi lớp kế tiếp bắt đầu, `@BeforeAll` dọn phần sót của một JVM đã bị dừng. Ngoài ra **thêm** `@BeforeEach` chạy cùng bước quét: đây là bổ sung **ngoài** Q2 A, mạnh hơn (một trigger sót lại trong cùng lớp, ví dụ một `@Test` chết giữa chừng, cũng không ảnh hưởng `@Test` kế tiếp của lớp đó) với chi phí là hai truy vấn danh mục mỗi `@Test`; không mâu thuẫn với Q2 A và có thể bỏ mà không đổi các quyết định khác. Bước quét: truy vấn `pg_trigger` (không phải trigger nội bộ) có `tgname LIKE 'test\_fail\_%'` rồi `pg_proc` có `proname LIKE 'test\_fail\_%'` trong schema hiện hành, `DROP TRIGGER IF EXISTS ... ON <bảng>` rồi `DROP FUNCTION IF EXISTS ...`; tên lấy từ danh mục, kiểm `^test_fail_[a-z0-9_]+$` rồi mới đặt trong dấu nháy kép. Nhờ vậy một JVM bị dừng giữa chừng không làm hỏng kiểm thử khác.
- **Các kiểm thử ép lỗi không chạy song song** (JUnit giữ chế độ tuần tự mặc định; `CREATE TRIGGER`/`DROP TRIGGER` cần khóa bảng nên cũng không nên chạy chồng với kiểm thử khác).
- **Dùng ở:** `NFR2.26` (A) `BEFORE INSERT` trên `callbacks`; `NFR2.27` `BEFORE INSERT` trên `callbacks` có điều kiện `outcome` (kiểm thử nạp ép lỗi của `RD-07`); `NFR2.30` `BEFORE INSERT` trên `service_config_versions` (khi đó `UPDATE services` đã chạy rồi `INSERT` phiên bản lỗi: khẳng định `services` giữ giá trị cũ, `current_version_number` không tăng, không phiên bản mồ côi); `NFR3.21` (a) `BEFORE INSERT` trên `services`, (b) `BEFORE UPDATE` trên `services` và `BEFORE INSERT` trên `service_config_versions`, (c) `BEFORE INSERT` trên `callbacks`; `NFR5.21` cách gây lỗi (1).
- Bước chạy tay bằng `psql` ở `RD-03` dùng cùng mẫu SQL và tiền tố `test_fail_`; lần chạy kiểm thử kế tiếp sẽ quét sạch nếu quên xóa (trên database kiểm thử).

## Bất biến dữ liệu (NFR2.28)

**`RD-05`: kiểm thử rà soát tĩnh mở rộng cho ba bảng và mọi gói.** Thỏa `NFR2.28`; BR12.7, BR15.x.

- `SourceRulesTest` của U1 quét `src/main` (Java, SQL, YAML). Giữ các quy tắc: không `UPDATE`/`DELETE`/`TRUNCATE`/`DROP TABLE` trên `callbacks`; không `DELETE FROM services|service_config_versions|transactions`. Thêm: không `UPDATE service_config_versions`; không `DROP DATABASE`; không `CREATE EXTENSION` (`NFR6.24`). Vì quét theo thư mục `src/main` nên tự động phủ gói `loadtool` và mọi gói mới.
- `services` vẫn được `UPDATE` hợp lệ (sửa, bật/tắt, xóa mềm) nhưng không bao giờ `DELETE` (xóa mềm chỉ đặt `deleted = true`). Mã kiểm thử (`src/test`: dọn dữ liệu, tạo/xóa trigger) nằm ngoài phạm vi quét. Không tác vụ nền xóa dữ liệu.

## Bản chuyển Flyway (NFR2.29, NFR6.24)

**`RD-06`: `V2__list_filter_indexes.sql`, `V1` bất biến, không `CREATE EXTENSION`.** Thỏa `NFR2.29`, `NFR6.24`; ADR-008.

- `V2` chỉ chứa bốn câu `CREATE INDEX` của `performance-design.md` (`PD-03`), không đổi bảng hay cột, không dữ liệu. Tên tệp khớp `V\d+__[a-z0-9_]+\.sql` (kiểm thử của U1). Flyway chạy trước khi nhận request, kiểm tra checksum và từ chối khởi động nếu bản đã áp dụng bị sửa; bản chuyển lỗi thì ứng dụng báo lỗi rõ và thoát mã khác 0 (U1, không đổi).
- **Kiểm thử bổ sung:** (1) `SchemaMigrationTest` khẳng định `flyway_schema_history` có `V1` và `V2` đều thành công và bốn chỉ mục tồn tại; (2) kiểm thử khẳng định SHA-256 của `V1__init_schema.sql` bằng hằng số ghi trong kiểm thử (Code Generation tính từ bản đã duyệt của U1 khi bắt đầu U2); (3) quét `db/migration` không có `CREATE EXTENSION` (trừ khi `NFR6.24` được kích hoạt kèm cập nhật `tech-stack-decisions.md` và README); (4) kiểm thử khởi động của U1 (cơ sở dữ liệu rỗng, không kết nối được) giữ nguyên và xanh.
- **Công cụ nạp (`NFR2.29`):** ngữ cảnh Spring của công cụ chạy Flyway nên lược đồ database đích luôn cùng phiên bản với ứng dụng. Kiểm thử nạp quy mô nhỏ khẳng định bảng lịch sử Flyway của database đích có phiên bản lớn nhất bằng bản chuyển mới nhất trong `classpath:db/migration` và mọi dòng thành công.

## Công cụ nạp: lỗi giữa chừng (NFR2.27)

**`RD-07`: dừng, giữ dữ liệu đã commit, báo số bản ghi, thoát mã khác 0, không tự tiếp tục.** Thỏa `NFR2.27`; BR22.2, BR22.5, NFR1.26.

- Mỗi lần nhận (được chấp nhận hoặc bị từ chối) commit riêng, nên lỗi ở lần nhận thứ N để lại đúng N-1 lần đã commit.
- **`LoadRunner` không chờ ngoại lệ: nó đọc `WriteStatus` của `IngestionResult` do `receiveForLoad` trả (`RD-02`, `LC-03`).** Vì `CallbackIngestionService` là nơi duy nhất bắt lỗi ghi và không ném ra ngoài, **mọi `WriteStatus` khác `WRITTEN`** (`ACCEPTED_WRITE_FAILED`, `REJECTED_RECORD_FAILED`, và `SNAPSHOT_READ_FAILED` nếu có) là **lỗi đầu tiên**: `LoadRunner` **dừng ngay**, không nạp thêm lần nhận nào (không thử lại, không bỏ qua để chạy tiếp), trả mã thoát `1` và báo cáo. Riêng `REJECTED_RECORD_FAILED` **không** được coi là "lần nhận bị từ chối bình thường" dù kết quả vẫn mang mã từ chối gốc: header `X-Simulator-Record-Failed` là chuyện của HTTP, công cụ nạp chỉ nhìn `WriteStatus`. Bộ đếm "đã ghi của lần chạy này" chỉ tăng khi `WriteStatus = WRITTEN`. Ngoại lệ bất ngờ khác (không phải trạng thái ghi, ví dụ lỗi bộ sinh dữ liệu hay lỗi đọc ảnh dịch vụ lúc bắt đầu) cũng dừng cùng cách và cùng mã thoát. Nhờ vậy vòng 100.000 lần không bao giờ chạy tiếp sau lỗi ghi, và số báo cáo không sai (BR22.5, `NFR2.27`).
- **Báo cáo lỗi** (ra stderr, `observability-design.md`, `OD-05`): số Callback trong database đích bằng `SELECT count(*) FROM callbacks`, số lần ghi của lần chạy này (chỉ đếm `WriteStatus = WRITTEN`), `writeStatus` của lần nhận đầu tiên không ghi được, và lý do (lớp ngoại lệ cộng SQLSTATE lấy từ `IngestionResult`, không thông điệp, không payload, không khóa, không mật khẩu). Nếu chính phép đếm cũng lỗi thì in số đếm trong bộ nhớ kèm ghi chú "không đếm được trong cơ sở dữ liệu".
- **Mã thoát:** `0` thành công; `1` lỗi lúc chạy (kể cả lỗi giữa chừng); `2` từ chối trước khi ghi (tham số sai, tên database không hợp lệ, không tạo được database, dịch vụ `LOAD_xx` đã có mà không `--append`).
- **Không nhân đôi lặng lẽ (BR22.5):** trước khi ghi, `SELECT` tham số hóa kiểm tra có dịch vụ khớp `LOAD_` cộng chữ số trong database đích; có và không `--append` → dừng, mã thoát 2, không ghi gì. Có `--append` → dịch vụ `LOAD_01` đến `LOAD_<--services>` đã có thì dùng lại (đọc ảnh dịch vụ), chỉ tạo dịch vụ còn thiếu; dịch vụ `LOAD_` có số lớn hơn `--services` không bị chạm.
- **Kiểm chứng: kiểm thử nạp ép lỗi đi qua `CallbackIngestionService` thật** (`LoadRunnerWriteFailureTest`, trên `tpp_simulator_test`, dịch vụ `LOAD_` dọn trước và sau; **không** dùng bộ ghi giả hay bộ ghi ném ngoại lệ, vì chúng đi vòng qua chính đường bắt lỗi cần kiểm). Dùng `FailureTrigger` (`RD-04`) `BEFORE INSERT` trên `callbacks` với điều kiện theo mã dịch vụ `LOAD_xx` và `outcome`, hai ca:
  - **Ca lần nhận được chấp nhận:** trigger cho `outcome = 'SUCCESS'` của một dịch vụ `LOAD_xx` → `receiveForLoad` trả `ACCEPTED_WRITE_FAILED`.
  - **Ca lần nhận bị từ chối:** trigger cho `outcome = 'REJECTED'` của dịch vụ `API_KEY` (`LOAD_02`, `PD-08`) → lần nhận bị từ chối đầu tiên của dịch vụ đó trả `REJECTED_RECORD_FAILED` (kèm mã từ chối gốc, chứng minh công cụ nạp không bị đánh lừa bởi mã gốc).
  - Mỗi ca khẳng định: mã thoát `1`; đầu ra stderr có đúng dòng `Load failed` (`OD-05`); số in ra bằng `SELECT count(*) FROM callbacks`; **công cụ dừng ngay**: `count(*)` bằng đúng chỉ số của lần nhận khớp đầu tiên (kiểm thử tính chỉ số này bằng `LoadDataGenerator` cùng `seed`, thuần, không qua kho) và vẫn bằng số đó sau khi đóng trigger (không lần nhận nào được nạp tiếp, kể cả loại không bị ép lỗi); dữ liệu đã commit còn nguyên. Sau mỗi ca: chạy lại không `--append` bị từ chối (mã thoát `2`) và số bản ghi không đổi; chạy lại có `--append` (sau khi đóng trigger) tiếp tục và dùng lại dịch vụ `LOAD_xx`.
  - Kiểm thử đơn vị bổ sung `LoadRunnerStopsOnFirstFailureTest` dùng một `IngestionResult` giả chỉ để chứng minh logic dừng của `LoadRunner` (mọi `WriteStatus` khác `WRITTEN` dừng ngay); nó **không** thay thế hai ca tích hợp ở trên.

## Phân tích timestamp và payload không bao giờ gây 500

**`RD-08`: một bộ biên dịch mẫu cho lúc lưu, thử mapping và nhận callback (Q5 A).** Hỗ trợ `NFR6.23` (bốn định dạng timestamp), `NFR1.28`; BR11.3, BR14.7, BR17.1 đến BR17.5.

- **Bộ biên dịch dùng chung** `TimestampPatterns.compile(p)` (gói `mapping`, thuần, không trạng thái): `new DateTimeFormatterBuilder().appendPattern(p).parseDefaulting(ChronoField.ERA, 1).toFormatter(Locale.ENGLISH).withResolverStyle(ResolverStyle.STRICT)`. Mẹo kỷ nguyên cho phép mẫu quen thuộc `yyyy-MM-dd HH:mm:ss` chạy dưới `STRICT` (vốn từ chối `yyyy` khi thiếu kỷ nguyên). `IllegalArgumentException` của `appendPattern` là "mẫu sai cú pháp". Mẫu dài hơn 100 ký tự bị từ chối trước.
- **Phân tích khi nhận callback (BR17.3):** `formatter.parseBest(chuỗi, ZonedDateTime::from, LocalDateTime::from)`. `parseBest` đòi khớp **toàn bộ** chuỗi nên ký tự thừa ở đầu hay cuối là `DateTimeParseException` → `UNPARSEABLE`; ngày giờ không tồn tại (30/2, tháng 13, giờ 24, phút 60) bị `STRICT` từ chối → `UNPARSEABLE`, không tự điều chỉnh. Kết quả có múi giờ hoặc offset trong mẫu dùng nó; kết quả `LocalDateTime` dùng `atZone(defaultTimeZone)`, nên giờ trùng (chuyển mùa) lấy offset sớm hơn và giờ không tồn tại được dời tới theo độ lệch (BR17.4, thống nhất với đường ISO không múi giờ). Năm hai chữ số (`yy`) quy về 2000 đến 2099. Năm UTC ngoài 1 đến 9999 là `UNPARSEABLE`. Mọi `DateTimeException` bị bắt thành `UNPARSEABLE`/`WRONG_TYPE` của riêng trường timestamp (BR14.7: không bao giờ làm đổi response hay sinh `500`).
- **Phép thử định dạng khi lưu hoặc thử mapping (BR11.3), `TimestampPatterns.validate(p)`:** định dạng một thời điểm mẫu cố định có múi giờ (ví dụ `2001-02-03T16:05:06` ở `Asia/Ho_Chi_Minh`, giờ chiều để phủ chỉ báo sáng/chiều) bằng bộ biên dịch trên, rồi phân tích lại chuỗi vừa tạo bằng `parseBest`; **không ra được `ZonedDateTime` hay `LocalDateTime` thì từ chối** (mẫu 12 giờ thiếu chỉ báo sáng/chiều, mẫu chỉ có ngày hay chỉ có giờ). Để chứng minh mẫu **có** năm, tháng, ngày, giờ, phút, thêm năm lần định dạng các biến thể chỉ khác một trường (năm, tháng, ngày, giờ, phút) và đòi chuỗi kết quả khác chuỗi gốc ở mỗi biến thể; mẫu không in một trường thì từ chối. Giây và phần thập phân vắng thì bằng 0. Phép thử chỉ chạy lúc lưu và thử mapping, nên không tốn ở đường nhận callback (`PD-12`).
- **Unix (BR17.1, BR17.2), `UnixTimestampParser`:** lấy **văn bản gốc** của số JSON hoặc chuỗi chữ số; chuỗi phải khớp `^[0-9]+(\.[0-9]+)?$`; chuỗi sai dạng, số âm (ký tự `-` đầu) và boolean là `UNPARSEABLE`, object/mảng là `WRONG_TYPE`. Kiểm tra khoảng 1970 đến 2100 theo **bậc độ lớn từ chữ số và số mũ bằng số học `long`, trước khi tạo `BigDecimal`** hay khai triển số mũ: giá trị chắc chắn ngoài khoảng (`1e999999999`, chuỗi nhiều nghìn chữ số) cho `UNPARSEABLE` ngay; số mũ âm rất lớn cho 0 micro giây (`1970-01-01T00:00:00Z`, hợp lệ). Các giá trị còn lại đổi bằng `BigDecimal` (chính xác, không qua số thực dấu phẩy động): giây nhân 1.000.000, mili giây nhân 1.000, cắt về phía 0 (không làm tròn) về micro giây, kiểm tra khoảng tính cả hai đầu rồi `Instant.EPOCH.plus(micro, MICROS)`.
- Kiểm thử đơn vị bắt buộc trước khi coi `Q5 A` là đạt: mọi ví dụ của bảng W19 (`yyyy-MM-dd HH:mm:ss`, 30/2, giờ 24, tháng 13, ký tự thừa, `dd/MMM/yyyy HH:mm Z`, năm hai chữ số, `yyyy-MM-dd` bị từ chối khi lưu) cùng các số Unix (`1760850000.123`, `"1760850000."`, `".5"`, `1e999999999`, `1e-999999999`).

**`RD-09`: quyết định hình thức lưu payload của lần nhận bị từ chối một lần, trước khi ghi.** Thỏa `NFR2.26` (không có đường lỗi thứ hai), `NFR3.21`; BR15.4.

- `RejectedPayloadClassifier` (gói `ingestion`, thuần): (1) giải mã UTF-8 nghiêm ngặt; byte không hợp lệ → hình thức **văn bản gốc** với byte sai và ký tự NUL thay bằng U+FFFD (body rỗng là chuỗi rỗng); (2) giải mã được thì bỏ BOM đầu (chỉ để kiểm tra JSON) và đọc bằng bộ đọc luồng Jackson một lượt, đòi đúng một giá trị JSON; không phải thì **văn bản gốc**; (3) trong cùng lượt đọc, với mỗi tên khóa và mỗi giá trị chuỗi: chứa U+0000 hoặc nửa cặp thay thế lẻ (điều kiện (a), (b) của BR15.4) → **văn bản gốc**; (4) với mỗi số: nằm ngoài miền số bên dưới (điều kiện (c)) → **văn bản gốc**; (5) ngược lại → `payloadJson`, kể cả body đúng chữ `null` (giá trị JSON null, khác SQL NULL: ràng buộc tham số bằng `CAST(:payload AS jsonb)` và kiểu `VARCHAR` tường minh cho giá trị vắng).
- **Miền số lưu được** (BR15.4 giao NFR Design ghi): số với văn bản thập phân có phần định trị `m` (chữ số) và số mũ `e` (nguyên có dấu, tối đa 9 chữ số, nếu hơn thì ngoài miền) lưu được khi **số chữ số phần nguyên sau khi áp dụng số mũ không quá 131.072**, **số chữ số phần thập phân sau khi áp dụng số mũ không quá 16.383**, và `|e| <= 100000`. Đây là giới hạn đã công bố của kiểu `numeric` của PostgreSQL cộng một cận chặt cho số mũ. Phép tính chỉ dùng số học `long` trên chuỗi chữ số, không tạo `BigDecimal` cho số lớn.
- Không bao giờ thử ghi lần hai bằng hình thức còn lại: nếu việc ghi đã quyết định vẫn lỗi (kể cả điều kiện lẽ ra phát hiện được trước), đó là lỗi khối (C) của `RD-02`. Với callback được chấp nhận không có phép tiền kiểm này: payload không lưu được ở dạng `jsonb` vẫn là `500` của khối (B), như U1 đã ghi ở README (BR14.8).

## Suy giảm có kiểm soát (bổ sung cho bảng của U1)

| Tình huống | Hành vi | Thiết kế |
|---|---|---|
| Đọc được dịch vụ, không ghi được lần nhận bị từ chối | Mã từ chối gốc + `X-Simulator-Record-Failed: true`; một dòng ERROR; không thử lại | `RD-02` (C) |
| Không ghi được callback được chấp nhận | `500`, không response đã cấu hình, không header | `RD-02` (B) |
| Không đọc được dịch vụ (kho hỏng hoàn toàn) | `500`, không header, không ghi gì, không coi là `404` | `RD-02` (A), `RD-03` |
| Hết thời gian chờ khóa dòng khi sửa dịch vụ | `500 INTERNAL_ERROR`, giao dịch hủy | `scalability-design.md` `SC-01`, `SD-05` |
| PostgreSQL mất lúc thử mapping | Vẫn `200` (không dùng cơ sở dữ liệu) | `performance-design.md` `PD-07` |
| 50 request đồng thời vượt pool 10 | Xếp hàng chờ tới 5 giây; chỉ kết luận khi `maxInFlight >= 25` | `SC-04`, `SC-05` |
| Công cụ nạp lỗi giữa chừng | Giữ dữ liệu đã commit, mã thoát khác 0, báo số bản ghi | `RD-07` |
| Đĩa đầy do vòng lặp gửi sai khóa | Không giới hạn ở MVP (rủi ro đã chấp nhận); README hướng dẫn xóa database | `SC-08` |

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/nfr-requirements/reliability-requirements.md` (reliability-requirements: NFR2.26 đến NFR2.30), `security-requirements.md` (NFR3.21), `observability-requirements.md` (NFR5.21), `performance-requirements.md` (NFR1.23) và `tech-stack-decisions.md` (NFR6.23, NFR6.24)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/functional-design/rules.md` (rules: BR11.3, BR12.1, BR12.5, BR12.7, BR14.7 đến BR14.10, BR15.2 đến BR15.6, BR17.1 đến BR17.5, BR22.2, BR22.5) và `functional-spec.md` (functional-spec: W12 đến W14, W16, W18, W19, W25)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/nfr-design/nfr-design-questions.md` (Q2 A, Q5 A, giả định 1, 3, 12, 15, 20)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-design/reliability-design.md` (ranh giới giao dịch, pool, Flyway, độ bền)
- `tpp-simulator-app/src/main/java/com/tpp/simulator/ingestion/CallbackIngestionService.java`, `.../ingestion/PayloadDecoder.java`, `.../mapping/MappingEngine.java`, `.../config/DbErrors.java`, `tpp-simulator-app/src/test/java/com/tpp/simulator/SourceRulesTest.java`, `.../support/AbstractIntegrationTest.java`, `.../support/TestDatabase.java` (mã U1, chỉ đọc)

## Assumptions & Open Questions

- **Chưa kiểm chứng trên máy này:** (a) mẹo `parseDefaulting(ERA, 1)` với `STRICT` cần các ví dụ của W19 làm kiểm thử đơn vị (đã ghi ở `RD-08`); (b) role kết nối là chủ các bảng nên tạo và xóa được trigger (ghi ở `tech-stack-decisions.md`, Code Generation xác nhận); (c) hành vi `RAISE EXCEPTION` giữa `UPDATE services` và `INSERT` phiên bản thật sự hủy cả giao dịch qua `TransactionTemplate`/`@Transactional` (kỳ vọng theo ngữ nghĩa giao dịch, kiểm thử `NFR2.30` là bằng chứng).
- **Miền số của `RD-09` chưa kiểm chứng trên PostgreSQL thật.** Tôi dùng giới hạn đã công bố của `numeric` (131.072 chữ số phần nguyên, 16.383 phần thập phân) và cận `|e| <= 100000`; không có PostgreSQL ở phiên thiết kế nên chưa thử biên. Code Generation phải viết một kiểm thử biên trên PostgreSQL thật (giá trị ngay trong và ngay ngoài biên khi ép sang `jsonb`); nếu PostgreSQL từ chối giá trị mà miền này nhận thì thu hẹp miền tới giá trị lớn nhất đã thử được và ghi vào báo cáo. Hướng sai an toàn: miền hẹp hơn thực tế chỉ làm một số payload hiếm lưu ở dạng văn bản gốc thay vì `jsonb` (không mất dữ liệu); miền rộng hơn thực tế rơi vào lỗi khối (C), được báo bằng header.
- **Hằng số SHA-256 của `V1`** do Code Generation tính khi bắt đầu U2 từ bản đã duyệt của U1 (tôi không tính ở đây vì không được sửa mã và không cần).
- **Giới hạn luồng của Jackson** (`StreamReadConstraints` mặc định: số tối đa 1000 ký tự, độ sâu 1000): thiết kế dựa vào việc `PayloadDecoder` của U1 coi payload vượt giới hạn đó là `INVALID_JSON` và `RejectedPayloadClassifier` dùng cùng bộ đọc, nên hai đường phân loại thống nhất. Chưa kiểm chứng giá trị mặc định của phiên bản Jackson kèm Spring Boot 3.5.16 trên máy này.
- **BOM đầu body** được bỏ khi kiểm tra JSON hợp lệ và khi lưu `payloadJson`, nhưng văn bản gốc (khi lưu dạng văn bản) giữ nguyên ký tự. BR15.4 không nói riêng về BOM.
- **Tên `WriteStatus`, `IngestionResult.unknownService()` và `FailureTrigger.on(..., outcome)`** (`RD-02`, `RD-04`) là đề xuất; Code Generation có thể đổi tên nhưng giữ bốn giá trị trạng thái ghi, việc bắt lỗi ghi chỉ ở `CallbackIngestionService` và việc `LoadRunner` dừng ở mọi trạng thái khác `WRITTEN`. Việc `@BeforeEach` quét trigger là bổ sung ngoài Q2 A (`RD-04`), không đổi quyết định của bạn.
- Không có câu hỏi mở nào khác.
