# Bằng chứng — Practices Discovery

## Nguồn đã xem

- `aidlc/spaces/default/memory/org.md`: mặc định của org cho năm mục (dự án greenfield).
- `aidlc/spaces/default/memory/team.md`: chưa có nội dung đã chốt (lần chạy đầu).
- `docs/brief.md` mục 2 (công nghệ), 8 (tiêu chí nghiệm thu), 9 (thứ tự ba phần, trọng tâm kiểm thử).
- `ideation/feasibility/feasibility-questions.md`: chỉ chạy local, không triển khai production, không dùng đám mây.
- Workspace: chưa có `backend/`, `frontend/`, `compose.yaml`; lệnh `git` không có trên PATH, thư mục chưa phải kho git.

## Người tham gia

- Lead `aidlc-pipeline-deploy-agent`: soạn bản nháp từ mặc định org và brief, rồi tích hợp kết quả phỏng vấn.
- Không có agent hỗ trợ: scope `mvp` tắt collaborators.

## Quyết định từ phỏng vấn (`practices-discovery-questions.md`)

- Q1 = A: cài git, nhánh ngắn hạn, squash-merge vào `main`.
- Q2 = A: walking skeleton trong phần backend, kiểm chứng bằng cURL.
- Q3 = A: test-after; JUnit 5, Spring Boot Test, Testcontainers; Vitest, React Testing Library.
- Q4 = A: 80% line coverage backend (JaCoCo); CI bằng GitHub Actions.
- Q5 = A: Spotless + google-java-format; ESLint + Prettier.
- Tóm tắt được xác nhận: Looks correct.

## Điểm chưa chắc chắn

- Git chưa được cài; cần cài trước khi bắt đầu Construction.
- Chưa có kho GitHub; CI GitHub Actions chỉ chạy được khi người dùng tạo kho và đẩy code lên.
- Testcontainers cần Docker đang chạy khi chạy kiểm thử tích hợp (Docker đã có vì dùng Docker Compose).
