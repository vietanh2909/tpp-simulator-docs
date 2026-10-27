# Thiết kế quan sát: U2 `u2-backend-core`

> Nguồn: `observability-requirements.md` (NFR5.21 đến NFR5.24), `security-requirements.md` (NFR3.21, NFR3.24, NFR3.26), `reliability-requirements.md` (NFR2.26, NFR2.27) của U2; `rules.md` của U2 (BR14.8 đến BR14.10, BR15.6, BR22.4, BR22.5) và `functional-spec.md` (W16, W18, W25); thiết kế quan sát của U1; các quyết định giả định 12, 15 trong `nfr-design-questions.md` của U2. Mức thiết kế: mẫu và quyết định.
>
> **Quy ước mã.** Quyết định đánh số `OD-nn`, mỗi quyết định ghi NFR và quy tắc nó thỏa. Tệp mở rộng `observability-design.md` của U1 và không mâu thuẫn với nó, trừ chỗ ghi "thay thế" ở bảng dưới.

## Phạm vi

Giữ nguyên U1: nhật ký đủ để chẩn đoán "callback có đến không, vì sao bị từ chối", cộng `GET /actuator/health`. Không số liệu đo, truy vết, bảng điều khiển, cảnh báo, SLI/SLO, tệp nhật ký xoay vòng, mã tương quan (`NFR5.23`). Lịch sử trong cơ sở dữ liệu (nay gồm cả lần nhận bị từ chối) và màn hình theo dõi của U4 là công cụ chẩn đoán chính.

## Quan hệ với thiết kế của U1

| Nội dung của U1 | Tình trạng ở U2 |
|---|---|
| `GET /actuator/health`: `UP`/`DOWN` theo kết nối cơ sở dữ liệu; Actuator chỉ mở `health` (NFR5.3, NFR3.7) | **Giữ nguyên**, là điểm kiểm tra duy nhất (`OD-04`) |
| Nhật ký văn bản ra console, thời điểm UTC, mức, tên lớp, mức mặc định INFO (NFR5.4) | **Giữ nguyên**, `application.yml` không đổi |
| Dòng `Callback accepted: ...` ở `CallbackIngestionService` và dòng `Request rejected: ...` ở `RequestSizeLimitFilter`/`ApiExceptionAdvice` cho endpoint callback (NFR5.5) | **Bị thay thế** bằng đúng **một** dòng `Callback request: ...` do tầng `web` ghi (`OD-01`, `OD-02`). Mã `DbErrors.logWriteFailure` của đường nhận callback cũng bỏ, để không có dòng ERROR thứ hai cho cùng request |
| Tên kết quả `SUCCESS`, `MAPPING_ERROR` và quy tắc không log payload, header, khóa | **Giữ** |
| Dòng INFO `Service created` | **Giữ**; U2 thêm dòng tương tự cho sửa, bật/tắt, xóa mềm (`OD-06`) |

## Một dòng nhật ký cho mỗi request tới endpoint callback (NFR5.21)

**`OD-01`: một mục nhật ký tích lũy theo request, phát ra đúng một lần ở khối `finally`.** Thỏa `NFR5.21`; BR14.8 đến BR14.10, BR15.6.

- Kiểu `CallbackLogEntry` (gói `web`) được tạo ở đầu `CallbackController` (và ở `RequestSizeLimitFilter` cho nhánh `413`); các bước điền dần các trường đã biết: mã dịch vụ đã làm sạch, `recordId`, `outcome` hoặc `rejectionReason`, mã HTTP đã trả, và khi lỗi thì lớp ngoại lệ cùng SQLSTATE **lấy từ `IngestionResult`** (`WriteStatus` khác `WRITTEN`; `CallbackIngestionService` đã bắt lỗi kho, `reliability-design.md` `RD-02`). `CallbackAccessLog.emit(entry)` chạy trong `finally`, có cờ idempotent nên gọi hai lần vẫn chỉ ghi một dòng.
- **Controller chỉ ánh xạ `IngestionResult` sang response HTTP và tự dựng response cho endpoint callback** (mọi nhánh, kể cả lỗi; nó không bắt lỗi ghi của riêng nó) nên `ApiExceptionAdvice` không bao giờ thấy ngoại lệ của đường này và không ghi dòng `Request rejected` thứ hai. Lỗi đọc thân (`IOException`) và ngoại lệ không dự đoán không thuộc kho (lưới an toàn cuối của controller) thành `500` cùng dòng ERROR duy nhất.
- Kiểu `CallbackLogEntry` chỉ có phương thức nhận chuỗi mã dịch vụ, `Long recordId`, kiểu liệt kê `outcome`/`rejectionReason`, `int` mã HTTP và `Throwable` (chỉ lấy tên lớp và SQLSTATE bằng `DbErrors.sqlState`). Nó không nhận header, thân hay khóa (`security-design.md`, `SD-04`).
- Công cụ nạp đi vào ngay dịch vụ nhận callback, **không** qua controller, nên không phát sinh dòng này (`OD-05`, `NFR5.24`).

**`OD-02`: định dạng, mức, thứ tự trường, tên logger.** Thỏa `NFR5.21`, `NFR5.22`, `NFR3.24`.

- Logger: `com.tpp.simulator.web.CallbackAccessLog` (một lớp, một logger; tên này là thứ kiểm thử `NFR5.22` dùng để đếm). Mẫu thông điệp: `Callback request: service={} [recordId={}] [outcome={} | rejectionReason={}] httpStatus={} [exception={} sqlState={}]`. Trường vắng thì **bỏ cả khóa** (không in `-`), thứ tự khóa cố định như trên. Mọi giá trị chuỗi do bên gọi cung cấp (mã dịch vụ) đi qua `LogSanitizer.clean` (ký tự điều khiển thành khoảng trắng, cắt 100 ký tự); `outcome`/`rejectionReason` là kiểu liệt kê nên không chứa dữ liệu bên gọi. Dòng cuối của `pattern` giữ `%msg%n` của U1.
- Mức và nội dung theo tình huống:

| Tình huống | Mức | Trường có mặt |
|---|---|---|
| Callback được chấp nhận (`SUCCESS`, `MAPPING_ERROR`) | INFO | `service`, `recordId`, `outcome`, `httpStatus` |
| Lần nhận bị từ chối đã ghi (sáu lý do) | INFO | `service`, `recordId`, `rejectionReason`, `httpStatus` |
| `413 PAYLOAD_TOO_LARGE` | INFO | `service`, `httpStatus` (vắng `recordId`, `outcome`, `rejectionReason`) |
| Mã dịch vụ chưa từng có (`404`) | INFO | `service`, `httpStatus` |
| Khối (B): lỗi ghi callback được chấp nhận → `500` | **ERROR** | `service`, `outcome` (kết quả ánh xạ đã biết), `httpStatus=500`, `exception`, `sqlState` |
| Khối (C): lỗi ghi lần nhận bị từ chối → mã gốc + header | **ERROR** (thay dòng INFO) | `service`, `rejectionReason`, `httpStatus` (mã gốc), `exception`, `sqlState` |
| Khối (A): không đọc được dịch vụ → `500` | **ERROR** | `service`, `httpStatus=500`, `exception`, `sqlState` (vắng `recordId`, `outcome`, `rejectionReason`) |

- Không bao giờ ghi body, tên hay giá trị header, khóa đúng hoặc sai, hay thông điệp thô của kho dữ liệu; không truyền ngoại lệ làm tham số cuối của lệnh gọi log (`SD-05`). Đường lỗi dùng `exception` (tên lớp) và `sqlState`; khi ngoại lệ không mang SQLSTATE (ví dụ hết thời gian chờ lấy kết nối của HikariCP, `DbErrors.sqlState` trả `-`) thì **bỏ khóa `sqlState`** thay vì in `-`.
- **Kiểm chứng (`NFR5.21`)**, kiểm thử tích hợp gắn một appender trong bộ nhớ (`ListAppender` của `logback-core`, sẵn có qua `spring-boot-starter-logging`, không phụ thuộc mới) vào logger trên: cho từng trường hợp `SUCCESS`, `MAPPING_ERROR`, từng lý do trong sáu lý do `REJECTED`, `413`, mã dịch vụ chưa từng có (`404`), và hai cách gây lỗi: (1) *đọc được ảnh dịch vụ, ghi lỗi* bằng `FailureTrigger` trên `callbacks` (callback được chấp nhận → `500`; callback sai khóa → `401` kèm header); (2) *đọc ảnh dịch vụ lỗi* bằng pool không kết nối được (`500` không header, dòng ERROR không có `recordId`, `outcome`, `rejectionReason`). Mỗi request cho **đúng một** sự kiện của logger, đủ trường, đúng mức, và quét như `SD-10` không thấy giá trị nhạy cảm.

## Khối lượng nhật ký khi cơ sở dữ liệu mất (NFR5.22)

**`OD-03`: mỗi request một dòng ERROR, không gộp, không giới hạn tần suất.** Thỏa `NFR5.22`; BR14.9.

- Không có bộ gộp, bộ giới hạn tần suất hay tệp xoay vòng; chỉ console như U1. Ở khoảng 5 request/giây khối lượng này nhỏ; mỗi dòng ngắn (không vết ngăn xếp, `OD-02`).
- **Cách kiểm thử:** dùng hạ tầng kiểm thử độ tin cậy của U1 (`TcpProxy` bị ngắt hoặc pool trỏ địa chỉ hỏng) để làm kho không kết nối được; gửi **20 request callback song song** (20 luồng chờ ở một rào chắn rồi thả cùng lúc), nên tổng thời gian chỉ cỡ một lần chờ kết nối của HikariCP (khoảng 5 giây cộng dư địa) thay vì khoảng 100 giây nếu gửi tuần tự. Nếu cần, kiểm thử này được rút ngắn thời gian chờ lấy kết nối bằng thuộc tính của **ngữ cảnh kiểm thử** (không đổi giá trị 5000 ms của ứng dụng, `NFR2.4` của U1).
- **Phạm vi đếm:** chỉ các sự kiện có `loggerName` bằng `com.tpp.simulator.web.CallbackAccessLog` và mức ERROR; loại trừ mọi dòng WARN/ERROR do Hikari, Spring hay JDBC tự ghi. Khẳng định đúng **20** sự kiện như vậy, mỗi sự kiện một dòng vật lý (không chứa `\n`), khớp mẫu `^Callback request: service=\S+ httpStatus=500 exception=\S+( sqlState=\S+)?$` (vắng `recordId`, `outcome`, `rejectionReason`; `sqlState` có thể vắng khi hết thời gian chờ pool), không trùng, không bỏ sót, và không sự kiện INFO nào của logger này cho các request đó.

## Không thêm công cụ quan sát (NFR5.23)

**`OD-04`: `health` vẫn là điểm kiểm tra duy nhất.** Thỏa `NFR5.23`. `pom.xml` không thêm registry hay exporter số liệu, thư viện truy vết, hay bộ quan sát; `management.endpoints.web.exposure.include` vẫn là `health` với `show-details: never`. Kiểm thử Actuator của U1 (`env`, `beans`, `heapdump`, `metrics`... trả `404`) giữ nguyên và xanh; rà soát khi duyệt: `git diff` của `pom.xml` không có `<dependency>` mới (`logical-components.md`, `LC-09`).

## Đầu ra của công cụ nạp (NFR5.24)

**`OD-05`: tiến độ mỗi 10.000 callback, một dòng tổng kết, không nhật ký theo từng lần nhận.** Thỏa `NFR5.24`, `NFR2.27`, `NFR3.26`; BR22.4, BR22.5.

- Lớp `LoadReport` (gói `loadtool`) ghi ra `PrintStream` được tiêm (stdout cho tiến độ và tổng kết, stderr cho lỗi và từ chối), nên kiểm thử bắt được đầu ra. Ngưỡng tiến độ (`progressInterval`, mặc định 10.000) truyền từ ngoài để kiểm thử đơn vị đổi thành giá trị nhỏ.
- Ba dòng, bằng chữ cố định, không chứa payload, khóa hay mật khẩu:
  - tiến độ: `Load progress: callbacks=<n> target=<tổng>` mỗi khi số Callback đã commit của lần chạy chia hết cho ngưỡng;
  - tổng kết (thoát mã 0, đúng **bốn** trường): `Load finished: callbacks=<n> transactions=<n> durationSeconds=<s> callbacksPerSecond=<r>`, với `callbacks` là `SELECT count(*) FROM callbacks` và `transactions` là `SELECT count(*) FROM transactions` của database đích (không phải bộ đếm trong bộ nhớ); `pg_database_size` không nằm trong dòng này mà do Build and Test ghi riêng (`SC-08`);
  - lỗi giữa chừng (stderr, thoát mã 1): `Load failed: callbacks=<count(*)> writtenThisRun=<n> writeStatus=<ACCEPTED_WRITE_FAILED|REJECTED_RECORD_FAILED|SNAPSHOT_READ_FAILED|UNEXPECTED> reason=<lớp ngoại lệ> sqlState=<mã>`, với `writeStatus` lấy từ `IngestionResult` của lần nhận đầu tiên không được ghi (mọi giá trị khác `WRITTEN` là lỗi đầu tiên, `RD-07`; `UNEXPECTED` cho ngoại lệ bất ngờ ngoài `WriteStatus`) và `writtenThisRun` chỉ đếm các lần nhận có `WriteStatus = WRITTEN`; từ chối trước khi ghi (stderr, thoát mã 2): `Load refused: <lý do bằng chữ cố định>` kèm quy tắc đặt tên khi tên database sai và câu lệnh tạo database khi không tạo được (`SD-07`).
- **Không có dòng nhật ký theo từng lần nhận** (không sinh 100.000 dòng) và dòng `Callback request` không phát sinh. Ngữ cảnh Spring của công cụ đặt mức `WARN` cho `com.tpp.simulator`, `org.flywaydb`, `com.zaxxer.hikari`, và tắt biểu ngữ khởi động, nên đầu ra gần như chỉ là ba dòng trên.
- **Kiểm chứng:** kiểm thử tích hợp nạp quy mô nhỏ (500 callback, hai dịch vụ) khẳng định đúng một dòng tổng kết với bốn trường, **không** có dòng tiến độ (dưới 10.000), quét đầu ra không có payload hay giá trị bí mật; kiểm thử đơn vị `LoadReport` với `progressInterval = 100` khẳng định có dòng tiến độ ở mỗi bội số của 100; kiểm thử lỗi giữa chừng đi qua `CallbackIngestionService` thật (`RD-07`, hai ca chấp nhận và từ chối) khẳng định dòng `Load failed` với `writeStatus` tương ứng (`ACCEPTED_WRITE_FAILED`, `REJECTED_RECORD_FAILED`).

## Nhật ký API quản lý

**`OD-06`: dòng INFO ngắn cho thao tác ghi dịch vụ.** Hỗ trợ `NFR3.21`. Ngoài dòng `Service created` của U1, thêm cùng dạng cho `Service updated: service={} version={}` (số phiên bản hiện hành sau lần sửa), `Service enabled changed: service={} enabled={}`, `Service deleted: service={}`; mã dịch vụ qua `LogSanitizer.clean`, không có cấu hình, khóa hay header. Lỗi ghi và hết thời gian chờ khóa của các thao tác này đi qua `ApiExceptionAdvice` thành một dòng ERROR theo `DbErrors` (lớp ngoại lệ và SQLSTATE, không thông điệp). Không có yêu cầu riêng ở `NFR5`; đây là mức tối thiểu để người dùng thấy ai đổi gì trên máy local.

## Kiểm tra sức khỏe và tương quan

Không đổi so với U1: `GET /actuator/health` trả `UP` khi kết nối được cơ sở dữ liệu và `DOWN` khi không; `recordId` trong dòng nhật ký là khóa nối với bản ghi trong cơ sở dữ liệu nên không cần mã tương quan.

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/nfr-requirements/observability-requirements.md` (observability-requirements: NFR5.21 đến NFR5.24), `security-requirements.md` (NFR3.21, NFR3.24, NFR3.26) và `reliability-requirements.md` (NFR2.26, NFR2.27)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/functional-design/rules.md` (rules: BR14.8 đến BR14.10, BR15.6, BR22.4, BR22.5) và `functional-spec.md` (functional-spec: W16, W18, W25)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/nfr-design/nfr-design-questions.md` (giả định 12, 15)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-design/observability-design.md` (NFR5.3 đến NFR5.5, bảng nội dung nhật ký chuẩn)
- `tpp-simulator-app/src/main/java/com/tpp/simulator/ingestion/CallbackIngestionService.java`, `.../web/RequestSizeLimitFilter.java`, `.../web/ApiExceptionAdvice.java`, `.../config/DbErrors.java`, `.../config/LogSanitizer.java`, `tpp-simulator-app/src/main/resources/application.yml` (mã U1, chỉ đọc)

## Assumptions & Open Questions

- **Trường vắng thì bỏ khóa, không in `-`** là cách tôi hiểu chữ "vắng" của BR14.10 và `NFR5.21`; nếu bạn muốn vị trí cố định (in `-`), đổi ở `CallbackAccessLog` mà không ảnh hưởng thiết kế còn lại (kiểm thử mẫu dòng đổi theo).
- **Dòng ERROR của khối (B) có `outcome`** (kết quả ánh xạ đã biết trước khi ghi) dù bản ghi không được lưu; đúng với "các trường mà lúc đó đã biết" của BR14.10, nhưng người đọc có thể hiểu nhầm `outcome=SUCCESS httpStatus=500`; ghi chú trong README mục chẩn đoán.
- **Cách làm kho không kết nối được trong kiểm thử `NFR5.22`** (proxy hay pool hỏng, rút ngắn thời gian chờ hay không) để Code Generation chọn theo hạ tầng kiểm thử độ tin cậy sẵn có; yêu cầu là 20 request song song, đếm theo tên logger.
- **`OD-06` (dòng INFO cho sửa, bật/tắt, xóa)** là bổ sung của tôi ngoài yêu cầu; bỏ được mà không ảnh hưởng NFR nào.
- Không có câu hỏi mở nào khác.
