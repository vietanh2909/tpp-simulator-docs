# Functional Design — U1 `u1-backend-skeleton` — Câu hỏi làm rõ

> Phạm vi: lát cắt đầu-cuối nhỏ nhất của backend (U1): tạo dịch vụ tối giản, nhận `POST /callbacks/{serviceCode}` đường vui, ánh xạ `$.a.b.c`, ghi nguyên tử Callback và Transaction vào PostgreSQL, và hai API đọc tối giản. Tiêu chí U1 phải đạt: AC1.1.1 đến AC1.1.4, AC1.6.1 đến AC1.6.5, AC1.10.1 đến AC1.10.5, AC1.14.1 (theo `unit-of-work-story-map.md`).
>
> Đã chốt, không hỏi lại: Java 21, Spring Boot, Maven, PostgreSQL JSONB, một backend một database (brief mục 2); bốn thành phần backend và ADR-001 đến ADR-008 (Domain Design); thứ tự kiểm tra, định dạng lỗi, phân trang, thời gian ISO 8601 UTC, tên trường camelCase (Contract Design Q1 đến Q8); Transaction là bản ghi riêng, cập nhật nguyên tử cùng Callback (ADR-002); che ba header chuẩn (FR6.1).
>
> Hai việc Contract Design để lại cho bước này và đã có đề xuất ở "Giả định đề xuất" bên dưới: giới hạn độ dài trường (C2) và kiểu cột, ràng buộc (C6). Hai việc khác thuộc bước sau, không hỏi ở đây: cách lưu khóa API (NFR Requirements), cách bảo đảm đồng thời và chỉ mục (NFR Design). Việc "không ghi được request bị từ chối thì trả mã gốc hay 500" thuộc Functional Design của U2.
>
> Bước Contract Design đã được duyệt nhưng bản rà soát của nó còn 12 góp ý chưa xử lý (R-01 đến R-12, tệp `inception/contract-design/reviews/review-01.md`). Năm câu hỏi dưới đây là những chỗ cần bạn quyết; phần còn lại tôi đề xuất sẵn ở "Giả định đề xuất".

## Q1. Xử lý 12 góp ý còn mở của bản rà soát hợp đồng thế nào?

Lý do hỏi: hợp đồng `contract-summary.md` là nguồn cho tới khi có file `openapi.yaml`, nên nếu sửa chỗ này mà không sửa hợp đồng thì hai tài liệu sẽ mâu thuẫn. Hai góp ý nặng (R-01 và R-02) hỏi riêng ở Q2 và Q3. Các góp ý còn lại, tôi đề xuất sửa như sau:

- R-03: tách `apiKeySecret` khỏi schema phản hồi `Service` (chỉ `ServiceCreate` và `ServiceUpdate` có), để không thể vô tình trả khóa ra.
- R-04: đặt tên mã lỗi cho 409 là `SERVICE_CODE_DUPLICATE`, gom mọi mã lỗi vào một bảng duy nhất, thống nhất `ErrorResponse` và `FieldResult` giữa các khối.
- R-05: thêm `null` vào danh sách giá trị của `rejectionReason`; tham số lọc `rejectionReason` dùng cùng danh sách, giá trị sai trả 400 `VALIDATION_FAILED`.
- R-06: sửa danh sách YAML ở C5 (các mục có dấu phẩy bị tách sai).
- R-07: bộ lọc thời gian của danh sách giao dịch lọc theo `latestReceivedAt`; giao diện gửi thời điểm dạng UTC có chữ `Z`; thêm ví dụ cURL (dấu `+` trong múi giờ phải mã hóa phần trăm).
- R-08: xem Q5.
- R-09: đường dẫn trang của giao diện không dùng tiền tố `/api` và `/callbacks` (ví dụ `/services`, `/monitoring`), để Vite không chuyển nhầm sang backend khi tải lại trang.
- R-10: kích thước phản hồi chi tiết giao dịch (mỗi lần nhận có thể tới 1 MiB payload) ghi lại cho NFR Design chốt giới hạn. U1 vẫn trả đủ chi tiết trong chi tiết giao dịch, vì API chi tiết từng callback thuộc U2 và AC1.1.3 cần xem đủ dữ liệu bằng cURL.
- R-11: sửa, bật/tắt, xóa trên dịch vụ đã xóa trả 404 `SERVICE_NOT_FOUND`; xóa lại dịch vụ đã xóa trả 404; đổi `authType` sang `API_KEY` mà không có khóa thì 400 `VALIDATION_FAILED`.
- R-12: ghi vào quy ước chung rằng API quản lý và tra cứu không có xác thực theo brief (không đăng nhập), và backend mặc định chỉ lắng nghe `127.0.0.1`.

A. (Recommended) Sửa `contract-summary.md` cho 11 góp ý trên (trừ R-10 để NFR Design), thêm bảng "Sửa đổi sau rà soát" ở đầu tệp ghi từng chỗ đã đổi, và thiết kế chức năng U1 theo bản đã sửa. Chỉ đụng đúng các đoạn bị ảnh hưởng
B. Chỉ sửa hợp đồng cho hai góp ý nặng (R-01 và R-02); 10 góp ý còn lại ghi vào danh sách việc cho Functional Design của U2 và Code Generation
C. Không sửa hợp đồng; thiết kế U1 đúng theo hợp đồng hiện tại (rủi ro: R-01 làm cURL hỏng với `transactionId` có dấu `/`)
X. Other (please specify)

[Answer]: A

## Q2. API chi tiết giao dịch nhận `transactionId` ở đâu? (góp ý R-01)

Lý do hỏi: `transactionId` là chuỗi tùy ý lấy từ payload của ngân hàng, có thể chứa `/`, `?`, `#`, `%` hoặc khoảng trắng (ví dụ `2026/10/001`). Hợp đồng hiện đặt nó làm một đoạn đường dẫn `GET /api/transactions/{serviceCode}/{transactionId}`, mà Tomcat và Vite proxy mặc định từ chối hoặc giải mã sai `%2F`. Đây là chính API mà bước kiểm chứng skeleton bằng cURL dùng và ngăn chi tiết ở U4 sẽ gọi.

A. (Recommended) Dùng tham số truy vấn: `GET /api/transactions/detail?serviceCode=THU_HO&transactionId=2026%2F10%2F001`. Không cần cột phụ, hoạt động với mọi ký tự; cURL dùng `-G --data-urlencode`. Giao diện luôn mã hóa phần trăm hai tham số
B. Thêm khóa số `transactionKey` vào `TransactionSummary` và dùng `GET /api/transactions/{transactionKey}`. Đường dẫn gọn, nhưng thêm một cột và một chỉ mục vào bảng Transaction
C. Giữ dạng đường dẫn và bật cấu hình cho phép `%2F` ở Tomcat và Vite proxy. Ít sửa hợp đồng, nhưng dễ vỡ khi đổi phiên bản hay công cụ
X. Other (please specify)

[Answer]: A

## Q3. Làm sao phân biệt lỗi do ứng dụng sinh ra với response đã cấu hình? (góp ý R-02)

Lý do hỏi: người dùng có thể cấu hình response cố định là `401 {"error":"UNAUTHORIZED"}`. Khi đó trang gửi thử (chỉ thấy mã và body) và người kiểm thử không phân biệt được response cấu hình với lỗi do chính ứng dụng sinh ra (503 tắt dịch vụ, 413, 500), đúng loại nhầm lẫn mà thứ tự kiểm tra FR3.1 muốn giúp chẩn đoán. Quy tắc hiện tại "body lỗi hệ thống luôn có trường `error`" không đáng tin vì body cấu hình cũng có thể có trường này.

A. (Recommended) Mọi response do ứng dụng sinh ra (404, 503, 401, 400, 413, 500) có thêm header `X-Simulator-Error: <MÃ LỖI>` (ví dụ `X-Simulator-Error: SERVICE_DISABLED`) và vẫn giữ body JSON như hợp đồng. Response đã cấu hình không bao giờ có header này. Bỏ câu phân biệt dựa trên trường `error` trong body
B. Giữ nguyên hợp đồng: phân biệt bằng trường `error` trong body (chấp nhận nhập nhằng khi body cấu hình trùng tên trường)
X. Other (please specify)

[Answer]: A

## Q4. Những lựa chọn cấu hình mà U1 chưa làm thì xử lý ra sao?

Lý do hỏi: hợp đồng cho phép `authType` là `API_KEY`, `timestampFormat` là `UNIX_SECONDS`, `UNIX_MILLIS` hay `PATTERN`, và các tham số lọc của danh sách giao dịch. Nhưng U1 chỉ làm xác thực `NONE`, timestamp ISO 8601 và danh sách không lọc (kiểm tra khóa API, các định dạng thời gian khác và bộ lọc thuộc U2). Nếu U1 nhận cấu hình rồi lặng lẽ bỏ qua thì một dịch vụ cấu hình `API_KEY` sẽ nhận callback không cần khóa, hoặc bộ lọc trả kết quả sai mà không báo.

A. (Recommended) U1 từ chối rõ ràng: tạo dịch vụ với `authType` là `API_KEY` hoặc `timestampFormat` khác `ISO_8601` trả 400 `VALIDATION_FAILED` kèm `fieldErrors` nói "chưa hỗ trợ ở bản skeleton"; gọi danh sách giao dịch với tham số lọc trả 400 cùng cách. U2 gỡ các từ chối này khi làm xong. Không bao giờ có dịch vụ "tưởng đã bảo vệ" mà không được bảo vệ
B. U1 nhận và lưu mọi cấu hình, nhưng chỉ xử lý `NONE` và ISO 8601; phần còn lại bỏ qua cho tới khi U2 làm (ghi chú trong tài liệu)
C. Làm luôn trong U1: kiểm tra khóa API, bốn định dạng thời gian và bộ lọc (mở rộng phạm vi U1, chuyển phần việc của U2 sang U1)
X. Other (please specify)

[Answer]: A

## Q5. Địa chỉ gọi có phân biệt hoa thường không? (góp ý R-08)

Lý do hỏi: mã dịch vụ đã được quy định là duy nhất không phân biệt hoa thường (FR1.2): không tạo được `thu_ho` khi đã có `THU_HO`. Nhưng chưa nói hệ thống ngân hàng gọi `POST /callbacks/thu_ho` thì khớp dịch vụ `THU_HO` hay nhận 404. Đây là hành vi mà phía ngân hàng nhìn thấy.

A. (Recommended) Khớp không phân biệt hoa thường: `/callbacks/thu_ho` và `/callbacks/THU_HO` cùng vào dịch vụ đã tạo là `THU_HO`; bộ lọc `serviceCode` ở API tra cứu cũng không phân biệt hoa thường. Mọi phản hồi và bản ghi luôn dùng `serviceCode` đúng chữ gốc lúc tạo. Nhất quán với quy tắc duy nhất, tránh 404 vì gõ khác chữ hoa
B. Chỉ khớp đúng chữ hoa thường: `/callbacks/thu_ho` nhận 404 dù dịch vụ `THU_HO` có thật. Tính duy nhất vẫn không phân biệt hoa thường (không tạo được cặp `THU_HO` và `thu_ho`)
X. Other (please specify)

[Answer]: A

## Giả định đề xuất

Các điểm dưới đây tôi tự quyết theo mặc định hợp lý; bạn chỉ đọc và sửa nếu không đồng ý.

1. **Giới hạn độ dài trường (việc C2 để lại):** `serviceCode` 1 đến 50 ký tự (đã chốt); `name` 1 đến 100; `description` tối đa 500; `transactionIdPath`, `statusPath`, `timestampPath` tối đa 200; `timestampPattern` tối đa 100; `defaultTimeZone` phải là mã múi giờ hợp lệ của Java; `apiKeyHeaderName` tối đa 100 (U1 chưa dùng); `responseBody` tối đa 64 KB (JSON hợp lệ, lưu dạng văn bản JSON). Vượt giới hạn: 400 `VALIDATION_FAILED` kèm tên trường.
2. **Kiểm tra khi tạo dịch vụ ở U1 (tập con tối giản):** trường bắt buộc có mặt; `serviceCode` đúng định dạng và không trùng (không phân biệt hoa thường, kể cả dịch vụ đã xóa, trả 409 `SERVICE_CODE_DUPLICATE`); `responseHttpStatus` từ 200 đến 599; `responseBody` là JSON hợp lệ; các đường dẫn mapping không rỗng và bắt đầu bằng `$.`; độ dài theo giả định 1. Kiểm tra cú pháp đầy đủ của đường dẫn và mẫu thời gian, khóa API thuộc U2.
3. **Giá trị mặc định khi tạo:** `enabled` là true; `defaultTimeZone` là `Asia/Ho_Chi_Minh`; `timestampPath` có thể vắng (khi đó mọi callback không có timestamp nghiệp vụ và không cảnh báo thiếu). Tạo dịch vụ sinh ra phiên bản cấu hình số 1. Hai yêu cầu tạo cùng mã gần như đồng thời: một thành công, một nhận 409.
4. **Số trong payload giữ nguyên văn bản gốc:** `"code": 1.50` lưu là `"1.50"` (không rút gọn thành `1.5`), `"code": 1e3` lưu là `"1e3"`, số nguyên rất lớn không bị làm tròn. Boolean lưu là `"true"` hoặc `"false"`. Giá trị là chuỗi lưu đúng chuỗi, giữ khoảng trắng đầu cuối.
5. **Khóa trùng trong cùng một object JSON** (`{"a":1,"a":2}`): giá trị xuất hiện sau cùng được dùng; payload vẫn là JSON hợp lệ.
6. **`transactionId` và `status` là chuỗi mờ:** so khớp chính xác, phân biệt hoa thường, không cắt khoảng trắng; chuỗi chỉ gồm khoảng trắng coi như rỗng (lỗi mapping của trường đó); dài quá 255 ký tự là lỗi mapping "quá dài" của trường đó và callback không vào giao dịch nếu lỗi nằm ở `transactionId`.
7. **Lỗi từng trường:** ba mã lỗi mapping ổn định: `NOT_FOUND` (không thấy), `EMPTY` (null, rỗng hoặc chỉ khoảng trắng), `WRONG_TYPE` (object hoặc mảng), cộng `TOO_LONG`; timestamp thêm `UNPARSEABLE`. Mỗi lỗi kèm câu mô tả ngắn tiếng Việt cho người đọc.
8. **Timestamp ở U1:** chỉ ISO 8601; chấp nhận dạng có hoặc không có múi giờ; không có múi giờ thì dùng `defaultTimeZone` của dịch vụ; kết quả chuẩn hóa UTC. Thiếu `timestampPath` hoặc không có giá trị: không lỗi, không cảnh báo; có giá trị mà không đọc được: lỗi `UNPARSEABLE` của trường timestamp và callback vẫn được chấp nhận (không ảnh hưởng transactionId, status).
9. **Kết quả xử lý (`outcome`) ở U1:** `SUCCESS` khi cả `transactionId` và `status` đều hợp lệ (timestamp không ảnh hưởng nếu thiếu; nếu timestamp có mà lỗi thì tính là `MAPPING_ERROR`); `MAPPING_ERROR` khi bất kỳ trường nào trong ba trường có lỗi. Callback `MAPPING_ERROR` vẫn trả response đã cấu hình (FR3.6).
10. **Gom giao dịch:** chỉ callback có `transactionId` hợp lệ mới vào giao dịch (kể cả khi `status` lỗi: giao dịch hiện status trống kèm lỗi mapping theo FR5.4). Giao dịch được tạo ở callback đầu tiên của cặp (`serviceCode`, `transactionId`). Cập nhật "gần nhất" có điều kiện: chỉ thay status, timestamp nghiệp vụ, thời điểm nhận, mã bản ghi và cờ lỗi khi cặp (`receivedAt`, `recordId`) của callback này lớn hơn cặp đang lưu; tổng số callback luôn tăng thêm 1. Nhờ vậy kết quả đúng kể cả khi hai callback ghi theo thứ tự ngược (cách thực hiện chọn ở NFR Design).
11. **`receivedAt`:** server gán lúc bắt đầu nhận request, múi giờ UTC, độ chính xác micro giây; `recordId` do cơ sở dữ liệu sinh, tăng dần. Sắp xếp cố định: `receivedAt` mới trước, hòa nhau theo `recordId` lớn hơn.
12. **Header lưu trữ:** lưu mọi header của request, tên giữ chữ gốc, nhiều giá trị cùng tên nối bằng `, `. U1 che `Authorization`, `Proxy-Authorization`, `Cookie` (so khớp tên không phân biệt hoa thường) thành `***`; che header API key thuộc U2. Bộ che do CallbackIngestion làm trước khi giao cho CallbackLedger (ADR-007).
13. **Response đã cấu hình:** trả đúng mã `responseHttpStatus`, body JSON đã cấu hình, `Content-Type: application/json`. Trả cả khi mapping lỗi.
14. **Content-Type:** nhận `application/json` kèm bất kỳ tham số nào như `charset=UTF-8` (AC1.1.4), so khớp không phân biệt hoa thường. Dịch vụ không tồn tại trả 404 (đã chốt); các mã từ chối khác (503, 401, 400, 413) thuộc U2.
15. **Kiểu cột và ràng buộc (việc C6 để lại):** mô tả mức logic trong `entities.md` (chuỗi, số nguyên 64 bit, thời điểm có múi giờ, JSON, boolean); tên bản chuyển lược đồ `V1__init_schema` cho U1, U2 thêm `V2`, `V3`...; khóa chính, khóa duy nhất không phân biệt hoa thường của `serviceCode`, khóa ngoại và chỉ mục khóa chính. Chỉ mục phục vụ hiệu năng thuộc U2 và NFR Design.
16. **Ghi nguyên tử:** việc ghi Callback và cập nhật Transaction nằm trong một giao dịch cơ sở dữ liệu; lỗi bất kỳ thì cả hai không được ghi và API trả 500 `INTERNAL_ERROR` (hành vi này nằm trong thiết kế dù US1.9 thuộc U2, vì lỗi ghi cũng có thể xảy ra ở đường vui của U1).
17. **API đọc của U1:** `GET /api/transactions` nhận `page` và `size` (20, 50 hoặc 100, mặc định 1 và 20), sắp xếp như giả định 11, trả hình dạng `Page`; `GET /api/transactions/detail` (nếu Q2 chọn A) trả giao dịch kèm toàn bộ lần nhận cũ nhất trước, mỗi lần nhận có payload gốc, header đã che, `receivedAt`, kết quả mapping từng trường, response đã trả và `configVersionNumber`. Giao dịch không tồn tại: 404 `TRANSACTION_NOT_FOUND`.
18. **Tạo và đọc dịch vụ ở U1:** `POST /api/services` (201) và `GET /api/services/{serviceCode}` (200 hoặc 404) theo C2, phản hồi có `callbackPath`, `apiKeyConfigured` (luôn false ở U1) và không bao giờ có `apiKeySecret`. Danh sách, sửa, bật/tắt, xóa mềm thuộc U2.
19. **Ghi nhật ký:** ghi một dòng nhật ký (cấp INFO) cho mỗi callback nhận (mã dịch vụ, mã bản ghi, kết quả); không bao giờ ghi giá trị header nhạy cảm hay toàn bộ payload.

## Assumption Confirmation

Bạn đồng ý dùng các giả định trên chứ?

A. Accept assumptions
B. Convert to follow-up questions
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
