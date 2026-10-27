# Hướng dẫn kiểm thử — U4 `u4-frontend-monitoring`

Mọi lệnh chạy từ thư mục `D:\pet-pj-dlc\tpp-simulator-portal\`. Kiểm thử của đơn vị này không cần backend, PostgreSQL hay Docker: mọi gọi mạng đi qua `fetch` giả.

## Thiết lập framework

- Bộ chạy đã có từ U3, không dựng lại: Vitest 5, môi trường `jsdom`, `include` cả `*.test.ts` và `*.test.tsx`, `testTimeout` 60 giây và `asyncUtilTimeout` 20 giây (jsdom và user-event chạy chậm trên máy này), `maxWorkers: 2` để worker khởi động kịp.
- Thư viện kiểm thử (đã cài ở U3, phiên bản cố định trong `package.json`): `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom`, `axe-core`, `@vitest/coverage-v8`; công cụ chất lượng: `prettier`. **U4 không thêm thư viện nào.** Kiểm tra truy cập dùng `expectNoA11yViolations` (`src/test/a11y.ts`, gọi `axe-core` trực tiếp, tắt riêng `color-contrast` vì jsdom không có bố cục).
- `src/test/setup.ts` (đã khai báo trong `setupFiles`): nạp `@testing-library/jest-dom/vitest`, dọn DOM và gỡ giả lập `fetch` sau mỗi kiểm thử, giả `window.scrollTo`.
- Cần Node đúng với yêu cầu của Vitest 5 và jsdom 30 (máy đang dùng v22.23.2).
- Đóng `npm run dev` trước khi chạy `npm ci` hoặc `scripts/verify.ps1` (máy chủ Vite khóa tệp `.node` của lightningcss và gây lỗi EPERM).

## Cách chạy kiểm thử của đơn vị này

Lệnh chạy được trước chu kỳ kiểm thử đầu tiên (đường chuẩn của Step 2, chỉ gồm kiểm thử đã có từ U3):

```
npx vitest run src/components/ui src/app src/test
```

Lệnh theo từng nhóm (đường dẫn thư mục hoặc tệp cụ thể, không có lệnh toàn dự án trần):

```
npx vitest run src/features/transactions/utils src/features/callbacks/utils
npx vitest run src/features/transactions/api src/features/callbacks/api
npx vitest run src/features/transactions/utils src/features/transactions/hooks src/features/callbacks/utils
npx vitest run src/hooks src/features/transactions/hooks
npx vitest run src/pages/Monitoring src/features/transactions/components src/features/callbacks/components src/components/ui/Pagination
npx vitest run src/pages/TransactionDetail src/features/transactions/components src/features/callbacks/components
npx vitest run src/test src/layouts
```

Bộ đầy đủ của U4 (các thư mục U4 thêm hoặc sửa kiểm thử):

```
npx vitest run src/features/transactions src/features/callbacks src/hooks src/pages/Monitoring src/pages/TransactionDetail src/components/ui/Pagination src/layouts src/test
```

Kiểm thử của U3 nằm cạnh (ví dụ `src/pages/Services`, `src/features/callback-services`, `src/services/http`) phải còn xanh sau khi U4 dọn kiểu cũ; chạy bằng lệnh của `unit-test-instructions.md` U3, và toàn bộ bộ chạy ở Build and Test và `scripts/verify.ps1 -FrontendOnly`. Khi một tệp kiểm thử cụ thể đang được viết, chạy riêng bằng đường dẫn tệp: `npx vitest run <đường dẫn tệp .test.ts hoặc .test.tsx>`.

Đo coverage của đơn vị (không đặt ngưỡng cứng cho frontend, chỉ báo cáo con số):

```
npx vitest run --coverage src/features/transactions src/features/callbacks src/hooks src/pages/Monitoring src/pages/TransactionDetail src/components/ui/Pagination src/layouts src/test
```

Các lệnh chất lượng đi kèm (cũng chạy trong `scripts/verify.ps1 -FrontendOnly`):

```
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## Mục tiêu và phân bổ

- Chiến lược Standard: 5 đến 8 kiểm thử cho mỗi thành phần chính, đơn vị cộng tích hợp ở các biên chính (API với `fetch` giả, trang với router bộ nhớ).
- Phân bổ dự kiến: DTO 8 đến 10; API 8 đến 10; thời gian, bộ lọc, trạng thái URL, đọc đường dẫn, lịch sử 20 đến 26; hook tự cập nhật 9 đến 12; màn hình theo dõi và thành phần của nó 24 đến 32; chi tiết 14 đến 18; truy cập, không lộ khóa, banner 9 đến 12. Tổng khoảng 100 đến 130.
- Coverage: frontend không đặt ngưỡng cứng (team.md); đo bằng lệnh ở trên và báo cáo con số ở Build and Test, không hạ hay tắt bất kỳ ngưỡng hay quy tắc nào đang có.
- Mỗi kiểm thử có khẳng định về hành vi quan sát được; không viết kiểm thử luôn qua hoặc chỉ lặp lại chi tiết triển khai.

## Mock và stub

- Chỉ giả `fetch` (`routeFetch` và `stubFetch` trong `src/test/http.ts`) ở biên mạng; không giả logic nghiệp vụ, hàm ánh xạ DTO, logic bộ lọc hay hook. `routeFetch` làm kiểm thử lỗi khi có lời gọi ngoài bảng, nên bắt được lời gọi thừa (ví dụ `/api/callbacks/stats`).
- Phản hồi giả bám hợp đồng thật trong `tpp-simulator-app/docs/api/openapi.yaml`: `Page` với `items`, `page`, `size`, `totalItems`, `totalPages`; `TransactionSummary`; `CallbackSummary`; `CallbackDetail` (header object, `payloadJson` hoặc `payloadRawText`, `mappingFieldResults`); `ErrorResponse` với mảng `fieldErrors`. Mọi mốc thời gian là ISO 8601 UTC, có một ca với phần thập phân tới micro giây.
- Tự cập nhật: dùng `vi.useFakeTimers()` và `vi.advanceTimersByTimeAsync(5000)`; một yêu cầu "treo" tạo bằng Promise chưa giải quyết để kiểm tra nhịp bị bỏ qua và hủy bằng `AbortSignal` (khẳng định `signal.aborted`). Trả lại đồng hồ thật sau mỗi kiểm thử.
- Dùng `user-event` cho tương tác (gõ, nhấn phím, bấm); kiểm tra bằng truy vấn theo vai trò và nhãn (`getByRole`, `getByLabelText`). Với chuỗi có `[` hoặc `{` dùng `fireEvent.change`. Dựng trang bằng `renderPage` (`src/test/render.tsx`, có đủ provider và `MemoryRouter`; điều hướng ra ngoài hiện đường dẫn ở `data-testid="location"`).
- `sessionStorage` của jsdom được dọn trong `beforeEach` của các kiểm thử về bộ lọc nhớ theo tab.

## Dữ liệu kiểm thử

- Dữ liệu mẫu đặt trong `src/test/fixtures/` (thêm `monitoring.ts`): giao dịch `THU_HO`/`T100`, `T200`, `2026/10/001` (có ký tự đặc biệt); callback thành công, lỗi mapping thiếu transactionId, bị từ chối 401 (`INVALID_API_KEY`), bị từ chối với body không phải JSON (`payloadRawText`, `INVALID_JSON`); lỗi timestamp (`UNPARSEABLE`); dịch vụ đã xóa `DA_XOA` với `deleted: true`. Header mẫu `Authorization: ***`, `X-Request-Id: abc`.
- Khóa giả `test-key-not-real` chỉ dùng để khẳng định nó không xuất hiện trong DOM, URL hay thông báo lỗi. Không dùng dữ liệu thật hay mật khẩu nào trong kiểm thử; không ghi mật khẩu cơ sở dữ liệu vào bất kỳ tệp nào.
- Mỗi kiểm thử tự dựng và tự dọn dữ liệu; không phụ thuộc thứ tự chạy.

## Kiểm chứng thủ công (ghi vào code-summary.md)

- Chạy cùng backend thật (người dùng cho phép chạy backend và PostgreSQL): `docs/samples` script tạo ba dịch vụ mẫu, gửi thử từ màn hình Dịch vụ, rồi đi tay US3.1 đến US3.9 trên trình duyệt: lọc, phân trang, chi tiết, tự cập nhật bật/tắt, tắt backend rồi bật lại để xem banner lỗi và phục hồi.
- Truy cập thủ công theo `accessibility-checklist.md` mục E, F, G: Tab, mũi tên trong `Tabs`, công tắc tự cập nhật, trình đọc màn hình đọc đúng vùng thông báo (không đọc lại mỗi 5 giây), độ tương phản, phóng to 200% và banner dưới 1024px.
- Đo NFR1 (100.000 callback, dưới 1 giây p95) là việc của backend và Build and Test.
- Mục nào chưa chạy được thì ghi rõ "chưa chạy" cùng lý do.
