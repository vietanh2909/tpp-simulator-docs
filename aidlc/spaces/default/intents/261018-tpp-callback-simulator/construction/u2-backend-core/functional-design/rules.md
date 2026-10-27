# Quy tắc nghiệp vụ — U2 `u2-backend-core`

> Nguồn: `requirements.md` (FR1 đến FR6, FR8, FR10, FR12, NFR1 đến NFR3), `stories.md` (tiêu chí AC1.2.x đến AC1.14.5 và AC2.11.x), `components.md` và `decisions.md` (ADR-002, ADR-004, ADR-005, ADR-007), `contract-summary.md` đã sửa ở U1 cùng `openapi.yaml`, `functional-design-questions.md` của U2 (Q1 đến Q8 chọn A, 30 giả định chấp nhận) và quy tắc U1 (`construction/u1-backend-skeleton/functional-design/rules.md`).
>
> **Đánh số:** quy tắc U2 dùng nhóm `BR11` đến `BR22` để không trùng với nhóm `BR1` đến `BR6` của U1. U2 **mở rộng** quy tắc U1, không sửa lại ý nghĩa của chúng; chỗ nào U2 thay thế hay mở rộng một quy tắc U1, quy tắc U2 gọi quy tắc đó **theo tên** (ví dụ "quy tắc từ chối lựa chọn chưa làm của U1") chứ không lặp mã, để một mã chỉ có một nghĩa trong một tệp. Các quy tắc U1 mà U2 không nhắc vẫn giữ nguyên hiệu lực (khớp mã dịch vụ không phân biệt hoa thường, giới hạn 1.048.576 byte, header `X-Simulator-Error`, thời điểm nhận, ghi nguyên tử Callback và Transaction, ánh xạ `$.a.b.c`, lần nhận gần nhất theo (`receivedAt`, `recordId`), định dạng thời gian của API).
>
> **U2 gỡ ba từ chối tạm của U1:** `authType` là `API_KEY`, `timestampFormat` khác `ISO_8601`, và các tham số lọc của danh sách giao dịch. Các quy tắc U1 đó hết hiệu lực khi U2 triển khai; BR11.1 và BR19.1 thay thế chúng.

## Nguồn sự thật (YAML)

```yaml
rules:
  # Nhóm 11 — Kiểm tra cấu hình dịch vụ (ServiceCatalog, MappingEngine)
  - id: BR11.1
    statement: "U2 gỡ các từ chối tạm của U1: authType nhận cả NONE và API_KEY; timestampFormat nhận cả bốn giá trị ISO_8601, UNIX_SECONDS, UNIX_MILLIS, PATTERN. Thông báo chưa hỗ trợ ở bản skeleton không còn."
    category: constraint
    applies_to: "Service.authType, ServiceConfigVersion.timestampFormat"
    trigger: "POST /api/services, PUT /api/services/{serviceCode}, POST /api/mapping-tests"
    logic: "IF authType không phải NONE hoặc API_KEY THEN từ chối. IF timestampFormat không thuộc bốn giá trị cho phép THEN từ chối. Mọi giá trị hợp lệ khác được nhận."
    violation: "400 VALIDATION_FAILED, fieldErrors có field authType hoặc timestampFormat."
    source: "FR1.5, FR1.8"
  - id: BR11.2
    statement: "Đường dẫn mapping hợp lệ có dạng $. theo sau là 1 đến 10 đoạn nối bằng dấu chấm; mỗi đoạn chỉ gồm chữ cái ASCII, chữ số, dấu gạch dưới và dấu gạch ngang. Kiểm tra khi lưu, khi sửa và khi thử mapping."
    category: validation
    applies_to: "transactionIdPath, statusPath (bắt buộc), timestampPath (tùy chọn)"
    trigger: "POST /api/services, PUT /api/services/{serviceCode}, POST /api/mapping-tests"
    logic: >-
      IF đường dẫn không bắt đầu bằng $. THEN từ chối. IF đường dẫn chỉ là $ hoặc $. (không có đoạn nào) THEN từ chối.
      IF có đoạn rỗng (hai dấu chấm liền nhau, hoặc dấu chấm ở cuối) THEN từ chối.
      IF một đoạn chứa ký tự ngoài chữ cái ASCII, chữ số, gạch dưới, gạch ngang (ví dụ dấu cách, dấu ngoặc vuông, dấu nháy, dấu sao, chữ có dấu) THEN từ chối và thông báo nêu ký tự vi phạm đầu tiên kèm mã điểm U+XXXX của nó.
      IF có hơn 10 đoạn THEN từ chối. IF dài hơn 200 ký tự THEN từ chối.
      Khóa có dấu chấm hoặc ký tự đặc biệt chưa hỗ trợ. timestampPath rỗng hoặc vắng là hợp lệ (không đọc timestamp).
      Quy tắc chỉ chặn lúc lưu: cấu hình đã lưu từ U1 vẫn chạy như cũ và được kiểm tra lại ở lần sửa kế tiếp.
    violation: "400 VALIDATION_FAILED, fieldErrors có tên trường đường dẫn và lý do."
    source: "FR1.7"
  - id: BR11.3
    statement: "Mẫu ngày giờ của định dạng PATTERN phải hợp lệ theo cú pháp mẫu ngày giờ của Java và phải xác định đủ ngày và giờ: có ít nhất năm, tháng, ngày, giờ và phút."
    category: validation
    applies_to: "ServiceConfigVersion.timestampPattern khi timestampFormat là PATTERN"
    trigger: "POST /api/services, PUT /api/services/{serviceCode}, POST /api/mapping-tests"
    logic: >-
      IF timestampFormat là PATTERN và timestampPattern vắng hoặc rỗng THEN từ chối (bắt buộc).
      IF mẫu sai cú pháp THEN từ chối. IF mẫu thiếu một trong năm, tháng, ngày, giờ, phút (mẫu chỉ có ngày, chỉ có giờ, hoặc giờ 12 giờ mà không có chỉ báo sáng hoặc chiều) THEN từ chối.
      Giây và phần thập phân của giây không bắt buộc (vắng thì bằng 0). Mẫu có thành phần múi giờ hoặc offset được chấp nhận.
      Mẫu dài hơn 100 ký tự bị từ chối.
    violation: "400 VALIDATION_FAILED, fieldErrors có field timestampPattern (mẫu chỉ có ngày cũng vậy)."
    source: "FR1.8"
  - id: BR11.4
    statement: "timestampPattern chỉ có nghĩa khi timestampFormat là PATTERN; với định dạng khác giá trị gửi lên bị bỏ, không kiểm tra và không lưu."
    category: constraint
    applies_to: "ServiceConfigVersion.timestampPattern"
    trigger: "POST /api/services, PUT /api/services/{serviceCode}"
    logic: "IF timestampFormat là ISO_8601, UNIX_SECONDS hoặc UNIX_MILLIS THEN timestampPattern lưu là rỗng, kể cả khi yêu cầu có gửi một giá trị (dù sai cú pháp). IF timestampFormat là PATTERN THEN áp dụng BR11.3."
    violation: "Không áp dụng (giá trị thừa bị bỏ, không lỗi)."
    source: "FR1.8"
  - id: BR11.5
    statement: "Tên header API key phải là tên header HTTP hợp lệ, dài 1 đến 100 ký tự, và không được trùng các header dành riêng của giao thức."
    category: validation
    applies_to: "Service.apiKeyHeaderName khi authType là API_KEY"
    trigger: "POST /api/services, PUT /api/services/{serviceCode}"
    logic: >-
      IF tên chứa ký tự ngoài chữ cái, chữ số và các dấu ! # $ % & ' * + - . ^ _ ` | ~ (tức có khoảng trắng, dấu hai chấm, ký tự điều khiển, chữ có dấu) THEN từ chối.
      IF độ dài ngoài 1 đến 100 THEN từ chối.
      IF tên bằng Host, Content-Type, Content-Length, Transfer-Encoding hoặc Connection (không phân biệt hoa thường) THEN từ chối.
      Các tên khác, kể cả Authorization và Cookie, được chấp nhận (chúng vẫn bị che theo BR16.1). Tên lưu đúng chữ gốc; so khớp lúc nhận không phân biệt hoa thường.
    violation: "400 VALIDATION_FAILED, fieldErrors có field apiKeyHeaderName."
    source: "FR1.5, FR3.2"
  - id: BR11.6
    statement: "Giá trị khóa API dài 1 đến 256 ký tự ASCII in được, có thể có khoảng trắng ở giữa, không có khoảng trắng ở đầu hoặc cuối, và được lưu nguyên văn."
    category: validation
    applies_to: "Service.apiKeySecret"
    trigger: "POST /api/services, PUT /api/services/{serviceCode} khi có giá trị khóa mới"
    logic: >-
      IF khóa có ký tự ngoài mã ASCII 32 đến 126 (ký tự điều khiển, xuống dòng, ký tự không phải ASCII) THEN từ chối.
      IF khóa có khoảng trắng ở đầu hoặc cuối THEN từ chối. IF độ dài ngoài 1 đến 256 THEN từ chối.
      Khóa có khoảng trắng ở giữa (ví dụ Bearer abc) hợp lệ. Khóa được lưu đúng như gửi, không cắt, không đổi chữ hoa thường.
      Thông báo lỗi chỉ nêu quy tắc bị vi phạm, không lặp lại bất kỳ ký tự nào của khóa.
    violation: "400 VALIDATION_FAILED, fieldErrors có field apiKeySecret."
    source: "FR1.5, FR1.6, NFR3"
  - id: BR11.7
    statement: "Khi tạo dịch vụ, authType quyết định các trường khóa: API_KEY bắt buộc có tên header và khóa; NONE bỏ qua và không lưu chúng."
    category: validation
    applies_to: "Service.authType, apiKeyHeaderName, apiKeySecret"
    trigger: "POST /api/services"
    logic: >-
      IF authType là API_KEY THEN apiKeyHeaderName và apiKeySecret đều bắt buộc và được kiểm tra theo BR11.5 và BR11.6; phản hồi có apiKeyConfigured bằng true.
      IF authType là NONE THEN apiKeyHeaderName và apiKeySecret nếu có thì bỏ qua, không lỗi, không lưu; apiKeyConfigured bằng false.
    violation: "400 VALIDATION_FAILED, fieldErrors có field apiKeyHeaderName hoặc apiKeySecret."
    source: "FR1.5, FR1.6"
  - id: BR11.8
    statement: "Mọi lỗi trường của một yêu cầu tạo, sửa hoặc thử mapping được thu thập một lần và trả cùng nhau; thông báo dựng từ mẫu cố định và không bao giờ chứa giá trị khóa API."
    category: validation
    applies_to: "Mọi yêu cầu tạo, sửa dịch vụ và thử mapping"
    trigger: "Khi kiểm tra đầu vào"
    logic: "THEN trả một ErrorResponse VALIDATION_FAILED có fieldErrors liệt kê mọi trường lỗi với tên trường đúng như hợp đồng. Thông báo không lặp lại giá trị đầu vào, với đúng một ngoại lệ là ký tự vi phạm của đường dẫn mapping ở BR11.2; không thông báo nào chứa bất kỳ phần nào của khóa API."
    violation: "Không áp dụng (đây là cách báo lỗi)."
    source: "FR1.5, FR1.7 đến FR1.10, NFR3"

  # Nhóm 12 — Sửa dịch vụ và phiên bản cấu hình (ServiceCatalog)
  - id: BR12.1
    statement: "Sửa dịch vụ thay toàn bộ các trường cấu hình bằng giá trị trong thân yêu cầu; serviceCode không đổi; trường không thuộc thân sửa bị bỏ qua."
    category: policy
    applies_to: "Service, ServiceConfigVersion"
    trigger: "PUT /api/services/{serviceCode}"
    logic: >-
      THEN name, description, authType, apiKeyHeaderName, transactionIdPath, statusPath, timestampPath, timestampFormat, timestampPattern, defaultTimeZone, responseHttpStatus, responseBody lấy từ thân yêu cầu;
      trường bắt buộc vắng là lỗi chứ không giữ giá trị cũ; description vắng nghĩa là xóa mô tả; defaultTimeZone vắng nghĩa là Asia/Ho_Chi_Minh; apiKeySecret theo BR12.3.
      serviceCode lấy từ đường dẫn (khớp không phân biệt hoa thường) và không đổi; serviceCode, enabled, deleted và trường lạ trong thân bị bỏ qua. Thành công trả 200 với Service hiện hành.
    violation: "400 VALIDATION_FAILED nếu trường lỗi (BR12.2)."
    source: "FR1.3"
  - id: BR12.2
    statement: "Sửa với dữ liệu không hợp lệ không lưu thay đổi nào."
    category: validation
    applies_to: "Service, ServiceConfigVersion"
    trigger: "PUT /api/services/{serviceCode}"
    logic: >-
      THEN xử lý theo thứ tự chung của BR13.2: Content-Type sai (415) hoặc thân hỏng, không phải object, trường sai kiểu (400, BR13.6); rồi dịch vụ không tồn tại hoặc đã xóa (404, BR13.4); rồi kiểm tra giá trị từng trường (400, BR11.x và BR12.3). Hai bước đầu không phụ thuộc trạng thái dịch vụ; từ bước 404 trở đi chạy bên trong phần tuần tự hóa của dịch vụ (BR12.6).
      IF có bất kỳ trường lỗi THEN trả 400 với mọi lỗi cùng lúc và không đổi gì: không đổi Service, không sinh phiên bản, không đổi khóa.
    violation: "400 VALIDATION_FAILED, fieldErrors liệt kê mọi trường lỗi."
    source: "FR1.3, FR1.7 đến FR1.10"
  - id: BR12.3
    statement: "Khi sửa, việc đổi authType và khóa theo quy tắc: để trống ô khóa giữ khóa cũ, đổi sang NONE xóa khóa, đổi sang API_KEY bắt buộc có khóa."
    category: policy
    applies_to: "Service.authType, apiKeyHeaderName, apiKeySecret"
    trigger: "PUT /api/services/{serviceCode}"
    logic: >-
      IF authType mới là API_KEY và apiKeySecret có giá trị không rỗng THEN thay khóa bằng giá trị mới (kiểm tra BR11.6).
      IF authType mới là API_KEY, apiKeySecret vắng hoặc rỗng, và dịch vụ đang là API_KEY THEN giữ khóa cũ (cho phép đổi riêng tên header).
      IF authType mới là API_KEY, apiKeySecret vắng hoặc rỗng, và dịch vụ đang là NONE (không có khóa cũ) THEN từ chối.
      IF authType mới là NONE THEN xóa apiKeyHeaderName và apiKeySecret đã lưu; muốn quay lại API_KEY phải nhập khóa mới.
      apiKeyHeaderName luôn bắt buộc khi authType là API_KEY (không giữ tên cũ khi vắng). Phản hồi không bao giờ có khóa.
    violation: "400 VALIDATION_FAILED, fieldErrors có field apiKeySecret khi đổi sang API_KEY mà không có khóa, hoặc field apiKeyHeaderName khi thiếu tên."
    source: "FR1.5, FR1.6"
  - id: BR12.4
    statement: "Phiên bản cấu hình mới chỉ sinh khi ít nhất một giá trị hiệu lực sau khác phiên bản hiện hành: transactionIdPath, statusPath, timestampPath, timestampFormat, timestampPattern (chỉ tính khi định dạng là PATTERN), defaultTimeZone, responseHttpStatus, responseBody. Tên, mô tả, authType, tên header khóa, khóa và bật/tắt không bao giờ sinh phiên bản."
    category: calculation
    applies_to: "ServiceConfigVersion"
    trigger: "PUT /api/services/{serviceCode}"
    logic: >-
      THEN so sánh giá trị đã chuẩn hóa, từng trường một: timestampPath rỗng bằng vắng; timestampPattern coi là vắng khi định dạng khác PATTERN; defaultTimeZone so theo mã múi giờ.
      responseBody so theo JSON tương đương: cùng cấu trúc, cùng giá trị chuỗi, cùng văn bản số, chỉ khác khoảng trắng hoặc thứ tự khóa của object thì coi là không đổi (số 1 và 1.0 là khác nhau).
      IF thân có khóa trùng trong cùng object THEN so theo văn bản nguyên.
      IF có ít nhất một trường khác THEN cần phiên bản mới (BR12.5). ELSE không sinh phiên bản.
    violation: "Không áp dụng."
    source: "FR1.13, ADR-004"
  - id: BR12.5
    statement: "Phiên bản mới có số bằng số hiện hành cộng 1, được ghi cùng lúc với cập nhật Service; sửa mà không đổi gì thì vẫn trả 200, không ghi gì."
    category: calculation
    applies_to: "Service.currentVersionNumber, ServiceConfigVersion.versionNumber"
    trigger: "PUT /api/services/{serviceCode} đã qua kiểm tra"
    logic: >-
      IF BR12.4 cho thấy cần phiên bản mới THEN trong MỘT giao dịch cơ sở dữ liệu: ghi ServiceConfigVersion với versionNumber bằng currentVersionNumber cộng 1, cập nhật các trường còn lại của Service, đặt currentVersionNumber và updatedAt.
      ELSE IF chỉ các trường ngoài phiên bản đổi (tên, mô tả, authType, tên header khóa, khóa) THEN cập nhật Service và updatedAt, không sinh phiên bản, currentVersionNumber giữ nguyên.
      ELSE (không có gì đổi) THEN trả 200 với cấu hình hiện hành, không ghi gì, updatedAt giữ nguyên, không sinh phiên bản.
      Giá trị tương đương không đổi thì giữ nguyên văn bản đã lưu (ví dụ responseBody chỉ khác khoảng trắng vẫn giữ văn bản cũ).
      Số phiên bản của một dịch vụ là dãy liên tục 1, 2, 3, không hụt, không trùng, không dùng lại.
    violation: "Lỗi ghi: 500 INTERNAL_ERROR và không đổi gì (Service và phiên bản cùng không ghi)."
    source: "FR1.13, ADR-004"
  - id: BR12.6
    statement: "Sửa, bật/tắt và xóa mềm của cùng một dịch vụ dùng chung một phần tuần tự hóa theo từng dịch vụ; toàn bộ lần sửa (kiểm tra còn tồn tại và chưa xóa, giữ hay xóa khóa, so sánh để sinh phiên bản, ghi) chạy trọn bên trong phần đó trên trạng thái đã ghi bền mới nhất. Hai người sửa cùng lúc: người lưu sau thắng, không phát hiện xung đột; số phiên bản vẫn tăng liên tục, không trùng, không hụt."
    category: constraint
    applies_to: "Service, ServiceConfigVersion"
    trigger: "Hai hoặc nhiều thao tác PUT /api/services/{serviceCode}, PUT /api/services/{serviceCode}/enabled, DELETE /api/services/{serviceCode} của cùng một dịch vụ chạy đồng thời"
    logic: >-
      THEN mỗi dịch vụ có một phần tuần tự hóa duy nhất (theo từng dịch vụ, không phải một khóa chung cho mọi dịch vụ) dùng chung cho sửa, bật/tắt và xóa mềm; thao tác của dịch vụ khác không chờ nhau.
      Một lần sửa chỉ vào phần này sau khi đã qua các kiểm tra không phụ thuộc trạng thái (Content-Type, thân hỏng, trường sai kiểu: BR13.2, BR13.6). Từ lúc vào đến lúc ghi xong, MỌI việc sau chạy bên trong phần tuần tự hóa, theo thứ tự này, trên trạng thái đã ghi bền mới nhất của dịch vụ đọc ngay khi vào phần (không dùng trạng thái đọc trước đó, không dùng trạng thái biểu mẫu đã đọc):
      (1) kiểm tra dịch vụ còn tồn tại và chưa xóa (BR13.4); (2) kiểm tra giá trị từng trường, trong đó quyết định giữ hay xóa khóa API dựa trên authType hiện hành (BR12.3); (3) so sánh để sinh phiên bản (BR12.4); (4) ghi (BR12.5).
      Bật/tắt và xóa mềm cũng chạy trọn bên trong cùng phần này (kiểm tra tồn tại, so với giá trị hiện tại, ghi), nên ba thao tác của cùng một dịch vụ xảy ra lần lượt như thể chạy tuần tự theo thứ tự hoàn tất: một lần sửa tới sau xóa mềm thấy dịch vụ đã xóa và trả 404, không sinh phiên bản; một lần sửa tới sau bật/tắt không làm mất kết quả bật/tắt.
      Thao tác sửa không bao giờ ghi lại enabled hay deleted: nó chỉ ghi các thuộc tính cấu hình đã nêu ở BR12.1, currentVersionNumber và updatedAt, không ghi lại cả dòng Service từ bản đã đọc.
      Người hoàn tất sau thắng với các trường họ gửi; không có số phiên bản biểu mẫu hay mã 409 xung đột trong hợp đồng.
      Sửa cùng lúc với nhận callback: callback đang xử lý dùng phiên bản đã đọc ở đầu (BR14.1) và không chờ phần tuần tự hóa. Cơ chế tuần tự hóa cụ thể do NFR Design chọn; ranh giới của phần (những việc nằm trong) đã chốt ở đây.
    violation: "Số phiên bản trùng hoặc hụt, dịch vụ API_KEY không có khóa, phiên bản mới của dịch vụ đã xóa, hay trạng thái bật/tắt bị ghi đè là lỗi dữ liệu nghiêm trọng."
    source: "FR1.3, NFR2 (Q6 A)"
  - id: BR12.7
    statement: "Phiên bản cấu hình và kết quả đã lưu của callback cũ là bất biến: sửa cấu hình không bao giờ tính lại hay đổi callback đã ghi."
    category: constraint
    applies_to: "Callback, ServiceConfigVersion"
    trigger: "Sau mỗi lần sửa cấu hình"
    logic: >-
      THEN mỗi Callback giữ configVersionId, kết quả ánh xạ từng trường, timestamp đã chuẩn hóa và response đã trả như lúc ghi; callback nhận sau lần sửa dùng phiên bản mới.
      Ví dụ: đổi đường dẫn mapping thì callback cũ vẫn hiện kết quả theo đường dẫn cũ; đổi response từ 200 sang 202 thì callback cũ vẫn ghi 200; đổi định dạng hoặc múi giờ thì timestamp chuẩn hóa của callback cũ không đổi.
    violation: "Đổi kết quả đã lưu của callback cũ là lỗi dữ liệu nghiêm trọng."
    source: "FR1.13, ADR-004"

  # Nhóm 13 — Vòng đời và API quản lý dịch vụ (ServiceCatalog)
  - id: BR13.1
    statement: "Danh sách dịch vụ mặc định chỉ gồm dịch vụ chưa xóa; includeDeleted bằng true thì gồm cả dịch vụ đã xóa."
    category: policy
    applies_to: "GET /api/services"
    trigger: "Mỗi lần gọi danh sách dịch vụ"
    logic: >-
      THEN trả mảng Service (có cờ deleted), sắp theo serviceCode tăng dần không phân biệt hoa thường, không phân trang; mảng rỗng khi chưa có dịch vụ.
      IF includeDeleted vắng hoặc rỗng (includeDeleted=) THEN coi như false. IF includeDeleted có giá trị không rỗng mà không phải true hoặc false THEN từ chối.
    violation: "400 VALIDATION_FAILED, fieldErrors có field includeDeleted."
    source: "FR1.1, FR1.12"
  - id: BR13.2
    statement: "Bật hoặc tắt dịch vụ chỉ đổi trạng thái enabled; thao tác lặp lại là hợp lệ và không đổi gì. PUT sửa và PUT enabled dùng chung một thứ tự kiểm tra: 415 hoặc thân hỏng, rồi 404, rồi lỗi trường."
    category: policy
    applies_to: "Service.enabled"
    trigger: "PUT /api/services/{serviceCode}/enabled (thứ tự kiểm tra cũng áp dụng cho PUT /api/services/{serviceCode})"
    logic: >-
      Thứ tự chung cho PUT sửa và PUT enabled, dừng ở lỗi đầu tiên:
      (1) Content-Type không phải JSON THEN 415 UNSUPPORTED_MEDIA_TYPE.
      (2) Thân không đọc được thành JSON object, hoặc trường có kiểu sai (ví dụ enabled là chuỗi, responseHttpStatus là chuỗi) THEN 400 VALIDATION_FAILED (BR13.6). Bước (1) và (2) không phụ thuộc trạng thái dịch vụ.
      (3) Dịch vụ không tồn tại hoặc đã xóa THEN 404 SERVICE_NOT_FOUND (BR13.4).
      (4) Giá trị trường lỗi (với enabled: vắng; với PUT sửa: BR11.x và BR12.3) THEN 400 VALIDATION_FAILED, mọi lỗi cùng lúc.
      Bước (3) và (4) chạy bên trong phần tuần tự hóa của dịch vụ (BR12.6).
      IF qua cả bốn bước THEN đặt enabled; IF giá trị khác hiện tại THEN cập nhật enabled và updatedAt; IF giống hiện tại THEN không đổi gì.
      Không sinh phiên bản, không đổi cấu hình. Luôn trả 200 với Service hiện hành. Dịch vụ tắt có hiệu lực với request tới sau khi thao tác được ghi bền.
    violation: "415 UNSUPPORTED_MEDIA_TYPE; 400 VALIDATION_FAILED với fieldErrors có field enabled khi thiếu hoặc không phải boolean; 404 SERVICE_NOT_FOUND."
    source: "FR1.11"
  - id: BR13.3
    statement: "Xóa dịch vụ là xóa mềm một chiều: chỉ đặt deleted bằng true, giữ nguyên mọi thông tin và lịch sử; mã đã xóa không bao giờ dùng lại."
    category: policy
    applies_to: "Service.deleted"
    trigger: "DELETE /api/services/{serviceCode}"
    logic: >-
      IF dịch vụ tồn tại và chưa xóa THEN đặt deleted bằng true và updatedAt; giữ nguyên enabled, cấu hình, khóa, phiên bản, Callback và Transaction; trả 204 không có thân.
      Sau đó: danh sách mặc định không còn dịch vụ; URL callback trả 404 SERVICE_NOT_FOUND (lần nhận được ghi với lý do SERVICE_DELETED, BR15.1); GET một dịch vụ vẫn trả nó với deleted bằng true; tạo lại cùng mã (không phân biệt hoa thường) trả 409 SERVICE_CODE_DUPLICATE.
      Không có thao tác khôi phục trong MVP. Kiểm tra tồn tại và ghi chạy bên trong phần tuần tự hóa của dịch vụ, dùng chung với sửa và bật/tắt (BR12.6).
    violation: "Không áp dụng."
    source: "FR1.12"
  - id: BR13.4
    statement: "Sửa, bật/tắt và xóa một dịch vụ không tồn tại hoặc đã xóa trả 404 và không đổi gì; xóa lại dịch vụ đã xóa cũng trả 404."
    category: policy
    applies_to: "Service"
    trigger: "PUT /api/services/{serviceCode}, PUT /api/services/{serviceCode}/enabled, DELETE /api/services/{serviceCode}"
    logic: "IF không có dịch vụ khớp mã (không phân biệt hoa thường) hoặc dịch vụ đã xóa THEN 404 SERVICE_NOT_FOUND. Kiểm tra này chạy bên trong phần tuần tự hóa của dịch vụ trên trạng thái đã ghi bền mới nhất (BR12.6), sau các kiểm tra 415 và thân hỏng (BR13.2). Riêng đọc một dịch vụ giữ hành vi U1: vẫn trả dịch vụ đã xóa với deleted bằng true."
    violation: "404 SERVICE_NOT_FOUND."
    source: "FR1.12"
  - id: BR13.5
    statement: "Mọi phản hồi của API quản lý chỉ có cờ apiKeyConfigured, không bao giờ có khóa API; tên header khóa được trả."
    category: constraint
    applies_to: "Phản hồi tạo, sửa, bật/tắt, đọc, liệt kê dịch vụ"
    trigger: "Mỗi phản hồi Service"
    logic: "THEN apiKeyConfigured bằng true khi và chỉ khi authType là API_KEY (khi đó luôn có khóa); apiKeyHeaderName được trả khi có; không trường nào của phản hồi, thân lỗi hay header chứa giá trị khóa."
    violation: "Lộ khóa trong phản hồi là lỗi bảo mật (NFR3)."
    source: "FR1.6, NFR3"
  - id: BR13.6
    statement: "Thân yêu cầu của API quản lý và thử mapping không đọc được thành JSON object hợp lệ, hoặc có trường sai kiểu, bị từ chối 400; Content-Type của yêu cầu quản lý không phải JSON bị từ chối 415; không bao giờ 500."
    category: validation
    applies_to: "POST và PUT /api/services, PUT /api/services/{serviceCode}/enabled, POST /api/mapping-tests"
    trigger: "Khi đọc thân yêu cầu"
    logic: "IF Content-Type của yêu cầu không phải application/json THEN 415 UNSUPPORTED_MEDIA_TYPE. ELSE IF thân hỏng, không phải object, hoặc trường có kiểu sai (ví dụ responseHttpStatus là chuỗi) THEN 400 VALIDATION_FAILED với fieldErrors nêu trường sai kiểu hoặc thân hỏng. Hai kiểm tra này đứng trước kiểm tra 404 của PUT sửa và PUT enabled (thứ tự chung ở BR13.2); POST không có kiểm tra 404."
    violation: "400 VALIDATION_FAILED hoặc 415 UNSUPPORTED_MEDIA_TYPE."
    source: "FR1.2, FR1.10"

  # Nhóm 14 — Thứ tự kiểm tra và xác thực khi nhận callback (CallbackIngestion)
  - id: BR14.1
    statement: "CallbackIngestion đọc trạng thái dịch vụ một lần duy nhất ở đầu xử lý mỗi request và dùng ảnh đó cho mọi bước còn lại."
    category: constraint
    applies_to: "ServiceRuntimeSnapshot"
    trigger: "Mỗi request tới POST /callbacks/{serviceCode} đã qua kiểm tra kích thước"
    logic: >-
      THEN đọc trong một lần: đã xóa, bật/tắt, authType, tên header khóa, khóa, phiên bản cấu hình hiện hành.
      IF dịch vụ bị sửa, tắt hoặc xóa sau thời điểm đọc THEN request đang xử lý vẫn đi hết theo ảnh đã đọc và được ghi theo đúng phiên bản đã đọc; request đến sau thấy trạng thái mới.
      Bản ghi (kể cả lần từ chối) luôn tham chiếu phiên bản của ảnh.
    violation: "Không áp dụng."
    source: "FR1.13, NFR2"
  - id: BR14.2
    statement: "Thứ tự kiểm tra một request tới endpoint callback là cố định và dừng ở lỗi đầu tiên: kích thước, mã chưa từng có, đã xóa, tắt, khóa API, Content-Type, JSON, rồi ánh xạ và ghi."
    category: policy
    applies_to: "POST /callbacks/{serviceCode}"
    trigger: "Mỗi request tới endpoint callback"
    logic: >-
      Bước 1: IF body lớn hơn 1.048.576 byte THEN 413 PAYLOAD_TOO_LARGE, không ghi (body đúng 1.048.576 byte vẫn được xử lý bình thường).
      Bước 2: IF mã dịch vụ chưa từng có (không phân biệt hoa thường) THEN 404 SERVICE_NOT_FOUND, không ghi.
      Bước 3 và 4: trạng thái dịch vụ theo BR14.3 (đã xóa, rồi tắt).
      Bước 5: khóa API theo BR14.4 (chỉ khi authType là API_KEY).
      Bước 6: IF Content-Type không phải application/json (bỏ tham số, không phân biệt hoa thường; vắng cũng tính) THEN 400 UNSUPPORTED_CONTENT_TYPE.
      Bước 7: IF body rỗng hoặc không phải đúng một giá trị JSON hợp lệ THEN 400 INVALID_JSON.
      Bước 8: ánh xạ, ghi Callback và Transaction trong một giao dịch, trả response đã cấu hình.
      Hệ quả: dịch vụ tắt thì khóa sai vẫn 503; dịch vụ bật thì khóa sai cùng body không phải JSON vẫn 401.
    violation: "Không áp dụng (đây là kết quả từ chối)."
    source: "FR3.1, FR3.3"
  - id: BR14.3
    statement: "Dịch vụ đã xóa trả 404 và dịch vụ tắt trả 503, đều trước kiểm tra khóa API; dịch vụ vừa tắt vừa đã xóa thì đã xóa thắng."
    category: policy
    applies_to: "POST /callbacks/{serviceCode}"
    trigger: "Sau khi đọc ảnh dịch vụ (BR14.1)"
    logic: "IF deleted là true THEN 404 SERVICE_NOT_FOUND, rejectionReason SERVICE_DELETED. ELSE IF enabled là false THEN 503 SERVICE_DISABLED, rejectionReason SERVICE_DISABLED. Cả hai được ghi (BR15.1) và đứng trước khóa API, nên khóa sai tới dịch vụ tắt vẫn nhận 503."
    violation: "Không áp dụng (đây là kết quả từ chối)."
    source: "FR3.1, FR3.8"
  - id: BR14.4
    statement: "Với dịch vụ API_KEY, request phải mang header có tên trùng apiKeyHeaderName (không phân biệt hoa thường) và giá trị trùng khóa đã lưu (chính xác từng ký tự, phân biệt hoa thường)."
    category: authorization
    applies_to: "POST /callbacks/{serviceCode} của dịch vụ authType API_KEY"
    trigger: "Sau kiểm tra trạng thái dịch vụ"
    logic: >-
      IF header vắng, hoặc có nhưng giá trị rỗng (sau khi bỏ khoảng trắng đầu cuối do giao thức) THEN 401 UNAUTHORIZED, rejectionReason MISSING_API_KEY.
      ELSE IF header xuất hiện nhiều lần (nhiều giá trị) THEN coi là sai: 401, rejectionReason INVALID_API_KEY.
      ELSE IF giá trị khác khóa đã lưu THEN 401, rejectionReason INVALID_API_KEY. ELSE qua.
      Hai tên header chỉ khác chữ hoa thường là một (x-api-key khớp X-Api-Key); giá trị K1 không khớp khóa k1.
      Phép so sánh giá trị có thời gian không phụ thuộc vào vị trí ký tự đầu tiên khác nhau. Khóa không bao giờ vào nhật ký (BR16.2).
    violation: "401 UNAUTHORIZED với thông báo cố định, không phải response đã cấu hình."
    source: "FR3.2, FR1.5"
  - id: BR14.5
    statement: "Dịch vụ có authType NONE không bao giờ bị từ chối vì xác thực."
    category: authorization
    applies_to: "POST /callbacks/{serviceCode} của dịch vụ authType NONE"
    trigger: "Sau kiểm tra trạng thái dịch vụ"
    logic: "THEN bỏ qua bước khóa API, dù request có hay không có header khóa hay header Authorization; request đi tiếp tới kiểm tra Content-Type."
    violation: "Không áp dụng."
    source: "FR1.5, FR3.1"
  - id: BR14.6
    statement: "Mỗi lý do từ chối ứng với đúng một bộ mã HTTP, mã lỗi (trường error và header X-Simulator-Error) và rejectionReason."
    category: policy
    applies_to: "Phản hồi từ chối của endpoint callback"
    trigger: "Khi một kiểm tra BR14.2 không qua ở một trong năm tên kiểm tra: đã xóa, tắt, khóa API, Content-Type, JSON"
    logic: >-
      Đã xóa: 404, SERVICE_NOT_FOUND, SERVICE_DELETED. Tắt: 503, SERVICE_DISABLED, SERVICE_DISABLED. Thiếu khóa: 401, UNAUTHORIZED, MISSING_API_KEY. Sai khóa: 401, UNAUTHORIZED, INVALID_API_KEY.
      Content-Type sai: 400, UNSUPPORTED_CONTENT_TYPE, UNSUPPORTED_CONTENT_TYPE. JSON hỏng hoặc rỗng: 400, INVALID_JSON, INVALID_JSON.
      Thân lỗi dùng thông báo cố định; 401 dùng cùng một câu cho thiếu khóa và sai khóa; thân lỗi không chứa khóa, giá trị header hay nội dung body. rejectionReason chỉ thấy qua API tra cứu lịch sử, không có trong response trả cho bên gửi.
    violation: "Không áp dụng."
    source: "FR3.1, FR3.8"
  - id: BR14.7
    statement: "Mapping lỗi không bao giờ đổi response: request đã qua mọi kiểm tra luôn nhận response đã cấu hình, kể cả khi thiếu transactionId, status sai kiểu hay timestamp sai định dạng."
    category: policy
    applies_to: "Response của endpoint callback"
    trigger: "Callback được chấp nhận có kết quả ánh xạ lỗi"
    logic: "IF JSON hợp lệ, dịch vụ đang bật và xác thực hợp lệ THEN ghi Callback với outcome MAPPING_ERROR cùng lỗi cụ thể từng trường (errorCode, error) trong mappingFieldResults và trả responseHttpStatus cùng responseBody của phiên bản đã dùng, không có header X-Simulator-Error."
    violation: "Không áp dụng."
    source: "FR3.6"
  - id: BR14.8
    statement: "Lỗi ghi một callback được chấp nhận trả 500 INTERNAL_ERROR, không trả response đã cấu hình, không lưu một phần, và tự phục hồi khi kho dữ liệu hoạt động lại."
    category: constraint
    applies_to: "Callback, Transaction"
    trigger: "Ghi Callback hoặc cập nhật Transaction lỗi (kho không dùng được, hết thời gian, vi phạm ràng buộc, payload không lưu được ở định dạng JSON của kho dữ liệu)"
    logic: >-
      THEN hủy mọi thứ của giao dịch, trả 500 INTERNAL_ERROR với thân thông báo chung (không phải response đã cấu hình, không có header X-Simulator-Record-Failed), ghi đúng một dòng nhật ký mức ERROR theo tập trường của BR14.10 (không payload, không khóa).
      IF kho dữ liệu hoạt động lại THEN request kế tiếp xử lý bình thường và được ghi, không cần khởi động lại ứng dụng.
      Payload hợp lệ nhưng không lưu trung thực được ở định dạng JSON của kho dữ liệu (các điều kiện ở BR15.4: chuỗi chứa ký tự thoát U+0000, ký tự thoát nửa cặp thay thế, số vượt miền số của kho) vẫn thuộc trường hợp này, như U1 đã ghi ở README. Callback được chấp nhận không có đường lưu dạng văn bản gốc và không thử ghi lần hai.
    violation: "500 INTERNAL_ERROR kèm X-Simulator-Error."
    source: "FR3.7"
  - id: BR14.9
    statement: "Nếu không đọc được trạng thái dịch vụ vì kho dữ liệu không dùng được thì trả 500 INTERNAL_ERROR và không ghi gì; không được coi là 404."
    category: constraint
    applies_to: "POST /callbacks/{serviceCode}"
    trigger: "Đọc ảnh dịch vụ lỗi"
    logic: "THEN trả 500 INTERNAL_ERROR kèm X-Simulator-Error, ghi đúng một dòng nhật ký mức ERROR theo tập trường của BR14.10 (mã dịch vụ đã làm sạch, mã HTTP 500, lớp lỗi, mã lỗi của kho dữ liệu nếu có; không có recordId, outcome hay rejectionReason); không có bản ghi nào vì chưa biết dịch vụ có thật hay không."
    violation: "500 INTERNAL_ERROR."
    source: "FR3.7"
  - id: BR14.10
    statement: "Mỗi request tới endpoint callback ghi đúng một dòng nhật ký không chứa dữ liệu nhạy cảm; khi có lỗi ghi, dòng mức ERROR thay thế dòng mức INFO chứ không đứng cạnh nó."
    category: constraint
    applies_to: "Nhật ký ứng dụng"
    trigger: "Mỗi request tới endpoint callback"
    logic: >-
      THEN mỗi request ghi đúng một dòng, kể cả request bị từ chối không ghi bản ghi (413, mã dịch vụ chưa từng có). Có hai mẫu trường:
      Dòng INFO (không có lỗi ghi): mã dịch vụ lấy từ đường dẫn đã làm sạch ký tự điều khiển và cắt độ dài; recordId nếu đã ghi bản ghi; outcome hoặc rejectionReason (rejectionReason cho lần bị từ chối, outcome cho lần được chấp nhận; vắng khi 413 và mã chưa từng có); mã HTTP đã trả.
      Dòng ERROR (có lỗi ghi: BR14.8, BR14.9, BR15.6): các trường của dòng INFO mà lúc đó đã biết (mã dịch vụ đã làm sạch; recordId nếu có, thường vắng vì không ghi được; outcome hoặc rejectionReason nếu đã xác định), cộng mã HTTP đã trả, lớp lỗi, và mã lỗi của kho dữ liệu nếu có.
      Không bao giờ ghi body, giá trị của bất kỳ header nào, khóa đúng hoặc sai, hay thông điệp lỗi thô của kho dữ liệu có thể chứa dữ liệu. Lỗi ghi dùng mức ERROR; còn lại mức INFO.
    violation: "Lộ giá trị nhạy cảm trong nhật ký là lỗi bảo mật (NFR3)."
    source: "FR6.2, NFR3"

  # Nhóm 15 — Ghi lần nhận bị từ chối (CallbackIngestion, CallbackLedger)
  - id: BR15.1
    statement: "Mọi request bị từ chối tới một dịch vụ có thật được ghi thành một Callback outcome REJECTED, với đúng sáu lý do của BR14.6; request quá 1.048.576 byte và request tới mã chưa từng tồn tại không được ghi."
    category: policy
    applies_to: "Callback"
    trigger: "Request bị từ chối ở một trong năm kiểm tra của BR14.2 theo tên: đã xóa, tắt, khóa API, Content-Type, JSON"
    logic: "IF dịch vụ có thật (kể cả đã xóa hoặc đang tắt) và request bị từ chối vì một trong sáu lý do THEN ghi một Callback REJECTED. IF 413 hoặc mã dịch vụ chưa từng tồn tại THEN không ghi gì."
    violation: "Không áp dụng."
    source: "FR3.8, FR3.9"
  - id: BR15.2
    statement: "Bản ghi lần nhận bị từ chối có hình dạng cố định: kết quả ánh xạ rỗng, không có transactionId, status, timestamp nghiệp vụ."
    category: constraint
    applies_to: "Callback outcome REJECTED"
    trigger: "Ghi lần nhận bị từ chối"
    logic: >-
      THEN outcome là REJECTED; rejectionReason theo BR14.6; httpStatusReturned và responseStatusReturned là mã đã trả; responseBodyReturned là thân ErrorResponse đã trả;
      receivedAt gán lúc bắt đầu nhận request; configVersionId là phiên bản hiện hành trong ảnh BR14.1; requestHeadersMasked đã che theo BR16.1.
      transactionId, status, businessTimestampUtc để trống; mappingFieldResults là đối tượng rỗng (không đánh giá trường nào); payload theo BR15.4.
    violation: "Không áp dụng."
    source: "FR3.8"
  - id: BR15.3
    statement: "Lần nhận bị từ chối không bao giờ tạo hay cập nhật Transaction và không được tính vào callbackCount, kể cả khi body có transactionId."
    category: constraint
    applies_to: "Transaction"
    trigger: "Ghi lần nhận bị từ chối"
    logic: "THEN chỉ ghi Callback; không đọc transactionId trong body; lần nhận chỉ xuất hiện trong danh sách callback, không trong danh sách hay chi tiết giao dịch."
    violation: "Giao dịch chứa lần nhận bị từ chối là lỗi dữ liệu."
    source: "FR3.8, FR5.2"
  - id: BR15.4
    statement: "Body của lần nhận bị từ chối lưu thành payloadJson nếu là JSON hợp lệ và lưu trung thực được, nếu không thì lưu thành văn bản gốc ở payloadRawText; hình thức lưu được quyết định MỘT lần trước khi ghi và không bao giờ lưu cả hai."
    category: constraint
    applies_to: "Callback.payloadJson, Callback.payloadRawText"
    trigger: "Ghi lần nhận bị từ chối"
    logic: >-
      THEN giải mã body theo UTF-8 rồi quyết định hình thức lưu TRƯỚC khi ghi, chỉ dựa vào nội dung body:
      "JSON lưu trung thực được" nghĩa là body là đúng một giá trị JSON hợp lệ và không có điều kiện nào sau đây (mỗi điều kiện xác định được bằng cách đọc body, không cần thử ghi): (a) một chuỗi hoặc tên khóa chứa chuỗi thoát U+0000; (b) một chuỗi hoặc tên khóa chứa chuỗi thoát nửa cặp thay thế không đủ cặp (nửa đầu không có nửa sau, hoặc nửa sau đứng riêng); (c) một số nằm ngoài miền số mà định dạng JSON của kho dữ liệu lưu được (miền cụ thể do NFR Design ghi).
      IF body là JSON hợp lệ và không vướng (a), (b), (c) THEN payloadJson có giá trị, payloadRawText để trống (kể cả khi lý do từ chối là Content-Type sai hay khóa sai).
      ELSE payloadRawText bằng văn bản giải mã, byte không hợp lệ và ký tự NUL thay bằng U+FFFD, payloadJson để trống. Body rỗng thì payloadRawText là chuỗi rỗng.
      Không bao giờ thử ghi lần hai bằng hình thức còn lại: nếu việc ghi đã quyết định vẫn lỗi (kể cả khi điều kiện lẽ ra phát hiện được trước), đó là lỗi ghi lần từ chối theo BR15.6, giữ một giao dịch riêng của BR15.5.
      Body đúng chữ null (có thể kèm khoảng trắng) là JSON hợp lệ nên được lưu ở payloadJson dưới dạng giá trị JSON null (U1 cũng chấp nhận null là một giá trị JSON hợp lệ), không phải ở payloadRawText. "Có giá trị" của payloadJson nghĩa là có một giá trị JSON được lưu, kể cả null; "để trống" nghĩa là không lưu gì (vắng mặt). Hai trạng thái này khác nhau trong dữ liệu đã lưu. Ở API chi tiết, payloadRawText là bộ phân biệt: payloadRawText vắng thì payload nằm ở payloadJson (có thể là null); payloadRawText có mặt (kể cả chuỗi rỗng) thì payloadJson không có giá trị.
    violation: "Không áp dụng."
    source: "FR3.8"
  - id: BR15.5
    statement: "Mỗi lần nhận bị từ chối được ghi trong một giao dịch cơ sở dữ liệu riêng, độc lập với mọi callback khác."
    category: constraint
    applies_to: "Callback outcome REJECTED"
    trigger: "Ghi lần nhận bị từ chối"
    logic: "THEN hai request bị từ chối đồng thời (ví dụ hai callback tới dịch vụ đang tắt) tạo hai bản ghi riêng; lỗi ghi của một lần không ảnh hưởng lần khác."
    violation: "Không áp dụng."
    source: "FR3.8, NFR2"
  - id: BR15.6
    statement: "Nếu một lần nhận bị từ chối không ghi được thì phản hồi vẫn là mã từ chối gốc, kèm header X-Simulator-Record-Failed bằng true."
    category: policy
    applies_to: "Phản hồi từ chối của endpoint callback"
    trigger: "Ghi lần nhận bị từ chối lỗi"
    logic: >-
      THEN trả đúng response từ chối của BR14.6 (mã HTTP, thân, X-Simulator-Error) và thêm header X-Simulator-Record-Failed: true; ghi đúng một dòng nhật ký mức ERROR theo tập trường của BR14.10 (mã dịch vụ đã làm sạch, rejectionReason, mã HTTP gốc, lớp lỗi, mã lỗi của kho dữ liệu nếu có), thay cho dòng INFO; không ghi body và không ghi khóa.
      Header này chỉ xuất hiện trong tình huống này: không trên response đã cấu hình, không trên 413 hay 404 của mã chưa từng có (không có gì để ghi), không trên 500 của callback được chấp nhận.
      Đây là mở rộng tương thích của hợp đồng C1: header phải được thêm vào openapi.yaml ở Code Generation.
    violation: "Không áp dụng."
    source: "FR3.7, FR3.8"

  # Nhóm 16 — Che header và không lộ khóa
  - id: BR16.1
    statement: "Header Authorization, Proxy-Authorization, Cookie và header API key hiện hành của dịch vụ được lưu thành ba dấu sao cho mọi lần nhận, kể cả lần bị từ chối; header khác giữ nguyên."
    category: constraint
    applies_to: "Callback.requestHeadersMasked"
    trigger: "Trước khi ghi mọi Callback (chấp nhận hoặc từ chối)"
    logic: >-
      THEN so tên header không phân biệt hoa thường. Header API key là apiKeyHeaderName trong ảnh BR14.1 khi authType là API_KEY, che dù khóa đúng, sai, và dù dịch vụ đang tắt hay đã xóa.
      Nhiều giá trị cùng tên thành một giá trị ***. Dịch vụ NONE chỉ che ba header chuẩn. Header tên khác (ví dụ X-Request-Id) giữ nguyên giá trị và giữ tên đúng chữ gốc.
      Việc che làm ở CallbackIngestion trước khi giao cho CallbackLedger; CallbackLedger không bao giờ nhận giá trị chưa che.
    violation: "Giá trị chưa che trong dữ liệu hoặc nhật ký là lỗi bảo mật (NFR3)."
    source: "FR6.1, ADR-007"
  - id: BR16.2
    statement: "Giá trị khóa API và giá trị chưa che của các header nhạy cảm không bao giờ xuất hiện trong dữ liệu đã lưu (ngoài cột khóa của Service), nhật ký ứng dụng, hay thân và header của bất kỳ phản hồi API nào."
    category: constraint
    applies_to: "Toàn bộ ứng dụng"
    trigger: "Mọi lúc"
    logic: >-
      Dạng lưu khóa đã chốt từ U1 (Q2 C, NFR3.5) và U2 không đổi: khóa được lưu nguyên văn trong cột api_key_secret của Service, là nơi DUY NHẤT trong dữ liệu đã lưu có giá trị khóa. Giá trị khóa đó chỉ được đọc để so khớp trong bộ nhớ (BR14.4).
      Tiêu chí AC1.12.3 được hiểu là "khóa không xuất hiện ở đâu ngoài cột khóa của Service": header đã lưu, nhật ký, mọi phản hồi API và báo cáo công cụ nạp đều không chứa khóa (xem Assumptions & Open Questions, giả định 11).
      THEN gồm thân lỗi, thông báo kiểm tra, phản hồi dịch vụ, chi tiết callback và báo cáo của công cụ nạp.
      Payload (body) của callback không bị quét hay che vì FR6.1 chỉ quy định header; nội dung body lưu nguyên.
      Kiểm chứng bằng kiểm thử tích hợp: gửi callback có khóa đúng và sai rồi quét cơ sở dữ liệu (trừ cột khóa của Service), nhật ký và mọi phản hồi API để chắc không có giá trị khóa.
    violation: "Lộ khóa là lỗi bảo mật (NFR3)."
    source: "FR6.2, NFR3"

  # Nhóm 17 — Chuẩn hóa timestamp bốn định dạng (MappingEngine)
  - id: BR17.1
    statement: "Với UNIX_SECONDS và UNIX_MILLIS, giá trị được nhận khi là số JSON hoặc chuỗi chỉ gồm chữ số, có thể có một phần thập phân; đơn vị là giây hoặc mili giây kể từ 1970-01-01T00:00:00Z."
    category: calculation
    applies_to: "businessTimestampUtc khi timestampFormat là UNIX_SECONDS hoặc UNIX_MILLIS"
    trigger: "Callback có timestampPath và giá trị tìm thấy"
    logic: >-
      THEN số JSON được hiểu theo giá trị thập phân chính xác (không qua số thực dấu phẩy động, kể cả dạng có số mũ).
      Dạng chuỗi hợp lệ gồm một hoặc nhiều chữ số, theo sau tùy chọn bởi một dấu chấm và ít nhất một chữ số thập phân; không dấu cộng, trừ, khoảng trắng hay dấu phân cách hàng nghìn. Vì vậy "1760850000" và "1760850000.5" hợp lệ, còn "1760850000." (dấu chấm không có chữ số thập phân sau) và ".5" (không có chữ số trước dấu chấm) không hợp lệ và cho UNPARSEABLE.
      Kiểm tra khoảng 1970 đến 2100 của BR17.2 được làm TRƯỚC khi khai triển số mũ hay đổi đơn vị: ước lượng bậc độ lớn từ phần định trị và số mũ (hoặc từ số chữ số của phần nguyên) mà không tạo ra chuỗi hay số lớn. Giá trị chắc chắn ngoài khoảng (ví dụ 1e999999999, hoặc chuỗi vài nghìn chữ số) cho UNPARSEABLE ngay, không khai triển, không tốn bộ nhớ hay thời gian đáng kể và không bao giờ thành lỗi 500 (BR14.7). Số mũ âm rất lớn (ví dụ 1e-999999999) cho giá trị cắt về 0 micro giây, tức 1970-01-01T00:00:00Z hợp lệ, cũng không khai triển.
      Phần thập phân giữ đến micro giây của kết quả, phần thừa bị cắt (không làm tròn). Kết quả chuẩn hóa UTC.
      Ví dụ: 1760850000 (giây) và 1760850000000 (mili giây) đều ra 2025-10-19T05:00:00Z; 1760850000.123 giây ra 2025-10-19T05:00:00.123Z.
    violation: "Lỗi UNPARSEABLE của riêng trường timestamp (xem BR17.2)."
    source: "FR1.8, FR4.6"
  - id: BR17.2
    statement: "Timestamp Unix phải nằm trong khoảng 1970-01-01 đến 2100-01-01 UTC (tính cả hai đầu); giá trị ngoài khoảng, sai dạng, âm hoặc boolean là UNPARSEABLE, object và mảng là WRONG_TYPE."
    category: validation
    applies_to: "Trường timestamp"
    trigger: "Callback có timestampPath và giá trị tìm thấy"
    logic: >-
      IF thời điểm kết quả (sau khi cắt micro giây) ngoài khoảng 1970-01-01T00:00:00Z đến 2100-01-01T00:00:00Z THEN lỗi UNPARSEABLE (bắt được nhầm đơn vị giây với mili giây). Với giá trị có số mũ hoặc rất nhiều chữ số, việc kiểm tra khoảng làm trước khi khai triển (BR17.1).
      IF giá trị là chuỗi không đúng dạng của BR17.1 (ví dụ abc), số âm, hoặc boolean THEN UNPARSEABLE. IF giá trị là object hoặc mảng THEN WRONG_TYPE.
      Boolean là UNPARSEABLE ở mọi định dạng thời gian. null, chuỗi rỗng hoặc chỉ khoảng trắng và không tìm thấy là trường hợp thiếu giá trị (BR17.5), không phải lỗi.
      Lỗi chỉ thuộc trường timestamp; transactionId và status không bị ảnh hưởng.
    violation: "Lỗi UNPARSEABLE hoặc WRONG_TYPE của trường timestamp; Callback có outcome MAPPING_ERROR."
    source: "FR4.4, FR1.8"
  - id: BR17.3
    statement: "Với PATTERN, giá trị (chuỗi, hoặc số JSON lấy theo văn bản gốc) phải khớp TOÀN BỘ mẫu đã cấu hình; ngày giờ không tồn tại là UNPARSEABLE; múi giờ trong mẫu được ưu tiên hơn defaultTimeZone."
    category: calculation
    applies_to: "businessTimestampUtc khi timestampFormat là PATTERN"
    trigger: "Callback có timestampPath và giá trị tìm thấy"
    logic: >-
      IF còn ký tự thừa ở đầu hoặc cuối, hoặc chuỗi không khớp mẫu THEN UNPARSEABLE.
      IF ngày giờ không tồn tại (30 tháng 2, tháng 13, giờ 24, phút 60) THEN UNPARSEABLE; phân tích chặt, không tự điều chỉnh.
      Tên tháng và tên thứ trong chuỗi phải viết theo tiếng Anh chuẩn (ví dụ Oct, October, Mon) và khớp như cú pháp mẫu.
      IF mẫu có thành phần múi giờ hoặc offset THEN dùng nó; ELSE dùng defaultTimeZone của phiên bản cấu hình. Năm hai chữ số quy về 2000 đến 2099. Giây vắng bằng 0.
      Kết quả chuẩn hóa UTC đến micro giây. Ví dụ: mẫu yyyy-MM-dd HH:mm:ss, múi giờ Asia/Ho_Chi_Minh, chuỗi 2026-10-19 10:00:00 ra 2026-10-19T03:00:00Z. Boolean UNPARSEABLE; object hoặc mảng WRONG_TYPE.
    violation: "Lỗi UNPARSEABLE hoặc WRONG_TYPE của trường timestamp; Callback có outcome MAPPING_ERROR."
    source: "FR1.8, FR1.9, FR4.6"
  - id: BR17.4
    statement: "Mọi định dạng cho kết quả cùng hình dạng: timestamp nghiệp vụ hợp lệ là một thời điểm UTC đến micro giây, năm UTC từ 1 đến 9999, và được lưu riêng với receivedAt."
    category: calculation
    applies_to: "Callback.businessTimestampUtc, Callback.receivedAt"
    trigger: "Mọi callback có timestamp hợp lệ"
    logic: >-
      THEN ISO_8601 giữ nguyên quy tắc đã làm ở U1 (offset hoặc Z đổi sang UTC; ngày giờ ISO không múi giờ dùng defaultTimeZone). Giờ địa phương rơi vào chuyển mùa: giờ bị trùng lấy offset sớm hơn, giờ không tồn tại được dời tới theo độ lệch; áp dụng thống nhất cho ISO không múi giờ và PATTERN.
      Năm UTC ngoài 1 đến 9999 là UNPARSEABLE. businessTimestampUtc và receivedAt là hai giá trị độc lập: receivedAt do server gán lúc bắt đầu nhận request, không bao giờ lấy từ payload; businessTimestampUtc không ảnh hưởng thứ tự nhận hay trạng thái giao dịch.
    violation: "Không áp dụng."
    source: "FR4.6, FR4.7"
  - id: BR17.5
    statement: "Timestamp thiếu chỉ là cảnh báo, timestamp lỗi chỉ làm lỗi trường timestamp; cả hai không cản callback vào giao dịch khi transactionId hợp lệ."
    category: validation
    applies_to: "Trường timestamp"
    trigger: "Mọi callback được chấp nhận"
    logic: >-
      IF timestampPath không cấu hình THEN không đọc, không lỗi, không cảnh báo (mọi định dạng).
      IF có timestampPath nhưng không tìm thấy, null, chuỗi rỗng hoặc chỉ khoảng trắng THEN chỉ cảnh báo (warning), không lỗi, outcome không vì thế thành MAPPING_ERROR.
      IF lỗi UNPARSEABLE hoặc WRONG_TYPE THEN trường timestamp có lỗi cụ thể và outcome là MAPPING_ERROR. Trong cả hai trường hợp transactionId và status không bị ảnh hưởng, callback vẫn vào giao dịch nếu transactionId hợp lệ.
    violation: "Lỗi của trường timestamp (xem BR17.2, BR17.3)."
    source: "FR4.4"

  # Nhóm 18 — Thử mapping (MappingEngine)
  - id: BR18.1
    statement: "Thử mapping dùng đúng MappingEngine như nhận callback thật, với cấu hình trong yêu cầu (kể cả chưa lưu), tính ở server và không ghi gì."
    category: policy
    applies_to: "POST /api/mapping-tests"
    trigger: "Mỗi lần thử mapping"
    logic: >-
      THEN không tạo Callback, Transaction, phiên bản cấu hình, và không đổi dịch vụ nào; không cần dịch vụ tồn tại, response cố định hay khóa API trong yêu cầu.
      Kết quả ba trường bằng đúng kết quả khi một callback thật tới với cùng cấu hình và cùng payload, cho cả bốn định dạng thời gian.
    violation: "Không áp dụng."
    source: "FR2.1, FR2.2, FR2.3, ADR-005"
  - id: BR18.2
    statement: "Cấu hình trong yêu cầu thử mapping được kiểm tra bằng cùng quy tắc như khi lưu trước khi chạy."
    category: validation
    applies_to: "MappingTestRequest"
    trigger: "POST /api/mapping-tests"
    logic: >-
      IF transactionIdPath, statusPath, timestampFormat hoặc sampleJson vắng THEN lỗi trường bắt buộc.
      IF đường dẫn sai cú pháp (BR11.2), định dạng ngoài bốn giá trị (BR11.1), mẫu thiếu hoặc sai (BR11.3), hoặc múi giờ không hợp lệ THEN trả mọi lỗi cùng lúc và không chạy mapping.
      timestampPath vắng hoặc rỗng hợp lệ; defaultTimeZone vắng nghĩa là Asia/Ho_Chi_Minh; timestampPattern bị bỏ qua khi định dạng khác PATTERN. Không kiểm tra authType, response, tên hay khóa.
    violation: "400 VALIDATION_FAILED, fieldErrors liệt kê mọi trường lỗi."
    source: "FR2.3, FR1.7, FR1.8"
  - id: BR18.3
    statement: "JSON mẫu tối đa 1.048.576 byte; JSON mẫu hỏng không phải lỗi yêu cầu mà trả 200 với sampleJsonValid bằng false."
    category: validation
    applies_to: "MappingTestRequest.sampleJson"
    trigger: "POST /api/mapping-tests đã qua kiểm tra cấu hình"
    logic: >-
      IF sampleJson dài hơn 1.048.576 byte (UTF-8) THEN 400 VALIDATION_FAILED, field sampleJson.
      ELSE IF sampleJson (kể cả chuỗi rỗng hoặc chỉ khoảng trắng) không phải đúng một giá trị JSON hợp lệ THEN 200 với sampleJsonValid là false và sampleJsonError mô tả loại và vị trí lỗi mà không lặp lại nội dung mẫu; không có kết quả ba trường.
      ELSE sampleJsonValid là true và chạy ánh xạ. Giá trị JSON gốc không phải object vẫn là JSON hợp lệ.
    violation: "400 VALIDATION_FAILED khi quá kích thước."
    source: "FR2.1"
  - id: BR18.4
    statement: "Kết quả thử mapping gồm kết quả độc lập của ba trường, đúng các quy tắc ánh xạ."
    category: calculation
    applies_to: "MappingTestResult"
    trigger: "JSON mẫu hợp lệ"
    logic: >-
      THEN transactionId và status đánh giá độc lập, có thể ra NOT_FOUND, EMPTY, WRONG_TYPE, TOO_LONG; một trường lỗi không làm hỏng trường kia (thiếu code thì status báo không tìm thấy, hai trường còn lại vẫn có giá trị).
      Giá trị JSON gốc không phải object thì transactionId, status (và timestamp nếu có timestampPath) đều PAYLOAD_NOT_OBJECT.
      timestampPath vắng thì không có kết quả timestamp; có đường dẫn mà thiếu giá trị thì chỉ có warning; có giá trị thì value là ISO 8601 UTC hoặc lỗi UNPARSEABLE hoặc WRONG_TYPE theo BR17.x.
    violation: "Không áp dụng."
    source: "FR2.1, FR4.2, FR4.3, FR4.4"

  # Nhóm 19 — Tra cứu: bộ lọc, phân trang, chi tiết (CallbackLedger)
  - id: BR19.1
    statement: "Danh sách giao dịch nhận các bộ lọc serviceCode, transactionId, status, receivedFrom, receivedTo kết hợp bằng AND; U2 gỡ việc từ chối tham số lọc của U1."
    category: policy
    applies_to: "GET /api/transactions"
    trigger: "Mỗi lần gọi danh sách giao dịch"
    logic: >-
      serviceCode: khớp trọn mã, không phân biệt hoa thường, kể cả dịch vụ đã xóa; mã chưa tồn tại trả trang rỗng, không 404.
      transactionId và status: khớp chuỗi chứa, không phân biệt hoa thường; dấu phần trăm, gạch dưới, gạch chéo ngược trong giá trị lọc là ký tự thường; giao dịch có latestStatus rỗng không khớp bộ lọc status.
      receivedFrom, receivedTo: lọc theo latestReceivedAt, tính cả hai đầu, theo ngữ nghĩa thời gian dưới đây (dùng chung cho BR19.2).
      Ngữ nghĩa bộ lọc thời gian (chốt một nơi, backend chịu trách nhiệm, giao diện chỉ gửi giá trị người dùng chọn): đầu vào là ngày giờ ISO 8601 có múi giờ (Z hoặc offset); phần thập phân của giây ĐƯỢC nhận (1 đến 9 chữ số, phần quá micro giây bị cắt, không làm tròn). Mọi so sánh sau khi đổi sang UTC, ở độ chính xác micro giây, tính cả hai đầu.
      IF giá trị KHÔNG có phần thập phân THEN nó nghĩa là cả giây đó: receivedFrom tính từ đầu giây (phần thập phân .000000), receivedTo tính đến hết giây (.999999). IF giá trị CÓ phần thập phân THEN so sánh đúng như đã gửi, ở micro giây, tính cả đầu.
      Ví dụ biên với receivedTo=2026-10-19T11:00:00Z: lần nhận lúc 11:00:00.400000 được tính (nhỏ hơn hoặc bằng 11:00:00.999999); lần nhận lúc 11:00:01.000000 không được tính. Với receivedFrom=2026-10-19T11:00:00Z: lần nhận lúc 11:00:00.000000 được tính, lúc 10:59:59.999999 không. Với receivedTo=2026-10-19T11:00:00.400Z: lần nhận lúc 11:00:00.400000 được tính, lúc 11:00:00.400001 không.
      Ngữ nghĩa này khớp quyết định D6 của Refined Mockups (bộ lọc theo giây: "đến 11:00:00" gồm các lần nhận tới hết giây 11:00:00).
      Giá trị rỗng (ví dụ status=) coi như không lọc, theo BR19.3; giá trị lọc không bị cắt khoảng trắng. Mỗi dòng có serviceDeleted cho biết dịch vụ đã xóa.
    violation: "Giá trị tham số không hợp lệ: xem BR19.3."
    source: "FR8.2"
  - id: BR19.2
    statement: "Danh sách callback nhận các bộ lọc serviceCode, transactionId, outcome, rejectionReason, receivedFrom, receivedTo kết hợp bằng AND."
    category: policy
    applies_to: "GET /api/callbacks"
    trigger: "Mỗi lần gọi danh sách callback"
    logic: >-
      serviceCode như BR19.1. transactionId: chứa chuỗi, không phân biệt hoa thường; Callback có transactionId để trống (thiếu, lỗi, hoặc mọi lần bị từ chối) không khớp.
      outcome và rejectionReason: khớp chính xác; rejectionReason kèm outcome khác REJECTED không lỗi, kết quả đơn giản là rỗng.
      receivedFrom, receivedTo: lọc theo receivedAt, tính cả hai đầu, cùng ngữ nghĩa thời gian như BR19.1 (giá trị không có phần thập phân nghĩa là cả giây; ví dụ callback nhận lúc 11:00:00.400 được tính khi receivedTo là 11:00:00). Giá trị rỗng coi như không lọc (BR19.3).
      Lọc outcome bằng MAPPING_ERROR chỉ cho callback có ít nhất một trường lỗi.
    violation: "Giá trị tham số không hợp lệ: xem BR19.3."
    source: "FR10.2"
  - id: BR19.3
    statement: "Tham số lọc và phân trang không hợp lệ bị từ chối 400 và mọi lỗi được báo cùng lúc."
    category: validation
    applies_to: "GET /api/transactions, GET /api/callbacks"
    trigger: "Mỗi lần gọi danh sách"
    logic: >-
      Giá trị rỗng của MỌI tham số lọc và phân trang (receivedFrom=, receivedTo=, outcome=, rejectionReason=, serviceCode=, transactionId=, status=, page=, size=) được coi như vắng: không lọc theo tham số đó, page và size dùng mặc định (BR19.4), không phải lỗi. Chỉ giá trị KHÔNG rỗng mà không hợp lệ mới bị 400. Ví dụ: GET /api/callbacks?outcome=&receivedFrom=&page=&size= giống GET /api/callbacks (trang 1, size 20, không lọc); GET /api/callbacks?size=30 và ?page=0 và ?receivedFrom=abc đều 400. Giá trị chỉ gồm khoảng trắng không phải giá trị rỗng (giá trị không bị cắt khoảng trắng): với outcome, page, size, receivedFrom, receivedTo nó là không hợp lệ.
      IF receivedFrom hoặc receivedTo (không rỗng) không phải thời điểm ISO 8601 có múi giờ (Z hoặc offset; thiếu múi giờ hoặc sai định dạng) THEN lỗi ở field tương ứng; phần thập phân của giây được nhận (BR19.1); dấu cộng của offset phải mã hóa phần trăm, nếu không sẽ thành khoảng trắng và bị từ chối.
      IF cận dưới hiệu lực của receivedFrom lớn hơn cận trên hiệu lực của receivedTo (sau khi áp ngữ nghĩa BR19.1: receivedFrom=11:00:00 và receivedTo=11:00:00 hợp lệ vì .000000 nhỏ hơn .999999) THEN lỗi ở field receivedTo.
      IF outcome hoặc rejectionReason không thuộc danh sách giá trị THEN lỗi ở field tương ứng.
      IF page không phải số nguyên từ 1 trở lên, hoặc size không phải 20, 50, 100 THEN lỗi.
      IF một tham số xuất hiện nhiều lần THEN lỗi ở field đó. Tham số lạ bị bỏ qua.
    violation: "400 VALIDATION_FAILED, fieldErrors liệt kê từng tham số lỗi."
    source: "FR8.3, FR10.2, FR10.3"
  - id: BR19.4
    statement: "Hai danh sách phân trang phía server với thứ tự cố định mới nhất trước, không có tham số sắp xếp."
    category: policy
    applies_to: "GET /api/transactions, GET /api/callbacks"
    trigger: "Mỗi lần gọi danh sách"
    logic: >-
      THEN page mặc định 1, size mặc định 20 (chỉ 20, 50, 100). Giao dịch sắp theo latestReceivedAt giảm dần rồi latestCallbackId giảm dần; callback sắp theo receivedAt giảm dần rồi recordId giảm dần.
      totalItems là tổng số dòng khớp bộ lọc; totalPages là totalItems chia size làm tròn lên và bằng 0 khi không có dòng nào.
      IF page lớn hơn totalPages THEN 200 với items rỗng cùng totalItems và totalPages đúng. Ví dụ: 25 giao dịch cho trang 1 có 20 dòng, trang 2 có 5 dòng, totalItems 25.
    violation: "page hoặc size sai: xem BR19.3."
    source: "FR8.3, FR10.3"
  - id: BR19.5
    statement: "Danh sách callback gồm cả ba kết quả SUCCESS, MAPPING_ERROR, REJECTED, kể cả callback thiếu transactionId và của dịch vụ đã xóa."
    category: policy
    applies_to: "GET /api/callbacks"
    trigger: "Mỗi lần gọi danh sách callback"
    logic: >-
      THEN mỗi dòng gồm recordId, serviceCode (chữ gốc), serviceDeleted, receivedAt, outcome, rejectionReason (rỗng khi không bị từ chối), httpStatusReturned, transactionId, status, businessTimestamp (có thể rỗng).
      Callback MAPPING_ERROR có thể vẫn có transactionId; lần nhận bị từ chối không có. Lọc outcome bằng REJECTED với từng rejectionReason chỉ cho đúng các lần nhận bị từ chối vì lý do đó.
    violation: "Không áp dụng."
    source: "FR10.1, FR10.2"
  - id: BR19.6
    statement: "Chi tiết một lần nhận trả mọi outcome theo recordId hoặc 404 CALLBACK_NOT_FOUND."
    category: policy
    applies_to: "GET /api/callbacks/{recordId}"
    trigger: "Mỗi lần gọi chi tiết một lần nhận"
    logic: >-
      IF recordId không phải số nguyên 64 bit THEN 400 VALIDATION_FAILED. IF không có Callback với recordId (kể cả recordId nhỏ hơn 1) THEN 404 CALLBACK_NOT_FOUND.
      ELSE trả các trường dòng danh sách cùng configVersionNumber, requestHeaders đã che, đúng một trong payloadJson và payloadRawText, mappingFieldResults (đối tượng rỗng khi REJECTED), responseStatusReturned, responseBodyReturned.
      "Đúng một" hiểu theo BR15.4: payloadRawText vắng thì payload nằm ở payloadJson (kể cả khi payload là JSON null); payloadRawText có mặt (kể cả chuỗi rỗng) thì payloadJson không có giá trị.
      payloadJson là dạng chuẩn hóa của định dạng JSON của kho dữ liệu (số như 1e3 có thể hiện thành 1000, thứ tự khóa và khóa trùng không được giữ).
    violation: "400 VALIDATION_FAILED hoặc 404 CALLBACK_NOT_FOUND."
    source: "FR10.4"
  - id: BR19.7
    statement: "Các API danh sách có lọc và phân trang phải trả kết quả dưới 1 giây ở p95 với 100.000 callback trong database trên máy local."
    category: constraint
    applies_to: "GET /api/transactions, GET /api/callbacks"
    trigger: "Mỗi lần gọi danh sách khi database có 100.000 callback"
    logic: "THEN ngữ nghĩa lọc và sắp xếp ở BR19.1 đến BR19.4 là cố định, không đánh đổi để tăng tốc. Chỉ mục, truy vấn và cách đo NFR1 do NFR Requirements và NFR Design quyết định, không chốt ở đây. Dữ liệu 100.000 callback do công cụ nạp ở BR22.x tạo."
    violation: "p95 từ 1 giây trở lên là không đạt NFR1."
    source: "NFR1"

  # Nhóm 20 — Đồng thời (CallbackIngestion, CallbackLedger)
  - id: BR20.1
    statement: "Gửi đồng thời 50 callback cùng dịch vụ và cùng transactionId cho đúng 50 bản ghi Callback, đúng một Transaction với callbackCount bằng 50, và không request nào nhận lỗi."
    category: constraint
    applies_to: "Callback, Transaction"
    trigger: "50 request đồng thời cùng (serviceCode, transactionId)"
    logic: "THEN mỗi request nhận response đã cấu hình (không 500, không mất callback); Callback đếm được 50; Transaction duy nhất cho cặp đó có callbackCount bằng 50. Cách bảo đảm do NFR Design chọn."
    violation: "Mất callback hoặc tổng số sai là lỗi dữ liệu nghiêm trọng (NFR2)."
    source: "NFR2, FR5.5"
  - id: BR20.2
    statement: "Gửi đồng thời 50 callback cho 50 transactionId khác nhau cho đúng 50 Transaction, mỗi cái callbackCount bằng 1."
    category: constraint
    applies_to: "Transaction"
    trigger: "50 request đồng thời với 50 transactionId khác nhau"
    logic: "THEN có đúng 50 Transaction mới, mỗi cái callbackCount bằng 1, không Transaction nào bị gộp nhầm hay mất; mọi request nhận response đã cấu hình."
    violation: "Giao dịch bị gộp nhầm hoặc mất là lỗi dữ liệu nghiêm trọng (NFR2)."
    source: "NFR2"
  - id: BR20.3
    statement: "Trạng thái giao dịch sau xử lý đồng thời là của callback có cặp (receivedAt, recordId) lớn nhất, bất kể thứ tự hoàn tất của các giao dịch cơ sở dữ liệu."
    category: calculation
    applies_to: "Transaction.latest*"
    trigger: "Nhiều callback cùng giao dịch hoàn tất đồng thời"
    logic: "THEN các trường latest* của Transaction bằng giá trị của Callback có receivedAt muộn nhất; hòa receivedAt thì recordId lớn hơn thắng; timestamp nghiệp vụ không tham gia."
    violation: "Trạng thái lấy từ callback không phải gần nhất là lỗi dữ liệu."
    source: "FR5.5, NFR2"

  # Nhóm 21 — Tài sản mẫu (US2.11)
  - id: BR21.1
    statement: "Có ba dịch vụ mẫu với mã THU_HO, CHI_HO, BIEN_DONG_SO_DU, mỗi dịch vụ một cấu hình trình diễn một tính năng khác nhau."
    category: policy
    applies_to: "docs/samples của tpp-simulator-app"
    trigger: "Chạy script tạo dịch vụ mẫu"
    logic: >-
      THU_HO: authType NONE, ISO_8601, múi giờ Asia/Ho_Chi_Minh, đường dẫn $.transId, $.code, $.time, response 200 với thân JSON một trường code bằng chuỗi 00.
      CHI_HO: authType API_KEY với header X-Api-Key và khóa giả công khai sample-key-chi-ho, PATTERN yyyy-MM-dd HH:mm:ss, múi giờ Asia/Ho_Chi_Minh, đường dẫn $.processId, $.status, $.date, response 200 với thân JSON một trường status bằng chuỗi OK.
      BIEN_DONG_SO_DU: authType NONE, UNIX_MILLIS, đường dẫn $.trnId, $.stage, $.dateTime, response 202 với thân JSON một trường received bằng true.
      Mỗi dịch vụ bật (enabled true). Khóa mẫu là giá trị giả công khai ghi rõ chỉ để thử, không bao giờ là khóa thật. UNIX_SECONDS không có dịch vụ mẫu mà được phủ bằng kiểm thử tích hợp.
    violation: "Không áp dụng."
    source: "FR12.1"
  - id: BR21.2
    statement: "Mỗi dịch vụ mẫu có đúng hai payload thử: một payload ánh xạ đúng ba trường và một payload thiếu hoặc sai một trường."
    category: policy
    applies_to: "docs/samples của tpp-simulator-app"
    trigger: "Gửi payload mẫu bằng cURL"
    logic: >-
      THEN payload hợp lệ cho kết quả SUCCESS với đúng ba giá trị đã ánh xạ (thu hộ, chi hộ: timestamp 2026-10-19T03:00:00Z từ 10:00:00 giờ Việt Nam; biến động số dư: 1760850000000 mili giây ra 2025-10-19T05:00:00Z).
      Payload lỗi cho kết quả MAPPING_ERROR với lỗi cụ thể cho trường thiếu hoặc sai (ví dụ thiếu code, hoặc ngày sai định dạng) để người dùng thấy cách lỗi mapping hiển thị; callback vẫn nhận response đã cấu hình.
      Payload nội dung ví dụ nằm ở functional-spec.md.
    violation: "Không áp dụng."
    source: "FR12.1"
  - id: BR21.3
    statement: "Tài sản mẫu nằm ở docs/samples của tpp-simulator-app: mỗi dịch vụ một tệp cấu hình và hai tệp payload; hai script (PowerShell và bash) cùng đọc các tệp JSON đó; lệnh cURL mẫu cho PowerShell và bash nằm trong README của thư mục."
    category: policy
    applies_to: "docs/samples"
    trigger: "Bản checkout sạch"
    logic: "THEN mỗi dịch vụ có một tệp <mã>.service.json (đúng thân của yêu cầu tạo dịch vụ) và hai tệp payload; README của thư mục có lệnh cURL cho từng dịch vụ (PowerShell dùng curl.exe, bash dùng curl) gửi payload hợp lệ và payload lỗi; lệnh của CHI_HO mang header X-Api-Key với khóa mẫu."
    violation: "Không áp dụng."
    source: "FR12.1, FR12.2"
  - id: BR21.4
    statement: "Script tạo ba dịch vụ mẫu bằng API, chạy lại được: dịch vụ đã có thì báo đã tồn tại và tiếp tục, không tạo bản trùng."
    category: policy
    applies_to: "Script tạo dịch vụ mẫu"
    trigger: "Chạy script"
    logic: >-
      THEN với mỗi dịch vụ gọi POST /api/services bằng tệp cấu hình mẫu. IF phản hồi 201 THEN in đã tạo. IF phản hồi 409 SERVICE_CODE_DUPLICATE THEN in đã tồn tại (hoặc đã bị xóa) và tiếp tục. Mọi phản hồi khác hoặc không kết nối được là lỗi: ghi nhận, vẫn thử các dịch vụ còn lại.
      Mã thoát 0 khi mọi dịch vụ ở trạng thái đã tạo hoặc đã tồn tại; khác 0 khi có lỗi khác. Địa chỉ backend có giá trị mặc định http://127.0.0.1:8080 và đổi được bằng tham số. Script không sửa dịch vụ đã có và không xóa gì.
    violation: "Mã thoát khác 0 khi có lỗi ngoài trùng mã."
    source: "FR12.2"
  - id: BR21.5
    statement: "Ứng dụng không tự tạo bất kỳ dịch vụ nào khi khởi động."
    category: constraint
    applies_to: "Khởi động ứng dụng"
    trigger: "Khởi động lần đầu hoặc mọi lần"
    logic: "THEN danh sách dịch vụ của một database trống vẫn trống sau khi khởi động; không bản chuyển lược đồ hay mã khởi động nào thêm dịch vụ; dịch vụ mẫu chỉ được tạo khi người dùng chạy script."
    violation: "Có dịch vụ tự tạo là vi phạm FR12.2."
    source: "FR12.2"

  # Nhóm 22 — Công cụ nạp dữ liệu thử (NFR1)
  - id: BR22.1
    statement: "Công cụ nạp dữ liệu thử là một lệnh riêng trong tpp-simulator-app, không bao giờ chạy lúc khởi động, và đi qua chính logic nhận callback của ứng dụng nhưng không qua HTTP."
    category: policy
    applies_to: "Lệnh nạp dữ liệu"
    trigger: "Người dùng chạy lệnh nạp"
    logic: >-
      THEN mỗi lần nhận được tạo qua đúng các quy tắc ánh xạ, che header, gom giao dịch và ghi Callback của ứng dụng (kể cả lần bị từ chối theo BR15.x), không chèn thẳng vào bảng và không gửi request mạng. Khởi động ứng dụng không bao giờ gọi lệnh này.
      Công cụ đi vào logic nhận callback qua một lối vào nội bộ, nơi receivedAt do công cụ cung cấp thay vì do server gán lúc bắt đầu nhận (BR17.4). Lối vào này CHỈ công cụ nạp dùng: không có đường HTTP nào, không có tham số API nào để người gọi đặt receivedAt; endpoint callback thật luôn tự gán receivedAt. Công cụ dùng lối vào này để rải thời điểm nhận trong --days ngày (BR22.4).
      Lựa chọn Q8 A thay thế dòng "Đo hiệu năng 100.000 callback" của U1 (xem Assumptions & Open Questions, giả định 12).
    violation: "Dữ liệu nạp không tuân quy tắc nghiệp vụ làm số đo NFR1 kém đáng tin."
    source: "NFR1"
  - id: BR22.2
    statement: "Công cụ ghi vào một database riêng trong cùng PostgreSQL, tên cấu hình được, mặc định khác database thử thật, và từ chối chạy nếu đích trùng database thật."
    category: constraint
    applies_to: "LoadRunParameters.targetDatabase"
    trigger: "Bắt đầu lệnh nạp"
    logic: "IF tên database đích bằng database mà ứng dụng dùng cho dữ liệu thử thật THEN dừng với thông báo, không ghi gì. IF database đích chưa có THEN công cụ tạo nó; nếu không tạo được thì dừng với thông báo rõ. Lược đồ của database đích cùng phiên bản với ứng dụng."
    violation: "Dừng với thông báo, mã thoát khác 0, không ghi gì."
    source: "NFR1"
  - id: BR22.3
    statement: "Tham số của công cụ: --callbacks (mặc định 100000), --seed (cố định để lặp lại), --days (mặc định 30), --services (mặc định 3, mã LOAD_01 trở đi), --append."
    category: validation
    applies_to: "LoadRunParameters"
    trigger: "Bắt đầu lệnh nạp"
    logic: >-
      THEN --callbacks, --days, --services là số nguyên từ 1 trở lên; --seed có giá trị mặc định là một hằng số cố định nên chạy lại cho cùng dữ liệu; mã dịch vụ là LOAD_ cộng số thứ tự hai chữ số (nhiều hơn 99 dịch vụ thì dùng đủ số chữ số).
      IF tham số sai kiểu hoặc ngoài khoảng THEN dừng với thông báo nêu tham số, mã thoát khác 0, chưa ghi gì.
    violation: "Dừng với thông báo, mã thoát khác 0."
    source: "NFR1"
  - id: BR22.4
    statement: "Dữ liệu nạp có hình dạng gần thực tế: trung bình khoảng 4 callback mỗi giao dịch (có giao dịch tới 20), 85% SUCCESS, 10% MAPPING_ERROR, 5% REJECTED với đủ sáu lý do, thời điểm nhận rải đều trong --days ngày gần nhất, payload khoảng 1 KB."
    category: calculation
    applies_to: "Dữ liệu do công cụ tạo"
    trigger: "Lệnh nạp chạy"
    logic: >-
      THEN cùng seed cho cùng cấu trúc và giá trị dữ liệu (thời điểm nhận tính từ lúc chạy). Thời điểm nhận của từng lần nhận do công cụ chọn rải đều trong --days ngày gần nhất rồi đưa vào lối vào nội bộ của BR22.1 như receivedAt. Các dịch vụ LOAD_xx được tạo với nhiều cấu hình khác nhau (có dịch vụ API_KEY, có dịch vụ dùng PATTERN và Unix) để phủ các lý do từ chối và định dạng thời gian.
      Lý do SERVICE_DISABLED và SERVICE_DELETED được tạo bằng cách đưa cho logic nhận callback một ảnh dịch vụ ở trạng thái đó tại thời điểm nhận; bản ghi dịch vụ trong database đích vẫn bật.
    violation: "Không áp dụng."
    source: "NFR1"
  - id: BR22.5
    statement: "Công cụ không nhân đôi dữ liệu lặng lẽ, báo cáo kết quả và dừng rõ ràng khi lỗi."
    category: policy
    applies_to: "Lệnh nạp dữ liệu"
    trigger: "Lệnh nạp chạy và kết thúc"
    logic: >-
      IF dịch vụ LOAD_xx đã có trong database đích và không có --append THEN dừng với thông báo, không ghi gì. IF có --append THEN thêm dữ liệu mới: các dịch vụ LOAD_01 đến LOAD_<--services> đã có thì dùng lại và bỏ qua việc tạo (không báo lỗi, không sửa), các dịch vụ còn thiếu trong khoảng đó được tạo thêm với cấu hình theo số thứ tự như BR22.4; dịch vụ LOAD_ có số lớn hơn --services đã có sẵn không bị chạm tới và không nhận dữ liệu mới. Lần nạp thêm phân bổ --callbacks lần nhận mới cho các dịch vụ LOAD_01 đến LOAD_<--services>.
      Khi xong in số bản ghi Callback, số giao dịch và thời gian nạp, mã thoát 0. IF lỗi giữa chừng THEN dừng, in số bản ghi đã ghi và lý do, mã thoát khác 0; dữ liệu đã ghi giữ nguyên, chạy lại cần --append hoặc xóa database nạp.
    violation: "Mã thoát khác 0 khi lỗi."
    source: "NFR1"
```

## Tóm tắt quy tắc

| Nhóm | Mã | Nội dung chính | Loại |
|---|---|---|---|
| 11. Kiểm tra cấu hình | BR11.1 đến BR11.8 | Gỡ từ chối tạm, cú pháp đường dẫn, mẫu ngày giờ, tên header và khóa API, điều kiện theo authType, gom lỗi | constraint, validation |
| 12. Sửa và phiên bản | BR12.1 đến BR12.7 | Sửa thay toàn bộ, không lưu khi lỗi, đổi khóa, khi nào sinh phiên bản, số phiên bản liên tục, tuần tự hóa theo dịch vụ chung cho sửa, bật/tắt, xóa mềm, callback cũ bất biến | policy, validation, calculation, constraint |
| 13. Vòng đời và API quản lý | BR13.1 đến BR13.6 | Liệt kê, bật/tắt, xóa mềm, 404 trên dịch vụ đã xóa, không trả khóa, thân yêu cầu hỏng | policy, constraint, validation |
| 14. Thứ tự kiểm tra và xác thực | BR14.1 đến BR14.10 | Ảnh dịch vụ một lần, thứ tự kiểm tra, trạng thái dịch vụ, so khớp khóa, NONE, bảng mã từ chối, mapping lỗi vẫn trả response, 500 khi lỗi ghi, nhật ký | policy, authorization, constraint |
| 15. Ghi lần nhận bị từ chối | BR15.1 đến BR15.6 | Phạm vi ghi, hình dạng bản ghi, không vào giao dịch, payload, giao dịch riêng, mã gốc kèm header khi không ghi được | policy, constraint |
| 16. Che header | BR16.1 đến BR16.2 | Che ba header chuẩn và header khóa, không lộ khóa ở đâu | constraint |
| 17. Timestamp | BR17.1 đến BR17.5 | Unix giây/mili giây, khoảng hợp lệ, mẫu chuỗi, chuẩn hóa UTC chung, thiếu so với lỗi | calculation, validation |
| 18. Thử mapping | BR18.1 đến BR18.4 | Cùng engine, kiểm tra cấu hình, JSON mẫu, kết quả ba trường | policy, validation, calculation |
| 19. Tra cứu | BR19.1 đến BR19.7 | Bộ lọc hai danh sách, kiểm tra tham số, phân trang và thứ tự, danh sách đủ ba loại, chi tiết, hiệu năng | policy, validation, constraint |
| 20. Đồng thời | BR20.1 đến BR20.3 | 50 cùng transactionId, 50 khác transactionId, trạng thái gần nhất | constraint, calculation |
| 21. Tài sản mẫu | BR21.1 đến BR21.5 | Ba dịch vụ, payload, cấu trúc thư mục, script chạy lại được, không tự tạo | policy, constraint |
| 22. Công cụ nạp | BR22.1 đến BR22.5 | Lệnh riêng qua logic ứng dụng, database riêng, tham số, hình dạng dữ liệu, chạy lại và báo cáo | policy, constraint, validation, calculation |

Tổng cộng 68 quy tắc. Mỗi quy tắc đều truy được về một yêu cầu (cột `source`). Tiêu chí chấp nhận của U2 ánh xạ vào quy tắc ở `traceability.json`; các quy tắc phục vụ tiêu chí của U3 hoặc U4, hoặc không ứng với tiêu chí nào, được giải thích ở mục `reverse` của tệp đó.

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/units-generation/unit-of-work.md` và `unit-of-work-story-map.md` (phạm vi U2, tập con tiêu chí của U1)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/requirements-analysis/requirements.md` (FR1 đến FR6, FR8, FR10, FR12, NFR1 đến NFR3)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/user-stories/stories.md` (AC1.2.1 đến AC1.14.5, AC2.11.1 đến AC2.11.5)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/domain-design/components.md` và `decisions.md` (hành vi thành phần, ADR-002, ADR-004, ADR-005, ADR-007)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-summary.md` và `tpp-simulator-app/docs/api/openapi.yaml` (C1 đến C4)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/functional-design/rules.md` (quy tắc nền được mở rộng, gọi theo tên)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/functional-design/functional-design-questions.md` (Q1 đến Q8 chọn A, giả định 1 đến 30)
- `docs/brief.md` (mục 3, 4, 6) và `.claude/knowledge/aidlc-product-agent/corner-checklist.md`

## Assumptions & Open Questions

- **Payload mà định dạng JSON của kho dữ liệu không lưu trung thực được** (chuỗi chứa ký tự thoát U+0000, ký tự thoát nửa cặp thay thế, số vượt miền; điều kiện ở BR15.4): callback được chấp nhận vẫn trả 500 INTERNAL_ERROR (BR14.8, như U1 đã chấp nhận và ghi ở README); lần nhận bị từ chối thì lưu dạng văn bản gốc (BR15.4) để không mất bằng chứng. Nếu bạn muốn callback như vậy nhận 400 thay vì 500, cần sửa BR14.2 và BR14.8.
- **PATTERN nhận cả số JSON** theo văn bản gốc (BR17.3), ngoài chuỗi mà Q4 nêu, để mẫu gọn như yyyyMMddHHmmss dùng được với payload gửi số. Là mở rộng nhỏ so với câu chữ của Q4.
- **Giờ chuyển mùa** (BR17.4): giờ bị trùng lấy offset sớm hơn, giờ không tồn tại được dời tới. Q4 chỉ nói ngày không tồn tại là UNPARSEABLE; quy tắc này khớp cách U1 xử lý ISO không múi giờ. Múi giờ mặc định Asia/Ho_Chi_Minh không có chuyển mùa nên hiếm khi xảy ra.
- **Thông báo lỗi đường dẫn** nêu một ký tự vi phạm (BR11.2) theo Q2 A, là ngoại lệ duy nhất so với nguyên tắc "không lặp lại giá trị đầu vào" của U1; ký tự không in được được nêu bằng mã điểm U+XXXX.
- **Các quy ước thêm để thiết kế đủ chi tiết** (không có trong câu hỏi, cần bạn đọc ở cổng duyệt): `updatedAt` giữ nguyên khi sửa không đổi gì (BR12.5); tham số truy vấn lặp lại bị 400 (BR19.3); `recordId` không phải số nguyên bị 400 (BR19.6); mẫu 12 giờ bắt buộc có chỉ báo sáng chiều (BR11.3); số JSON có số mũ được hiểu theo giá trị chính xác (BR17.1).
- **Công cụ nạp** (BR22.x): tự tạo database đích nếu chưa có, từ chối khi đích trùng database thật; lý do SERVICE_DISABLED và SERVICE_DELETED trong dữ liệu nạp được mô phỏng bằng ảnh dịch vụ lúc nhận chứ không bằng trạng thái thật của dịch vụ LOAD_xx; "cùng seed cho cùng dữ liệu" tính trừ thời điểm tuyệt đối (rải đều trong `--days` ngày tính từ lúc chạy). Cách đo NFR1 vẫn thuộc NFR Requirements.
- Cơ chế đồng thời cụ thể, cơ chế tuần tự hóa theo dịch vụ (ranh giới những việc nằm trong phần tuần tự hóa đã chốt ở BR12.6) và chỉ mục (BR19.7, BR20.x): NFR Design. Cách đo p95 với 100.000 callback: NFR Requirements. Giới hạn kích thước phản hồi chi tiết giao dịch (R-10): NFR Design. Dạng lưu khóa API đã chốt từ U1 (Q2 C, NFR3.5): nguyên văn ở cột khóa của Service.
- **Các giả định 11 đến 14 của `functional-spec.md`** (cách hiểu AC1.12.3, thay thế dòng đo hiệu năng của U1, ngữ nghĩa bộ lọc thời gian, giá trị rỗng của `includeDeleted`) áp dụng cho các quy tắc ở đây (BR16.2, BR22.1, BR22.5, BR19.1, BR13.1) và cần bạn đọc ở cổng duyệt.
