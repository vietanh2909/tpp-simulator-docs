# Nhật ký quyết định tự động (đọc lại vào ngày mai)

> Bối cảnh: ngày 2026-10-19 bạn nhắn: "Tôi cho bạn quyền tự quyết theo ý bạn recommend cho tôi ... tôi muốn sinh code trong đêm nay". Từ lúc đó, mọi câu hỏi của AI-DLC được tôi tự trả lời theo phương án đánh dấu (Recommended), và ghi vào các file câu hỏi của từng stage. File này chỉ là mục lục: mỗi dòng trỏ tới file có đáp án đầy đủ.
>
> Ngoại lệ: câu hỏi nào trái với `docs/brief.md` thì tôi không đổi brief; brief vẫn thắng. Những điểm cần bạn xem lại kỹ được đánh dấu **[Xem lại]**.

## Cách xem lại một quyết định

1. Mở file câu hỏi của stage (đường dẫn trong bảng), tìm dòng `[Answer]:`.
2. Muốn đổi, sửa đáp án và nhắn tôi "đổi quyết định ở <stage>". Stage đó sẽ chạy lại phần bị ảnh hưởng.

## Các stage đã quyết

| Stage | File đáp án | Tóm tắt quyết định |
|---|---|---|
| Contract Design | `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/contract-design/contract-design-questions.md` | Backend giữ hợp đồng OpenAPI; REST dưới `/api`; 1 MiB = 1.048.576 byte, kiểm tra 413 đầu tiên; lỗi JSON `{error, message}`; phân trang `page`/`size` 20-50-100; không đặt phiên bản trong đường dẫn; không thử lại tự động |

| Contract Design (duyệt) | `inception/contract-design/reviews/review-01.md` | Bạn chọn duyệt giữ nguyên. Hai điểm Major của reviewer (R-01 `transactionId` trong đường dẫn, R-02 phân biệt lỗi hệ thống bằng header `X-Simulator-Error`) **[Xem lại]**: xử lý ở Functional Design hoặc Code Generation |

(Các stage sau được thêm vào bảng này khi chạy.)

## Việc làm ngoài quy trình theo yêu cầu của bạn

- Dựng sườn backend `tpp-simulator-app/` và frontend `tpp-simulator-portal/`, rồi dựng giao diện theo Stitch với API giả (`VITE_USE_MOCK`). Việc này nằm trước Code Generation; khi tới Construction, phần đã có được xem là nền để tiếp tục.
- Ghi chú vận hành: khi cổng duyệt của AI-DLC đang mở, hook chặn mọi lệnh shell, kể cả của workflow đang chạy. Vì vậy tôi không mở cổng duyệt mới khi workflow dựng code đang chạy.

## Các điểm dừng engine giữ cho riêng bạn

Engine từ chối cho tôi tự trả lời "Looks correct" ở bước xác nhận tóm tắt (lỗi: `--on-instruction is for a stage question the person left to you; --checkpoint summary-confirmation is theirs to answer`). Các điểm này vẫn cần một câu trả lời ngắn của bạn: xác nhận tóm tắt, Plan Approval ở Code Generation, chọn lệnh kiểm chứng Construction, và các lần duyệt cổng stage. Nếu muốn chạy liền, nhắn tôi tắt riêng "summary confirmation" cho công việc này (lệnh `aidlc engine config set summary-confirmation off`).
