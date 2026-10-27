# Lý do sắp xếp và rủi ro — TPP Callback Simulator (MVP)

> Bolt là một lượt xây dựng trọn một phần việc, kết thúc bằng thứ chạy được. Walking skeleton là lát cắt nhỏ nhất chạy được từ đầu đến cuối. WSJF là mô hình chấm điểm thứ tự theo (giá trị, độ gấp, giảm rủi ro) chia cho kích thước. Tài liệu này đứng một mình: nói vì sao các Bolt B1 đến B4 theo thứ tự đó.

## Thứ tự và lý do

Thứ tự là B1 (U1 skeleton), B2 (U2 backend core), B3 (U3 frontend dịch vụ), B4 (U4 frontend theo dõi).

1. **Thứ tự đã bị ràng buộc từ đầu.** Brief mục 9 yêu cầu ba phần: backend, frontend cấu hình dịch vụ, frontend theo dõi, hoàn thành và kiểm chứng phần nào mới chuyển phần đó. Đồ thị phụ thuộc của Units Generation phản ánh điều đó (U2 phụ thuộc U1, U3 phụ thuộc U2, U4 phụ thuộc U2 và U3), và chỉ có một thứ tự topo hợp lệ.
2. **Walking skeleton trước (B1).** U1 là lát cắt nhỏ nhất chạy đầu-cuối. Nó phơi sớm các rủi ro tích hợp rẻ nhất để sửa: khung Maven/Spring Boot, PostgreSQL JSONB, ghi nguyên tử Callback và Transaction, build (Spotless, JaCoCo, Testcontainers). Đây là lập luận skeleton-first của Cockburn.
3. **Rủi ro lớn nhất đến ngay sau skeleton (B2).** Đồng thời (NFR2) và hiệu năng 100.000 callback (NFR1) nằm ở U2. Vì U2 là Bolt thứ hai, rủi ro được xử lý sớm, trước khi frontend dựa vào API.
4. **Frontend sau khi backend ổn định (B3, B4).** Frontend là rủi ro thấp hơn về kỹ thuật; làm sau khi API ổn định tránh làm lại. U3 trước U4 vì U4 dùng khung AppShell của U3.
5. **Không chấm điểm WSJF.** Vì thứ tự bị brief và đồ thị phụ thuộc quy định, chấm điểm không thay đổi kết quả; bỏ qua để tránh nghi thức vô ích (câu trả lời Q2).

## Bảng rủi ro

| Rủi ro | Mức | Xử lý | Bolt |
|---|---|---|---|
| Ghi đồng thời cùng giao dịch làm mất callback hoặc sai tổng (NFR2) | Cao | Kiểm thử tích hợp đồng thời ngay đầu B2; chọn khóa dòng hay upsert có điều kiện ở NFR Design | B2 |
| Danh sách có lọc chậm hơn 1 giây với 100.000 callback (NFR1) | Cao | Bảng Transaction tổng hợp (ADR-002), chỉ mục chọn ở NFR Design, công cụ nạp dữ liệu để đo | B2 |
| Hợp đồng API lệch giữa hai kho git | Trung bình | Backend giữ file OpenAPI `docs/api/openapi.yaml`; thay đổi phá vỡ phải cập nhật cả hai kho trong cùng đợt | B1 đến B4 |
| `transactionId` có ký tự đặc biệt làm hỏng đường dẫn tra cứu (review Contract Design R-01) | Trung bình | Chốt dạng không phụ thuộc ký tự ở Functional Design của U1 | B1 |
| Không phân biệt lỗi hệ thống với response đã cấu hình (R-02) | Trung bình | Thêm header `X-Simulator-Error` ở Functional Design của U1 | B1 |
| Môi trường thiếu Docker, Java 21, Node hoặc kho GitHub từ xa | Thấp | Ghi ở `external-dependency-map.md`; Bolt vẫn chạy local, chỉ chưa thấy CI chạy thật | B1 đến B4 |
| Sườn code dựng sớm chưa kiểm chứng làm lệch Construction | Thấp | Construction kiểm tra lại sườn trước khi dùng làm nền | B1, B3 |

## Điều bản kế hoạch này không quyết

Chọn cách bảo đảm đồng thời, chỉ mục, cách lưu khóa API, kiểu cột chi tiết thuộc các stage thiết kế ở Construction. Bản kế hoạch chỉ ghi rủi ro và nơi chốt.
