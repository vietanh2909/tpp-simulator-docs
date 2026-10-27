# Đơn vị công việc (Units of Work) — TPP Callback Simulator (MVP)

> Nguồn: `components.md` và `decisions.md` của Domain Design (7 thành phần, ADR-001 đến ADR-008), `requirements.md`, `stories.md`, và các quyết định của bạn trong `units-generation-questions.md` (Q1 A, Q2 A, Q3 khung dự án có sẵn, giả định 1–9 chấp nhận, giả định 10 đã sửa theo hai kho git).
>
> Unit là lát cắt xây dựng, không phải đơn vị triển khai: mọi Unit backend cùng nằm trong một ứng dụng Spring Boot, mọi Unit frontend cùng nằm trong một ứng dụng Vite (brief mục 2, chỉ chạy local). Tài liệu này mô tả Unit là gì và làm gì. Phụ thuộc giữa các Unit ở `unit-of-work-dependency.md`; story thuộc Unit nào ở `unit-of-work-story-map.md`.

## Bảng Unit

| Unit ID | Directory | Tên | Loại | Kho git | Thành phần | Triển khai | Độ phức tạp |
|---|---|---|---|---|---|---|---|
| U1 | `u1-backend-skeleton` | Backend skeleton | `service` | `tpp-simulator-app/` | ServiceCatalog, MappingEngine, CallbackIngestion, CallbackLedger (phần tối thiểu) | Dùng chung ứng dụng backend | M |
| U2 | `u2-backend-core` | Backend core | `service` | `tpp-simulator-app/` | ServiceCatalog, MappingEngine, CallbackIngestion, CallbackLedger (phần còn lại) | Dùng chung ứng dụng backend (mở rộng U1) | L |
| U3 | `u3-frontend-services` | Frontend: quản lý dịch vụ | `ui` | `tpp-simulator-portal/` | AppShell, ServiceConsole | Ứng dụng frontend | L |
| U4 | `u4-frontend-monitoring` | Frontend: theo dõi | `ui` | `tpp-simulator-portal/` | Monitoring | Dùng chung ứng dụng frontend (mở rộng U3) | L |

- Độ phức tạp là ước lượng sơ bộ (S/M/L/XL); Delivery Planning xác nhận khi lập kế hoạch giao hàng.
- Loại: `service` là mã backend được chạy; `ui` là bề mặt giao diện frontend. Không có `spec`, `library` hay `packaging` riêng: hợp đồng API do Contract Design viết thành tài liệu dùng trong khi xây dựng, MappingEngine nằm trong ứng dụng backend, và khung dự án, `compose.yaml`, README thuộc U1/U3 (xem Q3).

## Phân bổ thành phần cho Unit

Bốn thành phần backend được chia giữa U1 và U2 theo lát cắt đầu-cuối nhỏ nhất (Q1 A); ba thành phần frontend thuộc trọn một Unit.

| Thành phần | U1 làm | U2 làm |
|---|---|---|
| ServiceCatalog | Tạo dịch vụ tối giản và đọc cấu hình; phiên bản cấu hình đầu tiên | Kiểm tra cấu hình đầy đủ, sửa, bật/tắt, xóa mềm, liệt kê (kể cả đã xóa), phiên bản theo quy tắc ADR-004, khóa API |
| MappingEngine | Trích transactionId, status từ `$.a.b.c`; lỗi từng trường; timestamp ISO 8601 | Unix giây/mili giây, mẫu chuỗi và múi giờ, kiểm tra cú pháp khi lưu, thử mapping |
| CallbackIngestion | Nhận `POST /callbacks/{serviceCode}` hợp lệ, ánh xạ, ghi, trả response đã cấu hình; 404 cho mã chưa từng có | Toàn bộ thứ tự kiểm tra (404 đã xóa, 503, 401, 400, 413), ghi request bị từ chối, che header đầy đủ, 500 khi lỗi ghi |
| CallbackLedger | Ghi Callback và cập nhật Transaction; lược đồ cơ sở dữ liệu; API đọc tối giản để tra cứu giao dịch | Đồng thời, lọc, phân trang, chi tiết, chỉ mục cho hiệu năng |
| AppShell | — | — (thuộc U3) |
| ServiceConsole | — | — (thuộc U3) |
| Monitoring | — | — (thuộc U4) |

Ghi chú: U1 và U2 cùng sửa bốn thành phần backend, nên ranh giới giữa hai Unit là ranh giới theo mức hoàn thiện, không phải theo thành phần. Mô-đun mã và lược đồ cơ sở dữ liệu của U1 được U2 mở rộng, không viết lại.

## Mô tả từng Unit

### U1 — u1-backend-skeleton

- **Mục đích.** Lát cắt đầu-cuối nhỏ nhất chạy được: tạo dịch vụ, nhận callback, ánh xạ, lưu PostgreSQL, tra cứu qua API. Là Unit đầu tiên trong DAG và chạy được trước khi U2 tồn tại (thực hành walking skeleton).
- **Ranh giới.** Bao gồm: dự án Maven/Spring Boot trong `tpp-simulator-app/`, `compose.yaml` chạy PostgreSQL, lược đồ cơ sở dữ liệu cho Service, ServiceConfigVersion, Callback, Transaction, README tối thiểu; API tạo dịch vụ tối giản; endpoint nhận callback đường vui (xác thực NONE, JSON hợp lệ); mapping `$.a.b.c`; timestamp ISO 8601; ghi nguyên tử Callback và Transaction; một API đọc tối giản để tra cứu giao dịch bằng cURL. Header được lưu với ba header chuẩn (`Authorization`, `Proxy-Authorization`, `Cookie`) đã che.
- **Không bao gồm.** API key, ghi request bị từ chối, bộ lọc và hiệu năng phân trang, xử lý đồng thời có kiểm chứng, phiên bản cấu hình khi sửa, thử mapping, tài sản mẫu.
- **Điều chỉnh sau Functional Design của U1 (2026-10-20).** U1 vẫn trả các mã 413, 404, 503, 400 của endpoint callback (nhưng chưa ghi lần nhận bị từ chối, chưa có 401), và làm phân trang cơ bản `page`, `size` của danh sách giao dịch; đây là mức tối thiểu để endpoint không xử lý body quá lớn, dịch vụ tắt hoặc body không phải JSON như callback bình thường. U2 vẫn làm ghi lần nhận bị từ chối, 401, bộ lọc, danh sách callback và hiệu năng. Chi tiết ở `construction/u1-backend-skeleton/functional-design/rules.md` (BR2.2 đến BR2.4, BR5.1, BR5.2).
- **Story chính.** US1.1, US1.6, US1.10 (xem story map).
- **Kiểm chứng.** Chạy cURL thật với backend và PostgreSQL từ `compose.yaml`; U1 đạt khi thỏa tập con tiêu chí AC1.1.1 đến AC1.1.4, AC1.6.1 đến AC1.6.5, AC1.10.1 đến AC1.10.5 và AC1.14.1 (xem "Tập con tiêu chí của U1" trong `unit-of-work-story-map.md`). Lệnh cURL kiểm chứng cụ thể do Delivery Planning và Construction chốt với bạn.
- **API đọc tối giản.** Hai việc, không lọc và không phân trang: danh sách giao dịch, và chi tiết một giao dịch theo dịch vụ và transactionId kèm các lần nhận của nó.
- **Ràng buộc.** Java 21, Spring Boot, Maven, PostgreSQL JSONB; một backend, một database; không Kafka, NoSQL, cache phân tán.

### U2 — u2-backend-core

- **Mục đích.** Hoàn thiện bốn thành phần backend để mọi story backend và API cho frontend đều sẵn sàng.
- **Ranh giới.** Phần "U2 làm" trong bảng phân bổ trên; API quản lý dịch vụ đầy đủ, API thử mapping, API tra cứu giao dịch, callback và chi tiết; `docs/samples/` và script tạo ba dịch vụ mẫu trong `tpp-simulator-app/`; công cụ nạp dữ liệu thử để đo NFR1 với 100.000 callback (cách đo chốt ở NFR Requirements); kiểm thử tích hợp cho mapping, timestamp, xác thực, lịch sử, đồng thời và API.
- **Không bao gồm.** Giao diện; tự tạo dịch vụ mẫu khi khởi động (Won't Have).
- **Story chính.** US1.2, US1.3, US1.4, US1.5, US1.7, US1.8, US1.9, US1.11, US1.12, US1.13, US1.14, US2.11.
- **Yêu cầu phi chức năng chính.** NFR1 (hiệu năng 100.000 callback), NFR2 (50 callback đồng thời), NFR3 (không lộ khóa), NFR7 (thêm dịch vụ bằng cấu hình).
- **Ràng buộc.** Cách bảo đảm đồng thời và chỉ mục để NFR Design chọn; cách lưu khóa API để NFR Requirements chọn; nội dung body response cho mã lỗi để Contract Design chọn.

### U3 — u3-frontend-services

- **Mục đích.** Giao diện quản lý dịch vụ: danh sách, cấu hình, thử mapping, gửi callback thử.
- **Ranh giới.** Dự án Vite/React/TypeScript trong `tpp-simulator-portal/`; AppShell (khung, điều hướng, thành phần dùng chung); ServiceConsole (S1, S1a, S2, S3); Vite proxy `/api` và `/callbacks` tới backend khi chạy dev; kiểm thử giao diện cho biểu mẫu cấu hình.
- **Không bao gồm.** Màn hình theo dõi (U4).
- **Story chính.** US2.1 đến US2.10.
- **Yêu cầu phi chức năng chính.** NFR4 (truy cập mức cơ bản) cho khung và biểu mẫu.
- **Ràng buộc.** Bố cục và phong cách theo Stitch; thành phần dựng bằng Tailwind CSS và thành phần headless có sẵn khả năng truy cập; không xây design system riêng; chỉ trình duyệt máy tính.

### U4 — u4-frontend-monitoring

- **Mục đích.** Giao diện theo dõi: danh sách giao dịch, tất cả callback, ngăn chi tiết, tự cập nhật.
- **Ranh giới.** Monitoring (S4, S5a, S5b) trong `tpp-simulator-portal/`, dùng AppShell của U3; bộ đếm tự cập nhật; kiểm thử giao diện cho bộ lọc và tự cập nhật.
- **Không bao gồm.** Quản lý dịch vụ (U3).
- **Story chính.** US3.1 đến US3.9.
- **Yêu cầu phi chức năng chính.** NFR4 cho màn hình theo dõi và ngăn chi tiết; NFR1 phía giao diện (dữ liệu hiện trong 1 giây ở trình duyệt khi API đạt mục tiêu).
- **Ràng buộc.** Như U3.

## Yêu cầu phi chức năng theo Unit

| NFR | Unit chịu trách nhiệm | Ghi chú |
|---|---|---|
| NFR1 hiệu năng | U2 | U1 đặt nền (chỉ mục khóa chính, lược đồ); U4 hiển thị |
| NFR2 đồng thời | U2 | U1 ghi nguyên tử Callback và Transaction |
| NFR3 bảo mật | U2 | U1 che ba header chuẩn; U3 không bao giờ hiển thị khóa |
| NFR4 truy cập cơ bản | U3, U4 | Theo `accessibility-checklist.md` |
| NFR5 chạy được theo README | Mọi Unit, Build and Test | U1 viết README tối thiểu; bản đầy đủ chốt ở Build and Test |
| NFR6 chất lượng, CI | Mọi Unit, Build and Test, CI Pipeline | Mỗi kho có CI riêng |
| NFR7 mở rộng bằng cấu hình | U2, U3 | API cấu hình (U2) và biểu mẫu (U3) |

## Ghi chú xây dựng chung

- Hai kho git riêng, mỗi kho một nhánh `main` theo trunk-based và squash-merge. Mỗi Unit làm trên nhánh ngắn hạn của kho chứa nó.
- `compose.yaml` và `docs/samples/` nằm trong `tpp-simulator-app/`; `docs/` ở thư mục gốc `d:\pet-pj-dlc` giữ brief và tài liệu AI-DLC.
- Thực thi tuần tự vì chỉ có một người; Unit là đơn vị lập kế hoạch và kiểm chứng.
- Cột "Cũng chạm tới" trong story map chỉ ghi phần đóng góp có trước, không thêm cạnh phụ thuộc.

## Rủi ro liên kho và việc chuyển cho các bước sau

Chia thành hai kho git làm xuất hiện các rủi ro dưới đây. Tài liệu này chỉ ghi lại và chuyển đi, không quyết định thay các bước sau.

| Rủi ro | Hệ quả | Bước chốt |
|---|---|---|
| Hợp đồng API giữa `tpp-simulator-app` và `tpp-simulator-portal` chưa có chỗ lưu và kho nào là chủ | Hai kho tách nhau nên lệch phiên bản hợp đồng không bị CI của kho nào phát hiện | Contract Design: chốt nơi lưu hợp đồng, kho làm chủ, và quy tắc đồng bộ phiên bản giữa hai kho |
| Thư mục gốc `d:\pet-pj-dlc` (chứa `docs/`, brief, `aidlc/`) không thuộc kho git nào | Tài liệu AI-DLC và quy ước commit cây `aidlc/` không có lịch sử phiên bản | Bạn quyết ở Delivery Planning: đưa thư mục gốc vào một kho git, hoặc xác nhận chủ ý để không có lịch sử |
| Đo NFR1 (dưới 1 giây p95 với 100.000 callback) cần dữ liệu nạp sẵn | Chưa có Unit nào được ghi là có công cụ nạp dữ liệu để đo | NFR Requirements: chốt cách đo. Phần công cụ nạp dữ liệu thử (nếu cần) được tính vào phạm vi U2 vì U2 chịu trách nhiệm NFR1 |
| Mỗi kho có CI và nhánh `main` riêng | Kiểm thử tích hợp frontend và backend cùng nhau không có chỗ chạy tự nhiên | CI Pipeline: chốt cách kiểm tra tích hợp giữa hai kho, hoặc ghi nhận chỉ kiểm tra mỗi kho riêng và tích hợp chạy tay ở Build and Test |
