# Thiết kế khả năng mở rộng và đồng thời — U1 `u1-backend-skeleton`

> Nguồn: `scalability-requirements.md` (NFR2.2, NFR2.3, NFR7.1, tham chiếu NFR1.5), `functional-spec.md` (W4), `contract-summary.md` (C2, C6), `tech-stack-decisions.md` và Q1 A cùng giả định 1, 9 trong `nfr-design-questions.md`.

## Kiến trúc mở rộng

Một bản backend, một cơ sở dữ liệu, không chia tỷ lệ ngang, không bộ nhớ đệm phân tán, không hàng đợi (brief, ADR-008). Bộ xử lý request không giữ trạng thái giữa các request nên chạy thêm bản sao là khả thi về mặt kỹ thuật nhưng không phải mục tiêu. Dung lượng thiết kế: 100.000 callback, khoảng 5 giao dịch/giây, đỉnh ngắn 50 callback đồng thời cho một giao dịch (NFR1.5, NFR2.2). Ngưỡng cần xem lại thiết kế: vượt 1 triệu callback hoặc cần nhiều người dùng đồng thời liên tục.

## Cập nhật giao dịch đồng thời (NFR2.2, NFR2.3; Q1 A)

Mọi callback có `transactionId` hợp lệ chạy **một câu lệnh duy nhất** "thêm, nếu đã có thì cập nhật có điều kiện" trên bảng `transactions`, bên trong giao dịch cơ sở dữ liệu đã ghi Callback. Minh họa ở mức mẫu:

```sql
INSERT INTO transactions (service_code, transaction_id, latest_status,
    latest_business_ts, latest_received_at, latest_callback_id,
    latest_has_mapping_error, callback_count)
VALUES (:svc, :txn, :status, :bts, :rcv, :cbId, :err, 1)
ON CONFLICT (service_code, transaction_id) DO UPDATE SET
  callback_count = transactions.callback_count + 1,
  latest_status = CASE WHEN (EXCLUDED.latest_received_at, EXCLUDED.latest_callback_id)
      > (transactions.latest_received_at, transactions.latest_callback_id)
      THEN EXCLUDED.latest_status ELSE transactions.latest_status END
  /* tương tự cho latest_business_ts, latest_received_at,
     latest_callback_id, latest_has_mapping_error */
```

Vì sao đúng khi đồng thời:

| Tình huống | Hành vi bảo đảm |
|---|---|
| Hai callback đầu tiên của cùng một cặp đến cùng lúc | Một bên thêm, bên kia rơi vào nhánh cập nhật; không bên nào gặp lỗi trùng khóa (NFR2.2) |
| Nhiều cập nhật cùng một dòng | PostgreSQL khóa dòng khi cập nhật và đánh giá biểu thức theo giá trị đã chốt mới nhất của dòng; hai cập nhật được xếp thứ tự, không mất lần đếm (NFR2.3) |
| Hai callback hoàn tất theo thứ tự ngược với thứ tự nhận | So sánh cặp (`receivedAt`, `recordId`) giữ lần nhận lớn hơn làm "gần nhất", còn tổng số vẫn tăng đủ (BR4.4) |
| Lần nhận gần nhất lỗi status | Các trường `latest*` lấy đúng giá trị của lần đó, status trống kèm cờ lỗi, không lấy status cũ (BR4.5) |

Mức cô lập mặc định READ COMMITTED của PostgreSQL là đủ cho mẫu này; không cần SERIALIZABLE hay khóa tư vấn. Các trường `latest*` luôn được cập nhật **cùng nhau** trong cùng một câu lệnh, nên không bao giờ có giao dịch với trạng thái lấy từ hai lần nhận khác nhau.

Câu lệnh này viết tường minh (truy vấn gốc), không dựa vào ORM (`tech-stack-decisions.md`).

## Kiểm chứng

- U1: kiểm thử tích hợp hai luồng ghi cùng cặp khóa (kể cả trường hợp cả hai đều là lần nhận đầu tiên) và kiểm thử đảo thứ tự hoàn tất: tổng số bằng số lần ghi, trạng thái gần nhất đúng (NFR2.2, NFR2.3).
- U2: kiểm chứng 50 callback đồng thời cùng giao dịch (US1.11).

## Mở rộng bằng cấu hình (NFR7.1)

Dịch vụ mới là dữ liệu, không phải mã: `POST /api/services` ghi một Service và phiên bản cấu hình số 1 (BR1.8); đường dẫn ánh xạ nằm trong phiên bản cấu hình và MappingEngine đọc nó mỗi callback (W3) nên không cần khởi động lại hay sửa mã. Thiết kế giữ MappingEngine không trạng thái và không có mã riêng cho từng dịch vụ. Kiểm chứng: kiểm thử tích hợp tạo hai dịch vụ với cấu trúc JSON khác nhau rồi gửi callback cho cả hai; ba dịch vụ mẫu của brief thuộc U2.

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/scalability-requirements.md` (scalability-requirements: NFR2.2, NFR2.3, NFR7.1)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/tech-stack-decisions.md` (tech-stack-decisions)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/functional-design/functional-spec.md` (functional-spec: W3, W4)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-summary.md` (contract-summary: C2, C6)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-design/nfr-design-questions.md` (Q1 A, giả định 1 và 9)

## Assumptions & Open Questions

- Đoạn SQL trên là minh họa mẫu thiết kế; câu lệnh thật do Code Generation viết và kiểm thử trên PostgreSQL 16.
- Mức cô lập READ COMMITTED được xem là đủ; kiểm thử đồng thời của U1 và U2 là bằng chứng. Nếu kiểm thử cho thấy sai thứ tự, xem xét khóa dòng tường minh.
