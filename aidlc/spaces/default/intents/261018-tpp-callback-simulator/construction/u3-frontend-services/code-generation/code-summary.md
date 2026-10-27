# Code Summary — U3 `u3-frontend-services`

Ngôn ngữ: tiếng Việt. Mã nguồn nằm ở `tpp-simulator-portal/` (kho git riêng, **chưa commit**) và `scripts/verify.ps1` ở gốc workspace. Backend `tpp-simulator-app/` không bị sửa.

## 1. Kết quả

- 18/18 bước của kế hoạch đã làm theo phương pháp test-after (hiện thực lớp rồi viết và chạy kiểm thử của lớp đó).
- **109 kiểm thử, 109 xanh** sau khi sửa theo review lần 1 (ban đầu 99; thêm 10, xem mục 8) (Vitest 5, jsdom, Testing Library, axe-core). Không còn 45 kiểm thử cũ của lớp mock (đã xóa cùng lớp mock).
- Kiểm chứng: xem mục 5 (kết quả `scripts/verify.ps1 -FrontendOnly`, `tsc --noEmit`, coverage).

### Số kiểm thử theo lớp

| Lớp (bước) | Tệp kiểm thử | Số kiểm thử |
| --- | --- | --- |
| Khung ứng dụng, kiểm thử khói (2) | `src/app/App.test.tsx` | 1 |
| API client (4) | `src/services/http/client.test.ts` | 10 |
| DTO và ánh xạ (6) | `features/callback-services/utils/service-dto.test.ts` | 10 |
| API dịch vụ (6) | `features/callback-services/api/callback-services.api.test.ts` | 9 |
| Logic biểu mẫu (8) | `features/callback-services/utils/service-form.test.ts` | 17 |
| Hộp thoại xác nhận (10) | `components/ui/ConfirmDialog.test.tsx` | 6 |
| Tabs: phím, roving tabindex, tabpanel (review R-01) | `components/ui/Tabs.test.tsx` | 8 |
| Danh sách, bật/tắt, xóa mềm (10) | `pages/Services/Services.test.tsx` | 11 |
| Biểu mẫu tạo và sửa (10) | `features/callback-services/components/ServiceFormView.test.tsx` | 12 |
| Thử mapping (12) | `features/callback-services/components/form/MappingTester.test.tsx` | 7 |
| Gửi thử (14) | `features/callbacks/components/SelfTestPanel.test.tsx` | 9 |
| Truy cập (axe) và không lộ khóa (16) | `src/test/accessibility.test.tsx` | 9 (6 axe + 3 không lộ khóa) |
| **Tổng** | | **109** |

## 2. Tệp tạo, sửa, xóa (portal, trừ khi ghi khác)

**Tạo**: `.prettierrc`, `.prettierignore`; `src/test/{setup.ts,a11y.ts,http.ts,render.tsx,fixtures/services.ts}`; `src/components/ui/ConfirmDialog.tsx`; `features/callback-services/{api/mapping-tests.api.ts,types/mapping-result.types.ts,utils/{mapping-path.ts,service-dto.ts,service-filter.ts}}`; toàn bộ tệp `*.test.ts(x)` ở mục 1.

**Sửa**: `vite.config.ts` (proxy `/api` và `POST /callbacks`, jsdom, setup, coverage v8, `testTimeout` 30 s), `package.json` (scripts `format`, `format:check`, `test:watch`, `test:coverage`; các thư viện kiểm thử do người dùng cài), `package-lock.json`, `eslint.config.js` (thêm `coverage` vào `ignores`, chỉ để bỏ thư mục sinh ra), `.gitignore` (`coverage`, `*.log`), `.env.example`, `README.md` (viết lại), `src/vite-env.d.ts`, `src/app/config/{env,app.config,index}.ts` (bỏ `VITE_DATA_MODE`, `isMock`, mặc định `tpp-uat.example.com`; gốc URL callback là `window.location.origin`), `src/constants/error-codes.ts` (mã lỗi thật của backend), `src/types/api.ts` (`ErrorResponse`, `FieldError`, `Page<T>` thật; `LegacyPage<T>` cho U4), `src/services/http/{client,error-handler}.ts` (viết lại), `features/callback-services/{api/callback-services.api.ts,types/callback-services.types.ts,utils/{service-form,sample-payload,callback-url}.ts,hooks/{useService,useServiceList}.ts,constants/*.ts,index.ts}`, `components/{ServiceFormView,ServiceTable}.tsx`, `components/form/{AuthSection,GeneralSection,MappingSection,MappingTester,ResponseSection}.tsx`, `features/callbacks/{api/callbacks.api.ts,types/callbacks.types.ts,utils/mask-headers.ts,components/SelfTestPanel.tsx}`, `features/transactions/{api/transactions.api.ts,types/transactions.types.ts}` (chỉ bỏ nhánh mock, xem mục 6), `pages/{Services,ServiceTest,Monitoring}/index.tsx`, `layouts/SimulatorLayout/{SimulatorHeader,SimulatorFooter}.tsx`, `components/ui/{Button.tsx,index.ts}` (`ref` làm prop, xuất `ConfirmDialog`). Prettier ghi đè định dạng toàn bộ `src/` (một lần, `prettier --write .`), nên diff có thể rộng hơn danh sách trên. Workspace gốc: `scripts/verify.ps1` (thêm `-FrontendOnly`; hành vi mặc định giữ nguyên).

**Xóa**: `src/mocks/` (cả thư mục), `features/callback-services/utils/{mapping.ts,mapping.test.ts,timestamp.ts,timestamp.test.ts,jsonpath.ts}`, `features/callback-services/components/ServiceStats.tsx`, `features/callbacks/utils/{receive-callback.ts,receive-callback.test.ts,callback-query.ts}`, `features/transactions/utils/{group-transactions.ts,group-transactions.test.ts}`, và 8 tệp rác ở gốc portal đã liệt kê cho người dùng: `_inspect.ps1`, `_inspect.txt`, `_p1.txt`, `_peers.ps1`, `_peers.txt`, `_probe.txt`, `_versions.ps1`, `_versions.txt`.

## 3. Quyết định chính

1. **Giữ giao diện đã dựng**, chỉ sửa lớp dữ liệu, logic biểu mẫu và chỗ lệch đặc tả (Stitch/refined-mockups).
2. **Xóa hẳn lớp mock** và mapping/timestamp/nhận/gom nhóm chạy trong trình duyệt; mọi gọi dữ liệu đi qua API thật.
3. **Vite proxy**: `/api` mọi phương thức; `/callbacks` chỉ `POST` (hàm `bypass` trả `req.url` cho phương thức khác nên route SPA `callbacks/:callbackId` còn dùng được). Áp dụng cho cả `server` và `preview`. Trình duyệt luôn cùng nguồn vì backend cấm CORS.
4. **DTO tách khỏi mô hình giao diện** (`service-dto.ts`): `CUSTOM` ↔ `PATTERN`, `responseBody` gửi dạng giá trị JSON, thời điểm cắt về mili giây, `apiKeyConfigured` thay giá trị khóa.
5. **Khóa API chỉ ghi**: form gửi `apiKeySecret` khi người dùng gõ; ô trống khi sửa dịch vụ đã có khóa nghĩa là giữ khóa (yêu cầu không có trường `apiKeySecret`); chuyển sang `NONE` bỏ khóa và tên header; ô khóa của trang gửi thử xóa giá trị ngay sau khi gửi.
6. **Xóa mềm** có `ConfirmDialog` mới (`role="alertdialog"`, bẫy tiêu điểm, Esc, trả tiêu điểm; tiêu điểm đầu ở nút Hủy; nếu nút mở không còn trên trang thì về nút "Tạo dịch vụ").
7. **Thử mapping** luôn do server tính (`POST /api/mapping-tests`) theo cấu hình đang nhập; có chữ "Kết quả đã cũ" (D4).
8. **Gửi thử** chỉ liên kết sang `/transactions?tab=callbacks&service=<mã>` (phản hồi không trả mã bản ghi); hiện `X-Simulator-Error` để phân biệt simulator từ chối với response đã cấu hình; giải thích 413.
9. **Lọc danh sách dịch vụ phía client** (tìm theo mã/tên, lọc bật/tắt) vì `GET /api/services` không có tham số lọc; tải một lần rồi lọc.
10. **Lỗi**: `ApiError` mang `status`, `code`, `message`, `fieldErrors[]` (mảng); thông điệp không chứa nội dung yêu cầu; hết thời gian 30 s tự cài đặt (không dùng `AbortSignal.timeout` để chạy ổn trong jsdom và fake timer); hủy từ bên gọi ném lại `AbortError`.
11. **Bỏ khỏi UI**: bốn thẻ thống kê, nút "Nhật ký nhận", đồng hồ giây ở header (D1), huy hiệu "Dữ liệu mô phỏng".

## 4. Độ lệch so với kế hoạch và đã biết

| # | Độ lệch | Lý do |
| --- | --- | --- |
| 1 | **Không có lint a11y** (`eslint-plugin-jsx-a11y`) và **dùng `axe-core` trực tiếp thay `vitest-axe`**. Hàm trợ giúp `expectNoA11yViolations` ở `src/test/a11y.ts`. | Quyết định của người dùng sau khi `eslint-plugin-jsx-a11y@6.10.2` có peer `eslint` tối đa ^9 (portal dùng ESLint 10). Hệ quả: NFR4 chỉ được kiểm tự động bằng axe trong kiểm thử, không còn lỗi lint truy cập lúc viết mã. |
| 2 | Phiên bản `axe-core` thực tế là **4.14.0** (đúng `package.json`). | Người dùng chạy lệnh cài; đã đối chiếu `package.json`. |
| 3 | `color-contrast` của axe bị tắt trong kiểm thử. | jsdom không có bố cục và bảng màu thật; độ tương phản được tính trong `design-system-mapping.md`, cần kiểm tay (mục 7). |
| 4 | Vite proxy mặc định tới `http://127.0.0.1:8080`, không phải `localhost`. | Backend chỉ bind IPv4 loopback; tránh phân giải `::1`. |
| 5 | Kiểm thử DTO/logic form đặt cạnh mã ở `utils/` và `api/`, không ở thư mục `types/` và `form/` như lệnh trong kế hoạch. | Gọn hơn; `unit-test-instructions.md` đã cập nhật lệnh chạy. |
| 6 | Sau khi lưu (cả tạo và sửa) quay về danh sách. | Khớp interaction-spec 2.2.6 và Step 9 của kế hoạch. |
| 7 | Một số kiểm thử đã gộp nhiều khẳng định cùng hành vi; tổng 99 (kế hoạch ước 70 đến 110). | Trong khoảng ước lượng. |
| 8 | Thông báo `X-Callback-Id`, `callbackId` bị bỏ khỏi `SelfTestResult` (thay bằng `simulatorError`). | Backend không phát header này. |
| 9 | Không làm hộp thoại "Bỏ các thay đổi chưa lưu?" (G5) và hỏi xác nhận khi ghi đè JSON mẫu (D14). | Không nằm trong 18 bước của kế hoạch đã duyệt; vẫn còn cảnh báo `beforeunload` cũ. Ghi lại làm khoảng trống. |

## 5. Kiểm chứng

Kết quả `scripts/verify.ps1 -FrontendOnly`, `tsc`, ESLint, Prettier và coverage ở phần "Kết quả cuối" ngay dưới. Mỗi lớp được chạy lẻ trước khi sang lớp sau (`npx vitest run <đường dẫn>`), sau đó chạy cả bộ.

### Kết quả cuối

- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1 -FrontendOnly` (từ `d:\pet-pj-dlc`): **in `VERIFY OK`** (npm ci, lint, format:check, test 99/99, build gồm `tsc --noEmit`). Sau lần chạy này chỉ còn một thay đổi nhỏ ở `src/test/setup.ts` (`asyncUtilTimeout` 20 giây, chỉ nới thời gian chờ) để kiểm thử không rớt khi chạy kèm coverage; sau đó đã chạy lại `prettier --check .` (sạch) và toàn bộ bộ kiểm thử với coverage (99/99 xanh). Chưa chạy lại cả `verify.ps1` sau thay đổi này (mỗi lần mất khoảng 20 phút trên máy này, `npm ci` riêng khoảng 6 đến 8 phút).
- Máy chậm: `npm ci` 6 đến 8 phút, `eslint .` và `tsc` mỗi lệnh 2 đến 3 phút, bộ kiểm thử khoảng 130 đến 165 giây (jsdom tạo 11 lần, chiếm khoảng một nửa thời gian). Vì vậy `testTimeout` đặt 60 giây và `asyncUtilTimeout` 20 giây; không có ngưỡng chất lượng nào bị hạ hay tắt.
- Thông báo `Not implemented: HTMLCanvasElement's getContext()` khi chạy kiểm thử axe là cảnh báo của jsdom (quy tắc `icon-ligature` của axe cần canvas), không làm kiểm thử lỗi.
- **Coverage (v8, toàn bộ `src/`)**: câu lệnh 68,58% (810/1181), nhánh 62,3% (671/1077), hàm 65,51% (266/406), dòng 70,21% (726/1034). Frontend không đặt ngưỡng cứng (team.md). Phần kéo con số xuống chủ yếu là mã màn hình theo dõi và chi tiết callback của U4 (chưa có kiểm thử, thuộc U4) cùng thành phần giao diện cơ bản.
- Lẻ trong lúc phát triển: `npx tsc --noEmit` sạch (bản đầu có 1 lỗi `isMock` ở Monitoring đã sửa), ESLint sạch (đã sửa 2 import thừa trong tệp kiểm thử), `npm run format:check` sạch.

## 6. Bàn giao cho U4 (`u4-frontend-monitoring`)

Màn hình theo dõi **chỉ được giữ biên dịch được**, chưa viết lại và **chưa khớp backend thật**:

- `features/transactions/api/transactions.api.ts` và `features/callbacks/api/callbacks.api.ts` (`list`, `get`, `getStats`) còn là hợp đồng đề xuất cũ: tham số `pageSize`, `statusFacets`, đường dẫn chi tiết `/api/transactions/{svc}/{txn}`, `/api/callbacks/stats` (backend không có), `X-Callback-Id`. Phản hồi thật dùng `page`/`size`/`totalItems`/`totalPages`, `GET /api/transactions/detail?serviceCode&transactionId`, `recordId` số, `outcome`/`rejectionReason`.
- Kiểu cũ còn dùng: `LegacyPage<T>` (`types/api.ts`, đã đánh dấu `@deprecated`), `features/callback-services/types/mapping-result.types.ts` (`MappingResult`, `MappingOverall`, `MAPPING_OVERALL_LABEL`, mô hình `PARTIAL/FAILED` thay vì `outcome`), `CallbackRecord`, `StoredHeader`, `ConfigSnapshot` trong `callbacks.types.ts`. `Page<T>` mới đúng hợp đồng đã có sẵn.
- `useAsyncData` chưa có `AbortController`, chưa bỏ qua nhịp khi đang tải (AC3.9.3). `useMonitoringQuery` dùng chip mapping `SUCCESS/PARTIAL/FAILED`, `pageSize` 10, trạng thái `MISSING_STATUS_FILTER` (U4: ô Status dạng chữ, "Kết quả xử lý" + "Lý do", cỡ trang 20/50/100).
- `callbackServicesApi.list({ includeDeleted: true })` đã hỗ trợ cho bộ lọc dịch vụ có nhãn "(đã xóa)"; `get` coi dịch vụ đã xóa là 404.
- Hạ tầng dùng lại được: `ApiError` (có `fieldErrors[]`, `isNetwork`, `isTimeout`), `http` client có hết thời gian và `signal`, `src/test/{http,render,a11y}.ts`, `ConfirmDialog` (U4 tự dựng ngăn trượt nếu cần).
- Trang chi tiết callback giữ là **trang riêng** theo quyết định đã duyệt (lệch AC3.4.1, AC3.4.4); route `callbacks/:callbackId` vẫn phục vụ qua SPA nhờ proxy chỉ chuyển `POST`.
- `format:check` hiện bao phủ cả mã U4: mã U4 đã được Prettier định dạng.

## 7. Mục kiểm chứng chưa chạy hoặc chưa đo

- **Chạy tay cùng backend thật** (script `docs/samples`, đi tay US2.1 đến US2.10, AC2.2.4 và AC2.3.2 là hành vi backend): **chưa chạy**, cần người dùng cho phép chạy backend và PostgreSQL (máy không có Docker). Vì vậy AC2.2.4 và AC2.3.2 ở `traceability.json` là `Deferred` (target `build-and-test`), không còn `OK` trỏ vào mã Java.
- **Thủ công theo `accessibility-checklist.md`**: Tab, skip link thật trong trình duyệt, đọc bằng trình đọc màn hình, độ tương phản màu, phóng to 200%: **chưa chạy**. Tự động chỉ có axe-core trên jsdom (không `color-contrast`). `Tabs` đã có phím mũi tên, roving tabindex, `aria-controls` và `tabpanel` (mục 8, R-01) và có kiểm thử phím tự động; chưa có banner dưới 1024px (D15), chưa có `aria-live` theo D12 (khoảng trống đã biết từ báo cáo quét, thuộc U3/U4 tùy màn hình).
- Hiệu năng NFR1/NFR2 của backend: ngoài phạm vi U3.
- `scripts/verify.ps1` bản đầy đủ (kèm backend ~20 phút): conductor chạy sau.
- Git: **không commit/push**; kho portal vẫn gồm một commit cũ và mã chưa theo dõi.

## 8. Sửa theo review lần 1

Tất cả sửa ở portal; không commit, không động tới `tpp-simulator-app`. Số kiểm thử: **99 → 109** (thêm 10: `Tabs.test.tsx` 8, `SelfTestPanel.test.tsx` 2; các khẳng định mới ở `Services.test.tsx` và ca `uuuu` ở `service-form.test.ts` nằm trong ca có sẵn).

| R-ID | Đã sửa thế nào | Tệp |
| --- | --- | --- |
| R-01 (Major) | `Tabs` theo mẫu ARIA: roving tabindex, mũi tên trái/phải xoay vòng, Home/End, kích hoạt tự động, `id` + `aria-controls` khi có `idBase`; thêm `TabPanel` (`role="tabpanel"`, `aria-labelledby`). Dùng ở `SelfTestPanel` (Request Body/Headers) và cả màn hình theo dõi (bọc nội dung thẻ trong `TabPanel`; `idBase` là tùy chọn nên nơi dùng khác không vỡ). Kiểm thử phím mới cho `Tabs` và `SelfTestPanel`. | `components/ui/{Tabs.tsx,Tabs.test.tsx,index.ts}`, `features/callbacks/components/{SelfTestPanel.tsx,SelfTestPanel.test.tsx}`, `pages/Monitoring/index.tsx` |
| R-02 (Major) | `useServiceList({ onDeleted })`: sau khi xóa thành công, hộp thoại đã đóng và danh sách tải lại xong thì gọi `onDeleted`; trang Dịch vụ đưa tiêu điểm về nút "Tạo dịch vụ". Hủy vẫn trả tiêu điểm về nút Xóa đã mở. Kiểm thử khẳng định `activeElement` ở cả hai ca (xóa thành công: nút "Tạo dịch vụ", không phải `body`; hủy: nút Xóa). | `features/callback-services/hooks/useServiceList.ts`, `pages/Services/{index.tsx,Services.test.tsx}` |
| R-03 (Major) | `maxWorkers: 2` trong `vite.config.ts`. Đã đọc mã Vitest 5: thời gian chờ khởi động worker cố định 60 giây (không cấu hình được) nên chỉ giới hạn song song được. Không hạ ngưỡng, không bỏ kiểm thử. Cấu hình mặc định (`npm test`, không cờ phụ): 12/12 tệp, 109/109 xanh ở lần chạy của người dùng (93 giây) và lần chạy của tôi (197 giây, exit 0). | `vite.config.ts` |
| R-04 (Minor) | `patternHasRequiredFields` nhận cả `y` và `u` cho năm (backend quyết định cuối). Ca kiểm thử mẫu `uuuu-MM-dd HH:mm:ss` nằm trong ca mẫu thời gian có sẵn. | `features/callback-services/utils/{service-form.ts,service-form.test.ts}` |
| R-05 (Minor) | `HeadersEditor` nhận `apiKeyHeader` của dịch vụ và truyền vào `isSensitiveHeader`, thống nhất với bước xóa giá trị sau khi gửi. Kiểm thử tên tùy biến `X-Partner` (che; bấm "Hiện giá trị" thì hiện; `Content-Type` không che). | `features/callbacks/components/{HeadersEditor.tsx,SelfTestPanel.tsx,SelfTestPanel.test.tsx}` |
| R-06 (Minor) | AC2.4.2 và AC2.8.4 trỏ tới `ServiceFormView.test.tsx` (ca ô khóa "Đã cấu hình khóa" không chứa giá trị khóa; ca 409 trùng mã "kể cả dịch vụ đã xóa"). AC2.2.4 và AC2.3.2 (hành vi backend, chưa chạy tay cùng backend) đổi sang `Deferred` với target `build-and-test`, theo cách U1 đã dùng. | `traceability.json` |
| R-07 (Minor) | **Không sửa `source-manifest.json`** theo brief (engine từ chối khóa `repo` và đường dẫn có tiền tố `tpp-simulator-portal/`). Quy ước: đường dẫn trong manifest tương đối với kho portal, riêng `scripts/verify.ps1` ở gốc workspace, như U1 và U2. Tệp và thư mục đã **xóa** (đã nêu ở mục 2): `src/mocks/` (cả thư mục), 4 tệp kiểm thử của lớp mock (`mapping.test.ts`, `timestamp.test.ts`, `receive-callback.test.ts`, `group-transactions.test.ts`) và 8 tệp rác `_inspect.ps1`, `_inspect.txt`, `_p1.txt`, `_peers.ps1`, `_peers.txt`, `_probe.txt`, `_versions.ps1`, `_versions.txt`. Manifest vẫn liệt kê các tệp `_*` ở `writes` dù chúng không còn trên đĩa. | (không sửa) |
| R-08 | `_gs.txt` ở gốc workspace đã được conductor xóa. | (không làm) |

### Độ lệch và ghi chú của lượt sửa này

- `Tabs` nhận `idBase` tùy chọn; không truyền thì không có `aria-controls` (tránh trỏ tới id không tồn tại). Màn hình theo dõi (thuộc U4) được sửa tối thiểu để dùng `TabPanel`; U4 cần giữ cặp `idBase`/`TabPanel` khi viết lại.
- Lần chạy đầu của lượt này có `npx tsc` bị hiểu nhầm là gói `tsc@2.0.4`; kết quả đáng tin là `npm run typecheck` (exit 0). Có hai coder chạy trùng brief; bản trùng đã bị conductor dừng, các tệp đã được đọc lại cho nhất quán.
- Kiểm chứng của lượt sửa: `npm run typecheck` exit 0, `npm run lint` exit 0, `npm run format:check` sạch, `npm test` 109/109 (xem R-03). `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1 -FrontendOnly` (từ `d:\pet-pj-dlc`, sau tất cả sửa đổi): **`VERIFY OK`, exit 0** (npm ci, lint, format:check, test 109/109 trong 258 giây, build gồm `tsc --noEmit`). Bộ test mặc định đã xanh ba lần liên tiếp không cờ phụ (người dùng, tôi, và trong verify).
