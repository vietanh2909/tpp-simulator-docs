# Bản đồ story → Unit — TPP Callback Simulator (MVP)

> Mỗi story `USx.y` trong `stories.md` có đúng một Unit chính (cột "Unit ID"). Cột "Cũng chạm tới" liệt kê Unit khác có đóng góp một phần cho story đó (hàng trải qua nhiều Unit). Quy tắc chia (giả định 5): story đi trọn trong lát cắt đầu-cuối thuộc U1; story hoàn thiện ở phần còn lại của backend thuộc U2; story giao diện thuộc U3 hoặc U4 và dùng API của U2.
>
> Bảng Unit ở `unit-of-work.md`: U1 `u1-backend-skeleton`, U2 `u2-backend-core`, U3 `u3-frontend-services`, U4 `u4-frontend-monitoring`.

## Nhóm 1 — Nhận, xử lý callback và tra cứu qua API (backend)

| Story | Unit ID | Directory | Cũng chạm tới | Ghi chú |
|---|---|---|---|---|
| US1.1 | U1 | `u1-backend-skeleton` | U2 | U1 làm đường vui (xác thực NONE, JSON hợp lệ, response đã cấu hình); U2 thêm các kiểm tra còn lại |
| US1.2 | U2 | `u2-backend-core` | — | Xác thực API key |
| US1.3 | U2 | `u2-backend-core` | U1 | U1 trả 404 cho mã chưa từng có; U2 làm đã xóa, 503 và thứ tự kiểm tra |
| US1.4 | U2 | `u2-backend-core` | — | 400, 413 |
| US1.5 | U2 | `u2-backend-core` | — | Ghi request bị từ chối |
| US1.6 | U1 | `u1-backend-skeleton` | U2 | U1 làm trích transactionId, status và lỗi từng trường; U2 thêm kiểm tra cú pháp khi lưu và thử mapping |
| US1.7 | U2 | `u2-backend-core` | U1 | U1 làm ISO 8601; U2 làm Unix giây, Unix mili giây, mẫu chuỗi và múi giờ |
| US1.8 | U2 | `u2-backend-core` | U1 | Response vẫn trả khi mapping lỗi; U1 có đường cơ bản |
| US1.9 | U2 | `u2-backend-core` | — | 500 khi lỗi ghi |
| US1.10 | U1 | `u1-backend-skeleton` | U2 | U1 ghi và gom giao dịch; U2 kiểm chứng đồng thời (US1.11) |
| US1.11 | U2 | `u2-backend-core` | — | 50 callback đồng thời |
| US1.12 | U2 | `u2-backend-core` | U1 | U1 che ba header chuẩn; U2 che header API key và kiểm chứng không lộ |
| US1.13 | U2 | `u2-backend-core` | U1 | U1 tạo phiên bản đầu tiên; U2 tạo phiên bản khi sửa theo ADR-004 |
| US1.14 | U2 | `u2-backend-core` | U1 | U1 đạt tập con AC1.14.1 trên API đọc tối giản (xem mục "Tập con tiêu chí của U1" bên dưới); U2 đạt AC1.14.2 đến AC1.14.5 (lọc, phân trang, kiểm tra tham số, hiệu năng) và API danh sách callback |

## Nhóm 2 — Cấu hình dịch vụ, thử mapping, gửi thử

| Story | Unit ID | Directory | Cũng chạm tới | Ghi chú |
|---|---|---|---|---|
| US2.1 | U3 | `u3-frontend-services` | U2 | Danh sách; API liệt kê dịch vụ do U2 |
| US2.2 | U3 | `u3-frontend-services` | U1, U2 | U1 có API tạo tối giản; U2 kiểm tra mã và cấu hình đầy đủ |
| US2.3 | U3 | `u3-frontend-services` | U2 | Sửa; U2 giữ quy tắc phiên bản |
| US2.4 | U3 | `u3-frontend-services` | U2 | Khóa che; U2 không trả khóa ra |
| US2.5 | U3 | `u3-frontend-services` | U2 | Mapping và định dạng thời gian; U2 kiểm tra cú pháp |
| US2.6 | U3 | `u3-frontend-services` | U2 | Response cố định |
| US2.7 | U3 | `u3-frontend-services` | U2 | Bật/tắt |
| US2.8 | U3 | `u3-frontend-services` | U2 | Xóa mềm |
| US2.9 | U3 | `u3-frontend-services` | U2 | Thử mapping; U2 tính ở server |
| US2.10 | U3 | `u3-frontend-services` | U2 | Gửi thử qua endpoint thật của U2 |
| US2.11 | U2 | `u2-backend-core` | — | Tài sản và script mẫu trong `tpp-simulator-app/` |

## Nhóm 3 — Theo dõi giao dịch và callback

| Story | Unit ID | Directory | Cũng chạm tới | Ghi chú |
|---|---|---|---|---|
| US3.1 | U4 | `u4-frontend-monitoring` | U2, U3 | Danh sách giao dịch |
| US3.2 | U4 | `u4-frontend-monitoring` | U2, U3 | Bộ lọc giao dịch |
| US3.3 | U4 | `u4-frontend-monitoring` | U2, U3 | Phân trang, hiệu năng |
| US3.4 | U4 | `u4-frontend-monitoring` | U2, U3 | Ngăn chi tiết giao dịch |
| US3.5 | U4 | `u4-frontend-monitoring` | U2, U3 | Tab tất cả callback |
| US3.6 | U4 | `u4-frontend-monitoring` | U2, U3 | Lọc theo kết quả xử lý |
| US3.7 | U4 | `u4-frontend-monitoring` | U2, U3 | Chi tiết một lần nhận |
| US3.8 | U4 | `u4-frontend-monitoring` | U2, U3 | Tự cập nhật |
| US3.9 | U4 | `u4-frontend-monitoring` | U2, U3 | Tải chậm hoặc lỗi |

## Nhóm 4 — Won't Have (không gán Unit)

| Story | Unit ID | Directory | Cũng chạm tới | Ghi chú |
|---|---|---|---|---|
| US4.1 | — | — | — | Gọi API nghiệp vụ sang ngân hàng; ngoài phạm vi |
| US4.2 | — | — | — | Giao dịch dự kiến, phát hiện callback chưa đến; ngoài phạm vi |
| US4.3 | — | — | — | Đăng nhập, phân quyền; ngoài phạm vi |
| US4.4 | — | — | — | Response động; ngoài phạm vi |
| US4.5 | — | — | — | Giả lập timeout, độ trễ, lỗi N lần; ngoài phạm vi |
| US4.6 | — | — | — | Triển khai production, đám mây; ngoài phạm vi |
| US4.7 | — | — | — | Đường dẫn JSON wildcard, filter, mảng, WebSocket; ngoài phạm vi |
| US4.8 | — | — | — | Tự động xóa dữ liệu cũ; ngoài phạm vi |
| US4.9 | — | — | — | Phần thiết kế Stitch ngoài brief; ngoài phạm vi |
| US4.10 | — | — | — | Tự tạo dịch vụ mẫu khi khởi động; ngoài phạm vi |

## Tập con tiêu chí của U1 (skeleton)

Để lát cắt skeleton kiểm chứng đo được, U1 phải đạt các tiêu chí chấp nhận sau (mã `AC` lấy từ `stories.md`) bằng cURL thật với backend và PostgreSQL từ `compose.yaml`. Các tiêu chí còn lại của cùng story thuộc U2.

| Story | Tiêu chí U1 phải đạt | Ghi chú |
|---|---|---|
| US1.1 | AC1.1.1, AC1.1.2, AC1.1.3, AC1.1.4 | AC1.1.3 kiểm qua API chi tiết giao dịch bên dưới; header chỉ che ba header chuẩn |
| US1.6 | AC1.6.1, AC1.6.2, AC1.6.3, AC1.6.4, AC1.6.5 | Toàn bộ tiêu chí ánh xạ |
| US1.10 | AC1.10.1, AC1.10.2, AC1.10.3, AC1.10.4, AC1.10.5 | AC1.10.5 kiểm bằng việc không có giao dịch nào được tạo cho callback thiếu transactionId; xem callback đó trong danh sách callback thuộc U2 |
| US1.14 | AC1.14.1 | Trên API đọc tối giản |

Điều chỉnh sau Functional Design của U1 (2026-10-20): U1 làm thêm phân trang cơ bản `page`, `size` của danh sách giao dịch (AC1.14.2 một phần) và trả các mã 413, 404, 503, 400 của endpoint callback mà không ghi lần nhận bị từ chối. Các tiêu chí AC1.6.4 (phần `transactionId`), AC1.6.5 và vế thứ hai của AC1.10.5 được chứng minh ở U1 bằng kiểm thử tích hợp đọc bảng Callback, vì U1 không có API xem callback ngoài giao dịch. Chi tiết ở `functional-spec.md` của U1.

API đọc tối giản của U1 gồm hai việc, không lọc (phân trang cơ bản có):

- Danh sách giao dịch: mỗi dòng có dịch vụ, transactionId, status của lần nhận gần nhất, timestamp nghiệp vụ của lần đó, thời điểm nhận gần nhất và tổng số callback (đủ để đạt AC1.14.1).
- Chi tiết một giao dịch theo dịch vụ và transactionId: trả status gần nhất và các lần nhận của giao dịch đó theo thứ tự nhận, kèm payload, header đã che, kết quả mapping và response đã trả (đủ để kiểm AC1.1.3 và AC1.10.1 đến AC1.10.4).

Các tiêu chí AC1.14.2 đến AC1.14.5 (phân trang 20/50/100, lọc theo kết quả xử lý, tham số không hợp lệ trả 400, hiệu năng 100.000 callback) và API danh sách callback thuộc U2.

## Hàng trải qua nhiều Unit (cắt ngang)

- Giữa U1 và U2: US1.1, US1.3, US1.6, US1.7, US1.8, US1.10, US1.12, US1.13, US1.14, và US2.2 (phần tạo dịch vụ tối giản).
- Giữa U2 và U3: toàn bộ US2.1 đến US2.10 (giao diện ở U3, API ở U2).
- Giữa U2, U3 và U4: toàn bộ US3.1 đến US3.9 (giao diện ở U4, API ở U2, khung dùng chung ở U3).

Cột "Cũng chạm tới: U1" chỉ ghi phần đóng góp mà U1 đã làm trước cho story có Unit chính khác. Nó không thêm cạnh phụ thuộc: các cạnh của đồ thị chỉ nằm ở `unit-of-work-dependency.md`. Ví dụ US2.2 chạm tới U1 (API tạo dịch vụ tối giản) nhưng U3 chỉ phụ thuộc U2, vì U2 đã phụ thuộc U1. Vì vậy khi lập kế hoạch, không cắt U2 giữa chừng chỉ vì một story giao diện đã chạm tới U1.

## Thứ tự thực hiện trong từng Unit

Chỉ là thứ tự gợi ý bên trong một Unit; thứ tự giữa các Unit thuộc Delivery Planning.

- **U1:** khung dự án và `compose.yaml` → lược đồ cơ sở dữ liệu → US1.6 (mapping) → US1.1 (nhận callback đường vui, kèm tạo dịch vụ tối giản) → US1.10 (gom giao dịch) → API đọc tối giản.
- **U2:** US1.7 (timestamp) → US1.2, US1.3, US1.4 (xác thực và các mã từ chối) → US1.8 → US1.5, US1.12 (ghi request bị từ chối, che header) → US1.13 (phiên bản) → US1.9 (500) → US1.11 (đồng thời) → US1.14 (lọc, phân trang, hiệu năng) → API quản lý dịch vụ đầy đủ và API thử mapping → US2.11 (tài sản mẫu).
- **U3:** dự án Vite và AppShell → US2.1 (danh sách) → US2.2, US2.3, US2.4, US2.5, US2.6 (biểu mẫu cấu hình) → US2.7, US2.8 → US2.9 (thử mapping) → US2.10 (gửi thử).
- **U4:** US3.1 → US3.2, US3.3 (bộ lọc, phân trang) → US3.4 (ngăn chi tiết) → US3.5, US3.6, US3.7 (tab tất cả callback) → US3.8, US3.9 (tự cập nhật).

## Kiểm tra độ phủ

- Tổng số mã story trong `stories.md`: 44 (US1.1–US1.14, US2.1–US2.11, US3.1–US3.9, US4.1–US4.10). Mọi mã đều có đúng một hàng ở trên.
- Phân bổ Unit chính: U1 có 3 story (US1.1, US1.6, US1.10); U2 có 12 (US1.2, US1.3, US1.4, US1.5, US1.7, US1.8, US1.9, US1.11, US1.12, US1.13, US1.14, US2.11); U3 có 10 (US2.1–US2.10); U4 có 9 (US3.1–US3.9); Won't Have có 10 (US4.1–US4.10). Tổng: 3 + 12 + 10 + 9 + 10 = 44.
- Mỗi Unit có ít nhất một hàng; không story nào thuộc hai Unit chính.
