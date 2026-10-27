# Units Generation — Câu hỏi làm rõ

> Đã chốt, không hỏi lại: bảy thành phần và quyền sở hữu thực thể (`components.md`, ADR-001 đến ADR-003); một backend, một frontend, một database (brief mục 2); thứ tự giao hàng ba phần theo brief mục 9 (backend, rồi frontend cấu hình, rồi frontend theo dõi), làm xong và kiểm chứng phần nào mới chuyển phần đó; có làm walking skeleton ở phần backend và kiểm chứng bằng cURL thật với PostgreSQL từ `compose.yaml` (team practices); thực thi tuần tự vì chỉ có một người. Bước này chỉ chia các thành phần thành các Unit (lát cắt xây dựng) và vẽ phụ thuộc giữa chúng. Thứ tự giao hàng theo giá trị hay rủi ro thuộc Delivery Planning.

## Q1. Backend chia thành những Unit nào?

Theo thực hành của team, Unit đầu tiên trong DAG phải là lát cắt nhỏ nhất chạy được từ đầu đến cuối: tạo dịch vụ, nhận callback, ánh xạ, lưu PostgreSQL, tra cứu qua API. Unit này không được chỉ là một lớp hay một tài liệu chưa chạy được.

A. (Recommended) Hai Unit: **u1-backend-skeleton** (lát cắt nhỏ nhất chạy được, cộng khung dự án, `compose.yaml` và lược đồ cơ sở dữ liệu) rồi **u2-backend-core** (toàn bộ phần còn lại của bốn thành phần backend: kiểm tra cấu hình đầy đủ, phiên bản cấu hình, xác thực API key, các mã từ chối và ghi request bị từ chối, che header, đồng thời, bộ lọc và phân trang, hiệu năng, tài sản mẫu)
B. Một Unit backend duy nhất (XL), tự nó là lát cắt đầu-cuối; mọi story backend thuộc Unit này
C. Bốn Unit theo thành phần (ServiceCatalog, MappingEngine, CallbackIngestion, CallbackLedger): ranh giới rõ nhưng Unit đầu tiên không chạy được đầu-cuối nên trái thực hành skeleton, và cả bốn cùng nằm trong một ứng dụng
X. Other (please specify)

[Answer]: A

## Q2. Frontend chia thành những Unit nào?

A. (Recommended) Hai Unit khớp phần 2 và phần 3 của brief: **u3-frontend-services** (AppShell và ServiceConsole: S1, S2, S3) và **u4-frontend-monitoring** (Monitoring: S4, S5). u4 phụ thuộc u3 vì dùng AppShell
B. Một Unit frontend duy nhất, gồm cả ba thành phần
C. Ba Unit: AppShell riêng, ServiceConsole, Monitoring (AppShell không chạy được độc lập nên Unit này chỉ có giá trị khi có màn hình đi cùng)
X. Other (please specify)

[Answer]: A

## Q3. Khung dự án, tài liệu và tài sản mẫu nằm ở Unit nào?

Cần chỗ cho cấu trúc thư mục (`backend/`, `frontend/`, `docs/`, `compose.yaml`), README chạy theo hướng dẫn, và `docs/samples/` kèm script tạo ba dịch vụ mẫu (US2.11).

A. (Recommended) Không có Unit riêng: u1 tạo khung dự án (`backend/`, `compose.yaml`, README tối thiểu); `frontend/` do Unit frontend đầu tiên tạo; `docs/samples/` và script thuộc u2 (script gọi API quản lý dịch vụ); README hoàn chỉnh chốt ở Build and Test
B. Thêm một Unit packaging đứng cuối (tài liệu, README đầy đủ, `docs/samples/`, cấu hình CI), còn `compose.yaml` vẫn ở u1 vì skeleton cần PostgreSQL
X. Other (please specify)

[Answer]: X, khung dự án đã có sẵn. thư mục backend : tpp-simulator-app/ , thư mục front-end: tpp-simulator-portal

> Làm rõ sau khi bạn trả lời: bạn đồng ý sửa dòng "Cấu trúc" ở brief mục 2 (điểm 1: Có), và đặt `compose.yaml` cùng `docs/samples/` trong `tpp-simulator-app/` (điểm 2: chọn 1). Chỉ phần "Cấu trúc" của brief được sửa.

## Giả định đề xuất

Những chi tiết dưới đây chưa có trong brief hay yêu cầu. Tôi đề xuất chọn như sau và sẽ ghi vào các tài liệu của bước này (tên Unit cuối cùng theo câu trả lời của bạn ở trên):

1. **Unit là lát cắt xây dựng, không phải đơn vị triển khai.** Mọi Unit backend cùng nằm trong một ứng dụng Spring Boot, mọi Unit frontend cùng nằm trong một ứng dụng Vite; không Unit nào triển khai riêng (brief mục 2, chỉ chạy local).
2. **Loại Unit:** Unit backend là `service`; Unit frontend là `ui`. Không có `spec` hay `library` riêng vì hợp đồng API do Contract Design viết thành tài liệu dùng trong khi xây dựng, và MappingEngine nằm trong ứng dụng backend.
3. **Phụ thuộc giữa Unit (khi chọn A cho Q1 và Q2):** u2 phụ thuộc u1; u3 phụ thuộc u2 (frontend chờ API quản lý và tra cứu đầy đủ); u4 phụ thuộc u2 và u3. Đồ thị không có vòng. Thứ tự này khớp thứ tự giao hàng ba phần của brief.
4. **Cơ hội song song:** không có trong thực thi hiện tại (một người, tuần tự). DAG vẫn ghi u3 có thể bắt đầu song song với phần cuối của u2 nếu sau này có thêm người, dựa trên hợp đồng API đã chốt ở Contract Design.
5. **Gán story:** mỗi story có một Unit chính. Story được làm một phần ở skeleton và hoàn thành ở u2 (ví dụ US1.14, tra cứu qua API) thuộc u2, còn story trong lát cắt đầu-cuối (US1.1, US1.6, US1.10) thuộc u1; hàng nào trải qua nhiều Unit thì ghi phần của từng Unit.
6. **Lát cắt skeleton (khi chọn A cho Q1):** tạo một dịch vụ bằng API tối giản, `POST /callbacks/{serviceCode}` với JSON hợp lệ, ánh xạ ISO 8601, lưu Callback và Transaction vào PostgreSQL, và một API đọc tối giản để tra cứu giao dịch bằng cURL. Chưa gồm xác thực API key, ghi request bị từ chối, che header đầy đủ, bộ lọc phức tạp. Lệnh kiểm chứng skeleton do Delivery Planning và Construction chốt với bạn.
7. **Ước lượng độ phức tạp sơ bộ:** u1 cỡ M, u2 cỡ L, u3 cỡ L, u4 cỡ L. Chốt khi lập kế hoạch giao hàng.
8. **Yêu cầu phi chức năng:** NFR1, NFR2, NFR3 gán cho u2 (u1 chỉ đặt nền); NFR4 gán cho u3 và u4; NFR5 và NFR6 là việc của mọi Unit và của Build and Test; NFR7 thuộc u2 và u3.
9. **Won't Have** (US4.1–US4.10) không gán Unit; ghi N/A kèm lý do như bước Domain Design.
10. **Cấu trúc thư mục và kho git (đã sửa theo câu trả lời của bạn):** backend nằm ở `tpp-simulator-app/` và frontend nằm ở `tpp-simulator-portal/`; mỗi thư mục là một kho git riêng đã có sẵn (hiện mới có `README.md` rỗng). `compose.yaml` và `docs/samples/` nằm trong `tpp-simulator-app/`. `docs/` ở thư mục gốc `d:\pet-pj-dlc` giữ brief và tài liệu AI-DLC, không thuộc kho nào. Brief mục 2 đã sửa đúng phần "Cấu trúc". Trong các kho này u1 tạo dự án Maven/Spring Boot, `compose.yaml`, lược đồ cơ sở dữ liệu và README tối thiểu; u3 tạo dự án Vite/React trong `tpp-simulator-portal/`. Mỗi kho có CI và nhánh `main` riêng.

## Assumption Confirmation

Bạn đồng ý dùng các giả định trên chứ? Nếu muốn đổi giả định nào, chọn B và ghi số giả định.

A. Accept assumptions
B. Convert to follow-up questions
X. Other (please specify)

[Answer]: X, đồng ý nhưng trừ số 10. Đã cung cấp thư mục cho frontend và backend

## Consolidated Summary Confirmation

Tóm tắt câu trả lời:

- Q1 — Backend có hai Unit: u1-backend-skeleton (lát cắt nhỏ nhất chạy được đầu-cuối) và u2-backend-core (phần còn lại của bốn thành phần backend).
- Q2 — Frontend có hai Unit: u3-frontend-services (AppShell và ServiceConsole, S1–S3) và u4-frontend-monitoring (Monitoring, S4–S5); u4 phụ thuộc u3.
- Q3 — Khung dự án đã có sẵn: backend ở `tpp-simulator-app/`, frontend ở `tpp-simulator-portal/`, mỗi thư mục là một kho git riêng; `compose.yaml` và `docs/samples/` nằm trong `tpp-simulator-app/`. Brief mục 2 đã sửa đúng phần "Cấu trúc".
- Giả định — Đồng ý các giả định 1 đến 9 như đề xuất: Unit là lát cắt xây dựng, không triển khai riêng; backend là `service`, frontend là `ui`; phụ thuộc u2→u1, u3→u2, u4→u2 và u3; thực thi tuần tự; mỗi story một Unit chính; skeleton gồm tạo dịch vụ tối giản, nhận callback, ánh xạ ISO 8601, lưu PostgreSQL và một API đọc tối giản; độ phức tạp u1 cỡ M, u2, u3, u4 cỡ L; NFR gán theo Unit; Won't Have không gán Unit. Giả định 10 đã sửa theo cấu trúc hai kho git ở trên.

Does this all look correct before I generate the units artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
