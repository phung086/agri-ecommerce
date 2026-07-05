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

Chuyển production sang gửi email qua Resend HTTPS API.

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
  - `EMAIL_PROVIDER=resend` để bật Resend trên production.
- Khi provider là `resend`, service sẽ:
  - lấy email người nhận từ `order.user.email`;
  - build subject và HTML hóa đơn như trước;
  - POST payload JSON tới `RESEND_API_URL`;
  - dùng header `Authorization: Bearer <RESEND_API_KEY>`;
  - dùng `Idempotency-Key: agri-order-invoice-<orderId>` để hạn chế gửi trùng trong trường hợp retry;
  - log rõ HTTP status/body rút gọn nếu Resend trả lỗi.
- Nếu bật Resend nhưng thiếu `RESEND_API_KEY` hoặc `MAIL_FROM`, service sẽ log lỗi cấu hình và không fallback mù sang SMTP production.

### `application.yml`

File: `src/main/resources/application.yml`

Đã thêm nhóm config:

```yaml
app:
  email:
    provider: ${EMAIL_PROVIDER:smtp}
    from: ${MAIL_FROM:${SPRING_MAIL_USERNAME:}}
    resend:
      api-key: ${RESEND_API_KEY:}
      api-url: ${RESEND_API_URL:https://api.resend.com/emails}
```

### `.env.example`

File: `.env.example`

Đã thêm biến mẫu:

```properties
EMAIL_PROVIDER=smtp
MAIL_FROM=AgriMarket <no-reply@example.com>
RESEND_API_KEY=your_resend_api_key_here
RESEND_API_URL=https://api.resend.com/emails
```

### Test

File: `src/test/java/com/agri/ecommerce/service/EmailServiceImplTest.java`

- Thêm unit test giả lập Resend endpoint bằng local HTTP server.
- Test xác nhận backend gửi `POST /emails` đúng header và payload:
  - `Authorization`
  - `Idempotency-Key`
  - `from`
  - `to`
  - `subject`
  - `tags.order_id`

## 5. Cần làm trên Resend

1. Tạo tài khoản Resend hoặc dùng tài khoản hiện có.
2. Tạo API key.
3. Add và verify domain gửi mail.
4. Chọn sender email đã verify, ví dụ:

```text
AgriMarket <no-reply@your-domain.com>
```

Không nên dùng domain chưa verify cho production. Nếu dùng sender test của Resend thì có thể bị giới hạn người nhận.

## 6. Cần làm trên Railway production

Trong Railway service `agri-ecommerce-backend`, environment `production`, thêm/cập nhật:

```properties
EMAIL_PROVIDER=resend
RESEND_API_KEY=<Resend API key thật>
MAIL_FROM=AgriMarket <no-reply@your-verified-domain.com>
RESEND_API_URL=https://api.resend.com/emails
```

Có thể dùng UI Railway Variables hoặc CLI.

CLI mẫu:

```powershell
railway variable set EMAIL_PROVIDER=resend --service agri-ecommerce-backend --environment production
railway variable set RESEND_API_KEY=<Resend API key thật> --service agri-ecommerce-backend --environment production
railway variable set "MAIL_FROM=AgriMarket <no-reply@your-verified-domain.com>" --service agri-ecommerce-backend --environment production
railway variable set RESEND_API_URL=https://api.resend.com/emails --service agri-ecommerce-backend --environment production
```

Lưu ý bảo mật:

- Không dùng `railway variable list --json` hoặc `--kv` để chụp màn hình/gửi log, vì các mode đó có thể in raw secret.
- Không commit `.env` thật.
- Không ghi API key thật vào báo cáo.

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
[Email Service] Invoice email sent via Resend to <email> for Order #<id>
```

   - nếu thiếu key:

```text
EMAIL_PROVIDER=resend but RESEND_API_KEY is not configured
```

   - nếu sender chưa verify hoặc domain lỗi, Resend sẽ trả HTTP `4xx` và body lỗi sẽ được log rút gọn.
5. Kiểm tra hộp thư:
   - Inbox;
   - Spam/Promotions;
   - Resend dashboard logs.

## 8. Vì sao local chạy được nhưng Railway lỗi

Localhost chạy trên mạng máy cá nhân, thường được phép outbound tới Gmail SMTP port `587/465`.

Production Railway chạy trong môi trường cloud/container. Kết nối SMTP outbound tới Gmail có thể timeout hoặc bị hạn chế. Vì vậy local test OK không chứng minh SMTP production sẽ ổn.

Fix bền vững là dùng email API qua HTTPS port `443`, hoặc dùng SMTP provider chuyên dụng có cấu hình production rõ ràng. Trong lần này chọn Resend HTTPS API.

