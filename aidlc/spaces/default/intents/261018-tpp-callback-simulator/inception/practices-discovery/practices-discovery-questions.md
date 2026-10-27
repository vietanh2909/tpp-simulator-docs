# Practices Discovery — Câu hỏi về cách làm việc

> Công nghệ (brief mục 2), thứ tự ba phần và trọng tâm kiểm thử (brief mục 9), chạy local không triển khai production (Feasibility) đã chốt nên không hỏi lại. Các câu dưới đây chỉ hỏi những điểm brief chưa nói tới. Câu trả lời sẽ được ghi vào `aidlc/spaces/default/memory/team.md` và áp dụng cho các stage sau.

## Q1. Quản lý mã nguồn bằng git như thế nào?

Hiện lệnh `git` không có trên máy (không tìm thấy trên PATH) và thư mục dự án chưa phải kho git. Câu trả lời quyết định cách các phần việc được gộp vào code chính.

A. (Recommended) Cài git, tạo kho ở thư mục dự án; mỗi phần việc làm trên một nhánh ngắn hạn rồi gộp vào `main` bằng squash-merge (mặc định của org)
B. Cài git, commit thẳng lên `main`, không dùng nhánh phụ
C. Chưa dùng git trong MVP
X. Other (please specify)

[Answer]: A

## Q2. Có xây một lát mỏng chạy xuyên suốt trước không? Walking skeleton là một phiên bản tối thiểu chạy hết luồng từ đầu đến cuối, được làm trước để chứng minh các phần kết nối được với nhau rồi mới làm tính năng thật.

A. (Recommended) Có, nằm trong phần 1 (backend) của brief: tạo một dịch vụ → POST callback → mapping → lưu PostgreSQL → tra cứu qua API, kiểm chứng bằng cURL; frontend làm sau theo đúng thứ tự brief
B. Có, nhưng lát mỏng phải đi qua cả frontend (một màn hình đơn giản gọi backend và database)
C. Không làm walking skeleton
X. Other (please specify)

[Answer]:A

## Q3. Viết kiểm thử theo cách nào?

Trọng tâm kiểm thử đã chốt trong brief; câu này chỉ hỏi viết test trước hay sau code và công cụ.

A. (Recommended) Viết code từng lớp xong rồi viết và chạy test của lớp đó (test-after). Backend: JUnit 5 + Spring Boot Test, kiểm thử tích hợp chạy PostgreSQL thật qua Testcontainers (vì dùng JSONB). Frontend: Vitest + React Testing Library cho các phần có logic (form cấu hình, bộ lọc, polling)
B. Viết test trước rồi mới viết code (TDD), công cụ như A
C. Như A nhưng kiểm thử tích hợp dùng database PostgreSQL trong `compose.yaml` thay cho Testcontainers
X. Other (please specify)

[Answer]: A

## Q4. Ngưỡng độ phủ (coverage) và chạy kiểm thử tự động (CI) ra sao?

Mặc định của scope `mvp` là tối thiểu 80% line coverage và chạy test trong CI trước khi gộp code. Feasibility đã chốt không dùng dịch vụ đám mây cho việc chạy ứng dụng; CI là việc riêng.

A. (Recommended) Giữ ngưỡng 80% line coverage cho backend (đo bằng JaCoCo); CI chạy bằng GitHub Actions (build + test backend và frontend) khi đẩy code lên GitHub
B. Giữ ngưỡng 80%; không dùng CI trên mạng, thay bằng một script chạy local (build + test cả hai phần) bắt buộc chạy trước khi gộp
C. Giữ ngưỡng 80% cho cả backend và frontend; CI như A
X. Other (please specify)

[Answer]: A

## Q5. Dùng công cụ format và lint nào?

A. (Recommended) Java: Spotless với google-java-format, chạy trong Maven build. TypeScript: ESLint + Prettier theo cấu hình mặc định của Vite. Đặt tên theo quy ước của từng ngôn ngữ
B. Java: Checkstyle (không tự format); TypeScript như A
C. Không bắt buộc công cụ, chỉ dùng format của IDE
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

Tóm tắt câu trả lời:

- Q1 — Cài git, tạo kho ở thư mục dự án; mỗi phần việc làm trên nhánh ngắn hạn, gộp vào `main` bằng squash-merge.
- Q2 — Có walking skeleton, nằm trong phần 1 (backend): tạo dịch vụ → POST callback → mapping → lưu PostgreSQL → tra cứu qua API, kiểm chứng bằng cURL.
- Q3 — Test-after theo từng lớp. Backend: JUnit 5 + Spring Boot Test, kiểm thử tích hợp với PostgreSQL thật qua Testcontainers. Frontend: Vitest + React Testing Library cho phần có logic.
- Q4 — Ngưỡng 80% line coverage cho backend (JaCoCo); CI bằng GitHub Actions build và test cả backend lẫn frontend.
- Q5 — Java: Spotless + google-java-format trong Maven build; TypeScript: ESLint + Prettier; đặt tên theo quy ước từng ngôn ngữ.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
