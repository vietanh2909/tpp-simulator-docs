# Thiết kế độ tin cậy — U1 `u1-backend-skeleton`

> Nguồn: `reliability-requirements.md` (NFR2.1, NFR2.4 đến NFR2.6, NFR5.2), `tech-stack-decisions.md`, `functional-spec.md` (W1, W2), `contract-summary.md` (C1, C6, quy ước chung) và giả định 4, 6, 7 trong `nfr-design-questions.md`. Mức thiết kế: mẫu và quyết định.

## Nguyên tắc

Không SLA/SLO; tiêu chí là tính đúng đắn và tự phục hồi. Không dùng ngắt mạch, thử lại tự động hay dự phòng vì chỉ có một phụ thuộc ngoài (PostgreSQL) và ghi đồng bộ là yêu cầu (ADR-008, FR3.7): thử lại ở phía ứng dụng sẽ che mất lỗi ghi mà người gọi phải thấy là 500.

## Ranh giới giao dịch (NFR2.1)

- Giao dịch cơ sở dữ liệu mở ở **dịch vụ ứng dụng** của CallbackIngestion (ghi Callback và Transaction) và của ServiceCatalog (ghi Service và ServiceConfigVersion số 1), không ở bộ điều khiển và không ở tầng truy cập dữ liệu.
- Mọi ngoại lệ trong giao dịch làm hủy toàn bộ giao dịch; không có phần ghi nào nằm ngoài giao dịch. Bộ xử lý lỗi tập trung dịch ngoại lệ truy cập dữ liệu thành 500 `INTERNAL_ERROR` kèm `X-Simulator-Error` (BR2.5, BR2.8).
- Vi phạm khóa duy nhất khi tạo dịch vụ được dịch thành 409 `SERVICE_CODE_DUPLICATE` (BR1.2); mọi vi phạm ràng buộc khác là 500.
- Kiểm thử: ép lỗi ở bước ghi Transaction và khẳng định không còn Callback mồ côi; ép lỗi ở bước ghi phiên bản số 1 và khẳng định không còn Service mồ côi.

## Cơ sở dữ liệu tạm mất và tự phục hồi (NFR2.4)

| Khía cạnh | Thiết kế |
|---|---|
| Lấy kết nối | HikariCP: tối đa 10 kết nối; thời gian chờ lấy kết nối 5 giây rồi trả lỗi; request đó nhận 500 `INTERNAL_ERROR` (chỉ tiêu "chờ tối đa 5 giây") |
| Kiểm tra kết nối | Kiểm tra kết nối còn sống trước khi cấp; kết nối hỏng bị loại khỏi pool và pool tạo lại |
| Phục hồi | Khi PostgreSQL chấp nhận kết nối trở lại, kết nối mới được tạo ở lần lấy kế tiếp; không cần khởi động lại; chỉ tiêu phục vụ lại trong vòng 30 giây (pool kiểm tra và tạo lại kết nối trong vài giây) |
| Callback trong lúc mất | Không bao giờ báo thành công khi chưa ghi được: request nhận 500, không trả response đã cấu hình (BR2.8) |
| Quan sát | Chỉ báo sức khỏe cơ sở dữ liệu trả `DOWN` khi không kết nối được (xem `observability-design.md`) |

Kiểm chứng: kiểm thử tích hợp bằng pool trỏ vào địa chỉ hỏng và kiểm thử thủ công dừng rồi bật lại container PostgreSQL trong Build and Test.

## Khởi động an toàn (NFR2.5)

- Flyway là bước đầu tiên của khởi động, trước khi máy chủ nhận request: áp dụng `V1__init_schema` và các bản chuyển sau.
- Bản chuyển đã áp dụng không bao giờ sửa; thay đổi mới là bản chuyển mới (`V2`, `V3`, ...). Flyway kiểm tra checksum và từ chối khởi động nếu bản đã áp dụng bị sửa.
- Không kết nối được cơ sở dữ liệu hoặc bản chuyển lỗi: ứng dụng báo lỗi nêu nguyên nhân (địa chỉ cơ sở dữ liệu đã làm sạch, không kèm mật khẩu) và thoát với mã lỗi khác 0, không treo.
- Kiểm thử: khởi động với cơ sở dữ liệu rỗng (lược đồ tự được tạo) và với địa chỉ không kết nối được (thoát với lỗi rõ ràng).

## Độ bền dữ liệu (NFR2.6)

- Callback bất biến: mã nguồn không có câu `UPDATE` hay `DELETE` nào trên bảng `callbacks`; không có xóa vật lý Service. Kiểm thử rà soát tĩnh đơn giản tìm các câu đó trong thư mục mã nguồn.
- Dữ liệu giữ vô thời hạn; không tác vụ nền xóa dữ liệu.
- Sao lưu và phục hồi là việc của người dùng: dữ liệu nằm ở Docker volume `tpp_simulator_pgdata`; README nêu cách sao lưu bằng công cụ của PostgreSQL và cách tạo lại từ đầu.

## Chạy được từ bản checkout sạch (NFR5.2)

Thiết kế khởi động không phụ thuộc trạng thái có sẵn: `docker compose up` tạo cơ sở dữ liệu rỗng, backend tự tạo lược đồ bằng Flyway, không bước thủ công nào ngoài README. Kiểm chứng trong Build and Test trên máy sạch.

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/reliability-requirements.md` (reliability-requirements: NFR2.1, NFR2.4 đến NFR2.6, NFR5.2)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/tech-stack-decisions.md` (tech-stack-decisions)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/functional-design/functional-spec.md` (functional-spec: W1, W2) và `rules.md` (rules: BR1.2, BR2.5, BR2.8, BR2.11)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-summary.md` (contract-summary: C1, C6)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-design/nfr-design-questions.md` (giả định 4, 6, 7)

## Assumptions & Open Questions

- Số 30 giây phục hồi là chỉ tiêu theo NFR2.4; thời gian thực của HikariCP thường ngắn hơn nhiều, Build and Test đo thực tế.
- Việc không dùng thử lại tự động là có chủ ý (lỗi ghi phải lộ ra cho người gọi); không có câu hỏi mở.
