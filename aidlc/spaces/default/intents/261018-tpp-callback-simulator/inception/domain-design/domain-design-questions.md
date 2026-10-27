# Domain Design — Câu hỏi làm rõ

> Đã chốt, không hỏi lại: công nghệ và cấu trúc thư mục (brief mục 2: một backend, một frontend, một database); toàn bộ yêu cầu FR1–FR12, NFR1–NFR7 và 34 story; năm màn hình S1–S5. Bước này chỉ chọn các khối xây dựng (thành phần) và chủ sở hữu của từng thực thể. Cách gom thành đơn vị triển khai thuộc bước Units Generation, còn kiểu dữ liệu và ràng buộc chi tiết thuộc Functional Design.

## Q1. Giao dịch (dịch vụ + transactionId) được lưu thế nào?

Status của giao dịch lấy từ callback nhận gần nhất. Cần đúng khi 50 callback cùng giao dịch đến đồng thời (NFR2) và danh sách trả dưới 1 giây (p95) với 100.000 callback (NFR1).

A. (Recommended) Giao dịch là một bản ghi riêng, cập nhật trong cùng một giao dịch cơ sở dữ liệu với việc ghi callback: giữ status và thời điểm của lần nhận gần nhất cùng tổng số callback. Danh sách giao dịch đọc thẳng bản ghi này
B. Giao dịch không có bản ghi riêng, chỉ là cách nhìn tính từ bảng callback mỗi lần truy vấn: ghi đơn giản hơn, nhưng truy vấn danh sách nặng hơn khi dữ liệu lớn
X. Other (please specify)

[Answer]:A

## Q2. Backend chia thành những thành phần nào?

Các khối chính: cấu hình dịch vụ, ánh xạ (đường dẫn JSON, timestamp), quy trình nhận callback (kiểm tra theo thứ tự 404, 503, 401, 400, ánh xạ, lưu, trả response), và nơi lưu cùng truy vấn callback và giao dịch.

A. (Recommended) Bốn thành phần: **ServiceCatalog** (cấu hình dịch vụ và các phiên bản cấu hình), **MappingEngine** (đường dẫn `$.a.b.c`, timestamp, thử mapping), **CallbackIngestion** (quy trình nhận callback), **CallbackLedger** (sở hữu Callback và Transaction; ghi và truy vấn)
B. Năm thành phần: như A nhưng tách phía đọc thành **MonitoringQuery** (chỉ truy vấn), CallbackLedger chỉ ghi
C. Ba thành phần: gộp CallbackIngestion và CallbackLedger thành một
X. Other (please specify)

[Answer]:A

## Q3. Frontend chia thành những thành phần nào?

A. (Recommended) Ba thành phần: **AppShell** (khung ứng dụng và phần dùng chung: khung xem JSON, bảng, bộ lọc, hộp thoại, gọi API, định dạng thời gian), **ServiceConsole** (S1, S2, S3), **Monitoring** (S4, S5)
B. Một thành phần frontend duy nhất
C. Mỗi màn hình S1–S5 một thành phần, cộng một thành phần dùng chung
X. Other (please specify)

[Answer]:A

## Giả định đề xuất

Những chi tiết dưới đây chưa có trong brief hay yêu cầu. Tôi đề xuất chọn như sau và sẽ ghi vào `components.md` và `decisions.md`:

1. **Cách đặt tên:** tên thành phần và thực thể bằng tiếng Anh PascalCase (là tên trong mã), phần mô tả bằng tiếng Việt.
2. **Thử mapping do server tính:** thành phần MappingEngine cung cấp cả "áp dụng cấu hình cho một payload" và "thử mapping với cấu hình đang nhập", dùng chung một bộ quy tắc, để kết quả thử đúng bằng kết quả lúc nhận callback thật (lấy từ góp ý của lần xem lại Refined Mockups). Trình duyệt không tự tính mapping.
3. **Phiên bản cấu hình:** mỗi lần sửa dịch vụ tạo một phiên bản mới bất biến (thực thể **ServiceConfigVersion**, thuộc ServiceCatalog). Mỗi Callback tham chiếu phiên bản đã dùng; giao diện hiển thị "phiên bản N" (US1.13).
4. **Xóa mềm:** dịch vụ có trạng thái đã xóa; mã dịch vụ không dùng lại; callback cũ vẫn trỏ về dịch vụ đã xóa.
5. **Request bị từ chối:** request tới `serviceCode` có thật mà bị từ chối (401, 400, 503, đã xóa) vẫn thành một **Callback** với kết quả "bị từ chối" và lý do, không thuộc giao dịch nào. Request tới `serviceCode` chưa từng có, hoặc quá 1 MB, không tạo gì (FR3.8, FR3.9).
6. **Thời điểm nhận:** `receivedAt` do server gán khi bắt đầu nhận request; hòa nhau thì theo mã bản ghi do cơ sở dữ liệu sinh, tăng dần (FR5.5).
7. **Khóa API:** ServiceCatalog giữ khóa và chỉ đưa cho CallbackIngestion để so khớp; không bao giờ ra khỏi backend qua API quản lý. Cách lưu (băm hay mã hóa) thuộc NFR Requirements.
8. **Che header:** CallbackIngestion che các header nhạy cảm trước khi giao cho CallbackLedger; CallbackLedger không bao giờ nhận giá trị chưa che (FR6.1).
9. **Phụ thuộc:** ServiceCatalog gọi MappingEngine (kiểm tra cú pháp khi lưu); CallbackIngestion gọi ServiceCatalog (đọc cấu hình), MappingEngine (áp dụng) và CallbackLedger (ghi); frontend gọi backend đồng bộ qua HTTP. Không có sự kiện hay hàng đợi, không có vòng phụ thuộc.
10. **Hạ tầng không phải thành phần:** PostgreSQL (JSONB) là phụ thuộc ngoài của ServiceCatalog và CallbackLedger.
11. **Truy vết:** `traceability.json` ánh xạ mỗi story `USx.y` tới thành phần hoặc thực thể hiện thực hóa nó; các story phía backend (US1.x) tới thành phần backend, các story giao diện tới thành phần frontend (kèm thành phần backend mà nó gọi nếu cần).
12. **Won't Have:** US4.1–US4.10 không có thành phần; ghi "N/A" kèm lý do trong truy vết.

## Assumption Confirmation

Bạn đồng ý dùng các giả định trên chứ? Nếu muốn đổi giả định nào, chọn B và ghi số giả định.

A. Accept assumptions
B. Convert to follow-up questions
X. Other (please specify)

[Answer]:A

## Consolidated Summary Confirmation

Tóm tắt câu trả lời:

- Q1 — Giao dịch là một bản ghi riêng (Transaction), cập nhật trong cùng một giao dịch cơ sở dữ liệu với việc ghi callback; danh sách giao dịch đọc thẳng bản ghi này.
- Q2 — Backend có bốn thành phần: ServiceCatalog, MappingEngine, CallbackIngestion, CallbackLedger (sở hữu Callback và Transaction, ghi và truy vấn).
- Q3 — Frontend có ba thành phần: AppShell (khung và phần dùng chung), ServiceConsole (S1, S2, S3), Monitoring (S4, S5).
- Giả định — Đồng ý 12 giả định: tên thành phần và thực thể bằng tiếng Anh PascalCase, mô tả bằng tiếng Việt; thử mapping do server tính qua MappingEngine; mỗi lần sửa dịch vụ tạo một ServiceConfigVersion bất biến; xóa mềm giữ mã và lịch sử; request bị từ chối tới dịch vụ có thật vẫn thành Callback "bị từ chối"; `receivedAt` do server gán, hòa nhau theo mã bản ghi tăng dần; khóa API chỉ ServiceCatalog giữ và chỉ đưa cho CallbackIngestion; CallbackIngestion che header trước khi giao cho CallbackLedger; phụ thuộc đồng bộ, không sự kiện hay hàng đợi, không vòng; PostgreSQL là phụ thuộc ngoài, không phải thành phần; truy vết story tới thành phần hoặc thực thể; Won't Have ghi N/A.

Does this all look correct before I generate the component catalogue?

- Looks correct
- Request changes

[Answer]: Looks correct
