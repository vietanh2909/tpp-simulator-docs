# NFR Requirements — U2 `u2-backend-core` — Câu hỏi làm rõ

> Phạm vi: các yêu cầu phi chức năng cho phần backend lõi (U2): xác thực khóa API, ghi lần nhận bị từ chối, bộ lọc và danh sách callback, thử mapping, tài sản mẫu và công cụ nạp 100.000 callback. Dữ liệu vào: thiết kế chức năng của U2 (`functional-spec.md`, `rules.md`, `entities.md`), kết quả NFR Requirements và NFR Design của U1, các yêu cầu NFR1 đến NFR7 trong `requirements.md` và `docs/brief.md`.
>
> Đã chốt, không hỏi lại:
> - Công nghệ: Java 21, Spring Boot 3.5.16 (giữ, rủi ro NFR3.9), Maven, PostgreSQL JSONB, JdbcClient, Flyway, một backend một database, chỉ chạy local và chỉ lắng nghe `127.0.0.1`, API quản lý không xác thực (U1 Q1 B; BR6.1).
> - Dữ liệu và an toàn: khóa API lưu nguyên văn (U1 Q2 C, NFR3.5); ghi Callback và Transaction bằng một câu `INSERT ... ON CONFLICT` trong một giao dịch; không đặt trần kích thước phản hồi chi tiết giao dịch (U1 NFR Design Q2 B); NFR1.1 (p95 dưới 200 ms khi nhận một callback đường vui) và NFR1.3 được đo tay trong Build and Test, không chạy trong CI.
> - Chất lượng: tối thiểu 80% line coverage backend đo bằng JaCoCo, kiểm thử tích hợp trên PostgreSQL thật (Testcontainers ở CI; máy này không dùng được Docker nên chạy trên PostgreSQL cài sẵn qua biến `TPP_TEST_DB_*`, database `tpp_simulator_test`), Spotless với google-java-format (`team.md`).
> - Từ Functional Design của U2: so sánh khóa API bằng phép so sánh thời gian không đổi (BR14.4); không bao giờ ghi khóa, giá trị header hay body vào nhật ký (BR14.10, BR16.2); khi không ghi được lần nhận bị từ chối thì trả mã gốc kèm `X-Simulator-Record-Failed: true` (Q1 A); thử mapping dùng `sampleJson` tối đa 1.048.576 byte (BR18.3); công cụ nạp là lệnh riêng đi qua logic nhận callback, ghi vào database riêng, tự tạo database đích nếu chưa có, từ chối khi đích trùng database thật, tham số `--callbacks`, `--seed`, `--days`, `--services`, `--append` (Q8 A; BR22.x); hai kịch bản 50 callback đồng thời (BR20.1, BR20.2); ngữ nghĩa lọc và sắp xếp cố định, không đánh đổi để tăng tốc (BR19.7).
>
> Để NFR Design, không hỏi ở đây: cách tuần tự hóa sửa dịch vụ, chọn chỉ mục cụ thể, cách đọc nhanh danh sách, lối vào nội bộ của công cụ nạp.
>
> Năm câu dưới đây là những chỗ còn mở và cần bạn quyết; phần còn lại tôi đề xuất sẵn ở "Giả định đề xuất". Lưu ý: dòng NFR1.3 của U1 viết "nạp thẳng bằng câu lệnh sinh hàng loạt" đã bị thay bởi Functional Design của U2 Q8 A (công cụ nạp đi qua logic nhận callback); Q1 dưới đây chỉ chốt phần đo.

## Q1. Đo mục tiêu NFR1 (p95 dưới 1 giây với 100.000 callback) cụ thể ra sao?

Lý do hỏi: công cụ nạp và nơi lưu kết quả đo đã chốt (nạp xong in số bản ghi; kết quả ghi vào báo cáo Build and Test), nhưng chưa chốt thứ được bấm giờ, số kịch bản lọc, số lần gọi, số lần chạy và cách phát biểu ngưỡng đạt. Nếu chỉ đo một kịch bản đơn giản thì bỏ sót chỗ rủi ro nhất: lọc theo chuỗi chứa và trang sâu (OFFSET lớn) trên 100.000 dòng.

A. (Recommended) Một script PowerShell chạy tay `scripts/measure-list-latency.ps1`, gọi backend thật (đã khởi động trỏ vào database nạp) sau khi công cụ nạp xong và đã chạy `ANALYZE`. Bấm giờ phía client toàn bộ một lần gọi HTTP trên loopback. Khoảng 10 kịch bản lọc (5 cho `/api/transactions` và 5 cho `/api/callbacks`): không lọc trang 1; trang giữa với `size=100`; `serviceCode` cộng khoảng thời gian một ngày; `transactionId` chứa chuỗi; `status` hoặc `outcome`/`rejectionReason` kết hợp. Mỗi kịch bản bỏ 20 lần khởi động nóng rồi đo 200 lần tuần tự; thêm 200 lần gọi `GET /api/callbacks/{recordId}`. Đạt khi p95 dưới 1000 ms ở MỌI kịch bản, trong hai lần chạy liên tiếp. Báo cáo in p50, p95, p99, max cùng cấu hình máy (CPU, RAM, hệ điều hành, phiên bản PostgreSQL) vào báo cáo Build and Test. Không chạy trong CI
B. Như A nhưng viết bằng một kiểm thử Java (`mvn -Pperf verify`, bỏ qua theo mặc định) có khẳng định p95, thay cho script PowerShell. Lặp lại được và dùng cùng hạ tầng kiểm thử, nhưng thêm một profile Maven và mã đo, làm chậm khâu build nếu bật nhầm
C. Chỉ đo một kịch bản (không lọc, trang 1, `size=20`) 200 lần và lấy p95. Nhanh nhất, nhưng không phát hiện chậm ở lọc chuỗi chứa và trang sâu, là hai chỗ dễ vượt 1 giây
X. Other (please specify)

[Answer]: C

## Q2. Kiểm chứng NFR2 (50 callback đồng thời) bằng cách nào và lặp mấy lần?

Lý do hỏi: hai kịch bản đã chốt ở BR20.1 (50 callback cùng `transactionId`) và BR20.2 (50 `transactionId` khác nhau), nhưng chưa nói công cụ, số lần lặp và tiêu chí đạt. Lỗi đua (race) thường chỉ xuất hiện đôi lần trong nhiều lần chạy, nên một lần chạy xanh chưa chứng minh được. Cần chú ý hồ bơi kết nối (tối đa 10, chờ 5 giây theo thiết kế của U1): 50 request đồng thời phải xếp hàng chờ kết nối mà không request nào hết thời gian.

A. (Recommended) Kiểm thử tích hợp tự động nằm trong bộ kiểm thử thường (chạy trong `mvn verify`, `scripts/verify.ps1` và CI), gọi HTTP thật trên cổng ngẫu nhiên, 50 luồng cùng xuất phát bằng một chốt đồng bộ. Cả hai kịch bản, mỗi kịch bản 10 vòng, mỗi vòng dùng mã giao dịch mới. Đạt khi MỌI vòng: 50/50 request nhận response đã cấu hình (không 500, kể cả không hết thời gian chờ kết nối), đúng 50 Callback, đúng số Transaction, `callbackCount` đúng, `latest*` là của cặp (`receivedAt`, `recordId`) lớn nhất. Một vòng sai là thất bại. Bắt được lỗi đua hiếm và chạy ngay ở CI
B. Mỗi kịch bản một vòng trong bộ kiểm thử thường, cộng một script chạy tay lặp 100 vòng trước khi hoàn tất (ghi vào báo cáo Build and Test). Bộ kiểm thử thường nhanh hơn, nhưng lỗi đua hiếm chỉ được bắt khi nhớ chạy script
C. Chỉ một script chạy tay (PowerShell, nhiều tiến trình cURL song song), không có kiểm thử tự động. Ít mã nhất, nhưng không bắt được hồi quy ở các lần đổi sau
X. Other (please specify)

[Answer]: C

## Q3. Bộ lọc "chứa chuỗi" trên `transactionId` và `status` có được dùng tiện ích mở rộng `pg_trgm` của PostgreSQL không?

Lý do hỏi: Functional Design giữ ngữ nghĩa "chứa chuỗi, không phân biệt hoa thường" (BR19.1, BR19.2) và không cho đánh đổi để tăng tốc (BR19.7). Chỉ mục thường (btree) không giúp được `%chuỗi%`; chỉ mục tăng tốc đúng loại này cần `pg_trgm`. Đây là yêu cầu về môi trường (cần `CREATE EXTENSION` trong bản chuyển Flyway) nên phải chốt ở NFR Requirements, trước khi NFR Design chọn chỉ mục. Với 100.000 callback (khoảng 25.000 giao dịch), quét tuần tự trên các cột ngắn thường đã đủ nhanh, nhưng chưa đo nên chưa chắc.

A. (Recommended) Mặc định không dùng tiện ích mở rộng. NFR Design dùng chỉ mục thường và để phép đo ở Q1 quyết định. Chỉ khi các kịch bản lọc chuỗi chứa không đạt p95 dưới 1000 ms thì mới được thêm `pg_trgm` (bản chuyển `V2` trở đi, ghi vào `tech-stack-decisions.md` và README như một điều kiện môi trường mới). Tránh thêm điều kiện môi trường khi chưa có số đo
B. Cho phép dùng `pg_trgm` ngay từ đầu: tạo tiện ích và chỉ mục GIN trên các cột lọc chuỗi trong bản chuyển Flyway. Nhanh chắc chắn, nhưng thêm điều kiện môi trường (tiện ích có sẵn trong ảnh `postgres:16` và PostgreSQL cài thường; từ PostgreSQL 13 là tiện ích "trusted" nên chủ database tạo được không cần siêu quản trị) và tăng chi phí ghi
C. Cấm tuyệt đối tiện ích mở rộng. Nếu bộ lọc chuỗi chứa không đạt NFR1 thì ghi thành rủi ro đã biết thay vì thêm tiện ích. Môi trường đơn giản nhất, nhưng có thể phải chấp nhận không đạt NFR1 ở đúng bộ lọc này
X. Other (please specify)

[Answer]: A

## Q4. Có giới hạn tốc độ hoặc tổng dung lượng lưu cho các request nhận callback ở MVP không?

Lý do hỏi: mọi lần nhận, kể cả bị từ chối, đều được lưu và không bao giờ xóa (FR3.8, NFR2.6). Một bên gửi lặp vô hạn tới dịch vụ đang tắt hoặc sai khóa sẽ sinh bản ghi liên tục, mỗi bản ghi có thể mang body tới 1.048.576 byte. Công cụ chỉ chạy local, nhưng dữ liệu không tự dọn nên đĩa có thể đầy mà không ai biết.

A. (Recommended) Không giới hạn tốc độ và không giới hạn tổng số bản ghi ở MVP. README ghi rõ rủi ro (một vòng lặp gửi sai khóa có thể làm đầy đĩa) kèm cách dọn (xóa database hoặc đặt lại volume Docker). Hợp với FR3.9 (lưu mọi lần nhận), NFR2 (50 callback đồng thời không mất bản ghi) và công cụ local chỉ lắng nghe `127.0.0.1`
B. Cảnh báo mềm: khi tổng số Callback vượt ngưỡng cấu hình (mặc định 1.000.000), ghi một dòng WARN lúc khởi động và mỗi 10.000 callback tiếp theo; vẫn nhận bình thường. Cho người dùng dấu hiệu sớm, nhưng thêm một truy vấn đếm và một tham số cấu hình
C. Giới hạn cứng tốc độ mỗi dịch vụ (ví dụ 100 request/giây), vượt thì trả 429. Chặn được vòng lặp, nhưng thêm mã lỗi mới vào hợp đồng, có thể làm rớt callback hợp lệ trong kịch bản 50 đồng thời, và làm công cụ từ chối thêm request mà bên gửi mong được ghi nhận
X. Other (please specify)

[Answer]: A

## Q5. Công cụ nạp 100.000 callback được phép ghi vào những database nào?

Lý do hỏi: Functional Design đã chốt công cụ từ chối khi đích trùng database thật. Còn mở là cách xác định "database thật" cho chắc. Máy bạn có `tpp_simulator` (dev) và `tpp_simulator_test` (kiểm thử, bị kiểm thử xóa sạch), và bạn có thể tạo thêm; gõ nhầm tên một database khác (ví dụ database của dự án khác trong cùng PostgreSQL) sẽ làm công cụ tạo 100.000 dòng vào đó. Phần ai tạo database: công cụ tự thử tạo, nếu role không có quyền `CREATEDB` thì in đúng câu lệnh để bạn tự chạy.

A. (Recommended) Chỉ cho phép tên database kết thúc bằng `_load` (mặc định `tpp_simulator_load`); mọi tên khác bị từ chối ngay, kể cả `tpp_simulator`, `tpp_simulator_test` và database lạ không trùng database thật. Công cụ thử `CREATE DATABASE` khi chưa có; không tạo được thì dừng và in câu lệnh cho bạn tự chạy. Chặn gõ nhầm từ gốc, giống quy ước "tên database kiểm thử phải chứa `test`" đang dùng. Hệ quả: muốn đích khác phải đặt tên theo quy ước
B. Chỉ từ chối khi tên trùng database ứng dụng đang cấu hình hoặc database kiểm thử (danh sách đen); mọi tên khác được ghi. Linh hoạt hơn, nhưng gõ nhầm sang một database khác vẫn tạo dữ liệu vào đó
C. Như B và thêm cờ xác nhận `--yes` khi database đích đã có dịch vụ không bắt đầu bằng `LOAD_`. Bảo vệ thêm một lớp, nhưng thêm bước phải nhớ và phải đọc dữ liệu đích trước khi ghi
X. Other (please specify)

[Answer]: A

## Giả định đề xuất

Các điểm dưới đây tôi tự quyết theo mặc định hợp lý; bạn chỉ đọc và sửa nếu không đồng ý. Mỗi mục có thẻ nguồn: `[desc]` mô tả ban đầu và brief, `[scope]` phạm vi đã duyệt của workflow, `[assumption]` suy luận của tôi, `[Q<n>]` câu trả lời ở câu hỏi tương ứng trong tệp này, `[memory:M<n>]` quy tắc nhớ của team/project (liệt kê ở mục Sources). Mỗi mục ghi NFR gốc mà nó cụ thể hóa.

**Hiệu năng (NFR1)**

1. **Điều kiện đo NFR1:** trên PostgreSQL 16 cài sẵn của máy bạn (database nạp riêng, theo Q5), không có tải khác, backend chạy từ tệp JAR đóng gói (không chạy từ IDE), cấu hình JVM và pool mặc định. Công cụ nạp chạy `ANALYZE` khi xong; script đo bỏ các lần khởi động nóng trước khi bấm giờ. Đo bằng `size=20` mặc định trừ kịch bản dùng `size=100`. `[assumption]` NFR1; `[Q1]`
2. **"100.000 callback" nghĩa là gì:** 100.000 dòng Callback do công cụ tạo (gồm cả ba kết quả theo tỷ lệ 85%/10%/5%, khoảng 25.000 giao dịch), lấy từ số công cụ in ra khi xong. Không đo trên dữ liệu ít hơn. `[desc]` NFR1; `[scope]` BR22.4
3. **Nhận callback (NFR1.1 mở rộng):** mục tiêu p95 dưới 200 ms của U1 áp dụng cho cả dịch vụ `API_KEY` (có so khớp khóa) và cho lần nhận bị từ chối được ghi (401, 503), vì cùng một giao dịch ghi; đo tay 100 lần gọi cURL tuần tự trong Build and Test như U1, không phải kiểm thử tự động. `[assumption]` NFR1; U1 NFR1.1
4. **Các API còn lại:** tạo, sửa, bật/tắt, xóa, liệt kê dịch vụ và `GET /api/callbacks/{recordId}` có p95 dưới 200 ms trên máy local khi PostgreSQL nóng; `POST /api/mapping-tests` với JSON mẫu dưới 100 KB dưới 200 ms, với mẫu 1.048.576 byte dưới 1 giây. Đây là mục tiêu phát triển để phát hiện lỗi thiết kế, đo tay một lần trong Build and Test, không phải kiểm thử tự động. `GET /api/transactions/detail` không có mục tiêu thời gian vì không có trần kích thước (U1). `[assumption]` NFR1
5. **Chỉ mục (tiêu chí chấp nhận):** tiêu chí quyết định là p95 ở Q1. Kiểm thử tích hợp chạy `EXPLAIN` (như U1 đã làm cho bốn truy vấn khóa) được mở rộng cho các truy vấn chọn lọc của U2: lọc `serviceCode` kèm khoảng thời gian, lọc `outcome`/`rejectionReason`, tìm callback theo `recordId`; khẳng định không quét toàn bảng `callbacks` ở các truy vấn đó. Các bộ lọc chuỗi chứa được miễn khẳng định chỉ mục (theo Q3). `[assumption]` NFR1; `[Q3]`
6. **Tốc độ công cụ nạp:** không có ngưỡng đạt hay không; công cụ in số callback mỗi giây khi xong. Kỳ vọng nạp 100.000 callback trong khoảng 15 phút trên máy phát triển; nếu chậm hơn nhiều, NFR Design được gộp nhiều lần nhận vào một giao dịch cơ sở dữ liệu miễn các quy tắc nhận callback giữ nguyên. `[assumption]` NFR1; `[scope]` BR22.1
7. **Tài nguyên:** thử mapping không dùng kết nối cơ sở dữ liệu (BR18.1) nên không tranh pool với việc nhận callback; JSON mẫu và body callback được đọc có chặn trên 1.048.576 byte. Không đặt mục tiêu bộ nhớ riêng ngoài NFR1.4 của U1. `[scope]` BR18.1; U1 NFR1.4

**Đồng thời và khả năng mở rộng (NFR2, NFR7)**

8. **Tiêu chí đồng thời bổ sung:** dưới 50 request đồng thời, hồ bơi kết nối tối đa 10 và thời gian chờ kết nối 5 giây của U1 giữ nguyên; tiêu chí đạt của Q2 gồm "không request nào lỗi vì hết thời gian chờ kết nối". Nếu không đạt, NFR Design chỉnh kích thước pool, không đổi mục tiêu. `[assumption]` NFR2; U1 NFR Design
9. **Sửa dịch vụ đồng thời (Q6 A của Functional Design):** kiểm chứng số phiên bản liên tục, không trùng, không hụt khi nhiều lần sửa chạy song song (một kiểm thử tích hợp nhiều luồng, vài chục lần sửa trên một dịch vụ); không có chỉ tiêu thời gian riêng. `[desc]` NFR2; `[scope]` BR12.6
10. **NFR7:** ba dịch vụ mẫu (cấu trúc JSON khác nhau, tạo từ `docs/samples/*.service.json` bằng API) được kiểm chứng bằng kiểm thử tích hợp: mỗi dịch vụ nhận payload hợp lệ cho `SUCCESS` với đúng ba giá trị ánh xạ, payload lỗi cho `MAPPING_ERROR`; chạy script tạo mẫu hai lần không tạo bản trùng. Không sửa mã khi thêm dịch vụ. `[desc]` NFR7; `[scope]` BR21.x
11. **Khối lượng thiết kế:** vẫn 100.000 callback và khoảng 5 giao dịch/giây (U1); đỉnh ngắn 50 đồng thời. Không phân vùng bảng, không bộ nhớ đệm. `[assumption]` NFR1; U1 NFR1.5

**Độ tin cậy và dung lượng**

12. **Ghi lần từ chối thất bại (`X-Simulator-Record-Failed`):** một lần thử duy nhất, không thử lại, không hàng đợi, không ghi bù về sau. Request chờ kết nối tối đa 5 giây rồi trả mã từ chối gốc kèm header. Khi cơ sở dữ liệu trở lại, việc ghi lần từ chối phục hồi trong 30 giây như NFR2.4 của U1, không cần khởi động lại. `[assumption]` NFR2; `[scope]` BR15.6; U1 NFR2.4
13. **Khối lượng nhật ký khi cơ sở dữ liệu mất:** mỗi request một dòng ERROR theo BR14.10, không gộp hay giới hạn tần suất (ở khoảng 5 request/giây thì lượng này nhỏ); không có tệp xoay vòng, chỉ console như U1. `[assumption]` NFR5; U1 NFR5.4
14. **Dung lượng dữ liệu:** callback và lần nhận bị từ chối giữ vô thời hạn, không tự xóa (U1 NFR2.6); ước lượng dùng 1 KB mỗi bản ghi nên 100.000 callback cỡ vài trăm MB kể cả chỉ mục; lượng bản ghi với body lớn tùy bên gửi (xem Q4). Dọn bằng xóa database hoặc đặt lại volume, README nêu rõ. `[assumption]` NFR1; U1 NFR2.6; `[Q4]`
15. **Phục hồi công cụ nạp:** lỗi giữa chừng giữ nguyên dữ liệu đã ghi và thoát mã khác 0 (BR22.5); không có tiếp tục tự động. Chạy lại cần `--append` hoặc xóa database nạp. `[scope]` BR22.5

**Bảo mật (NFR3)**

16. **Kiểm chứng không lộ khóa (NFR3):** kiểm thử tích hợp gửi callback có khóa đúng và sai cho dịch vụ `API_KEY`, rồi quét: mọi cột của mọi bảng trừ cột khóa của Service, đầu ra nhật ký, mọi response API (kể cả lỗi và thử mapping) và đầu ra của công cụ nạp, khẳng định không chứa giá trị khóa hay giá trị header nhạy cảm chưa che. `[desc]` NFR3; `[scope]` BR16.2
17. **So sánh khóa thời gian không đổi:** tính chất này kiểm chứng bằng rà soát mã ở Code Generation (dùng hàm so sánh thời gian không đổi của thư viện chuẩn), không bằng phép đo thời gian tự động vì kết quả đo không ổn định. Kiểm thử tự động chỉ khẳng định kết quả đúng/sai của các tình huống ở W17. `[assumption]` NFR3; `[scope]` BR14.4
18. **Làm sạch nhật ký mở rộng:** mọi giá trị do bên gọi cung cấp ở dòng nhật ký mới (mã dịch vụ từ đường dẫn, lý do từ chối) vẫn bỏ ký tự điều khiển và cắt tối đa 100 ký tự như NFR3.2 của U1. Không ghi tên hay giá trị header trong nhật ký. `[scope]` BR14.10; U1 NFR3.2
19. **An toàn công cụ nạp (ngoài Q5):** công cụ lấy thông tin kết nối từ cùng các biến môi trường như ứng dụng và chỉ đổi tên database đích; mật khẩu không bao giờ in hay ghi log; không chạm `tpp_simulator` hay `tpp_simulator_test`; không tự xóa database nạp sau khi xong (bạn tự `DROP DATABASE` khi muốn). Không mở cổng mạng. `[assumption]` NFR3; `[scope]` BR22.2
20. **Không giới hạn tốc độ, không xác thực, không CORS:** vì chỉ lắng nghe `127.0.0.1` và không có đăng nhập theo brief (U1 NFR3.1); mức dung lượng xem Q4. Thử mapping không thêm giới hạn tốc độ riêng. `[desc]` NFR3; U1 NFR3.1

**Quan sát (observability)**

21. **Không thêm công cụ quan sát mới:** không số liệu đo, truy vết hay cảnh báo; `GET /actuator/health` vẫn là điểm kiểm tra duy nhất. Dòng nhật ký theo BR14.10 là đủ để chẩn đoán đường mới (có `recordId` và `rejectionReason` cho lần bị từ chối). `[assumption]` NFR5; U1 NFR5.3 đến NFR5.5
22. **Nhật ký của công cụ nạp:** không ghi dòng nhật ký cho từng callback (100.000 dòng); dòng nhật ký mỗi request của BR14.10 không phát sinh trong lần chạy nạp. Tiến độ in mỗi 10.000 callback và một dòng tổng kết (số Callback, số giao dịch, thời gian, callback/giây), không có payload hay khóa. `[assumption]` NFR1; `[scope]` BR22.5

**Công nghệ và chất lượng (NFR5, NFR6)**

23. **Không phụ thuộc thư viện mới:** dùng thư viện đã có trong khung dự án; không thêm công cụ tải (JMeter, Gatling, k6, JMH); phần đo là script PowerShell (Q1) và kiểm thử JUnit. Điều kiện môi trường duy nhất có thể thêm là `pg_trgm` và chỉ khi Q3 cho phép. `[assumption]` NFR6; `[Q3]`
24. **Kiểm thử và độ bao phủ:** công cụ nạp được kiểm thử bằng một lần chạy quy mô nhỏ (ví dụ 500 callback, hai dịch vụ) trong bộ kiểm thử thường, và mã của nó tính vào ngưỡng 80% line coverage (không loại trừ). Kiểm thử U2 chạy trên PostgreSQL cài sẵn qua `TPP_TEST_DB_*` (database `tpp_simulator_test`) hoặc Testcontainers ở CI; phép đo NFR1 ở Q1 không nằm trong bộ kiểm thử thường và không chạy ở CI. `[desc]` NFR6; `[memory:M1]`
25. **README (NFR5):** bổ sung vào README: cách chạy script tạo dịch vụ mẫu, cách chạy công cụ nạp (tham số, database `_load`, cách xóa), cách chạy script đo, cảnh báo dung lượng. Bản đầy đủ chốt ở Build and Test. `[desc]` NFR5; `[scope]` BR21.x, BR22.x
26. **NFR4 (truy cập):** không áp dụng cho U2 vì không có giao diện. `[scope]` NFR4

## Sources

- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/inception/requirements-analysis/requirements.md` (NFR1 đến NFR7, FR3.8, FR3.9) `[desc]`
- `docs/brief.md` (mục 2, 6, 8, 9) `[desc]`
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u2-backend-core/functional-design/functional-spec.md`, `rules.md` (BR14.x đến BR22.x), `entities.md`, `functional-design-questions.md` (Q1 đến Q8 chọn A) `[scope]`
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/nfr-requirements/` (`performance-requirements.md`, `security-requirements.md`, `reliability-requirements.md`, `scalability-requirements.md`, `observability-requirements.md`, `nfr-requirements-questions.md`) và `nfr-design/` (`performance-design.md`)
- `aidlc/spaces/default/intents/261018-tpp-callback-simulator/construction/u1-backend-skeleton/code-generation/code-summary.md` (biến `TPP_TEST_DB_*`, `tpp_simulator_test`, không dùng được Docker trên máy này)
- `[memory:M1]` `aidlc/spaces/default/memory/team.md`, mục Testing Posture: test-after, JUnit 5 và Testcontainers, tối thiểu 80% line coverage backend bằng JaCoCo, CI bằng GitHub Actions
- `[memory:M2]` `aidlc/spaces/default/memory/project.md`, mục Forbidden: không hỏi lại các quyết định đã chốt trong `docs/brief.md`

## Assumption Confirmation

Bạn đồng ý dùng các giả định trên chứ?

A. Accept assumptions
B. Convert to follow-up questions
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: 
