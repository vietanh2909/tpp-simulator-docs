# Bản đồ phụ thuộc bên ngoài — TPP Callback Simulator (MVP)

> Bolt là một lượt xây dựng trọn một phần việc, kết thúc bằng thứ chạy được. Tài liệu này liệt kê những thứ nằm ngoài tầm kiểm soát của quá trình xây dựng có thể làm chậm một Bolt. Nó đứng một mình.

Không có đội bên ngoài, API bên ngoài, cửa sổ dữ liệu hay phê duyệt nào làm chậm dự án: ứng dụng chỉ chạy local và không gọi ra ngoài (brief mục 7). Chỉ có điều kiện môi trường dưới đây.

| # | Phụ thuộc | Chủ sở hữu | Thời gian dự kiến | Bolt bị chặn | Nếu chậm |
|---|---|---|---|---|---|
| E1 | Docker chạy được trên máy (PostgreSQL từ `compose.yaml`, Testcontainers) | Bạn | Có sẵn nếu đã cài | B1, B2 | Không chạy được kiểm thử tích hợp thật; ghi rõ phần chưa kiểm chứng, không dùng cơ sở dữ liệu giả thay thế mà không nói |
| E2 | Java 21 và Maven (hoặc Maven wrapper) | Bạn | Có sẵn nếu đã cài | B1, B2 | Backend không build được; cài hoặc dùng wrapper trước khi bắt đầu |
| E3 | Node LTS và npm | Bạn | Có sẵn nếu đã cài | B3, B4 | Frontend không build được; cài Node trước khi bắt đầu B3 |
| E4 | Hai kho GitHub từ xa cho `tpp-simulator-app` và `tpp-simulator-portal` | Bạn | Bạn tạo và đẩy code khi sẵn sàng | CI Pipeline (cuối Construction) | CI chạy được ở file, nhưng chỉ thấy chạy thật sau khi đẩy lên GitHub; kiểm tra local thay thế |
| E5 | Terminal của công cụ chạy ổn định | Công cụ Kiro | Đã gặp sự cố một lần ở phiên này | Mọi Bolt | Khởi động lại terminal; việc này đã giải quyết được lần trước |

## Ghi chú

- Hook của AI-DLC chặn lệnh shell khi một cổng duyệt đang mở, kể cả của workflow dựng code chạy cùng lúc. Vì vậy các Bolt không chạy song song với một cổng duyệt đang mở.
- Không có dữ liệu thật hay hệ thống ngân hàng thật nào là điều kiện; chỉ dữ liệu giả lập.
