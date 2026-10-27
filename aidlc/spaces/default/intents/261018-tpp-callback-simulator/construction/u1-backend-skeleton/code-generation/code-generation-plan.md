# Kế hoạch Code Generation — U1 `u1-backend-skeleton`

## Summary

- Builds: backend skeleton đầu-cuối: tạo dịch vụ, nhận callback, ánh xạ, ghi nguyên tử Callback và Transaction vào PostgreSQL, hai API đọc giao dịch
- Touches: `tpp-simulator-app/` (mã `src/main/java/com/tpp/simulator/...`, `src/main/resources/`, `src/test/java/...`, `docs/api/openapi.yaml`, `README.md`); không đụng `tpp-simulator-portal/`
- Tests: khoảng 80 đến 100 kiểm thử (đơn vị cho ánh xạ và tiện ích, tích hợp PostgreSQL thật qua Testcontainers cho ghi nguyên tử, đồng thời, API và một kiểm thử đầu-cuối của skeleton), kiểm tra bao phủ tối thiểu 80% dòng

## Phạm vi và nguồn

Lát cắt skeleton của backend (U1) theo `functional-spec.md`, `rules.md`, `entities.md` (BR1.1 đến BR6.2), các yêu cầu NFR1.1 đến NFR7.1 và thiết kế NFR Design của U1, hợp đồng `contract-summary.md` (C1, C2, C4, C6 đã cập nhật). Tiêu chí U1 phải đạt: AC1.1.1 đến AC1.1.4, AC1.6.1 đến AC1.6.5, AC1.10.1 đến AC1.10.5, AC1.14.1. Mã đặt ở `tpp-simulator-app/` (kho git riêng, nhánh ngắn hạn rồi squash-merge vào `main`); chỉ tệp kế hoạch này nằm trong thư mục record.

Phương pháp kiểm thử (Testing Contract của team): **test-after**: với mỗi lớp có thể kiểm thử, viết xong lớp đó rồi viết và chạy kiểm thử của lớp đó trước khi sang lớp tiếp theo. Khung dự án đã có Spotless, JaCoCo (ngưỡng 80%), Flyway, Actuator, Testcontainers; không hạ ngưỡng nào để qua kiểm tra.

## Quyết định triển khai cần bạn xem khi duyệt kế hoạch

1. **Truy cập dữ liệu bằng JDBC tường minh (`JdbcClient`/`JdbcTemplate`), không dùng thực thể JPA.** Lý do: câu lệnh thêm hoặc cập nhật có điều kiện của Transaction, ép kiểu JSONB, so khớp chữ thường và đọc phân trang đều là SQL tường minh theo `scalability-design.md`; JPA chỉ thêm lớp ánh xạ không cần thiết. Hơi khác dòng "JPA cho thao tác đơn giản" trong `tech-stack-decisions.md`; `spring-boot-starter-data-jpa` vẫn có trong `pom.xml` của khung nhưng `spring.jpa.open-in-view=false` được đặt, và có thể đổi starter sang `spring-boot-starter-jdbc` nếu bạn muốn gọn hơn.
2. **Tên biến môi trường kết nối cơ sở dữ liệu giữ theo khung hiện có** (`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, mặc định khớp `compose.yaml`), không đổi sang `TPP_DB_*` như `security-design.md` đã viết; README đã dùng tên này.
3. **Tên gói** bám khung: `com.tpp.simulator` với `catalog`, `mapping`, `ingestion`, `ledger`, `web`, `config` (theo `logical-components.md`).
4. **Kiểm thử đầu-cuối của skeleton** là một kiểm thử `@SpringBootTest` chạy máy chủ thật trên cổng ngẫu nhiên với PostgreSQL thật (Testcontainers), gọi HTTP đúng như cURL: tạo dịch vụ, gửi callback, đọc giao dịch. Đây là bằng chứng "skeleton chạy được" cho lệnh kiểm chứng đã duyệt (`scripts/verify.ps1` chạy `mvn verify`); các lệnh cURL tay nằm trong README.

## Kế hoạch các bước (test-after theo từng lớp)

- [ ] **Step 1: Chuẩn bị chạy kiểm thử và kiểm tra khung**
  - Chạy `mvn -B -f tpp-simulator-app/pom.xml verify` trên khung hiện tại để xác nhận Spotless, JaCoCo và kiểm thử khói xanh; kiểm tra Docker dùng được cho Testcontainers.
  - Thêm lớp cơ sở kiểm thử tích hợp dùng một container PostgreSQL 16 dùng chung cho cả bộ kiểm thử (singleton), cấu hình nguồn dữ liệu qua `@DynamicPropertySource`.
  - Lệnh chạy kiểm thử của Unit này được ghi trong `unit-test-instructions.md`.
  - Truy vết: NFR6.1, NFR6.3.
- [ ] **Step 2: Bản chuyển lược đồ `V1__init_schema` và kiểm thử lược đồ**
  - Tạo `src/main/resources/db/migration/V1__init_schema.sql` đúng `entities.md` và `contract-summary.md` C6: bốn bảng `services`, `service_config_versions`, `callbacks`, `transactions`; khóa chính, khóa duy nhất theo chữ thường của `service_code`, khóa ngoại (không có khóa ngoại từ `callbacks` sang `transactions`), cột JSONB, chỉ mục theo `performance-design.md`.
  - Kiểm thử: Flyway áp dụng bản chuyển trên PostgreSQL thật; kiểm tra ràng buộc duy nhất không phân biệt hoa thường, khóa ghép của Transaction, không có khóa ngoại Callback sang Transaction, chỉ mục sắp xếp tồn tại.
  - Truy vết: BR1.2, NFR1.2, NFR2.5, NFR2.6.
- [ ] **Step 3: Cấu hình ứng dụng và tiện ích dùng chung**
  - `application.yml`: `server.address=127.0.0.1`, HikariCP tối đa 10 kết nối và chờ 5 giây, kiểm tra kết nối, `spring.jpa.open-in-view=false`, Actuator chỉ mở `health` và không hiện chi tiết, mẫu nhật ký có thời điểm UTC, tên lớp.
  - `config`: bean `Clock` (thay được trong kiểm thử), tiện ích làm sạch giá trị bên gọi trước khi log (bỏ ký tự điều khiển, cắt 100 ký tự), kiểu "header đã che".
  - Kiểm thử: làm sạch xuống dòng và độ dài; kiểu header đã che che đúng ba header không phân biệt hoa thường và giữ nhiều giá trị cùng tên; địa chỉ lắng nghe mặc định là loopback; `health` UP.
  - Truy vết: BR2.10, BR2.12, BR6.1, NFR3.1, NFR3.2, NFR3.3, NFR3.7, NFR5.3, NFR5.4, NFR2.4.
- [ ] **Step 4: MappingEngine (đọc dòng, giữ nguyên văn số) và kiểm thử đơn vị**
  - `mapping`: duyệt JSON một lượt bằng mã thông báo (token) của Jackson, lấy ba giá trị theo ba đường dẫn `$.a.b.c`, khóa trùng thì lấy lần cuối, số lấy từ văn bản của mã thông báo, boolean, chuỗi nguyên văn; lỗi từng trường độc lập (`NOT_FOUND`, `EMPTY`, `WRONG_TYPE`, `TOO_LONG`, `PAYLOAD_NOT_OBJECT`, `UNPARSEABLE`); timestamp ISO 8601 về UTC, thiếu múi giờ dùng múi giờ mặc định; cảnh báo timestamp thiếu; `SUCCESS` hay `MAPPING_ERROR`.
  - Kiểm thử đơn vị (không cần cơ sở dữ liệu): AC1.6.1 đến AC1.6.5, số `1.50` và `1e3` và số rất lớn giữ nguyên, `0` và `true`, khóa trùng, mảng làm gốc, null, rỗng, chỉ khoảng trắng, dài 256 ký tự, ba định dạng ISO có và không có múi giờ, timestamp thiếu và hỏng.
  - Truy vết: BR3.1 đến BR3.8, AC1.6.1 đến AC1.6.5.
- [ ] **Step 5: ServiceCatalog (tạo và đọc dịch vụ) và kiểm thử**
  - `catalog`: kiểm tra tạo dịch vụ theo BR1.1, BR1.3 đến BR1.7 (thu thập mọi lỗi trường cùng lúc, từ chối `API_KEY` và định dạng thời gian khác ISO 8601, loại `apiKeyHeaderName` và `apiKeySecret` khi `NONE`); ghi Service và ServiceConfigVersion số 1 trong một giao dịch; trùng mã dựa vào ràng buộc duy nhất của cơ sở dữ liệu thành 409; đọc dịch vụ không phân biệt hoa thường; phản hồi không có khóa.
  - Kiểm thử tích hợp: tạo thành công (mặc định `enabled`, múi giờ, phiên bản 1), mã trùng khác chữ hoa thường, hai yêu cầu tạo cùng mã đồng thời chỉ một thành công, mọi lỗi trường, giới hạn độ dài, `204/205/304` bị từ chối, `API_KEY` bị từ chối, hủy cả hai bảng khi lỗi giữa chừng.
  - Truy vết: BR1.1 đến BR1.9, NFR2.1, NFR3.4.
- [ ] **Step 6: CallbackLedger (ghi và đọc) và kiểm thử tích hợp, kể cả đồng thời**
  - `ledger`: ghi Callback (JSONB, header đã che); thêm hoặc cập nhật Transaction bằng đúng một câu lệnh thêm-hoặc-cập-nhật-có-điều-kiện theo cặp (`receivedAt`, `recordId`) và tăng `callbackCount` nguyên tử (Q1 A); đọc danh sách giao dịch phân trang với thứ tự cố định và chi tiết giao dịch (các lần nhận cũ nhất trước, kèm số phiên bản cấu hình, `serviceDeleted`); đọc hết rồi giải phóng kết nối.
  - Kiểm thử tích hợp: AC1.10.1 đến AC1.10.5, callback đảo thứ tự hoàn tất, hai callback đầu tiên cùng cặp song song không lỗi, N ghi song song cho `callbackCount` bằng N, lần nhận gần nhất lỗi status cho status trống, hai dịch vụ cùng `transactionId` là hai giao dịch, `EXPLAIN` của bốn truy vấn khóa không quét toàn bảng, không có `UPDATE` hay `DELETE` trên bảng `callbacks` trong mã nguồn.
  - Truy vết: BR4.1 đến BR4.6, BR5.1, BR5.3, NFR1.2, NFR2.2, NFR2.3, NFR2.6.
- [ ] **Step 7: CallbackIngestion (quy trình nhận callback) và kiểm thử tích hợp**
  - `ingestion`: bộ lọc đếm byte dừng ở 1.048.576 byte (kể cả chunked); thứ tự kiểm tra 413, 404, đã xóa 404, tắt 503, Content-Type, JSON; đọc cấu hình hiện hành bằng một truy vấn; gọi MappingEngine ngoài giao dịch; che header; ghi nguyên tử qua CallbackLedger; trả response đã cấu hình kèm `Content-Type: application/json`; mapping lỗi vẫn trả response cấu hình; lỗi ghi trả 500; ghi một dòng nhật ký không chứa dữ liệu nhạy cảm; xử lý giới hạn JSONB (JSON hợp lệ nhưng JSONB từ chối trả 500, log an toàn).
  - Kiểm thử tích hợp qua HTTP: AC1.1.1 đến AC1.1.4 (hai lần gọi cùng body cho hai bản ghi, `charset=UTF-8`), tất cả mã từ chối không ghi gì, `X-Simulator-Error` chỉ có ở lỗi do ứng dụng sinh và không có ở response cấu hình dù trùng mã (ví dụ cấu hình 401), che ba header đã lưu, nhật ký không lộ giá trị nhạy cảm và không có dòng log giả, lỗi ghi ép bằng cơ sở dữ liệu hỏng trả 500 và log chỉ có lớp ngoại lệ và SQLSTATE.
  - Truy vết: BR2.1 đến BR2.12, AC1.1.1 đến AC1.1.4, NFR1.1, NFR1.4, NFR2.1, NFR3.2, NFR3.8.
- [ ] **Step 8: Lớp web (REST), xử lý lỗi tập trung và kiểm thử API**
  - `web`: `POST /api/services`, `GET /api/services/{serviceCode}`, `GET /api/transactions` (chỉ `page` và `size`, từ chối tham số lọc), `GET /api/transactions/detail` (tham số truy vấn), `POST /callbacks/{serviceCode}`; bộ xử lý lỗi tập trung dịch ngoại lệ thành `ErrorResponse` kèm header `X-Simulator-Error` (kể cả lỗi từ bộ lọc kích thước, 404 đường dẫn không có, 405); thân JSON hỏng hoặc sai kiểu khi tạo dịch vụ trả 400; không bật CORS; thông báo lỗi không chứa dữ liệu nhạy cảm.
  - Kiểm thử API (MockMvc hoặc HTTP thật): hình dạng khớp hợp đồng, phân trang mặc định 1 và 20 và giá trị hợp lệ 20/50/100, `page` và `size` sai trả 400, AC1.14.1, chi tiết giao dịch với `transactionId` chứa `/`, `?`, `#`, `%`, khoảng trắng (mã hóa phần trăm), 404 `TRANSACTION_NOT_FOUND`, `health` UP, các endpoint Actuator khác 404, không có `apiKeySecret` trong bất kỳ phản hồi nào.
  - Truy vết: BR1.8, BR1.9, BR5.1 đến BR5.3, BR2.5, BR6.2, NFR3.4, NFR3.7, NFR3.8, AC1.14.1.
- [ ] **Step 9: Kiểm thử đầu-cuối của skeleton, kiểm thử kiến trúc và độ tin cậy**
  - Kiểm thử `@SpringBootTest` với cổng ngẫu nhiên và PostgreSQL thật chạy đúng chuỗi của lệnh cURL: tạo `THU_HO`, gọi `/callbacks/THU_HO` và `/callbacks/thu_ho`, đọc danh sách và chi tiết giao dịch, kiểm tra từng tiêu chí AC1.1.x, AC1.6.1, AC1.10.1, AC1.14.1.
  - Kiểm thử phụ thuộc gói một chiều bằng đọc lệnh import (không thêm thư viện); kiểm thử khởi động thất bại rõ ràng khi cơ sở dữ liệu không kết nối được; kiểm thử API trả 500 rồi tự phục hồi khi nguồn dữ liệu hỏng rồi lành; kiểm thử không còn ký tự điều khiển trong dòng log.
  - Truy vết: NFR2.4, NFR2.5, NFR6.3, AC1.1.1, AC1.6.1, AC1.10.1, AC1.14.1.
- [ ] **Step 10: Hợp đồng OpenAPI, README và tài liệu**
  - Tạo `docs/api/openapi.yaml` từ các khối C1 đến C4 của `contract-summary.md` (bản nguồn của backend), kèm nhật ký thay đổi; cập nhật `README.md` theo NFR5.1 (điều kiện cần, `docker compose up`, khởi động, cURL tạo dịch vụ, gửi callback, truy vấn và mã hóa `transactionId`, cảnh báo địa chỉ lắng nghe và dữ liệu thật, cách sao lưu volume, giới hạn đã biết của chi tiết giao dịch và JSONB); thay mô tả "chỉ là skeleton".
  - Truy vết: NFR5.1, NFR3.1, NFR3.10, NFR2.6.
- [ ] **Step 11: Chạy kiểm chứng đầy đủ và dọn**
  - Chạy `scripts/verify.ps1` (đúng lệnh kiểm chứng đã duyệt): Spotless, mọi kiểm thử, ngưỡng bao phủ 80% đạt; sửa lỗi cho tới khi xanh, không hạ ngưỡng. Chạy `mvn spotless:apply` khi cần.
  - Kiểm tra thủ công bằng cURL các bước ở README với backend chạy thật (một lần).
  - Truy vết: NFR6.1, NFR6.2, NFR6.4, NFR6.5, NFR6.6, NFR1.1.
- [ ] **Step 12: Tài liệu bàn giao của Code Generation**
  - Viết `code-summary.md`, `source-manifest.json` (mọi đường dẫn nguồn do Unit này tạo hoặc sửa), `traceability.json` (AC, NFRx.y và BRx.y trỏ tới một tệp thật trong kho).
  - Truy vết: toàn bộ.

## Truy vết story đến bước

| Story | Tiêu chí | Bước |
|---|---|---|
| US1.1 | AC1.1.1, AC1.1.2, AC1.1.3, AC1.1.4 | Step 6, Step 7, Step 9 |
| US1.6 | AC1.6.1 đến AC1.6.5 | Step 4, Step 7, Step 9 |
| US1.10 | AC1.10.1 đến AC1.10.5 | Step 6, Step 9 |
| US1.14 | AC1.14.1 | Step 6, Step 8, Step 9 |

## Ngoài phạm vi của kế hoạch này

Kiểm tra khóa API và ghi lần nhận bị từ chối (U2), bộ lọc và danh sách callback (U2), mọi giao diện (U3, U4), script đo 100.000 callback (U2), CI mới (đã có `.github/workflows/ci.yml` trong khung; Build and Test và CI Pipeline xem lại).

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "Viết xong từng lớp có thể kiểm thử, sau đó viết và chạy kiểm thử của lớp đó trước khi sang lớp tiếp theo.",
  "scope": "mvp",
  "test_strategy": "standard",
  "project_type": "greenfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Methodology evidence**: người dùng chọn Q3-A; khớp mặc định của org và brief mục 9.\n- **Ordering**: Viết xong từng lớp có thể kiểm thử, sau đó viết và chạy kiểm thử của lớp đó trước khi sang lớp tiếp theo.\n- Backend: JUnit 5 + Spring Boot Test; kiểm thử tích hợp chạy PostgreSQL thật qua Testcontainers (vì dùng JSONB).\n- Frontend: Vitest + React Testing Library cho các phần có logic (form cấu hình, bộ lọc, polling).\n- Trọng tâm theo brief: mapping, timestamp, xác thực, lịch sử, xử lý đồng thời và API tích hợp; không viết test chỉ lặp lại getter/setter hoặc chi tiết triển khai.\n- Coverage: tối thiểu 80% line coverage cho backend, đo bằng JaCoCo (Q4); frontend không đặt ngưỡng cứng.\n- CI: GitHub Actions build và chạy test backend và frontend khi đẩy code lên GitHub; test phải xanh trước khi gộp vào `main` (Q4)."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Meet an 80% line-coverage floor.",
      "Run the selected tests in CI before merge."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:4bfdbdb64312e7034ae5ed64b00b2e6b8b898211e456ce9dca996fe5e6afdfce",
  "contract_sha256": "sha256:c40748ae7947098622610ee74b89f8cfde88b947373a91ca77f1733dba8f1532"
}
```
