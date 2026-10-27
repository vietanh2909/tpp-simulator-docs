# Team-Level Rules

> This team's affirmed practices and corrections. Loaded after `org.md` as
> strict-additive guidance; contradictions with broader policy are rejected.
> Populated by the practices-discovery affirmation gate. Edit at the gate,
> not directly.

## Way of Working

- Một người phát triển (chủ dự án) kiêm người duyệt duy nhất.
- Dùng git: cài git, tạo kho ở thư mục gốc dự án (Q1).
- Trunk-based: mỗi phần việc làm trên một nhánh ngắn hạn (1–2 ngày), gộp vào `main` bằng squash-merge; `main` là nhánh gốc và nhánh đích cho worktree trong Construction.
- Thứ tự công việc theo brief mục 9: (1) backend, (2) frontend cấu hình dịch vụ, thử mapping và gửi callback thử, (3) frontend theo dõi giao dịch; hoàn thành và kiểm chứng phần nào mới chuyển phần đó.

## Walking Skeleton

- Có làm walking skeleton (Q2), nằm trong phần 1 (backend): tạo một dịch vụ → POST `/callbacks/{serviceCode}` → mapping → lưu PostgreSQL → tra cứu qua API.
- Kiểm chứng skeleton bằng lệnh cURL thật đối với backend chạy cùng PostgreSQL từ `compose.yaml`.
- Frontend không nằm trong skeleton; làm sau theo đúng thứ tự brief.

## Testing Posture

- **Methodology**: test-after
- **Methodology evidence**: người dùng chọn Q3-A; khớp mặc định của org và brief mục 9.
- **Ordering**: Viết xong từng lớp có thể kiểm thử, sau đó viết và chạy kiểm thử của lớp đó trước khi sang lớp tiếp theo.
- Backend: JUnit 5 + Spring Boot Test; kiểm thử tích hợp chạy PostgreSQL thật qua Testcontainers (vì dùng JSONB).
- Frontend: Vitest + React Testing Library cho các phần có logic (form cấu hình, bộ lọc, polling).
- Trọng tâm theo brief: mapping, timestamp, xác thực, lịch sử, xử lý đồng thời và API tích hợp; không viết test chỉ lặp lại getter/setter hoặc chi tiết triển khai.
- Coverage: tối thiểu 80% line coverage cho backend, đo bằng JaCoCo (Q4); frontend không đặt ngưỡng cứng.
- CI: GitHub Actions build và chạy test backend và frontend khi đẩy code lên GitHub; test phải xanh trước khi gộp vào `main` (Q4).

## Guard Policy

<!-- Affirmed by the team. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless project.md or the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

- Đã chốt ở Feasibility: MVP chỉ chạy local theo README; không triển khai production, không dùng dịch vụ đám mây để chạy ứng dụng.
- `compose.yaml` chạy PostgreSQL; backend và frontend chạy theo hướng dẫn trong README.
- GitHub Actions chỉ dùng cho CI (build và test), không triển khai.

## Code Style

- Java: Spotless với google-java-format, chạy trong Maven build; build lỗi khi chưa format (Q5).
- TypeScript: ESLint + Prettier theo cấu hình mặc định của Vite (Q5).
- Đặt tên theo quy ước của từng ngôn ngữ (camelCase cho biến và hàm, PascalCase cho class và component).
- Linter và formatter chạy trong CI; lỗi thì chặn gộp code.
## Forbidden

<!-- Team-specific forbidden patterns -->

## Mandated

<!-- Team-specific mandates -->

## Corrections

<!-- Self-learning loop appends here. -->
