# Bảng theo dõi AI-DLC (chỉ đọc)

Dashboard nhỏ để xem state và workflow của AI-DLC trong workspace này. Chỉ đọc, không ghi tệp nào.

## Chạy

```powershell
cd D:\pet-pj-dlc\tools\aidlc-dashboard
node server.js
```

Mở http://127.0.0.1:4777/. Đổi cổng bằng biến `PORT`:

```powershell
$env:PORT = 5000; node server.js
```

Yêu cầu: Node.js (đã thử với v22). Không cần cài thêm gói nào, chỉ dùng module built-in `http`, `fs`, `path`.

## Nguồn dữ liệu

Intent lấy từ `aidlc/spaces/default/intents/active-intent` (dự phòng: `261018-tpp-callback-simulator`). Xem intent khác bằng `?intent=<tên>` hoặc ô chọn trên trang. Tên chỉ được gồm chữ, số, `-` và `_`.

Đọc từ thư mục intent: `aidlc-state.md`, `runtime-graph.json`, `audit/*.md`, các thư mục artefact, `verification/` và `.aidlc-construction-checkpoints/`. Kết quả parse audit được cache theo thời gian sửa và kích thước tệp.

## Bảo mật

- Server chỉ lắng nghe `127.0.0.1`, không lắng nghe `0.0.0.0`. **Không có xác thực**, nên đừng chuyển tiếp cổng ra mạng ngoài hay đổi địa chỉ lắng nghe.
- Chỉ có `GET /` và `GET /api/overview`. Không có endpoint đọc đường dẫn tuỳ ý. Máy chủ từ chối `Host` lạ (chống DNS rebinding).
- Nội dung audit là dữ liệu không tin cậy: giao diện chỉ hiển thị bằng `textContent`, không dùng `innerHTML`.

## API

`GET /api/overview?intent=&event=&stage=` trả JSON gồm `state`, `stages`, `units`, `auditStats`, `recentEvents` (tối đa 50), `artifacts`, `verification`, `checkpoints` và `errors` (lỗi theo từng phần, ví dụ `errors.audit`). `event` và `stage` lọc `recentEvents`; `stage=(none)` chọn sự kiện không gắn stage.

Trang tự làm mới mỗi 5 giây, có nút Tạm dừng.
