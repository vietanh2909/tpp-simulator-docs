# Thiết kế khả năng mở rộng và đồng thời: U2 `u2-backend-core`

> Nguồn: `scalability-requirements.md` (NFR1.29, NFR2.21 đến NFR2.25, NFR7.21, NFR7.22), `reliability-requirements.md` (NFR2.30), `tech-stack-decisions.md` của U2; `rules.md` của U2 (BR12.4 đến BR12.7, BR13.2 đến BR13.4, BR14.1, BR20.1 đến BR20.3, BR21.1 đến BR21.5) và `functional-spec.md` (W12 đến W14, W16, W24); thiết kế khả năng mở rộng của U1; các quyết định cuối Q1 A và giả định 1, 2, 21 trong `nfr-design-questions.md` của U2. Mức thiết kế: mẫu và quyết định, đoạn mã chỉ minh họa.
>
> **Quy ước mã.** Quyết định đánh số `SC-nn`, mỗi quyết định ghi NFR và quy tắc nó thỏa. Tệp mở rộng `scalability-design.md` của U1 (một bản backend, một cơ sở dữ liệu, một câu `INSERT ... ON CONFLICT` cho gom giao dịch, READ COMMITTED đủ cho mẫu đó) và không mâu thuẫn với nó.

## Quan hệ với thiết kế của U1

| Nội dung của U1 | Tình trạng ở U2 |
|---|---|
| Kiến trúc một bản backend, không bộ nhớ đệm phân tán, không hàng đợi; dung lượng 100.000 callback, khoảng 5 giao dịch/giây, đỉnh 50 đồng thời | **Giữ** (`SC-08`) |
| Một câu thêm-hoặc-cập-nhật-có-điều-kiện cho `transactions`, so sánh cặp (`receivedAt`, `recordId`) | **Giữ nguyên câu lệnh**; U2 chứng minh nó ở quy mô 50 (`SC-03`, `SC-05`) |
| Mở rộng bằng cấu hình (dịch vụ mới là dữ liệu) | **Giữ**; U2 thêm ba dịch vụ mẫu và hai script (`SC-06`, `SC-07`) |
| Kiểm thử đồng thời của U1 (hai luồng ghi cùng cặp khóa; N lần ghi song song) | **Giữ, không làm yếu** (`NFR2.23`, `SC-03`) |
| Kiểm chứng 50 đồng thời do U2 đảm nhận | **Thực hiện bằng một script chạy tay** (`SC-05`), không kiểm thử tự động mới (Q2 C) |

## Tuần tự hóa sửa, bật/tắt, xóa mềm theo từng dịch vụ (NFR2.24)

**`SC-01`: khóa dòng `FOR NO KEY UPDATE` trên dòng `services`, là câu dữ liệu đầu tiên của giao dịch (Q1 A).** Thỏa `NFR2.24`, `NFR2.30`; BR12.5, BR12.6, BR13.2 đến BR13.4.

Ba thao tác `PUT /api/services/{serviceCode}`, `PUT .../enabled`, `DELETE /api/services/{serviceCode}` của **cùng** một dịch vụ dùng chung một phần tuần tự hóa; thao tác của dịch vụ khác không chờ khóa của nhau; nhận callback **không chờ khóa dòng** này (kiểm tra khóa ngoại không xung đột với khóa dòng, bảng dưới). Chữ "không chờ" chỉ nói về **khóa dòng**: mỗi thao tác đang xếp hàng vẫn giữ một kết nối pool, nên callback vẫn có thể chờ ở **pool** khi rất nhiều thao tác cùng dịch vụ xếp hàng (mục "Đói pool" dưới đây). Cơ chế là khóa dòng của PostgreSQL, không phải khóa trong bộ nhớ ứng dụng, nên đúng cả khi có nhiều tiến trình dùng chung cơ sở dữ liệu.

```sql
-- giao dịch READ COMMITTED (mặc định, KHÔNG nâng lên REPEATABLE READ)
SET LOCAL lock_timeout = '5s';          -- không đọc/ghi dữ liệu; đặt ngay trước câu khóa
SELECT s.service_code, s.enabled, s.deleted, s.auth_type, s.api_key_header_name,
       (s.api_key_secret IS NOT NULL) AS api_key_configured, s.current_version_number
  FROM services s
 WHERE lower(s.service_code) = lower(:code)       -- khớp không phân biệt hoa thường, dùng ux_services_service_code_lower
   FOR NO KEY UPDATE;
```

Vì sao `FOR NO KEY UPDATE`:

| Thao tác khác trên dòng `services` | Xung đột với `FOR NO KEY UPDATE`? | Hệ quả |
|---|---|---|
| Sửa, bật/tắt, xóa mềm cùng dịch vụ | Có | Xếp hàng theo thứ tự, mỗi giao dịch thấy trạng thái đã commit mới nhất |
| Kiểm tra khóa ngoại của callback đang ghi (`FOR KEY SHARE` trên `services`) | **Không** | Nhận callback không phải chờ khóa dòng (có thể chờ pool, "Đói pool") |
| Thao tác trên dịch vụ khác | Không (dòng khác) | Không chờ nhau |
| `UPDATE` cột không phải khóa của chính dòng đó (sửa cấu hình) | Tự dùng cùng mức khóa | Không nâng lên `FOR UPDATE` |

Thiết kế cố ý **không dùng** `FOR UPDATE` (nó chặn kiểm tra khóa ngoại của callback), khóa tư vấn băm (khóa theo băm có thể làm hai dịch vụ chờ nhau nhầm, và nằm ngoài dữ liệu) hay khóa lạc quan (trái BR12.6 "người lưu sau thắng").

Trình tự của **sửa** (W12), mọi bước 2 đến 7 trong **một** giao dịch, dùng **một** kết nối:

1. Ngoài giao dịch: kiểm tra `415`, thân JSON hỏng hoặc không phải object, trường sai kiểu (BR13.2, BR13.6). Không phụ thuộc trạng thái dịch vụ.
2. Mở giao dịch, `SET LOCAL lock_timeout`, câu khóa ở trên.
3. Không có dòng hoặc `deleted = true` → `404 SERVICE_NOT_FOUND`, hủy giao dịch (nhả khóa ngay). (BR13.4, BR12.6 bước 1.)
4. Đọc phiên bản hiện hành: `SELECT ... FROM service_config_versions WHERE service_code = :c AND version_number = :n` trong cùng giao dịch (số `n` lấy từ dòng đã khóa).
5. Kiểm tra từng trường theo BR11.x và BR12.3, dùng `auth_type` và `api_key_configured` của **dòng đã khóa** (không dùng dữ liệu biểu mẫu hay lần đọc trước). Có lỗi → `400 VALIDATION_FAILED` gom mọi lỗi, hủy giao dịch (BR12.2, BR12.6 bước 2).
6. So sánh BR12.4 từng trường đã chuẩn hóa (bước 3 của BR12.6). Cần phiên bản mới thì số mới là `current_version_number + 1` **đọc sau khi đã khóa**.
7. Ghi (bước 4 của BR12.6): `UPDATE services` chỉ các cột cấu hình, `current_version_number` và `updated_at` (không bao giờ `enabled`, `deleted`), rồi `INSERT` dòng `service_config_versions`. Ba biến thể câu `UPDATE` (giữ khóa, đặt khóa mới, xóa khóa) là ba hằng riêng để thuộc loại (1) của `SD-03`. Commit nhả khóa.

**Bật/tắt (W13) và xóa mềm (W14)** dùng cùng bước 2, 3 rồi một câu `UPDATE services SET enabled = :v, updated_at = :now` (hoặc `SET deleted = true, ...`); nếu giá trị bật/tắt bằng giá trị hiện tại thì không ghi gì (BR13.2). Nhờ cùng một khóa, một lần sửa tới sau xóa mềm thấy `deleted = true` và trả `404` mà không sinh phiên bản; một lần sửa tới sau bật/tắt không ghi đè `enabled` vì lần sửa không bao giờ ghi cột đó.

Ràng buộc duy nhất (`service_code`, `version_number`) là lưới an toàn thứ hai: nếu nhờ lỗi mã nào đó hai giao dịch cùng sinh một số phiên bản, một bên lỗi `500` thay vì trùng lặng lẽ.

**Giữ hai điều kiện để không tự khóa chết:** (1) trong giao dịch sửa chỉ dùng `JdbcClient` gắn giao dịch (cùng một kết nối), không gọi `findSnapshot`, `get` hay bất kỳ phương thức nào mở kết nối thứ hai; vì pool chỉ 10 kết nối, nếu giao dịch giữ khóa lại xin thêm một kết nối thì 10 giao dịch chờ khóa có thể cạn pool và không ai tiến được. (2) Việc chờ khóa tối đa 5 giây (`lock_timeout`, khớp thời gian chờ pool); hết hạn thì SQLSTATE `55P03` → `500 INTERNAL_ERROR` kèm `X-Simulator-Error` (`SD-05`).

**Đói pool (hệ quả đã biết của khóa dòng, tách khỏi khóa ngoại).** Một giao dịch sửa đang chờ khóa dòng **vẫn giữ một kết nối** của pool 10 cho tới khi lấy được khóa hoặc hết `lock_timeout`. Khi `n` thao tác sửa/bật-tắt/xóa của cùng một dịch vụ đang xếp hàng, `n` kết nối bị chiếm (1 đang chạy, `n - 1` đang chờ khóa). Từ khoảng `n = 10` pool cạn: callback và API của **bất kỳ** dịch vụ nào chờ ở pool (tối đa 5 giây rồi `500`, `SC-04`), dù không bị khóa dòng nào chặn. Thiết kế **chấp nhận** điều này vì người dùng duy nhất của công cụ local không tạo 10 thao tác sửa cùng dịch vụ trong lúc nhận callback, và vì không có lựa chọn rẻ hơn: giữ khóa tư vấn hay hàng đợi trong ứng dụng đều trái lựa chọn đã chốt Q1 A (khóa nằm ở dữ liệu). Hai điều kiện không tự khóa chết ở trên (một kết nối cho mỗi giao dịch sửa, `lock_timeout` 5 giây) bảo đảm đói pool tự hết sau tối đa 5 giây, không bao giờ thành khóa chết. Câu "nhận callback không chờ" ở mọi tệp thiết kế của U2 phải đọc là "không chờ **khóa dòng**"; `logical-components.md` `LC-05` và `LC-06` nêu cùng ý.

**Kiểm chứng (`NFR2.24`)**, ba kiểm thử tích hợp tự động trong `mvn verify`. Hai ý định được **tách riêng** để một ca không trộn ảnh hưởng của khóa dòng với tranh chấp pool (kiểu trộn đó có thể chập chờn trên CI chậm):

- **Sửa song song (đúng chỉ tiêu `NFR2.24`; ca này có đói pool tạm thời và vì vậy **không** dùng ngưỡng 1 giây cho callback nền, xem ca phụ bên dưới):** 30 luồng (thả bằng một rào chắn) cùng `PUT` một dịch vụ, mỗi lần một `responseBody` khác nhau. Kỳ vọng: 30 phản hồi `200`; đúng 31 phiên bản, số 1 đến 31 liên tục, không trùng; `currentVersionNumber = 31`; cấu hình hiện hành bằng cấu hình của phiên bản 31. Không chỉ tiêu thời gian riêng. 30 luồng lớn hơn pool 10 nên ca này cố ý có đói pool tạm thời; mỗi lần sửa chỉ cỡ chục mili giây nên hàng đợi hết nhanh, dưới ngưỡng chờ pool 5 giây.
- **`FOR NO KEY UPDATE` không chặn kiểm tra khóa ngoại của callback (ca chính của ý định này), số thao tác sửa đang chờ nhỏ hơn kích thước pool:** kiểm thử tự giữ khóa dòng của dịch vụ bằng **một kết nối riêng ngoài pool của backend** (`TestDatabase`: `BEGIN; SELECT ... FOR NO KEY UPDATE` trên dòng đó) trong khoảng 2 giây (nhỏ hơn `lock_timeout` 5 giây). Trong lúc đó **5** luồng `PUT` (con số cố định, nhỏ hơn 10) xếp hàng chờ khóa, rồi một luồng nền gửi callback liên tục tới chính dịch vụ này. Số kết nối pool bị chiếm tối đa là 5 (sửa đang chờ) cộng 1 (callback) bằng 6, **nhỏ hơn 10**, nên callback không thể chờ ở pool và mọi chậm trễ nếu có chỉ có thể đến từ khóa ngoại. Kỳ vọng: mọi callback trả đúng response đã cấu hình, mỗi cái **dưới 1 giây**, ít nhất 10 callback hoàn tất khi khóa còn bị giữ (chứng minh chúng không chờ khóa); sau khi nhả khóa 5 lần sửa đều `200`, số phiên bản liên tục `1..6`, và mọi `config_version_id` của callback đã ghi trỏ tới một phiên bản có thật (ảnh dịch vụ không bao giờ ở trạng thái ghi dở). Chọn cách này (số thao tác chờ nhỏ hơn pool) làm ca chính thay vì chỉ nới ngưỡng, vì nó giữ **ngưỡng chặt** `1 giây` có ý nghĩa: nếu có hồi quy sang `FOR UPDATE`, callback sẽ chờ đúng khoảng giữ khóa 2 giây và kiểm thử đỏ, còn ngưỡng lỏng (ví dụ dưới 3 giây) sẽ không phân biệt được hồi quy đó với một CI chậm.
- **Ca phụ trong kiểm thử 30 sửa song song, đói pool được ghi nhận (ngưỡng đã nới, không còn 1 giây):** thêm một luồng nền gửi callback liên tục tới chính dịch vụ; vì số thao tác chờ có thể vượt pool nên **không** dùng ngưỡng 1 giây. Chỉ khẳng định: mọi callback trả `200` đúng response đã cấu hình, **không `500`** và mỗi cái **dưới 3 giây** (ngưỡng lỏng, thấp hơn 5 giây chờ pool để vẫn bắt được hồi quy nặng), mọi `config_version_id` đã ghi trỏ tới phiên bản có thật. Lý do nới: trong ca này khóa dòng và tranh chấp pool cùng tác động, nên ngưỡng 1 giây sẽ đo nhầm đói pool và có thể chập chờn trên CI chậm; ý định "không chặn khóa ngoại" đã có ca chính ở trên.
- **Sửa chạy đua với xóa mềm:** một `DELETE` và 10 `PUT` đồng thời; kỳ vọng `deleted = true` và số phiên bản bằng `1 + số phản hồi 200`, không phiên bản nào cho dịch vụ đã xóa sau thời điểm xóa. (Mười một thao tác cùng dịch vụ có thể chiếm hết pool trong chốc lát; ca này chỉ khẳng định tính đúng, không thời gian.)

## Nhận callback không khóa và gom giao dịch dưới 50 đồng thời

**`SC-02`: đường nhận callback không bao giờ dùng `FOR ...` trên `services`.** Thỏa `NFR2.24` (phần "không làm chậm nhận callback"); BR12.6, BR14.1.

- Ảnh dịch vụ là **một** truy vấn đọc thường, tự động hoàn tất, nối `services` và `service_config_versions` trong cùng một câu lệnh (một ảnh nhất quán). Vì lần sửa ghi `UPDATE services` và `INSERT` phiên bản trong cùng một giao dịch, callback đọc hoặc phiên bản cũ nguyên vẹn hoặc phiên bản mới nguyên vẹn, không bao giờ nửa vời.
- Callback ghi `callbacks` và `transactions` chỉ lấy `FOR KEY SHARE` (qua kiểm tra khóa ngoại) trên `services` và `service_config_versions`; lần sửa chỉ `UPDATE` cột không phải khóa và chỉ `INSERT` phiên bản mới, nên không có cặp khóa nào xung đột. Giao dịch callback chỉ giữ khóa dòng `transactions` (một dòng) từ câu `UPSERT` tới commit; câu đó là câu cuối nên khóa ngắn.

**`SC-03`: 50 đồng thời cùng giao dịch và khác giao dịch dựa nguyên vào mẫu của U1.** Thỏa `NFR2.23`; BR20.1 đến BR20.3.

- Không đổi câu `INSERT ... ON CONFLICT (service_code, transaction_id) DO UPDATE` của U1 và mức cô lập READ COMMITTED. 50 callback cùng cặp khóa: một bên thêm, các bên còn lại rơi vào nhánh cập nhật, mỗi cập nhật khóa dòng `transactions` và đánh giá biểu thức theo giá trị đã commit mới nhất, nên `callback_count` đúng 50 và các cột `latest*` luôn đến từ lần nhận có cặp (`receivedAt`, `recordId`) lớn nhất bất kể thứ tự commit (BR20.3). 50 `transactionId` khác nhau chạm 50 dòng khác nhau nên không tranh nhau (BR20.2).
- **Không có khả năng deadlock:** mỗi giao dịch callback khóa theo thứ tự cố định (chèn `callbacks`, rồi `UPSERT` một dòng `transactions`) và chỉ giữ tối đa một khóa dòng `transactions`.
- Lần nhận bị từ chối ghi `callbacks` trong giao dịch riêng, không chạm `transactions` (BR15.3), nên không tranh khóa nào ngoài chèn dòng.
- `TransactionConcurrencyTest` và các kiểm thử đồng thời của U1 chạy nguyên trong `mvn verify`, `scripts/verify.ps1` và CI (`NFR2.23`); U2 không xóa, bỏ qua hay hạ ngưỡng chúng.

**`SC-04`: giữ pool 10 kết nối và chờ 5 giây (`application.yml` không đổi).** Thỏa `NFR2.22`.

- 50 request đến cùng lúc: mỗi request giữ một kết nối hai lần, đều ngắn: lần đọc ảnh dịch vụ (autocommit, trả kết nối ngay) và lần giao dịch ghi (hai câu và commit, vài mili giây). Ánh xạ JSON và che header chạy **ngoài** giao dịch và ngoài lúc giữ kết nối, nên thời gian giữ kết nối không phụ thuộc kích thước payload. Với thời gian giữ cỡ 5 đến 20 ms, 10 kết nối phục vụ 50 request trong dưới nửa giây; lâu nhất một request chờ pool xa dưới 5 giây.
- Ngoại lệ về thời gian giữ kết nối: một thao tác sửa/bật-tắt/xóa **đang chờ khóa dòng** giữ kết nối suốt lúc chờ (tối đa `lock_timeout` 5 giây), nên từ khoảng 10 thao tác cùng một dịch vụ xếp hàng thì pool cạn và request khác chờ ở pool (`SC-01` "Đói pool"). Kịch bản 50 callback của `SC-05` không chứa thao tác sửa nên không chạm tình huống này.
- Số luồng Tomcat mặc định (200) lớn hơn 50 nên không thành nút thắt. Ngưỡng 5 giây chỉ bị chạm nếu thời gian giữ kết nối tăng đột biến; nếu bằng chứng của `NFR2.21` cho thấy `500` hay chờ gần 5 giây, thiết kế điều chỉnh kích thước pool hoặc rút ngắn thời gian giữ kết nối, **không đổi mục tiêu** (`NFR2.22`).
- Bằng chứng là kết quả script `SC-05` (xem bên dưới), không phải số đo trực tiếp hàng đợi của pool (Actuator chỉ mở `health`, `NFR5.23`).

## Kiểm chứng 50 đồng thời bằng một script chạy tay (NFR2.21, NFR2.22)

**`SC-05`: `scripts/check-concurrency.ps1`, một tiến trình, rào chắn bắt đầu chung, đo `maxInFlight`.** Thỏa `NFR2.21`, `NFR2.22`; BR20.1, BR20.2, BR20.3.

- Vị trí `tpp-simulator-app/scripts/check-concurrency.ps1`, Windows PowerShell 5.1, UTF-8 có BOM. Tham số: `-BaseUrl` (mặc định `http://127.0.0.1:8080`), `-Concurrency` (50). Không gọi công cụ nạp.
- **Cơ chế gửi.** Một `System.Net.Http.HttpClient` dùng chung (`Add-Type -AssemblyName System.Net.Http`, `UseProxy = $false`, `Timeout` 30 giây). Trước khi tạo handler, đặt `ServicePointManager.DefaultConnectionLimit = 100` và `Expect100Continue = $false` để chính máy khách không là nút thắt. Tạo 50 pipeline `System.Management.Automation.PowerShell` trong một `RunspacePool` (tối thiểu 50 runspace), mỗi runspace nhận sẵn `HttpClient`, nội dung request đã dựng và một `ManualResetEvent` chung; khối lệnh của mỗi runspace gọi `WaitOne()` rồi mới ghi `Stopwatch.GetTimestamp()` làm điểm bắt đầu, gửi **đồng bộ** (`SendAsync(...).GetAwaiter().GetResult()`), đọc hết thân phản hồi, ghi điểm kết thúc. Thân luồng đã chuẩn bị xong, rồi một lệnh `Set()` thả cả 50 cùng lúc. Script **không** khởi chạy 50 tiến trình `curl.exe` nối tiếp (khởi động tiến trình trên Windows mất hàng chục mili giây, có thể dài hơn một lần nhận callback).
- **`maxInFlight`.** Mỗi request cho một khoảng [bắt đầu, kết thúc] bằng tick của `Stopwatch` (đồng hồ đơn điệu, dùng chung giữa các luồng). Gom tất cả điểm, sắp theo thời gian, khi hòa thì **điểm kết thúc đứng trước điểm bắt đầu** (khoảng chỉ chạm nhau không tính là chồng); quét cộng một ở điểm bắt đầu, trừ một ở điểm kết thúc, lấy cực đại.
- **Luồng một lần chạy.** (0) Kiểm tra `GET /actuator/health` trả `200`, không thì in lỗi và thoát mã 1. (1) Tạo dịch vụ tạm `CONC_<yyyyMMddHHmmss>_<4 ký tự hex>` (`authType` `NONE`, `ISO_8601`, `$.transId`/`$.code`/`$.time`, response `202` thân `{"accepted":true}`). (2) Kịch bản **BR20.1**: 50 callback cùng `transactionId`, mỗi cái một giá trị `code` và `time` riêng. (3) Kịch bản **BR20.2**: 50 `transactionId` khác nhau. (4) Xóa mềm dịch vụ tạm (`DELETE`) và in đường dẫn dọn nếu bước này lỗi. Mỗi kịch bản có đúng một vòng.
- **Tiêu chí chức năng** (đối chiếu qua API công khai, không chạm cơ sở dữ liệu): BR20.1: (a) 50/50 phản hồi đúng mã `202` và đúng thân `{"accepted":true}`, không `500`, không hết thời gian; (b) `GET /api/callbacks?serviceCode=...&transactionId=...&size=100` cho `totalItems = 50`; (c) `GET /api/transactions?serviceCode=...&transactionId=...` cho đúng một giao dịch có `callbackCount = 50`; (d) `latestCallbackId` và `latestStatus` của giao dịch bằng `recordId` và `status` của **dòng đầu** danh sách callback (sắp `receivedAt` giảm dần rồi `recordId` giảm dần). BR20.2: 50/50 đúng phản hồi, đúng 50 giao dịch cho dịch vụ tạm, mỗi cái `callbackCount = 1`, đúng 50 Callback.
- **Kết quả ba mức.** PASS khi mọi tiêu chí chức năng đạt **và** `maxInFlight >= 25`; FAIL khi có tiêu chí chức năng không đạt; INCONCLUSIVE khi chức năng đạt nhưng `maxInFlight < 25` (không có bằng chứng các request chồng nhau). **Mã thoát:** `0` chỉ khi cả hai kịch bản PASS; `1` khi có kịch bản FAIL (hay không kết nối được); `2` khi không có FAIL nhưng có INCONCLUSIVE. Script in cho từng kịch bản: kết quả, các số đếm, `maxInFlight`, thời gian từ request bắt đầu đầu tiên tới kết thúc cuối cùng, thời gian nhỏ nhất/trung vị/lớn nhất mỗi request, và dòng `NFR2.22(c): maxMs=<n> (<5000 đạt|không đạt>)` (không ảnh hưởng mã thoát).
- **Không sửa script để hạ ngưỡng 25 hay chèn độ trễ giả vào backend**; INCONCLUSIVE thì chạy lại. README nêu rõ ý nghĩa INCONCLUSIVE và rằng dịch vụ tạm để lại các Callback không xóa được (chỉ xóa mềm dịch vụ), nên chạy trên database phát triển hoặc `_load`.
- **Rủi ro đã chấp nhận (Q2 C):** không có kiểm thử tự động cho 50 đồng thời nên hồi quy không bị bắt tự động (khuyến nghị chạy lại script sau mọi thay đổi đường ghi); một lần xanh không chứng minh không có lỗi đua hiếm; `maxInFlight` đo ở phía máy khách nên không chứng minh số request tranh nhau trong cơ sở dữ liệu.

## Mở rộng bằng cấu hình: ba dịch vụ mẫu (NFR7.21, NFR7.22)

**`SC-06`: dịch vụ mẫu là dữ liệu trong `docs/samples`, tạo bằng API, không mã riêng.** Thỏa `NFR7.21`; BR21.1 đến BR21.3, BR21.5.

- Tệp trong `tpp-simulator-app/docs/samples/`: `THU_HO.service.json`, `CHI_HO.service.json`, `BIEN_DONG_SO_DU.service.json` (đúng thân của `POST /api/services`, BR21.1) và với mỗi mã hai payload `<mã>.valid.payload.json`, `<mã>.invalid.payload.json` (BR21.2), cùng `README.md` của thư mục có lệnh cURL cho PowerShell (`curl.exe`) và bash (`curl`). Các tệp mẫu của U1 (`thu-ho-service.json`, `thu-ho-callback.json`) được đổi tên theo quy ước này ở Code Generation.
- Cấu hình: `THU_HO` (`NONE`, `ISO_8601`, `$.transId`/`$.code`/`$.time`, `200` `{"code":"00"}`), `CHI_HO` (`API_KEY`, header `X-Api-Key`, khóa giả công khai `sample-key-chi-ho`, `PATTERN` `yyyy-MM-dd HH:mm:ss`, `Asia/Ho_Chi_Minh`, `$.processId`/`$.status`/`$.date`, `200` `{"status":"OK"}`), `BIEN_DONG_SO_DU` (`NONE`, `UNIX_MILLIS`, `$.trnId`/`$.stage`/`$.dateTime`, `202` `{"received":true}`). Khóa mẫu ghi rõ chỉ để thử.
- **Kiểm thử tích hợp tự động `SampleServicesTest`** (`NFR7.21`): đọc **các tệp thật** trong `docs/samples` (đường dẫn tương đối từ gốc module nên thiếu tệp ở bản checkout sạch làm kiểm thử đỏ). Với mỗi `*.service.json`: `POST /api/services` bằng đúng byte của tệp → `201`; gửi payload hợp lệ (kèm `X-Api-Key` cho `CHI_HO`) → đúng mã và thân đã cấu hình, Callback `SUCCESS` với **ba giá trị ánh xạ** mong đợi (hằng trong kiểm thử: `CHI_HO` timestamp `2026-10-19T03:00:00Z`, `BIEN_DONG_SO_DU` timestamp `2025-10-19T05:00:00Z`); gửi payload lỗi → vẫn đúng response đã cấu hình, Callback `MAPPING_ERROR` với đúng trường lỗi; tạo lại cả ba lần hai → `409 SERVICE_CODE_DUPLICATE` và vẫn đúng 3 dịch vụ. `UNIX_SECONDS` không có dịch vụ mẫu mà được phủ bằng kiểm thử của MappingEngine.
- **Khởi động không tự tạo gì (`NFR7.22`, BR21.5):** kiểm thử khởi động ứng dụng trên database trống rồi `GET /api/services` cho mảng rỗng; không bản chuyển Flyway nào `INSERT INTO services`.

**`SC-07`: hai script tạo dịch vụ mẫu, chạy lại được.** Thỏa `NFR7.22`; BR21.4.

- `tpp-simulator-app/scripts/create-sample-services.ps1` (Windows PowerShell 5.1, UTF-8 có BOM) và `create-sample-services.sh` (bash, kết thúc dòng LF, `set -u`, không `-e`). Cùng đọc `docs/samples/*.service.json` theo thứ tự tên tệp. Tham số: `-BaseUrl`/`--base-url` (mặc định `http://127.0.0.1:8080`) và thư mục mẫu (mặc định `docs/samples` tính từ thư mục chứa script).
- Mỗi tệp: `POST /api/services` với thân là **byte UTF-8 của tệp** (PowerShell: `ByteArrayContent` cùng `Content-Type: application/json; charset=utf-8` qua `HttpClient`, tránh việc `Invoke-RestMethod` của 5.1 mã hóa thân chuỗi theo bảng mã hệ thống làm hỏng tiếng Việt; bash: `curl --data-binary @tệp`, mã HTTP lấy bằng `-w '%{http_code}'`).
- `201` → in "đã tạo"; `409` → in "đã tồn tại (hoặc đã bị xóa)" và tiếp tục (với `POST /api/services`, `409` chỉ có thể là `SERVICE_CODE_DUPLICATE`, nên script không cần phân tích thân); mã khác hoặc không kết nối được → ghi nhận lỗi, **vẫn thử các dịch vụ còn lại**. Mã thoát `0` khi mọi dịch vụ ở trạng thái đã tạo hoặc đã tồn tại, `1` khi có lỗi khác. Script không sửa, không xóa dịch vụ nào, không cần `jq`.
- Kiểm thử tĩnh `ScriptsTest`: mọi `*.ps1` bắt đầu bằng BOM UTF-8 và không chứa cú pháp chỉ có từ PowerShell 7 (`??`, `?.`, `ForEach-Object -Parallel`, toán tử ba ngôi `? :`); mọi `*.sh` không chứa ký tự `\r`. Chạy tay hai lần liên tiếp bản PowerShell trên backend thật (cả hai mã thoát 0, sau đó đúng ba dịch vụ mẫu); bản bash chỉ cần rà soát nội dung nếu máy không có bash (`NFR7.22`).

## Khối lượng thiết kế và đĩa (NFR1.29, NFR2.25)

**`SC-08`: khối lượng thiết kế không đổi, đĩa đầy là rủi ro đã chấp nhận.** Thỏa `NFR1.29`, `NFR2.25`; Q4 A.

- Dung lượng thiết kế: 100.000 callback (khoảng 25.000 giao dịch), khoảng 5 giao dịch/giây, đỉnh 50 đồng thời; không phân vùng bảng, không bộ nhớ đệm. Vượt khối lượng này thì phải xem lại chỉ mục và phân vùng, ngoài MVP. Bằng chứng hiệu năng ở khối lượng này chỉ cho một kịch bản (`performance-design.md`, `PD-09`, `PD-10`).
- **Không giới hạn tốc độ, không trần số bản ghi, không mã `429`.** Lần nhận bị từ chối luôn được ghi và có thể mang thân tới 1.048.576 byte nên một vòng lặp gửi sai khóa có thể làm đầy đĩa.
- README của `tpp-simulator-app` có mục nêu: (1) rủi ro đĩa đầy do dữ liệu không tự dọn và không bị giới hạn; (2) cách dọn chính là **xóa database**: `DROP DATABASE <tên>;` rồi `CREATE DATABASE <tên>;` (backend tự áp lược đồ khi khởi động; với database nạp thì xóa database `_load`); (3) cách phụ cho ai dùng Docker: đặt lại volume `tpp_simulator_pgdata`. Cách (2) đứng trước vì Docker không dùng được trên máy này (`NFR5.26`).
- Build and Test ghi `SELECT pg_size_pretty(pg_database_size(current_database()))` của database nạp sau khi nạp 100.000 callback; kỳ vọng dưới 1 GB, vượt thì ghi vào báo cáo, không làm thất bại. Giá trị này **không** nằm trong dòng tổng kết của công cụ nạp (dòng đó giữ đúng bốn trường, `observability-design.md`, `OD-05`).

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/nfr-requirements/scalability-requirements.md` (scalability-requirements: NFR1.29, NFR2.21 đến NFR2.25, NFR7.21, NFR7.22), `reliability-requirements.md` (NFR2.30) và `tech-stack-decisions.md` (tech-stack-decisions)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/functional-design/rules.md` (rules: BR12.4 đến BR12.7, BR13.2 đến BR13.4, BR14.1, BR15.3, BR20.1 đến BR20.3, BR21.1 đến BR21.5) và `functional-spec.md` (functional-spec: W12 đến W14, W16, W24)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/nfr-design/nfr-design-questions.md` (Q1 A, giả định 1, 2, 21)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-design/scalability-design.md` (câu lệnh gom giao dịch, READ COMMITTED)
- `tpp-simulator-app/src/main/resources/db/migration/V1__init_schema.sql`, `tpp-simulator-app/src/main/resources/application.yml`, `tpp-simulator-app/src/main/java/com/tpp/simulator/ledger/CallbackLedger.java`, `.../catalog/ServiceCatalog.java`, `tpp-simulator-app/docs/api/openapi.yaml` (tên trường `TransactionSummary`) (mã và hợp đồng U1, chỉ đọc)

## Assumptions & Open Questions

- **Chưa kiểm chứng trên máy này:** (a) `FOR NO KEY UPDATE` không chặn kiểm tra khóa ngoại `FOR KEY SHARE` của callback đang ghi, dựa vào bảng xung đột khóa dòng của tài liệu PostgreSQL; kiểm thử "khóa giữ bởi kết nối riêng, 5 sửa chờ, callback nền dưới 1 giây" ở `SC-01` là bằng chứng ở Code Generation; (b) tên lớp khóa và bố cục `RunspacePool` của script `SC-05` chưa chạy thử trên Windows PowerShell 5.1 của máy này.
- **`SET LOCAL lock_timeout` đứng trước câu khóa.** Giả định 1 (đã chấp nhận) viết "câu đầu tiên trong giao dịch" cho câu khóa và đồng thời đặt `lock_timeout = '5s'` trong giao dịch; hai điều chỉ nhất quán nếu `SET LOCAL` (không đọc hay ghi dữ liệu) được tính là chuẩn bị giao dịch. Thiết kế hiểu: câu khóa là câu **dữ liệu** đầu tiên.
- **Mức cô lập READ COMMITTED bắt buộc** cho giao dịch sửa (ghi rõ ở `SC-01`): dưới `REPEATABLE READ`, câu khóa trên dòng đã bị giao dịch khác sửa sau thời điểm chụp ảnh sẽ báo lỗi tuần tự hóa thay vì thấy trạng thái mới nhất.
- **Đói pool khi từ khoảng 10 thao tác sửa cùng dịch vụ xếp hàng** là rủi ro đã chấp nhận (`SC-01`), không có biện pháp giảm ở MVP; số 5 thao tác chờ của kiểm thử khóa ngoại và ngưỡng 3 giây của ca phụ là lựa chọn của tôi, Code Generation có thể chỉnh miễn giữ số chờ nhỏ hơn 10 ở ca chính.
- **Kiểm thử "sửa chạy đua với xóa mềm"** là kiểm thử bổ sung của tôi (ngoài `NFR2.24`), để chứng minh BR12.6 cho cả ba thao tác dùng chung một khóa; có thể bỏ nếu thấy thừa.
- **Số vòng chạy script, tên tham số** (`-Concurrency`) và tên tệp payload mẫu (`<mã>.valid.payload.json`) do tôi đặt; Build and Test quyết định chạy script bao nhiêu lần và ghi số lần vào báo cáo.
- Không có câu hỏi mở nào khác.
