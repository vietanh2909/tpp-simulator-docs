# Hướng dẫn kiểm thử — U3 `u3-frontend-services`

Mọi lệnh chạy từ thư mục `D:\pet-pj-dlc\tpp-simulator-portal\`. Kiểm thử của đơn vị này không cần backend, PostgreSQL hay Docker: mọi gọi mạng đi qua `fetch` giả.

## Thiết lập framework

- Vitest 5 (đã có), môi trường `jsdom`, `include` cả `*.test.ts` và `*.test.tsx`, `testTimeout` 30 giây (render và user-event trong jsdom chạy chậm trên máy này).
- Thư viện kiểm thử (người dùng đã cài, phiên bản cố định trong `package.json`): `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom`, `axe-core`, `@vitest/coverage-v8`; công cụ chất lượng: `prettier`. **Không có** lint a11y (`eslint-plugin-jsx-a11y`) và **không dùng** `vitest-axe`: kiểm tra axe gọi `axe-core` trực tiếp qua `expectNoA11yViolations` (`src/test/a11y.ts`, tắt riêng `color-contrast` vì jsdom không có bố cục).
- `src/test/setup.ts` (khai báo trong `setupFiles`): nạp `@testing-library/jest-dom/vitest`, dọn DOM và gỡ giả lập `fetch` sau mỗi kiểm thử, giả `window.scrollTo`.
- Cần Node đúng với yêu cầu của Vitest 5 và jsdom 30 (`22.22.2`+ trong nhánh 22); máy đang dùng v22.23.2.
- Đóng `npm run dev` trước khi chạy `npm ci` hoặc `scripts/verify.ps1` (máy chủ Vite khóa tệp `.node` của lightningcss và gây lỗi EPERM).

## Cách chạy kiểm thử của đơn vị này

Lệnh chạy được trước chu kỳ kiểm thử đầu tiên (kiểm thử khói của Step 2):

```
npx vitest run src/app
```

Lệnh theo từng nhóm (đường dẫn thư mục hoặc tệp cụ thể, không có lệnh toàn dự án trần):

```
npx vitest run src/services/http
npx vitest run src/features/callback-services/utils src/features/callback-services/api
npx vitest run src/features/callback-services/components src/components/ui src/pages/Services
npx vitest run src/features/callbacks/components
npx vitest run src/test
npx vitest run src/features/callback-services src/features/callbacks src/services/http src/components src/pages/Services src/test src/app
```

Dòng cuối là bộ đầy đủ của U3. Phần theo dõi giao dịch (U4) không có kiểm thử trong U3. Khi một tệp kiểm thử cụ thể đang được viết, chạy riêng bằng đường dẫn tệp: `npx vitest run <đường dẫn tệp .test.ts hoặc .test.tsx>`.

Đo coverage của đơn vị (không đặt ngưỡng cứng cho frontend, chỉ báo cáo con số):

```
npx vitest run --coverage src/features/callback-services src/features/callbacks src/services/http src/components src/pages/Services src/test src/app
```

Các lệnh chất lượng đi kèm (cũng chạy trong `scripts/verify.ps1 -FrontendOnly`):

```
npm run lint
npm run format:check
npm run build
```

## Mục tiêu và phân bổ

- Chiến lược Standard: 5 đến 8 kiểm thử cho mỗi thành phần chính, đơn vị cộng tích hợp ở các biên chính.
- Phân bổ thực tế: API client 10; DTO và ánh xạ 10; API dịch vụ 9; logic biểu mẫu 17; danh sách, biểu mẫu, hộp thoại xác nhận 29; thử mapping 7; gửi thử 7; truy cập và không lộ khóa 9; kiểm thử khói 1.
- Coverage: frontend không đặt ngưỡng cứng (team.md); đo bằng lệnh ở trên ở Build and Test và báo cáo con số, không hạ hay tắt bất kỳ ngưỡng nào đang có.
- Mỗi kiểm thử có khẳng định về hành vi quan sát được; không viết kiểm thử luôn qua hoặc chỉ lặp lại chi tiết triển khai.

## Mock và stub

- Chỉ giả `fetch` (`vi.stubGlobal` qua `stubFetch`/`routeFetch` trong `src/test/http.ts`) ở biên mạng; không giả logic nghiệp vụ, hàm ánh xạ hay logic biểu mẫu.
- Phản hồi giả bám hợp đồng thật trong `tpp-simulator-app/docs/api/openapi.yaml` (mảng `fieldErrors`, mã lỗi thật, tên trường backend).
- Dùng `user-event` cho tương tác (gõ, nhấn phím, bấm); kiểm tra bằng truy vấn theo vai trò và nhãn (`getByRole`, `getByLabelText`). Với chuỗi có `[` hoặc `{` dùng `fireEvent.change` (user-event hiểu chúng là mã phím).
- Đồng hồ: dùng `vi.useFakeTimers()` chỉ khi một thành phần phụ thuộc thời gian (hết thời gian của API client).

## Dữ liệu kiểm thử

- Dữ liệu mẫu đặt trong `src/test/fixtures/services.ts` (dịch vụ `THU_HO` không khóa, `CHI_HO` có khóa với `apiKeyConfigured: true`, `BIEN_DONG` đã tắt, `DA_XOA` đã xóa mềm); khóa giả là `test-key-not-real` và các kiểm thử khẳng định chuỗi này không xuất hiện trong DOM hay thông báo lỗi.
- Không dùng dữ liệu thật hay mật khẩu nào trong kiểm thử; không ghi mật khẩu cơ sở dữ liệu vào bất kỳ tệp nào.
- Mỗi kiểm thử tự dựng và tự dọn dữ liệu; không phụ thuộc thứ tự chạy.

## Kiểm chứng thủ công (ghi vào code-summary.md)

- Chạy cùng backend thật (người dùng cho phép): `docs/samples` script tạo ba dịch vụ mẫu, đi tay US2.1 đến US2.10 trên trình duyệt, kiểm Tab, mũi tên trong `Tabs`, Esc ở hộp thoại, skip link, độ tương phản màu.
- Mục nào chưa chạy được thì ghi rõ "chưa chạy" cùng lý do.
