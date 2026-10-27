# Delivery Planning — Câu hỏi làm rõ

> Bolt là một lượt xây dựng trọn một phần việc, kết thúc bằng thứ chạy được. Bước này lập kế hoạch các Bolt (thứ tự đi qua các Unit ở Construction), không chọn stage hay độ sâu.
>
> Đã chốt, không hỏi lại: thứ tự giao hàng ba phần của brief mục 9 (backend, rồi frontend cấu hình dịch vụ, rồi frontend theo dõi), làm xong và kiểm chứng phần nào mới chuyển phần đó; có làm walking skeleton (lát cắt nhỏ nhất chạy đầu-cuối) ở U1 và kiểm chứng bằng cURL thật với PostgreSQL từ `compose.yaml` (team practices); một người, thực thi tuần tự; bốn Unit U1 đến U4 và đồ thị phụ thuộc của chúng (`unit-of-work.md`, `unit-of-work-dependency.md`); hai kho git riêng `tpp-simulator-app/` và `tpp-simulator-portal/`; MVP chỉ chạy local.
>
> Cách trả lời: bạn đã giao quyền tự quyết cho tôi theo phương án khuyến nghị. Mỗi `[Answer]:` dưới đây là lựa chọn khuyến nghị của tôi và được tổng hợp ở `docs/auto-decisions.md`.

## Q1. Xây gì trước?

A. (Recommended) Lát cắt mỏng đầu-cuối trước (U1, walking skeleton), rồi các Unit còn lại theo đồ thị phụ thuộc và thứ tự brief mục 9: U2, U3, U4. Rủi ro lớn nhất (đồng thời, hiệu năng) nằm ở U2, đến ngay sau skeleton
B. Phần rủi ro nhất trước, kể cả khi trái thứ tự brief
C. Phần giá trị nhất trước, kể cả khi trái thứ tự brief
X. Other (please specify)

[Answer]: A

## Q2. Có chấm điểm xếp hạng công việc theo mô hình chính thức (kiểu WSJF: giá trị và độ gấp so với kích thước) không?

A. (Recommended) Không. Thứ tự đã bị ràng buộc bởi brief mục 9 và đồ thị phụ thuộc, nên chỉ ghi lý do ngắn trong `risk-and-sequencing-rationale.md`
B. Có, chấm WSJF cho từng Bolt
X. Other (please specify)

[Answer]: A

## Q3. Một Bolt lớn cỡ nào?

A. (Recommended) Mỗi Bolt đúng một Unit: B1 = U1, B2 = U2, B3 = U3, B4 = U4. Khớp ranh giới kho git và cách kiểm chứng từng phần của brief
B. Gộp U1 và U2 thành một Bolt backend, U3 và U4 thành một Bolt frontend
C. Cắt ngang các Unit theo lát mỏng
X. Other (please specify)

[Answer]: A

## Q4. Có chạy nhiều Bolt cùng lúc không?

A. (Recommended) Tuần tự, từng Bolt một (một người, AI thực thi), đúng thứ tự trong Q1
B. Song song U3 với phần cuối U2
X. Other (please specify)

[Answer]: A

## Q5. Có thứ gì bên ngoài team làm chậm không?

A. (Recommended) Không có đội ngoài hay API ngoài. Chỉ có điều kiện môi trường, ghi ở `external-dependency-map.md`: Docker chạy được (PostgreSQL từ `compose.yaml` và Testcontainers), Java 21 và Maven, Node LTS và npm, và hai kho GitHub từ xa do bạn tạo để CI chạy thật. Nếu thiếu thì Bolt đó chạy được ở local nhưng chưa thấy CI chạy
B. Có, để tôi liệt kê thêm
X. Other (please specify)

[Answer]: A

## Q6. Bạn lo nhất điều gì ở bản xây dựng này?

A. (Recommended) Hai điều ở U2: ghi đồng thời đúng (50 callback cùng giao dịch, NFR2) và hiệu năng 100.000 callback dưới 1 giây (NFR1), cùng với nguy cơ hợp đồng API lệch giữa hai kho. Xử lý sớm bằng kiểm thử tích hợp đồng thời ở đầu U2 và file OpenAPI do backend giữ
B. Chỉ lo tiến độ
X. Other (please specify)

[Answer]: A

## Câu hỏi theo từng Bolt

| Bolt | Unit gộp | Walking skeleton | Xong khi (Definition of Done) | Việc chạy xong sẽ cho biết | Ai làm |
|---|---|---|---|---|---|
| B1 | U1 `u1-backend-skeleton` | Có. Chứng minh đường tạo dịch vụ, nhận callback, ánh xạ ISO 8601, ghi PostgreSQL (Callback và Transaction nguyên tử), tra cứu qua API | Lệnh cURL thật với backend và PostgreSQL từ `compose.yaml` đạt tập con tiêu chí của U1 (AC1.1.1 đến AC1.1.4, AC1.6.1 đến AC1.6.5, AC1.10.1 đến AC1.10.5, AC1.14.1); `mvn -B verify` xanh | Khung dự án, lược đồ và đường đi chính có chạy đầu-cuối hay không | aidlc-developer-agent |
| B2 | U2 `u2-backend-core` | Không | Toàn bộ story backend (US1.2 đến US1.5, US1.7 đến US1.9, US1.11 đến US1.14, US2.11) đạt; kiểm thử tích hợp cho mapping, timestamp, xác thực, lịch sử, đồng thời và API xanh; JaCoCo từ 80%; đo được NFR1 với 100.000 callback; ba dịch vụ mẫu tạo được bằng script | Đồng thời và hiệu năng có đạt NFR2 và NFR1 không | aidlc-developer-agent |
| B3 | U3 `u3-frontend-services` | Không | S1, S1a, S2, S3 chạy với backend thật; US2.1 đến US2.10 đạt; kiểm thử giao diện cho biểu mẫu cấu hình xanh; lint, định dạng, build xanh | Biểu mẫu cấu hình, thử mapping và gửi thử có dùng được từ trình duyệt không | aidlc-developer-agent |
| B4 | U4 `u4-frontend-monitoring` | Không | S4, S5a, S5b chạy với backend thật; US3.1 đến US3.9 đạt; tự cập nhật 5 giây giữ bộ lọc, trang và ngăn chi tiết; kiểm thử bộ lọc và tự cập nhật xanh; các tiêu chí nghiệm thu 1 đến 10 của brief mục 8 đạt | Toàn bộ MVP đạt tiêu chí nghiệm thu | aidlc-developer-agent |

## Giả định đề xuất

1. Không có stage Team Formation trong scope `mvp`, nên mọi Bolt do aidlc-developer-agent thực hiện. `team-allocation.md` ghi rõ điều này.
2. Thứ tự Construction theo từng Unit (unit-major), tuần tự, đúng giá trị mặc định của luồng làm việc; mỗi Unit đi qua các stage thiết kế áp dụng và Code Generation rồi mới sang Unit sau.
3. Staffing: một phiên chạy toàn bộ Construction từ phiên này, không chia đội (`solo`).
4. Thư mục gốc `d:\pet-pj-dlc` đã được bạn chạy `git init` (nhánh `main`, chưa commit), còn hai kho con ở trong `.gitignore` gốc. Việc "đưa thư mục gốc vào kho git" từ Units Generation coi như đã xử lý.
5. Chỉ dựng sườn backend và frontend đã có sẵn một phần trên đĩa (chưa kiểm chứng); Construction coi chúng là nền để tiếp tục, không viết lại từ đầu.
6. Giao diện theo Stitch với API giả chạy lại ở Bolt B3 và B4, khi không có cổng duyệt nào mở. Các điểm Major của review Contract Design (R-01 `transactionId` trong đường dẫn, R-02 header `X-Simulator-Error`) được xử lý ở Functional Design của U1.
7. Lệnh kiểm chứng của Construction: sẽ hỏi riêng bạn ở cuối bước này.

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
