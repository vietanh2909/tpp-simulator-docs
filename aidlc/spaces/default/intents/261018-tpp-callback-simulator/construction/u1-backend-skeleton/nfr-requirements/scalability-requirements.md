# Yêu cầu khả năng mở rộng và đồng thời — U1 `u1-backend-skeleton`

> Nguồn: NFR1, NFR2, NFR7 trong `requirements.md`, ADR-002, `rules.md` (BR4.3, BR4.4, BR4.6) và hợp đồng `contract-summary.md`. Câu trả lời: giả định 3, 7, 14 trong `nfr-requirements-questions.md`.

## Tải dự kiến

- Một người dùng chạy trên máy của mình; nguồn callback là cURL, kịch bản kiểm thử hoặc trang gửi thử của giao diện, đều trên cùng máy. Để hệ thống ngân hàng thật gọi tới được công cụ nằm ngoài phạm vi MVP (Scope Definition, mục Out of scope) và cũng không tương thích với việc chỉ lắng nghe `127.0.0.1` (NFR3.1); muốn mở ra phải làm có chủ ý theo cảnh báo ở NFR3.1.
- Tới 100.000 callback lưu; tốc độ nhận khoảng 5 giao dịch/giây là đủ cho mục đích kiểm thử; đỉnh ngắn có thể 50 callback cùng lúc cho cùng một giao dịch (NFR2).
- Không có chia tỷ lệ ngang: một bản backend, một cơ sở dữ liệu (brief mục 2). Không bộ nhớ đệm phân tán, không hàng đợi (ADR-008).

## Yêu cầu

| ID | Yêu cầu | Chỉ tiêu kiểm chứng | Thuộc |
|---|---|---|---|
| NFR2.2 | Hai callback cùng giao dịch ghi song song cho kết quả đúng: không mất Callback nào, trạng thái "gần nhất" là của cặp (`receivedAt`, `recordId`) lớn nhất bất kể thứ tự hoàn tất (BR4.4). Hai callback đầu tiên của cùng một cặp (`serviceCode`, `transactionId`) đến cùng lúc không được làm một bên thất bại vì tranh chấp tạo giao dịch: bên thua phải chuyển sang cập nhật | Kiểm thử tích hợp hai luồng ghi cùng cặp khóa (U1); kiểm chứng 50 callback đồng thời với tổng đúng (U2) |
| NFR2.3 | Tổng số callback của giao dịch tăng nguyên tử, không theo kiểu đọc rồi ghi; tổng cuối cùng bằng số Callback của giao dịch | Kiểm thử tích hợp: sau N lần ghi song song, `callbackCount` bằng N |
| NFR7.1 | Thêm một dịch vụ có cấu trúc JSON khác chỉ cần gọi API tạo dịch vụ với đường dẫn ánh xạ khác, không sửa mã, không khởi động lại backend | Kiểm thử tích hợp tạo hai dịch vụ với cấu trúc JSON khác nhau rồi gửi callback cho cả hai; ba dịch vụ mẫu của brief thuộc U2 (tài sản mẫu) |

Khối lượng thiết kế 100.000 callback (NFR1.5) được định nghĩa ở `performance-requirements.md`; mục tiêu kích thước phản hồi chi tiết giao dịch là NFR1.6 ở cùng tệp.

## Giới hạn đã biết

- Thiết kế không nhắm tới tải lớn hơn khối lượng trên; vượt thì phải xem lại chỉ mục, tách phía đọc và dùng phân vùng (ADR-001 đã ghi nhận phía đọc có thể tách sau).
- Mỗi lần nhận callback giữ một kết nối cơ sở dữ liệu trong một giao dịch ngắn (ADR-008, ghi đồng bộ); tốc độ nhận bị giới hạn bởi thời gian ghi.
- Cách thực hiện tính đúng đồng thời (khóa dòng hay cập nhật có điều kiện), kích thước pool kết nối và chỉ mục do NFR Design chọn.

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/requirements-analysis/requirements.md` (requirements: NFR1, NFR2, NFR7)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/functional-design/rules.md` (rules: BR4.3, BR4.4, BR4.6) và `functional-spec.md` (functional-spec: W4)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-summary.md` (contract-summary: C1, C2, C6)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/nfr-requirements-questions.md` (giả định 3, 7, 14)

## Assumptions & Open Questions

- Tải dự kiến (5 giao dịch/giây) là con số tôi đề xuất và bạn đã chấp nhận (giả định 7).
- NFR2.2 và NFR2.3 bổ sung hai điểm mà bản rà soát thiết kế chức năng nêu (tạo giao dịch lần đầu bị tranh chấp, đếm không nguyên tử) vào yêu cầu, để NFR Design phải giải quyết chúng.
