# Yêu cầu độ tin cậy — U1 `u1-backend-skeleton`

> Nguồn: NFR2, NFR5 trong `requirements.md`, ADR-002, ADR-008, `rules.md` (BR1.8, BR2.8, BR2.11), `functional-spec.md` (W1, W2) và hợp đồng `contract-summary.md`. Câu trả lời: giả định 5 và 11 trong `nfr-requirements-questions.md`.

## Mục tiêu khả dụng

Công cụ phát triển chạy local và dùng nội bộ; **không đặt SLA/SLO**. Tiêu chí thay thế là tính đúng đắn và tự phục hồi:

- Không bao giờ trả "thành công" cho một callback chưa được ghi (BR2.8).
- Không bao giờ có dữ liệu ghi một nửa (BR2.11, BR1.8).
- Tự phục hồi khi cơ sở dữ liệu trở lại, không cần khởi động lại backend.

## Yêu cầu

| ID | Yêu cầu | Chỉ tiêu kiểm chứng |
|---|---|---|
| NFR2.1 | Ghi Callback và cập nhật Transaction nằm trong một giao dịch cơ sở dữ liệu: cả hai cùng thành công hoặc cùng không được ghi; tạo Service và ServiceConfigVersion số 1 cũng vậy. Lỗi ghi trả 500 `INTERNAL_ERROR`, không trả response đã cấu hình | Kiểm thử tích hợp ép lỗi giữa hai bước ghi rồi khẳng định không có dữ liệu mồ côi |
| NFR2.4 | Khi PostgreSQL tạm mất, API trả 500 `INTERNAL_ERROR` kèm `X-Simulator-Error` và tự phục hồi khi cơ sở dữ liệu trở lại, không cần khởi động lại; không có callback nào được báo thành công trong thời gian đó. Chỉ tiêu: một request không lấy được kết nối chờ tối đa 5 giây rồi trả 500; backend phục vụ lại bình thường trong vòng 30 giây sau khi cơ sở dữ liệu chấp nhận kết nối trở lại | Kiểm thử thủ công dừng rồi bật lại container PostgreSQL trong Build and Test; kiểm thử tích hợp bằng pool kết nối hỏng |
| NFR2.5 | Bản chuyển lược đồ chạy tự động lúc khởi động bằng Flyway (`V1__init_schema`); không bao giờ sửa bản đã áp dụng; khởi động khi chưa có cơ sở dữ liệu hoặc bản chuyển lỗi thì báo lỗi rõ ràng nêu nguyên nhân và thoát với mã lỗi khác 0 | Kiểm thử khởi động với cơ sở dữ liệu rỗng và với cơ sở dữ liệu không kết nối được |
| NFR2.6 | Độ bền dữ liệu: Callback bất biến, không bao giờ sửa hay xóa; dữ liệu giữ vô thời hạn, không tự xóa; không có xóa vật lý Service. Sao lưu là việc của người dùng (Docker volume `tpp_simulator_pgdata`); README nêu cách | Kiểm thử không có lệnh sửa hoặc xóa Callback trong mã; xem README |
| NFR5.2 | Chạy được từ một bản checkout sạch theo README: `docker compose up`, khởi động backend, tạo dịch vụ, gửi callback, truy vấn; mọi bước dùng phiên bản công cụ đã nêu | Chạy theo README trên máy sạch trong Build and Test |

## Suy giảm có kiểm soát

| Tình huống | Hành vi mong muốn |
|---|---|
| Cơ sở dữ liệu không ghi được một callback | 500 `INTERNAL_ERROR`; nhật ký mức ERROR kèm lớp ngoại lệ và SQLSTATE, không kèm thông điệp thô hay payload; không dữ liệu ghi dở |
| Body quá lớn hoặc không phải JSON | Mã từ chối tương ứng (BR2.2, BR2.4), không đụng cơ sở dữ liệu |
| Hai yêu cầu tạo cùng mã dịch vụ cùng lúc | Một thành công, một 409 `SERVICE_CODE_DUPLICATE` (BR1.2) |
| Backend bị tắt giữa chừng | Không có trạng thái dở dang vì mỗi lần ghi là một giao dịch; callback đang xử lý có thể mất, ngân hàng gọi lại nếu cần |

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/requirements-analysis/requirements.md` (requirements: NFR2, NFR5, FR3.7)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/functional-design/rules.md` (rules: BR1.2, BR1.8, BR2.8, BR2.11) và `functional-spec.md` (functional-spec: W1, W2)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-summary.md` (contract-summary: C6, quy ước chung)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/nfr-requirements-questions.md` (giả định 5, 11)

## Assumptions & Open Questions

- Việc không đặt SLA/SLO và việc dữ liệu giữ vô thời hạn không tự xóa là đề xuất đã được chấp nhận (giả định 5); Feasibility cũng ghi dữ liệu giữ vô thời hạn.
- Kiểm thử thủ công dừng và bật lại PostgreSQL (NFR2.4) do Build and Test thực hiện.
