## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-19
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/domain-design/decisions.md > ADR-004 (và components.md > ServiceCatalog.behaviour) | Giả định 3 mà bạn đã chấp nhận ghi "mỗi lần sửa dịch vụ tạo một phiên bản mới bất biến". ADR-004 và components.md lại chỉ tạo phiên bản khi phần cấu hình xử lý callback đổi, và đưa đúng phương án "tạo phiên bản ở mọi lần lưu" vào mục Alternatives Rejected. Đây là lệch khỏi điều bạn đã đồng ý, nhưng ADR không nêu rõ là lệch. Ảnh hưởng thấy được: số "phiên bản N" ở chi tiết callback sẽ không tăng khi chỉ sửa tên, mô tả, xác thực hay bật/tắt. | Bạn quyết định ở cổng duyệt: giữ cách "chỉ khi cấu hình xử lý đổi" (phù hợp FR1.13/US1.13 hơn) hoặc quay về "mọi lần lưu". Nếu giữ, ghi rõ trong ADR-004 rằng đây là điều chỉnh so với giả định 3 và nêu lý do. | New |
| R-02 | Major | aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/domain-design/components.md > CallbackLedger.depends_on và entity Callback.references | Callback và Transaction tham chiếu Service và ServiceConfigVersion của ServiceCatalog (cũng là hai thực thể để hiển thị "phiên bản N" và nhãn "đã xóa" ở ngăn chi tiết), nhưng CallbackLedger khai `depends_on: []`, còn Monitoring chỉ lấy từ ServiceCatalog "danh sách dịch vụ". Không thành phần nào được giao việc trả số phiên bản và cấu hình đã dùng cho chi tiết một lần nhận. Người cài đặt sẽ phải tự quyết: nối bảng chéo thành phần (kết hợp dữ liệu ngầm) hay Monitoring gọi thêm ServiceCatalog. | Chọn một cách và ghi vào components.md: (a) thêm cạnh phụ thuộc dữ liệu CallbackLedger → ServiceCatalog (vẫn không vòng, đối xứng với dependents), hoặc (b) khai Monitoring lấy ServiceConfigVersion từ ServiceCatalog theo `configVersionId`, và bổ sung việc đó vào dependents/responsibilities của ServiceCatalog. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/domain-design/decisions.md > ADR-002 (Consequences) | Mục tiêu NFR1 (dưới 1 giây p95 với 100.000 callback) được lập luận qua bảng Transaction tổng hợp, nhưng danh sách callback (tab "Tất cả callback") vẫn quét bảng Callback với bộ lọc "chứa chuỗi" cho transactionId và status. Lọc chứa chuỗi không dùng được chỉ mục thường; ADR không nhắc rủi ro này. Mục tiêu vẫn khả thi ở quy mô 100.000 dòng, nhưng cần nêu để không bị bỏ sót. | Thêm một dòng hệ quả (−) vào ADR-002 hoặc vào "Câu hỏi để lại": chiến lược chỉ mục cho lọc chứa chuỗi và lọc theo kết quả xử lý thuộc NFR Design. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/domain-design/components.md > CallbackIngestion.behaviour và mục Assumptions & Open Questions | Phần behaviour đã nêu cố định "Body lớn hơn 1 MB thì 413 và không ghi" và "Lỗi ghi ... thì trả 500", trong khi mục Open Questions nói vị trí kiểm tra 413 và 1.000.000 hay 1.048.576 byte còn để Contract Design, và việc trả mã gốc hay 500 khi không ghi được request bị từ chối để Functional Design. Hai chỗ nói hơi khác nhau về mức đã chốt; behaviour cũng đi sâu vào thứ tự mã HTTP, vượt mức quyền sở hữu và hình dạng. | Rút gọn behaviour thành những gì đã chốt ở yêu cầu, hoặc thêm chú thích "chi tiết thuộc Contract Design" cạnh hai điểm trên để tránh bị hiểu là đã quyết. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/domain-design/traceability.json > US1.12, US2.10 | US1.12 chỉ trỏ CallbackIngestion, Callback, nhưng header API key cần che do ServiceCatalog cấu hình (tên header). US2.10 (gửi thử) cần chọn dịch vụ và hiển thị URL callback nên cũng dùng ServiceCatalog, hiện không có trong target. Tất cả USx.y của stories.md (44 mã) đều có mặt, các target OK đều là thành phần hoặc thực thể có thật, các N/A đều có lý do. | Bổ sung ServiceCatalog (và Service) vào target của US1.12 và US2.10. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Kiểm tra thủ công catalogue yaml | PASS | Tên thành phần duy nhất; mọi thành phần được nêu đều được khai báo; không có tự phụ thuộc; depends_on và dependents đối xứng ở cả 11 cạnh; đồ thị không có vòng (ServiceCatalog → MappingEngine; CallbackIngestion → ServiceCatalog, MappingEngine, CallbackLedger; ServiceConsole và Monitoring chỉ ở lá); mỗi thực thể có đúng một chủ và có định danh; mọi `references.entity` được khai báo dưới đúng `owned_by`; hạ tầng (PostgreSQL, trình duyệt) chỉ nằm ở external_dependencies. |
| Phủ yêu cầu | PASS | FR1–FR11 và NFR1, NFR2, NFR3, NFR7 có chủ rõ ràng; FR12 là N/A hợp lý (tài sản mẫu). ADR-001 đến ADR-008 khớp components.md và Q1–Q3 = A; chỉ lệch ở giả định 3 (xem phát hiện đầu). |

### Summary

Catalogue đúng cấu trúc, không vòng, đối xứng, và các ADR phần lớn khớp câu trả lời Q1–Q3 và các giả định đã chấp nhận; NFR1/NFR2/NFR3 khả thi với thiết kế Transaction riêng và che header ở CallbackIngestion. Hai điểm bạn nên cân nhắc trước khi duyệt: ADR-004 lệch khỏi giả định 3 mà bạn đã chấp nhận, và đường lấy "phiên bản N"/dịch vụ cho chi tiết callback chưa có chủ rõ nên tạo phụ thuộc dữ liệu ngầm của CallbackLedger.
