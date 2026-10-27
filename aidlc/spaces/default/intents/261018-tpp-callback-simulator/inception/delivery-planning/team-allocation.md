# Phân công Bolt — TPP Callback Simulator (MVP)

> Bolt là một lượt xây dựng trọn một phần việc, kết thúc bằng thứ chạy được; mob là nhóm cùng làm một Bolt. Tài liệu này đứng một mình và nói ai làm Bolt nào.

## Phân công

Scope `mvp` không chạy bước Team Formation (lập đội), nên không có đội do con người đại diện trong kế hoạch. Mọi Bolt do **aidlc-developer-agent** (tác nhân AI lập trình của AI-DLC) thực hiện. Bạn là người duyệt duy nhất ở các cổng duyệt.

| Bolt | Unit | Người thực hiện | Người duyệt |
|---|---|---|---|
| B1 | U1 `u1-backend-skeleton` | aidlc-developer-agent | Bạn |
| B2 | U2 `u2-backend-core` | aidlc-developer-agent | Bạn |
| B3 | U3 `u3-frontend-services` | aidlc-developer-agent | Bạn |
| B4 | U4 `u4-frontend-monitoring` | aidlc-developer-agent | Bạn |

## Ghi chú vận hành

- Chỉ có một đội, nên không cần bảng Program Board (bảng phối hợp nhiều đội).
- Chạy tuần tự trong một phiên: Construction không chia Unit cho nhiều đội (`solo`).
- Reviewer độc lập (aidlc-architecture-reviewer-agent hoặc tác nhân tương ứng) được dùng theo từng stage ở Construction để kiểm tra chéo, không phải là chủ sở hữu Bolt.
- Bạn có thể đổi ý và giao một Unit cho đội khác sau này; việc đó cần chọn lại cách bố trí Construction và Unit phải nằm trong kho git gốc của đội đó.
