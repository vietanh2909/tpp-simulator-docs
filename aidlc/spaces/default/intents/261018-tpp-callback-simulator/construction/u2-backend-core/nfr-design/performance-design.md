# Thiết kế hiệu năng: U2 `u2-backend-core`

> Nguồn: `performance-requirements.md` (NFR1.21 đến NFR1.28), `scalability-requirements.md` (NFR1.29), `security-requirements.md` (NFR3.27), `tech-stack-decisions.md` của U2; `rules.md` (BR14.x, BR15.4, BR18.x, BR19.x, BR22.x) và `functional-spec.md` (W16, W18, W20 đến W23, W25) của U2; thiết kế hiệu năng của U1; các quyết định cuối Q3 A, Q4 A, Q5 A và 21 giả định đã chấp nhận trong `nfr-design-questions.md` của U2. Mức thiết kế: mẫu và quyết định, đoạn mã chỉ để minh họa (không quá 15 dòng).
>
> **Quy ước mã.** Quyết định của tệp này đánh số `PD-nn`. Mỗi quyết định ghi NFR và quy tắc nghiệp vụ nó thỏa. Tệp mở rộng `performance-design.md` của U1, không mâu thuẫn với nó; chỗ U2 thay thế U1 được ghi ở bảng ngay dưới.

## Quan hệ với thiết kế hiệu năng của U1

| Nội dung của U1 | Tình trạng ở U2 |
|---|---|
| Đường nhận callback 3 lần tới cơ sở dữ liệu, một giao dịch ngắn, không bộ nhớ đệm (NFR1.1) | **Giữ**; mở rộng cho khóa API và lần nhận bị từ chối (`PD-01`) |
| Chỉ mục nền trong `V1__init_schema` | **Giữ nguyên, không sửa `V1`**; bổ sung 4 chỉ mục ở `V2__list_filter_indexes.sql` (`PD-03`) |
| Phân trang `OFFSET`/`LIMIT` kèm truy vấn đếm trong giao dịch chỉ-đọc `REPEATABLE_READ` | **Giữ**; thêm bộ lọc và cắt bớt truy vấn trang khi trang vượt cuối (`PD-02`, `PD-04`) |
| Script đo nạp thẳng 100.000 bản ghi bằng câu lệnh sinh hàng loạt, gọi danh sách 200 lần với các bộ lọc mẫu (NFR1.3 của U1) | **Bị thay thế** ở hai điểm: dữ liệu do công cụ nạp tạo qua logic nhận callback (`PD-08`); chỉ đo một kịch bản (`PD-09`) |
| Chi tiết giao dịch đọc hết rồi trả kết nối, không trần (NFR1.6 của U1) | **Giữ nguyên** (không mục tiêu thời gian, không trần) |
| Không bộ nhớ đệm cấu hình dịch vụ | **Giữ**; áp dụng cả cho mẫu `PATTERN` (`PD-12`) |

## Đường nhận callback của U2 (NFR1.24)

**`PD-01`: đường nhận giữ nguyên dạng U1, thêm hai bước chạy trong bộ nhớ.** Thỏa `NFR1.24`; BR14.1 đến BR14.5, BR15.1 đến BR15.5.

| Bước | Việc | Tới cơ sở dữ liệu |
|---|---|---|
| 1 | Bộ lọc kích thước ghi `receivedAt`, đọc thân có chặn trên 1.048.576 byte (413 nếu vượt, không ghi) | Không |
| 2 | Đọc **ảnh dịch vụ** (đã xóa, bật/tắt, `authType`, tên header khóa, khóa, phiên bản hiện hành) bằng **một** truy vấn nối hai bảng, tự động hoàn tất (autocommit) rồi trả kết nối | 1 lần đọc |
| 3 | Quyết định trạng thái dịch vụ, rồi so khớp khóa API **trong bộ nhớ** (`SD-02`), kiểm tra Content-Type và JSON | Không |
| 4a | Callback được chấp nhận: ánh xạ ngoài giao dịch, che header, mở **một** giao dịch ghi `callbacks` rồi gom `transactions` | 2 câu ghi |
| 4b | Lần nhận bị từ chối (6 lý do): quyết định hình thức lưu payload một lần (`RD-09`), che header, mở **một giao dịch riêng** chỉ ghi `callbacks` (không chạm `transactions`, BR15.3) | 1 câu ghi |

Số lần đi tới cơ sở dữ liệu: callback được chấp nhận 3 (như U1), lần nhận bị từ chối 2 (một đọc, một ghi). So khớp khóa API không thêm lần đi nào, nên ba trường hợp mục tiêu của `NFR1.24` (đúng khóa, `401`, `503`) có cùng chi phí với đường vui của U1 cộng một lượt quét luồng tối đa 1 MiB cho payload của lần nhận bị từ chối (cỡ mili giây). Không bộ nhớ đệm ảnh dịch vụ (đổi cấu hình, đổi khóa, tắt dịch vụ phải có hiệu lực cho request kế tiếp, BR14.1).

**Quy trình đo tay (Build and Test), cho `NFR1.24` và `NFR1.25`.** Mỗi trường hợp 100 lần gọi cURL tuần tự, thời gian lấy từ `time_total`; p50 là giá trị thứ 50 và p95 là giá trị thứ 95 khi sắp tăng dần (hạng gần nhất). Mẫu lệnh (Windows PowerShell 5.1):

```powershell
$ms = 1..100 | ForEach-Object {
  [double]::Parse((curl.exe -s -o NUL -w "%{time_total}" -X POST -H "Content-Type: application/json" `
    --data-binary "@payload.json" "$base/callbacks/CHI_HO"), [Globalization.CultureInfo]::InvariantCulture) * 1000 } |
  Sort-Object
"p50={0:N0} ms  p95={1:N0} ms" -f $ms[49], $ms[94]
```

Ba trường hợp của `NFR1.24`: (a) `CHI_HO` kèm `X-Api-Key` đúng; (b) `CHI_HO` kèm khóa sai (`401`); (c) dịch vụ đã tắt (`503`). Với 100 lần liên tiếp của (b) và (c), `callbacks` tăng thêm 100 dòng mỗi trường hợp (lần nhận bị từ chối luôn được ghi), nên đo trên database phát triển.

## Truy vấn danh sách: bộ lọc, trang, chỉ mục (NFR1.21, NFR1.23)

**`PD-02`: một bộ dựng truy vấn ghép các đoạn SQL cố định cho từng bộ lọc có mặt.** Thỏa `NFR1.21`, `NFR1.23`, `NFR3.27` (xem `SD-06`); BR19.1 đến BR19.5.

- Bộ dựng nằm ở gói `ledger` (`ListQueryBuilder`). Với mỗi bộ lọc **có giá trị** nó thêm đúng một đoạn `AND ...` từ một tập hằng cố định; bộ lọc vắng hoặc rỗng không thêm gì. Không dùng mẫu `(:v IS NULL OR cột = :v)` vì mẫu đó làm kế hoạch dùng chung (generic plan) không chọn được chỉ mục.
- Mọi giá trị là tham số có tên, ép kiểu tường minh (`CAST(:v AS text)`, `CAST(:t AS timestamptz)`) để tránh suy kiểu tham số sai.
- Các đoạn cho danh sách callback (danh sách giao dịch tương tự trên `transactions t`, cột `t.latest_status`, `t.latest_received_at`):

| Bộ lọc | Đoạn SQL cố định |
|---|---|
| `serviceCode` | `c.service_code = (SELECT s.service_code FROM services s WHERE lower(s.service_code) = lower(CAST(:serviceCode AS text)))`. Mã chưa tồn tại cho giá trị `NULL`, tức trang rỗng, không 404 (BR19.1) |
| `transactionId` | `position(lower(CAST(:transactionId AS text)) IN lower(c.transaction_id)) > 0` |
| `outcome` | `c.outcome = CAST(:outcome AS text)` |
| `rejectionReason` | `c.rejection_reason = CAST(:rejectionReason AS text)` |
| `receivedFrom` / `receivedTo` | `c.received_at >= CAST(:receivedFrom AS timestamptz)` và `c.received_at <= CAST(:receivedTo AS timestamptz)` |

- `position(... IN ...)` thay cho `LIKE`: dấu `%`, `_`, `\` tự nhiên là ký tự thường (BR19.1) mà không cần thoát ký tự. Bộ lọc chuỗi chứa không có chỉ mục (miễn theo `NFR1.23`); thứ tự sắp xếp vẫn theo chỉ mục nên truy vấn dừng sớm khi đủ `size` dòng khớp.
- Thứ tự luôn kết thúc bằng khóa duy nhất: `ORDER BY c.received_at DESC, c.record_id DESC` và `ORDER BY t.latest_received_at DESC, t.latest_callback_id DESC` (BR19.4), nên phân trang ổn định.
- Mỗi truy vấn trang và truy vấn đếm được sinh từ **cùng** danh sách đoạn, nên `totalItems` và `items` dùng đúng một điều kiện.

**`PD-03`: bốn chỉ mục btree thường ở `V2__list_filter_indexes.sql` (Q3 A).** Thỏa `NFR1.23`, `NFR6.24`; BR19.7.

```sql
CREATE INDEX ix_callbacks_received ON callbacks (received_at DESC, record_id DESC);
CREATE INDEX ix_callbacks_outcome_received ON callbacks (outcome, received_at DESC, record_id DESC);
CREATE INDEX ix_callbacks_rejection_received ON callbacks (rejection_reason, received_at DESC, record_id DESC)
    WHERE rejection_reason IS NOT NULL;
CREATE INDEX ix_transactions_service_latest ON transactions (service_code, latest_received_at DESC, latest_callback_id DESC);
```

| Truy vấn | Chỉ mục phục vụ |
|---|---|
| Danh sách callback không lọc | `ix_callbacks_received` |
| Callback lọc `serviceCode` (kèm khoảng thời gian) | `ix_callbacks_service_received` của `V1`, quét ngược (đã có, không thêm) |
| Callback lọc `outcome` | `ix_callbacks_outcome_received` |
| Callback lọc `rejectionReason` | `ix_callbacks_rejection_received`. Điều kiện `rejection_reason = :r` với toán tử chặt (strict) suy ra được `rejection_reason IS NOT NULL` bất kể giá trị tham số, nên bộ lập kế hoạch dùng chỉ mục một phần cả với kế hoạch tổng quát |
| Callback theo `recordId` | khóa chính `pk_callbacks` |
| Danh sách giao dịch không lọc | `ix_transactions_latest` của `V1` |
| Giao dịch lọc `serviceCode` (kèm khoảng thời gian) | `ix_transactions_service_latest` |
| Lọc chuỗi chứa (`transactionId`, `status`) | Không có chỉ mục, được miễn (`NFR1.23`, `NFR1.22`) |

- Giữ `OFFSET`/`LIMIT`, không `pg_trgm`, không `CREATE EXTENSION` (`NFR6.24`, Q3 A). Lý do không thêm chỉ mục ghép `(service_code, outcome, ...)` (phương án D của Q3): chỉ một kịch bản được đo (Q1 C), không có số liệu ủng hộ thêm chi phí ghi.
- Chi phí ghi: `callbacks` có sáu chỉ mục (khóa chính, hai của `V1`, ba của `V2`). Ở khoảng 5 giao dịch/giây là không đáng kể; với công cụ nạp 100.000 bản ghi nó cộng thêm một phần thời gian đã tính trong `PD-08`.
- `V2` dùng `CREATE INDEX` thường (không `CONCURRENTLY`, vì Flyway chạy bản chuyển trong một giao dịch). Trên database phát triển đã có dữ liệu, việc tạo chỉ mục giữ khóa ghi ngắn lúc khởi động; chấp nhận cho công cụ local.

**`PD-04`: trang và tổng số trong một giao dịch chỉ-đọc, đếm trước, cắt trang vượt cuối.** Thỏa `NFR1.21`; BR19.4.

1. Mở giao dịch chỉ-đọc `REPEATABLE_READ` (như W5 của U1) để `totalItems` khớp `items`.
2. Chạy truy vấn đếm. `totalPages = ceil(totalItems / size)`, bằng 0 khi không có dòng.
3. Nếu `page > totalPages` trả `items` rỗng, **không** chạy truy vấn trang (tránh `OFFSET` khổng lồ và tràn số: `offset = (page - 1) * size` chỉ tính khi `page <= totalPages`, nên luôn nhỏ hơn `totalItems`). **Cách đọc `page` (và `size`) bằng `long`, `ListParams`:** (a) văn bản phải khớp `^[0-9]+$`, không thì `400 VALIDATION_FAILED` (BR19.3); (b) **bỏ hết số 0 đứng đầu trước, chừa lại ít nhất một chữ số**; (c) chỉ sau đó mới so độ dài: còn dài hơn 18 chữ số thì kẹp về `Long.MAX_VALUE`, ngược lại `Long.parseLong`; (d) giá trị sau cùng nhỏ hơn 1 (kể cả `"0"`, `"000"`) là `400`. Nhờ bỏ số 0 đầu trước khi so độ dài, `"0000000000000000001"` (19 ký tự, giá trị 1) là **trang 1**, không bị kẹp nhầm thành trang rỗng; chuỗi nhiều chữ số thật sự lớn như `"99999999999999999999"` vẫn kẹp thành `Long.MAX_VALUE` (vẫn là số nguyên từ 1 trở lên, cho trang rỗng, không phải `400`). `size` dùng cùng cách đọc rồi mới so với tập giá trị cho phép của BR19.3 (20, 50, 100). Giá trị rỗng vẫn coi như vắng và giá trị chỉ gồm khoảng trắng vẫn không hợp lệ (BR19.3). **Ca kiểm thử bắt buộc (`ListPagingTest`):** `page=0000000000000000001` → trang 1 có dữ liệu; `page=00000000000000000000000` → `400`; `page=99999999999999999999` → `200` trang rỗng; `page=0000000000000000000099999999999999999999` → `200` trang rỗng; `size=000000000000000000020` → như `size=20`.
4. Ngược lại chạy truy vấn trang `LIMIT :size OFFSET :offset`.

**`PD-05`: bộ lọc thời gian dựng ở một chỗ, kẹp vào khoảng lưu được.** Thỏa `NFR1.21`, `NFR3.27`; BR19.1 đến BR19.3.

- Phân tích `receivedFrom`/`receivedTo` bằng bộ đọc ISO 8601 có offset (phần giây vắng coi là `:00`, nhất quán với bộ đọc chuẩn), cắt phần thập phân quá micro giây (không làm tròn), rồi mới đổi sang UTC **sau khi kẹp** (xem dưới).
- Có phần thập phân thì so đúng như đã gửi; **không** có phần thập phân thì `receivedFrom` là đầu giây (`.000000`) và `receivedTo` là hết giây (`.999999`). Việc "có phần thập phân hay không" xác định bằng **văn bản gốc** của tham số (`.000` vẫn là có phần thập phân), không từ giá trị `nano == 0`.
- **Quy tắc `DateTimeException`: không bao giờ để lọt thành `500`.** `DateTimeParseException` chỉ là một lớp con của `DateTimeException`, và đổi một `OffsetDateTime` có năm gần `999999999` cộng offset (ví dụ `+999999999-12-31T23:59:59-18:00`) sang UTC ném `DateTimeException` thường (không phải `DateTimeParseException`). Thiết kế xử lý ở hai tầng:
  1. **Chính (số học, không ném):** sau khi đọc được `OffsetDateTime` hợp lệ, **không** gọi đổi sang UTC. Lấy `toEpochSecond()` (số học `long`, đúng với mọi `OffsetDateTime` đọc được, kể cả năm 999999999) cùng phần nano đã cắt, **kẹp số học** vào khoảng epoch của `0001-01-01T00:00:00Z` đến `9999-12-31T23:59:59.999999Z`, rồi mới dựng cận UTC từ giá trị đã kẹp bằng `Instant.ofEpochSecond`. Năm ngoài khoảng, cộng hay trừ offset, đều cho cận kẹp (không `400`, vì văn bản vẫn là ISO 8601 hợp lệ, BR19.3). Phép kiểm tra "cận dưới lớn hơn cận trên" (BR19.3) so `(toEpochSecond, nano)` **trước** khi kẹp, cũng không ném.
  2. **Lưới an toàn (phân tích):** mọi `DateTimeException` (kể cả `DateTimeParseException` và mọi ngoại lệ ngoài dự kiến khi đọc hoặc đổi offset) bắt trong `ListParams` được dịch thành `400 VALIDATION_FAILED` với `fieldErrors` ở **đúng field** (`receivedFrom` hoặc `receivedTo`), không bao giờ chạy tới `ApiExceptionAdvice` thành `500`. Văn bản không phải ISO 8601 (ví dụ `2026-02-30T00:00:00Z`, `2026-10-19`, năm 10 chữ số không dấu) rơi vào tầng này.
- Cận được **kẹp vào khoảng `0001-01-01T00:00:00Z` đến `9999-12-31T23:59:59.999999Z`** trước khi gán tham số, để một năm quá lớn (bộ đọc ISO nhận tới 10 chữ số năm) không bao giờ gây lỗi `timestamp out of range` của PostgreSQL thành `500`. Dữ liệu chỉ có `receivedAt` quanh hiện tại nên kẹp không đổi kết quả.
- Truyền cận thành `OffsetDateTime` UTC với `CAST(:v AS timestamptz)`; so sánh `>=` và `<=` (tính cả hai đầu).
- **Ca kiểm thử bắt buộc (`ListFilterTest`, năm rất lớn và offset biên):** `receivedTo=+999999999-12-31T23:59:59-18:00` → `200`, trả mọi dòng (cận trên bị kẹp); `receivedFrom=+999999999-12-31T23:59:59-18:00` → `200`, trang rỗng; `receivedFrom=-999999999-01-01T00:00:00+18:00` → `200`, trả mọi dòng (cận dưới bị kẹp); `receivedFrom=+999999999-12-31T23:59:59-18:00` cùng `receivedTo=2026-10-19T00:00:00Z` → `400` ở `receivedTo` (cận dưới lớn hơn cận trên, BR19.3); `receivedFrom=2026-02-30T00:00:00Z` → `400` ở `receivedFrom`. Không ca nào cho `500`.

## Các API còn lại và thử mapping (NFR1.25, NFR1.28)

**`PD-06`: các API quản lý và tra cứu theo khóa dùng cùng khuôn U1.** Thỏa `NFR1.25`.

- `GET /api/callbacks/{recordId}`: một truy vấn khóa chính nối `service_config_versions` (số phiên bản) và `services` (cờ đã xóa), đọc xong trả kết nối (W23).
- Tạo, sửa, bật/tắt, xóa mềm, liệt kê dịch vụ: giao dịch ngắn một dịch vụ (xem `scalability-design.md`, `SC-01`); liệt kê dịch vụ là một truy vấn sắp theo `lower(service_code)` không phân trang (số dịch vụ nhỏ).
- Mục tiêu p95 dưới 200 ms trên database phát triển nhỏ: các thao tác trên là 2 đến 4 câu lệnh theo khóa. Đo tay một lần theo quy trình ở `PD-01`. `GET /api/transactions/detail` không có mục tiêu (U1).

**`PD-07`: thử mapping không chạm cơ sở dữ liệu, có chặn trên bộ nhớ.** Thỏa `NFR1.25`, `NFR1.28`; BR18.1, BR18.3.

- `MappingTestController` không có `@Transactional` và **không tiêm** `JdbcClient`, `ServiceCatalog` hay bean truy cập dữ liệu nào; chỉ tiêm `MappingEngine` (không trạng thái, không truy cập dữ liệu) và bộ kiểm tra cấu hình thuần. Khi PostgreSQL không kết nối được, thử mapping vẫn `200`. Kiểm thử cấu trúc: `PackageDependencyTest` mở rộng khẳng định `MappingTestController` không có tham số hay trường kiểu `JdbcClient`/`DataSource`/`CallbackLedger`/`ServiceCatalog`.
- `sampleJson` đo bằng byte UTF-8 của chuỗi đã giải mã (`getBytes(UTF_8).length`); quá 1.048.576 byte thì `400 VALIDATION_FAILED`, `fieldErrors` ở `sampleJson` (BR18.3). Sau đó phân tích một lượt đọc dòng như đường nhận callback (không dựng cây cho mục đích ánh xạ).
- **Trần thân yêu cầu 8 MiB (8.388.608 byte) cho `POST /api/mapping-tests`** (giả định 18): bộ lọc kích thước của U1 được mở rộng bằng bảng chính sách theo đường dẫn: `/callbacks/**` giữ trần 1.048.576 byte và trả `413`; `POST /api/mapping-tests` có trần 8 MiB, đọc dừng ở trần cộng một byte, vượt thì trả `400 VALIDATION_FAILED` với `fieldErrors` ở `sampleJson` (không thêm mã trạng thái nào vào hợp đồng). 8 MiB đủ cho chuỗi 1 MiB bị thoát ký tự ở mức xấu nhất (`\u00XX` là 6 byte cho 1 byte, tức khoảng 6 MiB) cộng các trường còn lại. Bộ lọc chỉ gán `receivedAt` cho `/callbacks/**`.
- Ngân sách: `sampleJson` dưới 100 KB p95 dưới 200 ms; đúng 1.048.576 byte p95 dưới 1000 ms (đo tay, 100 lần). Bộ nhớ đỉnh mỗi request khoảng thân 8 MiB cộng chuỗi giải mã, chấp nhận trong heap mặc định ở 5 request/giây.

## Công cụ nạp 100.000 callback (NFR1.26, NFR1.27, NFR1.29)

**`PD-08`: công cụ nạp tuần tự, một luồng, một giao dịch cho mỗi lần nhận, đi qua logic nhận callback thật.** Thỏa `NFR1.26`, `NFR1.27`, `NFR1.29`; BR22.1, BR22.3, BR22.4.

- Đi vào lối vào nội bộ của logic nhận callback (xem `logical-components.md`, `LC-03`), nơi `receivedAt` do công cụ cung cấp. Với mỗi lần nhận, công cụ đã có sẵn ảnh dịch vụ trong bộ nhớ (đọc một lần cho mỗi dịch vụ `LOAD_xx` lúc bắt đầu, các biến thể tắt/đã xóa, và biến thể `API_KEY` khi khoảng dịch vụ không có dịch vụ `API_KEY`, dựng từ ảnh đó, BR22.4), nên mỗi lần nhận được chấp nhận chỉ tốn **2 lần ghi** (callback, gom giao dịch) và mỗi lần bị từ chối **1 lần ghi**, không đọc dịch vụ trong vòng lặp. Sau mỗi lần nhận `LoadRunner` đọc `WriteStatus` của kết quả; khác `WRITTEN` là dừng ngay (`reliability-design.md`, `RD-07`).
- Pool của công cụ **2 kết nối** (một cho giao dịch ghi, một dự phòng cho Flyway/đếm); một luồng ghi. Sinh dữ liệu bằng `java.util.SplittableRandom(seed)`, seed mặc định là hằng số cố định (BR22.3); thời điểm nhận rải đều trong `--days` ngày tính từ lúc chạy; tỷ lệ 85% `SUCCESS`, 10% `MAPPING_ERROR`, 5% `REJECTED` với sáu lý do xoay vòng tất định (thứ tự `SERVICE_DISABLED`, `SERVICE_DELETED`, `MISSING_API_KEY`, `INVALID_API_KEY`, `UNSUPPORTED_CONTENT_TYPE`, `INVALID_JSON`) để đủ sáu lý do khi có từ sáu lần từ chối trở lên và có dịch vụ `API_KEY` (xem bảng gán ngay dưới); trung bình khoảng 4 callback mỗi giao dịch, tối đa 20; payload khoảng 1 KB (BR22.4). Không giữ danh sách 100.000 phần tử trong bộ nhớ (sinh và ghi từng lần nhận).
- **Bảng gán cấu hình dịch vụ `LOAD_xx` theo số thứ tự (cố định, không ngẫu nhiên, `LoadServiceDefinitions`).** Số thứ tự `n` (1 đến `--services`) quyết định cấu hình theo chu kỳ 3; cả ba cấu hình có mặt khi `--services` ≥ 3, và dịch vụ `API_KEY` có mặt từ `--services` ≥ 2 (`UNIX_SECONDS` không có dịch vụ nạp riêng, đã phủ bằng kiểm thử của `MappingEngine`):

  | `n` (theo chu kỳ 3) | Ví dụ | `authType` | `timestampFormat` | Ghi chú |
  |---|---|---|---|---|
  | 1 | `LOAD_01`, `LOAD_04`, `LOAD_07`, ... | `NONE` | `ISO_8601` | |
  | 2 | `LOAD_02`, `LOAD_05`, `LOAD_08`, ... | `API_KEY` (header `X-Api-Key`, khóa giả cố định của công cụ) | `PATTERN` (`yyyy-MM-dd HH:mm:ss`, `Asia/Ho_Chi_Minh`) | Nguồn của `MISSING_API_KEY` và `INVALID_API_KEY` |
  | 0 | `LOAD_03`, `LOAD_06`, `LOAD_09`, ... | `NONE` | `UNIX_MILLIS` | |

  Cách chọn dịch vụ cho mỗi lần nhận: lần nhận **không** thuộc `MISSING_API_KEY`/`INVALID_API_KEY` chọn dịch vụ bằng bộ sinh số (đều trên `--services`); lần nhận thuộc hai lý do khóa **luôn** chọn một dịch vụ `API_KEY` (lần lượt theo vòng giữa các dịch vụ `API_KEY` của khoảng), còn mọi lần nhận được chấp nhận ở dịch vụ `API_KEY` gửi đúng khóa. Hai lý do `SERVICE_DISABLED`/`SERVICE_DELETED` dùng biến thể ảnh của dịch vụ được chọn (như ở trên).
- **Khoảng không có dịch vụ `API_KEY`** (chỉ xảy ra khi `--services` = 1, vì `LOAD_02` đã là `API_KEY`): công cụ **dựng một biến thể ảnh `API_KEY`** từ ảnh của `LOAD_01` (đổi `authType` thành `API_KEY`, đặt tên header khóa và khóa giả cố định của công cụ), đúng cách dựng biến thể tắt/đã xóa; bản ghi dịch vụ trong database đích vẫn là `NONE`. Hai lý do `MISSING_API_KEY` và `INVALID_API_KEY` khi đó dùng biến thể này nên **đủ sáu lý do vẫn xuất hiện**. Công cụ không bỏ lý do nào và không đổi cấu hình dịch vụ trong database. `LoadServiceDefinitions` in một dòng chú thích duy nhất ở stderr khi dùng biến thể ("API_KEY variant used"), không kèm khóa.
- **Kiểm thử nạp quy mô nhỏ (500 callback, 2 dịch vụ)** vì vậy luôn có `LOAD_02` là `API_KEY`; kiểm thử thêm một ca `--services=1` khẳng định biến thể `API_KEY` được dùng và đủ sáu lý do từ chối (với đủ số lần từ chối), dịch vụ `LOAD_01` trong database vẫn `NONE`. Mọi kiểm thử khẳng định "đủ sáu lý do" phải có ít nhất sáu lần từ chối (500 callback × 5% ≈ 25).
- **Dữ liệu cơ sở của phép đo (`NFR1.27`):** "100.000 callback" là 100.000 dòng `callbacks` (khoảng 25.000 dòng `transactions`) trong database `_load` trống trước khi nạp (không `--append`). Nạp xong công cụ chạy `ANALYZE callbacks, transactions, services, service_config_versions` rồi in dòng tổng kết với số Callback đọc bằng `SELECT count(*) FROM callbacks` (không phải bộ đếm trong bộ nhớ). Kiểm thử nạp quy mô nhỏ khẳng định `pg_stat_user_tables.last_analyze` của `callbacks` không rỗng.
- **Ước lượng:** 100.000 lần nhận × khoảng 2 lần ghi đồng bộ, cộng chi phí sáu chỉ mục của `callbacks`, cho cỡ 5 đến 15 phút trên máy phát triển; kỳ vọng 15 phút (`NFR1.26`), không có ngưỡng đạt hay không.
- **Biện pháp khi đo thấy trên 30 phút (chưa làm, chỉ là phương án đã thiết kế):** (0) đặt `synchronous_commit = off` cho kết nối của công cụ (thuộc tính của phiên, không đổi cấu hình máy chủ; chỉ mất độ bền khi máy chủ sập giữa lúc nạp, chấp nhận vì database `_load` nạp lại được; đây là bước giảm nhẹ **ngoài** danh sách của `NFR1.26`, nhưng không đổi quy tắc nghiệp vụ nào); (1) nếu vẫn chậm, gom nhiều lần nhận **được chấp nhận** vào một giao dịch theo lô, với đủ bốn giới hạn của `NFR1.26`: lần nhận bị từ chối vẫn một giao dịch riêng, mọi quy tắc nhận callback giữ nguyên, lỗi giữa chừng hủy cả lô đang dở và số báo cáo chỉ tính các lô đã commit, và chỉ vòng ghi của công cụ đổi (`LoadRunner` có điểm mở rộng "bộ ghi" để thay mà không đụng `CallbackIngestionService`). Bất kỳ cách gộp nào ngoài giới hạn đó phải quay lại Functional Design.

## Đo hiệu năng duy nhất và khoảng trống đã chấp nhận (NFR1.21, NFR1.22)

**`PD-09`: `scripts/measure-list-latency.ps1`, một kịch bản.** Thỏa `NFR1.21`.

- Vị trí: `tpp-simulator-app/scripts/measure-list-latency.ps1`, Windows PowerShell 5.1, lưu **UTF-8 có BOM** (để 5.1 đọc đúng tiếng Việt; `ScriptsTest` kiểm ba byte đầu).
- Tham số: `-BaseUrl` (mặc định `http://127.0.0.1:8080`), `-Samples` (200), `-Warmup` (20), `-PostgresVersion` (tùy chọn, chuỗi để in vào báo cáo; không có thì thử `psql --version` và ghi rõ đó là phiên bản **máy khách**).
- Kịch bản duy nhất: `GET /api/transactions?page=1&size=20` (không bộ lọc). `System.Net.Http.HttpClient` dùng chung (nạp bằng `Add-Type -AssemblyName System.Net.Http`), `HttpClientHandler.UseProxy = $false` để proxy hệ thống không chen vào loopback, `Timeout` 30 giây. Mỗi lần gọi: `Stopwatch.StartNew()`, `GetAsync(url)` với chế độ đọc hết thân, dừng đồng hồ **sau khi đọc xong thân**. 20 lần khởi động nóng bỏ qua, 200 lần sau tính, tuần tự.
- Thống kê theo hạng gần nhất: sắp tăng dần, p50 là giá trị thứ 100, p95 thứ 190, p99 thứ 198, `max` là giá trị cuối. In cấu hình máy: CPU và số nhân (`Win32_Processor`), RAM (`Win32_ComputerSystem`), hệ điều hành, phiên bản PostgreSQL (như trên).
- Trước phép đo (không tính giờ) gọi một lần `GET /api/callbacks?page=1&size=20` để đọc `totalItems` và in "callback trong database = N"; nếu khác 100.000 thì in cảnh báo (dữ liệu không phải bộ nạp chuẩn của `NFR1.27`) nhưng vẫn đo.
- Mã thoát: `0` khi mọi lần gọi trả `200` và p95 dưới 1000 ms; `1` khi p95 từ 1000 ms trở lên, có phản hồi không phải `200`, hoặc không kết nối được. Không chạy trong CI hay `scripts/verify.ps1`.

**`PD-10`: không đo thì không tuyên bố.** Thỏa `NFR1.22`. Thiết kế **không** thêm số đo hay khẳng định thời gian cho: lọc `transactionId`/`status` chuỗi chứa; `serviceCode` kèm khoảng thời gian; `outcome`/`rejectionReason`; trang sâu; `size=50` hoặc `100`; toàn bộ `GET /api/callbacks`; `GET /api/callbacks/{recordId}` ở 100.000 callback. Chỉ mục ở `PD-03` giảm rủi ro cấu trúc (khẳng định ở `PD-11`), không phải bằng chứng thời gian. Báo cáo Build and Test phải liệt kê từng kịch bản trên là "không đo". Điều kiện mở lại quyết định chỉ mục: người dùng tự đo hoặc quan sát chậm (khi đó thêm bản chuyển `V3` hoặc, chỉ khi có số đo, `pg_trgm` theo `NFR6.24`).

**`PD-11`: kiểm thử `EXPLAIN` cho `NFR1.23`.** Thỏa `NFR1.23`.

- **`ListQueryPlanTest` là một lớp độc lập mới**, `extends AbstractIntegrationTest` (lớp cha chung của kiểm thử tích hợp), **không** kế thừa `QueryPlanTest` của U1. Lý do: `QueryPlanTest` là lớp cụ thể có `@BeforeEach` nạp 5.000 dịch vụ cùng 40.000 `callbacks` và bốn `@Test`; kế thừa sẽ chạy lại cả bốn `@Test` và nạp dữ liệu hai lần cho mỗi `@Test`, không đổi `enable_seqscan`. Lớp mới có `@BeforeEach` nạp dữ liệu của riêng nó (lớp cha dọn dữ liệu trước mỗi `@Test`, nên không nạp một lần ở `@BeforeAll`); cỡ này sinh dưới vài giây.
- **Lượng dữ liệu (nêu rõ để Code Generation không phải đoán và để bộ lập kế hoạch không chọn `Seq Scan` hợp lý trên bảng quá nhỏ):** khoảng **30.000 dòng `callbacks`** và khoảng **7.500 dòng `transactions`**, tức trung bình 4 callback mỗi giao dịch, trải trên 10 dịch vụ kiểm thử (mã `PLAN_01` đến `PLAN_10`, mỗi dịch vụ một dòng `services` và một phiên bản cấu hình để thỏa khóa ngoại của `callbacks`, như `QueryPlanTest` của U1; dọn trước và sau) để bộ lọc `serviceCode` có tính chọn lọc. Cách tạo, chỉ trong kiểm thử, bằng `INSERT ... SELECT ... FROM generate_series(...)`: (1) `callbacks`: `transaction_id = 'T' || (g / 4)` (cứ 4 dòng liên tiếp chung một `transactionId`, nên có khoảng 7.500 giá trị khác nhau) và `service_code = 'PLAN_' || lpad(((g / 4) % 10 + 1)::text, 2, '0')` (cả nhóm 4 dòng cùng một dịch vụ, nên giao dịch không bị tách giữa các dịch vụ); dòng `REJECTED` có `transaction_id` rỗng (lần nhận bị từ chối không ánh xạ); thời điểm nhận trải đều trong 30 ngày, tỷ lệ 85/10/5 cho `SUCCESS`/`MAPPING_ERROR`/`REJECTED`, trong 5% dòng `REJECTED` có đúng một lý do hiếm (ví dụ `INVALID_JSON`) chiếm khoảng **1% tổng số dòng**, các lý do còn lại chia phần còn lại; (2) `transactions`: **gom từ chính các dòng `callbacks` vừa tạo theo `(service_code, transaction_id)`** (`INSERT ... SELECT ... GROUP BY`, `DISTINCT ON` cho các cột `latest_*` theo cặp `received_at DESC, record_id DESC` và `count(*)` cho `callback_count`) chỉ trên các dòng không phải `REJECTED` (BR15.3: lần nhận bị từ chối không chạm `transactions`), nên số dòng `transactions` khoảng 7.500 tính theo `transactionId` của callback được chấp nhận; (3) rồi `ANALYZE callbacks, transactions, services, service_config_versions`. Không đổi `enable_seqscan`. Kiểm thử khẳng định trước khi chạy `EXPLAIN` rằng `count(*)` của `callbacks` nằm trong 28.000 đến 32.000 và của `transactions` trong 6.500 đến 8.500 (để một thay đổi cách sinh dữ liệu làm lệch cỡ này sẽ đỏ rõ ràng thay vì cho kế hoạch sai).
- **Cập nhật `QueryPlanTest` của U1 khi `CallbackLedger.LIST_TRANSACTIONS` không còn là hằng:** `ListQueryBuilder` thay hằng đó (`logical-components.md`, `LC-01`). `QueryPlanTest` chỉ đổi **dòng lấy SQL** của `transactionListUsesTheSortIndexWithoutSortingTheWholeTable`: thay `CallbackLedger.LIST_TRANSACTIONS.replace(":limit", "20").replace(":offset", "0")` bằng câu trang giao dịch **không bộ lọc** do `ListQueryBuilder` sinh (kèm cùng phép thay `:limit`, `:offset` hoặc tên tham số tương đương; nếu tên tham số khác thì chỉ phép thay đổi theo, nhưng bộ dựng không bộ lọc phải sinh câu cùng dạng `SELECT ... FROM transactions t ... ORDER BY t.latest_received_at DESC, t.latest_callback_id DESC LIMIT ... OFFSET ...` như hằng cũ). **Ba khẳng định giữ nguyên, không nới:** kế hoạch chứa `ix_transactions_latest`, không chứa `Sort`, không `Seq Scan on transactions`; dữ liệu 40.000 `callbacks` của lớp đó cũng không đổi. Ba `@Test` còn lại của `QueryPlanTest` (`FIND_TRANSACTION`, `LIST_TRANSACTION_CALLBACKS`, tra dịch vụ theo mã) không đụng tới nên không đổi. Nếu bộ dựng không bộ lọc không sinh được câu có `ix_transactions_latest` và không `Sort`, đó là lỗi của bộ dựng (đồng thời làm kiểm thử U1 đỏ), không phải lý do sửa khẳng định.
- `EXPLAIN` chạy trên **đúng chuỗi SQL do `ListQueryBuilder` sinh** (kèm tham số thật qua giao thức mở rộng), không sao chép tay. Khẳng định kế hoạch **không chứa `Seq Scan on callbacks`** ở: (a) `serviceCode` + `receivedFrom`/`receivedTo` hẹp; (b) `rejectionReason=<hiếm>` kèm `outcome=REJECTED`, và `outcome=REJECTED` + `serviceCode` + khoảng thời gian; (c) tìm theo `recordId`. Cùng khẳng định cho `transactions` với `serviceCode` + khoảng thời gian. Lọc chỉ bằng `outcome=SUCCESS` và lọc chuỗi chứa **không** nằm trong khẳng định.

## Cache và biên dịch mẫu

**`PD-12`: không bộ nhớ đệm nào ở U2.** Thỏa `NFR1.24`; BR17.3. Bộ định dạng `PATTERN` được biên dịch lại mỗi lần gọi (chi phí cỡ micro giây, `MappingEngine` không trạng thái); phép thử định dạng nặng hơn (`RD-08`) chỉ chạy lúc lưu và lúc thử mapping, không chạy ở đường nhận callback. Xem lại bằng số đo `NFR1.24` nếu `PATTERN` làm đường nhận chậm.

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/nfr-requirements/performance-requirements.md` (performance-requirements: NFR1.21 đến NFR1.28), `scalability-requirements.md` (NFR1.29), `security-requirements.md` (NFR3.27), `tech-stack-decisions.md` (tech-stack-decisions)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/functional-design/rules.md` (rules: BR14.1 đến BR14.5, BR15.1 đến BR15.5, BR17.3, BR18.1, BR18.3, BR19.1 đến BR19.7, BR22.1, BR22.3, BR22.4) và `functional-spec.md` (functional-spec: W16, W18, W20 đến W23, W25)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/nfr-design/nfr-design-questions.md` (Q3 A, Q4 A, Q5 A, giả định 4 đến 10, 18, 20, 21)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-design/performance-design.md` (đường đi nóng, chỉ mục nền, phân trang, rủi ro NFR1.6)
- `tpp-simulator-app/src/main/resources/db/migration/V1__init_schema.sql`, `tpp-simulator-app/src/main/java/com/tpp/simulator/ledger/CallbackLedger.java`, `.../ingestion/CallbackIngestionService.java`, `.../web/RequestSizeLimitFilter.java`, `tpp-simulator-app/src/test/java/com/tpp/simulator/ledger/QueryPlanTest.java` (mã U1, chỉ đọc)

## Assumptions & Open Questions

- **Chưa kiểm chứng trên máy này (không có PostgreSQL ở phiên thiết kế):** (a) bộ lập kế hoạch thật sự chọn `ix_callbacks_rejection_received` với tham số `rejection_reason = :r` (lập luận suy ra `IS NOT NULL` dựa vào tài liệu PostgreSQL); kiểm thử `ListQueryPlanTest` ở Code Generation là bằng chứng, nếu không đạt thì đổi sang chỉ mục đầy đủ cho `rejection_reason` mà không đổi hợp đồng; (b) 30.000 dòng `callbacks` và khoảng 7.500 dòng `transactions` (đã `ANALYZE`) đủ để bộ lập kế hoạch chọn chỉ mục (giả định 8 đã chấp nhận; nếu `transactions` vẫn cho `Seq Scan` hợp lý ở cỡ này thì tăng số dòng mà không đổi khẳng định); (c) ước lượng 5 đến 15 phút cho công cụ nạp là suy luận, chưa đo.
- **`synchronous_commit = off` (bước 0 của `PD-08`)** là phương án giảm nhẹ tôi thêm, nằm ngoài ba giới hạn của `NFR1.26` nhưng không đụng quy tắc nghiệp vụ nào; chỉ dùng nếu đo thấy trên 30 phút. Bạn có thể bỏ nó và đi thẳng tới gom lô.
- **Bộ lọc thời gian kẹp vào 0001 đến 9999 (`PD-05`)** và **`page` rất lớn trả trang rỗng thay vì 400 (`PD-04`)** là chi tiết thiết kế để không sinh `500`; cả hai phù hợp BR19.3 và BR19.4 (chỉ giá trị không phải ISO 8601 hoặc không phải số nguyên từ 1 trở lên mới bị 400).
- **Giây vắng trong `receivedFrom`/`receivedTo` (ví dụ `2026-10-19T11:00Z`)** được coi là `:00` không có phần thập phân (bộ đọc ISO chuẩn nhận dạng này). Functional Design không nêu riêng trường hợp này.
- **Không phân biệt hoa thường với ký tự ngoài ASCII (`PD-02`):** `lower()` của PostgreSQL theo `LC_CTYPE` của database. Với ký tự ASCII luôn đúng; với chữ có dấu tiếng Việt, kết quả đúng chỉ khi database dùng locale UTF-8 (cài đặt thường gặp). Functional Design (BR19.1) không nêu locale; thiết kế không thêm cột chuẩn hóa hay chỉ mục riêng. Nếu database của bạn dùng locale `C`, bộ lọc chuỗi chứa chỉ không phân biệt hoa thường với ASCII.
- **Tên script và tham số** (`-Samples`, `-Warmup`, `-PostgresVersion`) do tôi đặt theo `NFR1.21`; Code Generation có thể đổi tên nhưng giữ trong `tpp-simulator-app/scripts/`.
- Không có câu hỏi mở nào khác.
