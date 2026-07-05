# Production Email Integration Report

Last updated: 2026-07-05

## 1. Mục tiêu

Tích hợp gửi email xác nhận đơn hàng ổn định trên production Railway.

Trạng thái mong muốn:

- COD order vẫn ở trạng thái `pending` / `Chờ xử lý` sau khi tạo đơn. Đây là đúng vì đơn tiền mặt chưa được giao và chưa hoàn tất thanh toán.
- Sau khi tạo đơn COD thành công và tạo được mã GHN, hệ thống gửi email hóa đơn/xác nhận đơn tới email đăng nhập của khách hàng.
- Production không phụ thuộc vào SMTP port `587` hoặc `465`, vì các port này có thể bị timeout/chặn bởi môi trường hosting.

## 2. Những việc đã làm trước khi tích hợp Resend

### Test suite

- Đã tạo các test backend theo prompt ban đầu.
- Đã xóa file boilerplate rỗng `AgriEcommerceBackendApplicationTests.java`.
- Không giữ scratch/temp test không dùng nữa.
- Các test còn lại trong `src/test/java` là test controller/service có giá trị kiểm thử.

### GHN

- Kiểm tra Railway production service `agri-ecommerce-backend`.
- Phát hiện các biến GHN chưa hiển thị trong Railway Variables.
- Đã bổ sung các biến GHN cần thiết trên Railway production:
  - `GHN_API_URL`
  - `GHN_API_TOKEN`
  - `GHN_TOKEN`
  - `GHN_SHOP_ID`
- Redeploy backend sau khi cập nhật biến.
- Kết quả thực tế: đơn COD tạo được mã vận đơn GHN, ví dụ `LAU7WD`, `LAU789`; phí giao hàng trả về `75.900 đ`.

### SMTP/Gmail

- Phát hiện Railway thiếu biến mail ban đầu.
- Đã bổ sung:
  - `SPRING_MAIL_USERNAME`
  - `SPRING_MAIL_PASSWORD`
- Backend đã gọi đúng luồng gửi email sau khi tạo đơn.
- Lỗi gặp phải:
  - Với SMTP Gmail port `587`: timeout khi connect `smtp.gmail.com:587`.
  - Đổi thử sang SMTP SSL port `465`: tiếp tục timeout khi connect `smtp.gmail.com:465`.
- Kết luận: lỗi không nằm ở email khách hàng, không phải app không gọi email, và cũng không giống lỗi sai Gmail app password. Nếu sai mật khẩu thường sẽ là lỗi authentication; ở đây log là connection timeout. Nguyên nhân phù hợp nhất là môi trường Railway không kết nối ổn định tới SMTP Gmail qua port `587/465`.

## 3. Giải pháp production đã chọn

Ban đầu đã thử chuyển production sang Resend HTTPS API để tránh lỗi SMTP timeout. Tuy nhiên vì demo chưa có domain riêng để verify DNS, Resend không phù hợp làm phương án cuối cùng cho kỳ thực tập.

Giải pháp cuối cùng đã chọn cho demo là Google Apps Script mail relay qua HTTPS:

- Backend Railway gọi Apps Script Web App bằng HTTPS `443`.
- Apps Script gửi email thật bằng Gmail đã đăng nhập/deploy script.
- Không cần mua domain riêng.
- Tránh lỗi Railway timeout tới Gmail SMTP port `465/587`.
- Có `MAIL_SECRET` để chặn request không hợp lệ.

Resend hiện đã được loại khỏi code/config/test/env mẫu. Các ghi chú Resend bên dưới chỉ giữ lại như lịch sử phân tích và bài học triển khai.

### Lý do từng cân nhắc Resend

Lý do:

- Resend gửi qua HTTPS endpoint `https://api.resend.com/emails`, dùng port `443`, phù hợp môi trường hosting hơn SMTP.
- Resend official docs yêu cầu API key và verified domain cho Java/Spring Boot.
- API `POST /emails` nhận các trường chính: `from`, `to`, `subject`, `html`.
- Tài liệu tham khảo:
  - https://resend.com/docs/api-reference/emails/send-email
  - https://resend.com/docs/send-with-java

## 4. Thay đổi code đã thực hiện

### `EmailServiceImpl`

File: `src/main/java/com/agri/ecommerce/service/impl/EmailServiceImpl.java`

- Giữ nguyên SMTP/JavaMailSender làm mặc định cho local/dev.
- Thêm provider mới qua config:
  - `EMAIL_PROVIDER=smtp` mặc định.
  - `EMAIL_PROVIDER=google-script` để bật Google Apps Script relay trên demo production.
- Khi provider là `google-script`, service sẽ:
  - lấy email người nhận từ `order.user.email`;
  - build subject và HTML hóa đơn như trước;
  - build thêm text fallback body;
  - POST payload JSON tới `GOOGLE_SCRIPT_MAIL_URL`;
  - gửi kèm `GOOGLE_SCRIPT_MAIL_SECRET` để Apps Script kiểm tra;
  - dùng `Idempotency-Key: agri-order-invoice-<orderId>` để hạn chế gửi trùng trong trường hợp retry;
- log rõ HTTP status/body rút gọn nếu Apps Script trả lỗi.
- Nếu bật `google-script` nhưng thiếu `GOOGLE_SCRIPT_MAIL_URL` hoặc `GOOGLE_SCRIPT_MAIL_SECRET`, service sẽ log lỗi cấu hình và bỏ qua gửi mail.
- Đã xóa provider Resend khỏi code sau khi chọn Google Apps Script làm phương án cuối cho demo.

### `application.yml`

File: `src/main/resources/application.yml`

Đã thêm nhóm config:

```yaml
app:
  email:
    provider: ${EMAIL_PROVIDER:smtp}
    from: ${MAIL_FROM:${SPRING_MAIL_USERNAME:}}
    from-name: ${MAIL_FROM_NAME:AgriMarket}
    reply-to: ${MAIL_REPLY_TO:${SPRING_MAIL_USERNAME:}}
    google-script:
      url: ${GOOGLE_SCRIPT_MAIL_URL:}
      secret: ${GOOGLE_SCRIPT_MAIL_SECRET:}
```

### `.env.example`

File: `.env.example`

Đã thêm biến mẫu:

```properties
EMAIL_PROVIDER=smtp
MAIL_FROM=AgriMarket <no-reply@example.com>
MAIL_FROM_NAME=AgriMarket
MAIL_REPLY_TO=agrimarket.ecommerce@gmail.com
GOOGLE_SCRIPT_MAIL_URL=https://script.google.com/macros/s/your_deployment_id/exec
GOOGLE_SCRIPT_MAIL_SECRET=replace_with_a_long_random_secret
```

### Test

File: `src/test/java/com/agri/ecommerce/service/EmailServiceImplTest.java`

- Thêm unit test giả lập Google Apps Script endpoint bằng local HTTP server.
- Test xác nhận backend gửi `POST /emails` đúng payload:
  - `Idempotency-Key`
  - `to`
  - `secret`
  - `replyTo`
  - `trackingNumber`
  - `source`

## 5. Ghi chú Resend đã loại bỏ

Update 2026-07-05:

- Resend đã được cân nhắc vì gửi qua HTTPS `443`, tránh lỗi Railway timeout SMTP.
- Không chọn Resend làm phương án demo cuối vì chưa có domain riêng để verify DNS.
- Code/config/test/env mẫu liên quan Resend đã được xóa.
- Railway production cũng đã kiểm tra/xóa các biến `RESEND_API_KEY`, `RESEND_API_URL` nếu có.
- Phần này chỉ giữ lại làm lịch sử phân tích cho báo cáo thực tập.

## 6. Cần làm trên Railway production

Trong Railway service `agri-ecommerce-backend`, environment `production`, thêm/cập nhật:

```properties
EMAIL_PROVIDER=google-script
MAIL_FROM_NAME=AgriMarket
MAIL_REPLY_TO=agrimarket.ecommerce@gmail.com
GOOGLE_SCRIPT_MAIL_URL=https://script.google.com/macros/s/AKfycbzJODyzm7wXo2PoFd0g5RKbDZ2N5O3ypiPooWstHx54-dBZahxdWs-YigEemUwIkBUp/exec
GOOGLE_SCRIPT_MAIL_SECRET=<giống MAIL_SECRET trong Apps Script>
```

Có thể dùng UI Railway Variables hoặc CLI.

CLI mẫu:

```powershell
railway variable set EMAIL_PROVIDER=google-script --service agri-ecommerce-backend --environment production
railway variable set MAIL_FROM_NAME=AgriMarket --service agri-ecommerce-backend --environment production
railway variable set MAIL_REPLY_TO=agrimarket.ecommerce@gmail.com --service agri-ecommerce-backend --environment production
railway variable set GOOGLE_SCRIPT_MAIL_URL=<Apps Script /exec URL> --service agri-ecommerce-backend --environment production
railway variable set GOOGLE_SCRIPT_MAIL_SECRET=<secret> --service agri-ecommerce-backend --environment production
```

Lưu ý bảo mật:

- Không chụp màn hình/gửi log output từ `railway variable list`. Railway CLI trên máy hiện tại có thể in raw secret ngay cả khi không dùng `--json` hoặc `--kv`.
- Không commit `.env` thật.
- Không ghi secret thật vào báo cáo công khai.

Sau khi set biến, redeploy backend:

```powershell
railway up --service agri-ecommerce-backend --detach
```

## 7. Cách kiểm thử sau deploy

1. Mở Railway deployment logs.
2. Tạo một đơn COD mới bằng tài khoản khách hàng có email thật.
3. Kiểm tra order:
   - trạng thái đơn là `pending` / `Chờ xử lý`;
   - có mã GHN;
   - phí giao hàng hiển thị đúng.
4. Kiểm tra logs:
   - thành công mong đợi:

```text
[Email Service] Invoice email sent via Google Apps Script to <email> for Order #<id>
```

   - nếu thiếu URL hoặc secret:

```text
EMAIL_PROVIDER=google-script but GOOGLE_SCRIPT_MAIL_URL is not configured
EMAIL_PROVIDER=google-script but GOOGLE_SCRIPT_MAIL_SECRET is not configured
```

   - nếu Apps Script sai secret hoặc lỗi quyền gửi mail, backend sẽ log `Google Apps Script mail relay failed`.
5. Kiểm tra hộp thư:
   - Inbox;
   - Spam/Promotions;
   - Apps Script `Nhật ký thực thi`.

## 8. Vì sao local chạy được nhưng Railway lỗi

Localhost chạy trên mạng máy cá nhân, thường được phép outbound tới Gmail SMTP port `587/465`.

Production Railway chạy trong môi trường cloud/container. Kết nối SMTP outbound tới Gmail có thể timeout hoặc bị hạn chế. Vì vậy local test OK không chứng minh SMTP production sẽ ổn.

Fix phù hợp cho demo là dùng Google Apps Script relay qua HTTPS port `443`. Nếu sau này chạy production thương mại, có thể nâng cấp sang email provider chuyên dụng kèm domain riêng đã verify.

## 9. Ghi chú chi phí custom domain với Vercel

- Thêm custom domain có sẵn vào project Vercel không phải là khoản phí riêng của thao tác cấu hình domain.
- Chi phí chính là mua/duy trì tên miền, trả theo năm cho Vercel Domains hoặc registrar khác như Cloudflare, Namecheap, Porkbun, Mắt Bão, PA Việt Nam.
- Vercel Hobby plan miễn phí và có giới hạn 50 custom domains mỗi project, nhưng theo tài liệu Vercel Hobby bị giới hạn cho non-commercial/personal use.
- Nếu AgriMarket chỉ là đồ án/demo cá nhân, có thể dùng Hobby + domain mua riêng.
- Nếu triển khai ecommerce thương mại thật, nên dùng Vercel Pro hoặc hạ tầng phù hợp điều khoản production/commercial.
- Một domain riêng có thể dùng đồng thời cho frontend và email:
  - `www.agrimarket.vn` cho Vercel frontend.
  - `api.agrimarket.vn` cho backend Railway nếu cần.
  - `updates.agrimarket.vn` cho email provider chuyên dụng nếu sau này cần nâng cấp.

## 10. Phương án gửi mail thật khi chưa có domain riêng

Nếu chưa mua/verify domain riêng, vẫn có thể gửi mail thật bằng tài khoản Gmail hiện có, nhưng không dùng SMTP trên Railway vì port `465/587` đã timeout.

Các lựa chọn:

1. Google Apps Script relay qua HTTPS
   - Tạo Apps Script bằng tài khoản Gmail gửi mail.
   - Script dùng `MailApp.sendEmail()` để gửi email.
   - Backend Railway gọi Apps Script Web App qua HTTPS `443`, tránh SMTP port bị timeout.
   - Cần thêm secret để chỉ backend được gọi endpoint.
   - Phù hợp demo/đồ án vì nhanh, miễn phí, gửi từ Gmail thật.
   - Giới hạn theo Google Apps Script: consumer Gmail khoảng `100` recipients/day, Google Workspace khoảng `1,500` recipients/day; quota có thể thay đổi theo chính sách Google.
   - Đã tích hợp provider backend `EMAIL_PROVIDER=google-script`.
   - File script mẫu đã lưu tại `docs/google-apps-script-mail-relay.gs`.
   - Biến Railway cần set:

```properties
EMAIL_PROVIDER=google-script
MAIL_FROM_NAME=AgriMarket
MAIL_REPLY_TO=agrimarket.ecommerce@gmail.com
GOOGLE_SCRIPT_MAIL_URL=<Apps Script Web App /exec URL>
GOOGLE_SCRIPT_MAIL_SECRET=<secret giống MAIL_SECRET trong Apps Script>
```

   - Các bước tạo Apps Script:
     1. Vào `https://script.google.com`, tạo project mới bằng Gmail gửi mail.
     2. Copy nội dung `docs/google-apps-script-mail-relay.gs` vào `Code.gs`.
     3. Vào Project Settings -> Script properties -> thêm `MAIL_SECRET`.
     4. Chạy hàm `authorizeMail()` một lần và cấp quyền gửi mail.
     5. Deploy -> New deployment -> Web app.
     6. Chọn `Execute as: Me`.
     7. Chọn `Who has access: Anyone`.
     8. Copy Web app URL kết thúc bằng `/exec` đưa vào `GOOGLE_SCRIPT_MAIL_URL`.
     9. Set cùng secret vào Railway `GOOGLE_SCRIPT_MAIL_SECRET`.
     10. Redeploy backend và tạo đơn COD mới để test.

   - Mapping giao diện tiếng Việt Apps Script:
     1. Click tên `Dự án không có tiêu đề` -> đổi thành `AgriMarket Mail Relay`.
     2. Click icon bánh răng `Cài đặt dự án`.
     3. Kéo tới mục `Thuộc tính của tập lệnh`.
     4. Click `Thêm thuộc tính của tập lệnh`.
     5. Cột `Thuộc tính`: nhập `MAIL_SECRET`.
     6. Cột `Giá trị`: nhập secret dài tự tạo, ví dụ chuỗi random 40-64 ký tự.
     7. Click `Lưu thuộc tính của tập lệnh`.
     8. Quay lại tab `Trình chỉnh sửa`.
     9. Chọn hàm `authorizeMail` ở dropdown cạnh nút `Chạy`.
     10. Click `Chạy`, chọn tài khoản Gmail, bấm `Nâng cao` nếu Google cảnh báo app chưa xác minh, rồi cấp quyền.
     11. Click `Triển khai` -> `Lần triển khai mới`.
     12. Loại triển khai chọn `Ứng dụng web`.
     13. `Thực thi với tư cách`: chọn `Tôi`.
     14. `Ai có quyền truy cập`: chọn `Bất kỳ ai`.
     15. Click `Triển khai`.
     16. Copy `URL ứng dụng web` kết thúc bằng `/exec`.

   - Update 2026-07-05 sau khi deploy:
     - Đã set Railway production sang `EMAIL_PROVIDER=google-script`.
     - Đã set `GOOGLE_SCRIPT_MAIL_URL` bằng Apps Script `/exec` URL đã tạo.
     - Đã xóa các biến Railway cũ không còn dùng: SMTP Gmail override và Resend nếu có.
     - Đã xóa `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` khỏi local `.env`.
     - Test trực tiếp Apps Script trả `Unauthorized`, nguyên nhân là `MAIL_SECRET` trong Apps Script chưa khớp với `GOOGLE_SCRIPT_MAIL_SECRET` đã set ở Railway/local.
     - Cách fix: vào Apps Script -> `Cài đặt dự án` -> `Thuộc tính của tập lệnh`, sửa `MAIL_SECRET` cho khớp với secret đang dùng ở Railway/local, sau đó test lại tạo đơn COD. Không cần redeploy backend nếu chỉ sửa Apps Script property.
   - Update 2026-07-06:
     - Đơn `LAUCC6` có log GHN thành công nhưng email chạy vào nhánh `[Email Service MOCK]`, chứng tỏ deployment lúc đó chưa chạy đúng code Google Script hoặc runtime chưa nhận đúng build.
     - Đã ép deploy lại từ repo root để Railway dùng đúng Dockerfile/root build context.
     - Sau deploy root, backend start thành công và public API trả `200`.
     - Test trực tiếp Apps Script bằng đúng URL + secret Railway vẫn trả `Unauthorized`, nên blocker còn lại là property trong Apps Script: tên phải là `MAIL_SECRET` và giá trị phải khớp tuyệt đối với `GOOGLE_SCRIPT_MAIL_SECRET`.
     - Người dùng đã đồng bộ `GOOGLE_SCRIPT_MAIL_SECRET` trên Railway và `MAIL_SECRET` trong Apps Script về cùng giá trị.
     - Test trực tiếp Apps Script sau khi đồng bộ trả `{"ok":true,"quotaRemaining":99}`, chứng tỏ relay gửi mail đã hoạt động.
     - Đã redeploy Railway lại sau khi đồng bộ secret để container chắc chắn nhận env mới. Public API trả `200`.
     - Bước kiểm thử còn lại: tạo đơn COD mới; đơn cũ như `LAUCC6` không tự gửi lại email.
     - Đơn mới `LAUC3Y` đã tạo GHN thành công và log backend ghi: `Invoice email sent via Google Apps Script to phamhung080604@gmail.com for Order #21`.
     - Gmail bên gửi đã có thư trong `Đã gửi`; nếu bên nhận chưa thấy trong `Hộp thư đến`, cần kiểm tra `Giao dịch mua`, Spam, Thùng rác hoặc tìm `in:anywhere LAUC3Y` vì Gmail có thể tự phân loại hóa đơn mua hàng.

2. Gmail API trực tiếp
   - Backend lấy OAuth refresh token rồi gọi Gmail API `users.messages.send`.
   - Gửi từ Gmail thật qua HTTPS.
   - Đúng kỹ thuật hơn Apps Script relay nhưng setup OAuth phức tạp hơn và cần lưu `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`.

Khuyến nghị hiện tại:

- Nếu mục tiêu là demo sớm bằng những gì đang có: dùng Google Apps Script relay.
- Nếu mục tiêu là production thương mại thật: dùng email provider chuyên dụng với domain riêng đã verify.
