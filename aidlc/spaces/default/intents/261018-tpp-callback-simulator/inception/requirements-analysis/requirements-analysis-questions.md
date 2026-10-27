# Requirements Analysis — Câu hỏi làm rõ

> Mọi nội dung trong `docs/brief.md` và các quyết định ở Ideation (xóa mềm dịch vụ, chỉ chạy local, dữ liệu giả lập, bố cục Stitch) đã chốt nên không hỏi lại. Theo brief mục 9, các câu dưới đây chỉ hỏi những điểm ảnh hưởng phạm vi, nghiệp vụ hoặc bảo mật mà brief chưa nói tới. Chi tiết triển khai thông thường được ghi thành giả định ở cuối file để bạn duyệt một lần.

## Q1. Có lưu lại các request bị từ chối (401, 400, 503) không?

Brief nói tab "Tất cả callback" có mọi lần nhận, kể cả lỗi mapping và thiếu transactionId, nhưng chưa nói về request bị từ chối do sai API key, JSON không hợp lệ hoặc dịch vụ đang tắt. Đây là những trường hợp người kiểm thử hay cần xem nhất khi "callback không đến".

A. (Recommended) Có: request tới một dịch vụ có thật (đang bật, đang tắt hoặc đã xóa) đều được lưu vào "Tất cả callback", kèm mã HTTP đã trả và lý do từ chối (sai/thiếu API key, JSON không hợp lệ, dịch vụ tắt, dịch vụ đã xóa); không nhóm vào giao dịch. Body không phải JSON hợp lệ được lưu dạng văn bản gốc. Request tới `serviceCode` chưa từng tồn tại thì không lưu
B. Không: chỉ lưu request đã qua xác thực và là JSON hợp lệ, như brief đang mô tả; request bị từ chối chỉ ghi vào log của server
X. Other (please specify)

[Answer]: A

## Q2. Request gửi lên với Content-Type khác JSON thì xử lý thế nào?

Brief nói endpoint "nhận application/json" và JSON không hợp lệ trả 400, nhưng chưa nói về request có Content-Type khác (ví dụ `text/plain`) hoặc không có Content-Type. `application/json; charset=UTF-8` luôn được chấp nhận.

A. (Recommended) Trả 400 như JSON không hợp lệ, để giữ đúng bộ mã lỗi trong brief
B. Trả 415 Unsupported Media Type
C. Bỏ qua Content-Type: nếu body là JSON hợp lệ thì vẫn xử lý bình thường
X. Other (please specify)

[Answer]:A

## Q3. Gửi callback thử cho dịch vụ dùng API_KEY thì lấy khóa từ đâu?

Brief yêu cầu che giá trị khóa trên giao diện, đồng thời gửi callback thử phải đi qua xác thực thật. Câu này quyết định khóa có bao giờ được gửi về trình duyệt hay không.

A. (Recommended) Form tự điền sẵn tên header; người dùng tự nhập giá trị khóa (hoặc cố ý nhập sai để thử 401). Khóa không bao giờ được backend gửi về trình duyệt
B. Form có thêm lựa chọn "Dùng khóa đã cấu hình": trình duyệt gửi request kèm ký hiệu đặc biệt và backend tự chèn khóa thật trước khi xác thực
C. Backend trả giá trị khóa thật cho form gửi thử (ô nhập vẫn che, có nút hiện)
X. Other (please specify)

[Answer]: A

## Q4. Cấu hình mẫu cho ba dịch vụ (thu hộ, chi hộ, biến động số dư) được tạo bằng cách nào?

A. (Recommended) Tự tạo ba dịch vụ mẫu khi khởi động lần đầu (chỉ khi database chưa có dịch vụ nào); payload mẫu và lệnh cURL đặt trong `docs/samples/`
B. Không tự tạo; `docs/samples/` có file cấu hình mẫu và script gọi API để tạo khi cần
X. Other (please specify)

[Answer]:B

## Q5. Ứng dụng cần chịu được lượng dữ liệu bao nhiêu?

Dữ liệu được giữ vô thời hạn (đã chốt ở Feasibility), nên cần một mục tiêu để kiểm chứng phân trang và bộ lọc.

A. (Recommended) Tới 100.000 callback trong database; các API danh sách có lọc và phân trang trả kết quả dưới 1 giây (p95) trên máy local
B. Không đặt mục tiêu hiệu năng trong MVP
X. Other (please specify)

[Answer]:A

## Giả định đề xuất

Những chi tiết dưới đây brief chưa nói tới. Tôi đề xuất chọn cách đơn giản như sau và sẽ ghi vào `requirements.md`:

1. **Thứ tự kiểm tra callback:** dịch vụ không tồn tại hoặc đã xóa (404) → dịch vụ tắt (503) → API key (401) → JSON (400) → mapping → lưu (lỗi lưu thì 500) → trả response đã cấu hình.
2. **Header API key:** tên header không phân biệt hoa thường; giá trị so khớp chính xác.
3. **Che headers lịch sử:** `Authorization`, `Proxy-Authorization`, `Cookie` và header API key của dịch vụ được lưu thành `***`; các header khác giữ nguyên.
4. **Giá trị khóa trên giao diện:** sau khi lưu chỉ hiện dạng che; khi sửa, để trống ô khóa nghĩa là giữ khóa cũ.
5. **Kiểu giá trị mapping:** chuỗi, số và boolean được lưu dưới dạng chuỗi nguyên văn; object, mảng, `null` hoặc chuỗi rỗng ở `transactionId` hoặc `status` là lỗi mapping. Payload gốc không phải object (ví dụ một mảng) thì cả ba trường đều lỗi mapping.
6. **Đường dẫn JSON:** chỉ dạng `$.a.b.c` (root và object lồng nhau); đường dẫn sai cú pháp bị từ chối khi lưu cấu hình.
7. **Mẫu chuỗi ngày giờ:** viết theo cú pháp `DateTimeFormatter` của Java (ví dụ `yyyy-MM-dd HH:mm:ss`); mẫu sai cú pháp bị từ chối khi lưu cấu hình. Múi giờ mặc định của dịch vụ là `Asia/Ho_Chi_Minh`. Timestamp không đọc được theo định dạng đã cấu hình là lỗi của trường timestamp.
8. **Response cấu hình:** HTTP status trong khoảng 200–599; body phải là JSON hợp lệ, được kiểm tra khi lưu.
9. **Mã dịch vụ:** 1–50 ký tự gồm chữ, số, `-`, `_`; so sánh trùng không phân biệt hoa thường, kể cả với mã đã xóa.
10. **Kích thước body:** tối đa 1 MB; lớn hơn thì trả 413 và không lưu.
11. **Bộ lọc:** transactionId và status lọc theo "chứa chuỗi", không phân biệt hoa thường; khoảng thời gian nhận nhập theo giờ Asia/Ho_Chi_Minh, tính cả hai đầu. Bộ lọc dịch vụ có cả dịch vụ đã xóa (ghi rõ "đã xóa").
12. **Phân trang:** mặc định 20 dòng mỗi trang, chọn được 20/50/100; sắp xếp theo thời điểm nhận mới nhất trước, hòa nhau thì theo mã bản ghi.
13. **Tự cập nhật:** bật sẵn khi mở màn hình theo dõi; lần polling trước chưa xong thì bỏ qua lần kế tiếp.
14. **Thời gian phản hồi khi gửi thử:** đo ở trình duyệt, từ lúc gửi tới lúc nhận đủ response.
15. **Kết nối frontend với backend:** khi chạy dev, Vite proxy chuyển `/api` và `/callbacks` sang backend, không cần cấu hình CORS.

## Assumption Confirmation

Bạn đồng ý dùng các giả định trên chứ? Nếu muốn đổi giả định nào, chọn B và ghi số giả định.

A. Accept assumptions
B. Convert to follow-up questions
X. Other (please specify)

[Answer]: A. Accept assumptions

## Consolidated Summary Confirmation

Tóm tắt câu trả lời:

- Q1 — Lưu cả request bị từ chối (401, 400, 503, dịch vụ đã xóa) vào "Tất cả callback", kèm mã HTTP và lý do; không nhóm vào giao dịch; body không phải JSON lưu dạng văn bản gốc; `serviceCode` chưa từng tồn tại thì không lưu.
- Q2 — Content-Type khác JSON trả 400 như JSON không hợp lệ.
- Q3 — Form gửi thử điền sẵn tên header API key; người dùng tự nhập giá trị khóa; backend không bao giờ gửi khóa về trình duyệt.
- Q4 — Không tự tạo dịch vụ mẫu; `docs/samples/` có file cấu hình mẫu, payload mẫu và script gọi API để tạo khi cần.
- Q5 — Tới 100.000 callback; API danh sách có lọc và phân trang dưới 1 giây (p95) trên máy local.
- Giả định — Đồng ý dùng 15 giả định đề xuất (câu trả lời "As" được hiểu là A).

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
