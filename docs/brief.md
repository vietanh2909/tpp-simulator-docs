# TPP Callback Simulator — Yêu cầu MVP (nguồn yêu cầu chính, đã chốt)

> Nguyên văn yêu cầu của người dùng. Mọi nội dung dưới đây là quyết định đã chốt, không hỏi lại.

## 1. Bối cảnh và mục tiêu

Đây là ứng dụng giả lập đối tác (TPP) trong môi trường dev/UAT của ngân hàng.

Ngân hàng có nhiều dịch vụ như thu hộ, chi hộ, thông báo biến động số dư. Ngân hàng chủ động gọi HTTP API của TPP để gửi thông báo kết quả nghiệp vụ.

Người dùng cấu hình dịch vụ trên TPP, lấy URL callback rồi tự cấu hình URL đó trên hệ thống ngân hàng.

TPP chỉ nhận callback và trả HTTP response. Không xây dựng luồng TPP gọi API nghiệp vụ sang ngân hàng.

Mục tiêu:
- Kiểm tra callback có đến TPP hay không.
- Xem trạng thái nghiệp vụ ngân hàng gửi sang.
- Xem payload và lịch sử các lần nhận.
- Thêm dịch vụ mới bằng cấu hình, không sửa code trong phạm vi HTTP POST JSON và mapping đã hỗ trợ.

## 2. Công nghệ và kiến trúc

- Java 21, Spring Boot, Maven.
- PostgreSQL; payload gốc lưu bằng JSONB.
- React, TypeScript, Vite.
- Một backend, một frontend, một database.
- Docker Compose chạy PostgreSQL.
- Chọn các phiên bản thư viện ổn định, tương thích và ghi rõ phiên bản.
- Không dùng microservices, Kafka, NoSQL, cache phân tán hoặc workflow engine.
- Chọn giải pháp UI đơn giản, nhất quán; không xây design system riêng.

Cấu trúc:
- tpp-simulator-app/ (backend, kho git riêng; chứa compose.yaml và docs/samples/)
- tpp-simulator-portal/ (frontend, kho git riêng)
- docs/

## 3. Màn hình cấu hình dịch vụ

Danh sách dịch vụ có:
- Mã dịch vụ, tên, mô tả.
- URL callback và nút sao chép.
- Kiểu xác thực.
- Trạng thái bật/tắt.
- Tạo mới, sửa và xóa dịch vụ.

Cấu hình từng dịch vụ:
- serviceCode duy nhất, không thay đổi sau khi tạo.
- URL tự sinh: POST /callbacks/{serviceCode}.
- Nhận application/json.
- Xác thực: NONE hoặc API_KEY.
- API_KEY cho phép cấu hình tên header và giá trị khóa; che giá trị trên giao diện và không ghi khóa vào log.
- Mapping transactionId, status, timestamp bằng đường dẫn JSON.
- Hỗ trợ tối thiểu trường ở root và object lồng nhau, ví dụ $.transId, $.data.transId. Chưa cần wildcard, filter hoặc mapping mảng.
- Định dạng timestamp: ISO 8601, Unix giây, Unix mili giây hoặc mẫu chuỗi ngày giờ.
- Cấu hình múi giờ khi chuỗi ngày giờ không có múi giờ.
- Response: HTTP status và JSON body cố định theo dịch vụ.
- Bật/tắt dịch vụ.

Có hai chức năng khác nhau:

1. Thử mapping:
   - Dán JSON mẫu, xem ba giá trị ánh xạ và lỗi từng trường.
   - Không tạo bản ghi callback hoặc giao dịch.
2. Gửi callback thử:
   - Nhập payload và headers.
   - Gọi endpoint callback thật của dịch vụ.
   - Đi qua đầy đủ xác thực, mapping, lưu và phản hồi.
   - Hiển thị HTTP status, response body, thời gian phản hồi.
   - Có lưu dữ liệu như callback bình thường.
   - Không tạo endpoint nhận callback riêng cho self-test.

## 4. Ví dụ mapping

Thu hộ:
- transactionId: $.transId
- status: $.code
- timestamp: $.time

Chi hộ:
- transactionId: $.processId
- status: $.status
- timestamp: $.date

Biến động số dư:
- transactionId: $.trnId
- status: $.stage
- timestamp: $.dateTime

Tạo cấu hình mẫu và payload thử cho cả ba dịch vụ.

## 5. Màn hình theo dõi

Tab "Giao dịch":
- Một dòng cho mỗi cặp serviceCode + transactionId.
- Hiển thị dịch vụ, mã giao dịch, trạng thái từ callback nhận gần nhất, timestamp nghiệp vụ của callback đó, thời điểm nhận gần nhất, tổng số callback.
- Bộ lọc: dịch vụ, transactionId, status, khoảng thời gian nhận.
- Có phân trang phía server.

Chi tiết giao dịch:
- Lịch sử callback theo thứ tự nhận.
- Payload gốc, headers đã che thông tin nhạy cảm.
- Kết quả mapping từng trường.
- HTTP response đã cấu hình cho lần nhận đó.

Tab "Tất cả callback":
- Mỗi lần nhận một dòng.
- Bao gồm callback lỗi mapping hoặc thiếu transactionId.
- Lọc theo dịch vụ, transactionId, thời gian nhận, kết quả mapping.
- Có phân trang phía server.

Tự cập nhật:
- Polling mỗi 5 giây, có bật/tắt và tải lại thủ công.
- Không làm mất bộ lọc, trang hiện tại hoặc đóng nội dung chi tiết đang đọc.
- Chưa cần WebSocket.

## 6. Quy tắc nghiệp vụ

- Giao dịch được xác định bằng serviceCode + transactionId.
- Mỗi callback được lưu riêng; không deduplicate và không ghi đè lịch sử.
- Giữ nguyên giá trị status nghiệp vụ; không tự diễn giải SUCCESS/FAILED hoặc gán ý nghĩa cho mã.
- Trạng thái tổng hợp lấy từ callback được nhận gần nhất, không dựa vào timestamp nghiệp vụ.
- Nếu callback mới thiếu status thì hiển thị thiếu giá trị và lỗi mapping; không lấy status cũ để che lỗi.
- Lưu riêng timestamp nghiệp vụ và receivedAt do server tạo.
- Chuẩn hóa thời gian hợp lệ về UTC; giao diện hiển thị theo Asia/Ho_Chi_Minh và ghi rõ múi giờ.
- Mapping lỗi vẫn lưu payload, các giá trị lấy được và lỗi cụ thể.
- Thiếu transactionId: lưu trong danh sách callback nhưng không nhóm vào giao dịch.
- Mapping lỗi vẫn trả response đã cấu hình nếu request là JSON hợp lệ, dịch vụ đang bật và xác thực hợp lệ.
- Service không tồn tại trả 404; dịch vụ tắt trả 503; API key sai/thiếu trả 401; JSON không hợp lệ trả 400.
- Lỗi lưu database trả 500, không trả response thành công theo cấu hình.
- Sửa cấu hình chỉ áp dụng cho callback mới.
- Lưu phiên bản hoặc snapshot cấu hình cần thiết để giải thích kết quả xử lý lịch sử.
- Xử lý đúng khi nhiều callback cùng transactionId đến đồng thời.
- Không lưu Authorization hoặc giá trị API key nguyên văn trong headers lịch sử.

## 7. Phạm vi loại trừ

- Không gọi API nghiệp vụ sang ngân hàng.
- Không quản lý danh sách giao dịch dự kiến hoặc phát hiện callback chưa đến.
- Không Kafka, SQL–NoSQL hoặc đồng bộ dữ liệu.
- Không đăng nhập và phân quyền quản trị trong MVP; người kiểm thử dùng chung dữ liệu.
- Không response động lấy giá trị từ request.
- Không giả lập timeout, độ trễ, lỗi N lần hoặc phản hồi theo điều kiện.
- Không triển khai production.

## 8. Tiêu chí nghiệm thu

1. Khởi động được PostgreSQL, backend và frontend theo README.
2. Tạo dịch vụ và thử mapping mà không tạo giao dịch.
3. Gọi callback bằng cURL và nhận đúng response cấu hình.
4. Xem được giao dịch và payload trên UI.
5. Gửi nhiều callback cùng mã, giữ đủ lịch sử và tổng hợp đúng lần nhận gần nhất.
6. Callback lỗi mapping vẫn được lưu và tra cứu.
7. API key đúng/sai được xử lý đúng.
8. Thêm dịch vụ có cấu trúc JSON khác mà không sửa code.
9. Self-test trên UI đi qua endpoint callback thật và tạo dữ liệu.
10. Build backend/frontend thành công; có kiểm thử tích hợp cho các hành vi quan trọng.

## 9. Cách làm việc với AI-DLC

Trước tiên:
- Đọc workflow/rules thực tế trong workspace.
- Xác định tài liệu và stage nào bắt buộc, stage nào có thể bỏ qua hoặc gộp theo workflow.
- Không tự bịa tên chế độ hay cơ chế AI-DLC.
- Những nội dung trong tài liệu này là quyết định đã chốt, không hỏi lại.

Quản lý câu hỏi:
- Gom các câu hỏi thực sự cản trở triển khai thành một lượt.
- Chỉ hỏi khi quyết định ảnh hưởng phạm vi, nghiệp vụ, bảo mật hoặc gây thay đổi khó đảo ngược.
- Với chi tiết triển khai thông thường, tự chọn cách đơn giản và ghi nhận giả định.
- Nếu workflow bắt buộc xác nhận, dừng đúng điểm đó và nêu rõ kết quả cần duyệt.

Quản lý tài liệu và ngữ cảnh:
- Tái sử dụng tài liệu AI-DLC bắt buộc, không tạo thêm tài liệu trùng nội dung.
- Duy trì một nguồn yêu cầu chính, một nơi ghi quyết định và một nơi ghi tiến độ; có thể dùng tài liệu workflow sẵn có.
- Chỉ đọc tài liệu và code liên quan đến task hiện tại, trừ khi cần đánh giá tác động rộng.
- Khi có conflict, nêu hai nội dung mâu thuẫn và đề xuất cách giải quyết; chỉ cập nhật phần bị ảnh hưởng.
- Không phân tích lại toàn bộ dự án cho thay đổi cục bộ.

Triển khai theo ba phần:
1. Backend: cấu hình dịch vụ → callback → mapping → lưu → tra cứu; kèm cURL kiểm chứng.
2. Frontend cấu hình dịch vụ, thử mapping và self-test.
3. Frontend theo dõi giao dịch và lịch sử callback.

Hoàn thành và kiểm chứng từng phần trước khi chuyển tiếp. Không phân tích chi tiết cả ba phần trước khi viết code phần đầu.

Kiểm thử tập trung vào mapping, timestamp, xác thực, lịch sử, xử lý đồng thời và API tích hợp. Không viết test chỉ lặp lại getter/setter hoặc chi tiết triển khai.
