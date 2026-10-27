# Feasibility & Constraints — Câu hỏi làm rõ

> Công nghệ, kiến trúc và phạm vi đã chốt trong `docs/brief.md` nên không hỏi lại. Các câu dưới đây chỉ hỏi những điểm brief chưa nói tới nhưng ảnh hưởng tới tính khả thi.

## Q1. Hệ thống ngân hàng trên dev/UAT sẽ gọi tới URL callback của TPP bằng cách nào?

Callback do ngân hàng chủ động gọi, nên TPP phải nằm ở chỗ mà hệ thống ngân hàng gọi tới được. Nếu không, tiêu chí "kiểm tra callback có đến TPP hay không" chỉ kiểm chứng được bằng cURL/self-test.

A. TPP chạy trên một máy chủ dùng chung trong mạng dev/UAT, hệ thống ngân hàng gọi trực tiếp tới được
B. TPP chạy trên máy cá nhân của người kiểm thử; ngân hàng gọi tới qua IP nội bộ hoặc công cụ tunnel do người dùng tự lo
C. (Recommended) Trong MVP chỉ cần chạy local theo README và kiểm chứng bằng cURL/self-test; việc đưa lên chỗ ngân hàng gọi tới được để sau, ngoài phạm vi MVP
D. Chưa xác định
X. Other (please specify)

[Answer]:C

## Q2. Payload callback trên dev/UAT có thể chứa dữ liệu khách hàng thật không?

Ứng dụng lưu nguyên văn payload (JSONB) và không có đăng nhập. Nếu có dữ liệu thật, cần thêm ràng buộc bảo mật hoặc tuân thủ.

A. (Recommended) Không: chỉ dữ liệu kiểm thử/giả lập, không có dữ liệu khách hàng thật
B. Có thể có dữ liệu thật đã được che (mask) từ phía ngân hàng
C. Có thể có dữ liệu thật chưa che
D. Chưa xác định
X. Other (please specify)

[Answer]:A

## Q3. Dữ liệu callback được giữ bao lâu?

Brief yêu cầu không ghi đè, không gộp lịch sử, nhưng chưa nói về thời hạn lưu; dữ liệu sẽ tăng dần theo thời gian.

A. (Recommended) Giữ vô thời hạn trong MVP; khi cần thì người dùng tự làm sạch database (ví dụ tạo lại volume Docker)
B. Tự động xóa callback cũ hơn N ngày (ghi rõ N)
C. Chưa xác định
X. Other (please specify)

[Answer]: A

## Q4. Có hạn chót hoặc giới hạn ngân sách nào không?

A. (Recommended) Không có hạn chót cứng; làm lần lượt ba phần như brief mục 9, xong và kiểm chứng phần nào thì chuyển phần đó
B. Có hạn chót (ghi rõ ngày hoặc số tuần)
C. Chưa xác định
X. Other (please specify)

[Answer]:A

## Q5. Ai phát triển và duy trì ứng dụng?

Ảnh hưởng tới rủi ro kỹ năng và mức tài liệu hóa cần có.

A. (Recommended) Bạn tự làm cùng AI; bạn đã quen Java/Spring Boot và React/TypeScript
B. Bạn tự làm cùng AI; một trong hai mảng backend hoặc frontend còn mới với bạn (ghi rõ mảng nào)
C. Một nhóm phát triển (ghi rõ số người và kỹ năng)
D. Chưa xác định
X. Other (please specify)

[Answer]:A

## Q6. Máy phát triển đã có hoặc được phép cài các công cụ cần thiết chưa?

Cần JDK 21, Maven, Node.js và Docker (Docker Compose cho PostgreSQL). Máy công ty đôi khi chặn Docker Desktop hoặc chặn tải thư viện từ internet.

A. (Recommended) Đã có hoặc cài được đủ JDK 21, Maven, Node.js, Docker; tải được thư viện từ Maven Central và npm
B. Có hạn chế cài đặt hoặc mạng (ghi rõ: ví dụ không dùng được Docker Desktop, phải qua proxy hoặc kho nội bộ)
C. Chưa xác định
X. Other (please specify)

[Answer]:A

## Q7. Có dùng hạ tầng đám mây (ví dụ AWS) không?

A. (Recommended) Không: MVP chạy local bằng Docker Compose, không triển khai production, không dùng dịch vụ đám mây
B. Có (ghi rõ tài khoản/dịch vụ)
X. Other (please specify)

[Answer]:A

## Q8. Có trở ngại nào về tổ chức không (ví dụ chờ cấp quyền, đóng băng thay đổi, ưu tiên cạnh tranh)?

A. (Recommended) Không có
B. Có (ghi rõ)
C. Chưa xác định
X. Other (please specify)

[Answer]:A

## Consolidated Summary Confirmation

Tóm tắt câu trả lời:

- Q1 — MVP chỉ chạy local theo README, kiểm chứng bằng cURL và gửi callback thử trên UI; việc để hệ thống ngân hàng gọi tới được TPP nằm ngoài phạm vi MVP.
- Q2 — Payload chỉ chứa dữ liệu kiểm thử/giả lập, không có dữ liệu khách hàng thật.
- Q3 — Giữ dữ liệu callback vô thời hạn trong MVP; người dùng tự làm sạch database khi cần.
- Q4 — Không có hạn chót cứng; làm lần lượt ba phần theo brief mục 9, kiểm chứng xong phần nào mới chuyển phần đó.
- Q5 — Chủ dự án tự làm cùng AI, đã quen Java/Spring Boot và React/TypeScript.
- Q6 — Máy phát triển có hoặc cài được JDK 21, Maven, Node.js, Docker; tải được thư viện từ Maven Central và npm.
- Q7 — Không dùng hạ tầng đám mây; chạy local bằng Docker Compose.
- Q8 — Không có trở ngại tổ chức.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
