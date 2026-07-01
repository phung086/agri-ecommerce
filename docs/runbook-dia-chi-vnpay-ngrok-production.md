# Runbook: Dia chi Viet Nam, VNPay Sandbox, Ngrok, Vercel va Railway

Cap nhat: 30/06/2026  
Du an: AgriMarket / Agri Ecommerce  
Nhanh production hien tai: `develop`  
Frontend production: `https://agri-ecommerce-sigma.vercel.app`  
Backend production: `https://agri-ecommerce-backend-production.up.railway.app`

Tai lieu nay tong hop cac viec da lam trong giai do hoan thien checkout, thanh toan VNPay sandbox, IPN qua ngrok, deploy production tren Vercel/Railway va cac loi da gap.

## 1. Muc tieu

Muc tieu chinh:

- Checkout co phan dia chi giao hang dung luong thuong mai dien tu: tinh/thanh pho, quan/huyen, xa/phuong, dia chi cu the.
- Neu khach da co dia chi mac dinh thi khong mo form them dia chi ngay; chi hien danh sach dia chi va nut `Them dia chi moi`.
- Tich hop VNPay Sandbox theo luong ecommerce that: tao don hang truoc, chuyen sang cong thanh toan, nhan return, nhan IPN, cap nhat trang thai thanh toan.
- Dung ngrok khi test local de VNPay co the goi IPN vao backend local.
- Deploy frontend len Vercel va backend len Railway de mentor co the review remote.
- Dam bao code moi merge ve `develop` co the tiep tuc auto deploy len production neu GitHub integration duoc ket noi dung.

## 2. Tong quan code lien quan

Frontend:

- Checkout page: `agri-ecommerce-frontend/src/app/checkout/page.jsx`
- Trang ket qua VNPay: `agri-ecommerce-frontend/src/app/checkout/vnpay-return/page.jsx`
- Service goi API order/payment: `agri-ecommerce-frontend/src/services/order.service.js`
- Axios base URL: `agri-ecommerce-frontend/src/lib/axios-client.js`
- Du lieu dia chi Viet Nam: `agri-ecommerce-frontend/src/data/vietnam-addresses.json`
- Admin login: `agri-ecommerce-frontend/src/app/admin/login/page.jsx`
- Luu session theo scope admin/customer/delivery: `agri-ecommerce-frontend/src/lib/auth-storage.js`

Backend:

- Config chinh: `agri-ecommerce-backend/src/main/resources/application.yml`
- CORS/Security: `agri-ecommerce-backend/src/main/java/com/agri/ecommerce/config/SecurityConfig.java`
- VNPay properties: `agri-ecommerce-backend/src/main/java/com/agri/ecommerce/config/VnpayProperties.java`
- Tao URL VNPay cho khach: `agri-ecommerce-backend/src/main/java/com/agri/ecommerce/controller/customer/PaymentController.java`
- Public return/IPN VNPay: `agri-ecommerce-backend/src/main/java/com/agri/ecommerce/controller/publicapi/PublicVnpayPaymentController.java`
- Logic thanh toan: `agri-ecommerce-backend/src/main/java/com/agri/ecommerce/service/impl/PaymentServiceImpl.java`
- Logic checkout va tru kho: `agri-ecommerce-backend/src/main/java/com/agri/ecommerce/service/impl/OrderServiceImpl.java`

Deploy:

- Railway config: `railway.json`
- Docker build cho Railway: `Dockerfile`
- Ignore file khi build image: `.dockerignore`

## 3. Tinh chinh dia chi Viet Nam trong checkout

### Van de ban dau

Man hinh checkout ban dau chi co mot o nhap tinh/thanh pho dang text input. Cach nay khong chuyen nghiep va de nhap sai:

- Khach co the go sai ten tinh.
- Khong co quan/huyen, xa/phuong.
- Neu khach da co dia chi mac dinh, form them dia chi van hien ra lam man checkout dai va roi.
- Ban dau co huong "moi tinh kem mien/mui gio", nhung app noi dia khong can hien mui gio cho khach.

### Cach da sua

Da them du lieu dia chi Viet Nam o frontend:

```text
agri-ecommerce-frontend/src/data/vietnam-addresses.json
```

Form checkout dung 3 cap chon:

1. Tinh/thanh pho.
2. Quan/huyen.
3. Xa/phuong.
4. Dia chi cu the.

Khong hien chu thich mien, khong hien timezone. O select tinh chi hien ten tinh/thanh pho ngan gon, vi du:

```text
Ha Noi
Nghe An
Thanh Hoa
Da Nang
Ho Chi Minh
```

Trong `checkout/page.jsx`, form dia chi gom cac truong:

```js
{
  fullName: "",
  phone: "",
  provinceCode: "",
  provinceName: "",
  districtCode: "",
  districtName: "",
  wardCode: "",
  wardName: "",
  address: "",
  defaultAddress: true
}
```

Khi submit them dia chi:

- `city` gui ve backend = `provinceName`.
- `address` gui ve backend = `dia chi cu the, wardName, districtName`.
- Neu chua co dia chi nao, dia chi moi tu dong la mac dinh.
- Neu da co dia chi, checkbox `Dat lam dia chi mac dinh` quyet dinh co set mac dinh hay khong.

### Luong hien thi checkout

Khi vao checkout:

- Goi API lay danh sach dia chi cua customer.
- Neu co dia chi mac dinh: chon dia chi do, an form them dia chi.
- Neu co dia chi nhung khong co mac dinh: chon dia chi dau tien, an form them dia chi.
- Neu chua co dia chi: hien thong bao va mo form them dia chi.

Trang thai UI:

```js
const [showAddressForm, setShowAddressForm] = useState(false);
```

Quy tac:

- `addresses.length > 0 && !showAddressForm`: chi hien nut `Them dia chi moi`.
- Click `Them dia chi moi`: `setShowAddressForm(true)`.
- Them dia chi thanh cong: chon dia chi moi va `setShowAddressForm(false)`.

### Ket qua

Ket qua sau khi sua:

- Checkout gon hon neu customer da co dia chi.
- Dia chi nhap theo cap, giong Shopee/Tiki/Lazada hon.
- Giam loi nhap sai tinh/thanh pho.
- Khong can timezone trong form dia chi vi day la app noi dia.
- Backend van khong bi phu thuoc vao file JSON frontend; backend chi nhan `city` va `address` nhu truoc, nen it gay conflict.

## 4. Thanh toan VNPay Sandbox

### Tai sao can VNPay

VNPay la luong thanh toan online pho bien tai Viet Nam. Tich hop VNPay giup app co luong thanh toan ecommerce that:

- Khach tao don va chon thanh toan online.
- He thong tao link thanh toan co checksum.
- Khach sang cong VNPay de nhap the/test card.
- VNPay tra ve frontend qua Return URL.
- VNPay goi backend qua IPN de backend cap nhat trang thai payment chinh xac.

### Dang ky sandbox lay ma

Trang dang ky merchant test:

```text
https://sandbox.vnpayment.vn/devreg/
```

Form dang ky dien:

- `Ten website`: AgriMarket hoac Agri Ecommerce.
- `Dia chi URL`: khi dang ky test co the dung frontend local `http://localhost:3000`; khi test IPN local nen dung public URL/ngrok neu form yeu cau.
- `Email dang ky`: email ca nhan de nhan cau hinh.
- `Mat khau`: mat khau de vao Merchant Admin sandbox.
- `Nhap lai mat khau`.
- `Captcha`.

Sau khi dang ky, VNPay gui email gom:

- `vnp_TmnCode`: ma website/terminal.
- `vnp_HashSecret`: secret ky checksum.
- `vnp_Url`: URL cong thanh toan sandbox.
- Link Merchant Admin sandbox.
- Thong tin the test.

Khong dua `vnp_HashSecret` vao Git. Chi de trong `.env`, Railway Variables hoac secret manager.

### The test VNPay sandbox

Dung the demo VNPay sandbox:

```text
Ngan hang: NCB
So the: 9704198526191432198
Ten chu the: NGUYEN VAN A
Ngay phat hanh: 07/15
OTP: 123456
```

### Bien moi truong VNPay

Local backend `.env`:

```properties
VNPAY_PAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_TMN_CODE=your_sandbox_tmn_code
VNPAY_HASH_SECRET=your_sandbox_hash_secret
VNPAY_RETURN_URL=http://localhost:3000/checkout/vnpay-return
VNPAY_EXPIRE_MINUTES=15
```

Production Railway Variables:

```properties
VNPAY_PAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_TMN_CODE=your_sandbox_tmn_code
VNPAY_HASH_SECRET=your_sandbox_hash_secret
VNPAY_RETURN_URL=https://agri-ecommerce-sigma.vercel.app/checkout/vnpay-return
VNPAY_EXPIRE_MINUTES=15
```

Khi len production that voi hop dong VNPay that:

- Doi `VNPAY_PAY_URL` sang URL production VNPay cung cap.
- Doi `VNPAY_TMN_CODE` sang terminal production.
- Doi `VNPAY_HASH_SECRET` sang secret production.
- Giu `VNPAY_RETURN_URL` la domain frontend production.
- Cap nhat IPN URL trong Merchant Admin VNPay sang backend production.

### Luong checkout VNPay trong app

Frontend checkout:

1. Khach chon `VNPay Sandbox`.
2. Frontend goi:

```http
POST /api/customer/orders/checkout
```

3. Backend validate:

- Gio hang.
- Ton kho.
- Dia chi giao hang.
- Coupon.
- Phuong thuc thanh toan.
- Cau hinh VNPay neu `paymentMethod=vnpay`.

4. Backend tao order status `pending`, tao payment status `pending`, tru kho.
5. Frontend goi:

```http
POST /api/customer/orders/{orderId}/payment/vnpay
```

6. Backend tao URL VNPay va ky checksum HMAC SHA512.
7. Frontend redirect:

```js
window.location.assign(payment.paymentUrl);
```

8. Khach thanh toan tren VNPay sandbox.
9. VNPay redirect browser ve:

```text
{VNPAY_RETURN_URL}?vnp_...
```

10. Frontend trang `/checkout/vnpay-return` goi:

```http
GET /api/public/payments/vnpay/return
```

11. Backend verify checksum va tra thong tin de hien thi trang ket qua.
12. VNPay goi server-to-server vao IPN:

```http
GET /api/public/payments/vnpay/ipn
```

13. Backend verify checksum, so tien, order, payment method, sau do cap nhat:

- Thanh cong: `payment.status=completed`, set `transactionId`, set `paidAt`.
- That bai: `payment.status=failed`, set `transactionId` neu co.
- Neu da xu ly roi: tra response idempotent, khong cap nhat lap.

### Endpoint VNPay

Tao URL thanh toan:

```http
POST /api/customer/orders/{orderId}/payment/vnpay
Authorization: Bearer customer_token
```

Return endpoint:

```http
GET /api/public/payments/vnpay/return?vnp_TxnRef=...&vnp_...
```

IPN endpoint:

```http
GET /api/public/payments/vnpay/ipn?vnp_TxnRef=...&vnp_...
```

### Vi sao order co the van `pending`

Trong code hien tai, endpoint Return chi `verify` de hien thi ket qua; viec cap nhat `payment.status=completed` nam o IPN.

Vi vay:

- Local khong dung ngrok: VNPay khong goi duoc IPN vao `localhost:8080`, payment co the van `pending`.
- Local dung ngrok dung IPN: payment se chuyen `completed`.
- Production Railway: VNPay goi duoc backend public, payment se chuyen `completed` neu IPN duoc cau hinh dung.

## 5. Ngrok khi test VNPay local

### Ngrok dung de lam gi

VNPay IPN la server VNPay goi vao backend cua minh. Neu backend chay local:

```text
http://localhost:8080
```

thi VNPay khong truy cap duoc may local. Ngrok tao mot public HTTPS URL map ve local backend:

```text
https://<ngrok-domain> -> http://localhost:8080
```

Nho do VNPay co the goi IPN vao backend local.

### Cai va cau hinh ngrok

Sau khi dang ky ngrok, lay authtoken tren dashboard.

Neu `ngrok` da co trong PATH:

```powershell
ngrok config add-authtoken <NGROK_AUTHTOKEN>
ngrok http 8080
```

Neu PowerShell bao:

```text
ngrok : The term 'ngrok' is not recognized
```

thi co nghia la ngrok chua nam trong PATH. Cach xu ly:

1. Mo terminal ngay trong folder co `ngrok.exe`, roi chay:

```powershell
.\ngrok.exe config add-authtoken <NGROK_AUTHTOKEN>
.\ngrok.exe http 8080
```

2. Hoac them folder chua `ngrok.exe` vao Environment Variables `Path`, mo lai terminal, roi chay `ngrok`.

### Lenh chay local test VNPay

Terminal 1 - backend:

```powershell
cd D:\agri-ecommerce\agri-ecommerce-backend
.\mvnw.cmd spring-boot:run
```

Terminal 2 - frontend:

```powershell
cd D:\agri-ecommerce\agri-ecommerce-frontend
npm install
npm run dev
```

Terminal 3 - ngrok:

```powershell
ngrok http 8080
```

Ngrok se hien:

```text
Forwarding https://projector-blaspheme-angelfish.ngrok-free.dev -> http://localhost:8080
```

IPN URL local can nhap vao cong test VNPay:

```text
https://projector-blaspheme-angelfish.ngrok-free.dev/api/public/payments/vnpay/ipn
```

Return URL local trong `.env` backend:

```text
http://localhost:3000/checkout/vnpay-return
```

### Production co can ngrok khong

Khong. Production khong can ngrok vi Railway da co public domain:

```text
https://agri-ecommerce-backend-production.up.railway.app
```

IPN production:

```text
https://agri-ecommerce-backend-production.up.railway.app/api/public/payments/vnpay/ipn
```

Return production:

```text
https://agri-ecommerce-sigma.vercel.app/checkout/vnpay-return
```

## 6. Cac loi da gap va cach fix

### Loi 1: `VNPay chưa được cấu hình`

Thong bao:

```text
VNPay chưa được cấu hình. Vui lòng thiết lập VNPAY_TMN_CODE, VNPAY_HASH_SECRET và VNPAY_RETURN_URL
```

Nguyen nhan:

- Backend chua doc duoc `.env`.
- Thieu `VNPAY_TMN_CODE`.
- Thieu `VNPAY_HASH_SECRET`.
- Thieu `VNPAY_RETURN_URL`.
- Sua `.env` xong nhung chua restart backend.

Cach fix:

1. Them bien vao `agri-ecommerce-backend/.env`.
2. Kiem tra `application.yml` da import `.env`:

```yaml
spring:
  config:
    import:
      - optional:file:.env[.properties]
      - optional:file:agri-ecommerce-backend/.env[.properties]
```

3. Restart backend.
4. Test lai checkout voi `paymentMethod=vnpay`.

### Loi 2: COD thanh cong nhung VNPay bi 500

Nguyen nhan:

- Luong COD khong can VNPay env.
- Luong VNPay can validate config va tao payment URL.
- Neu env thieu hoac service tao URL loi, API checkout/payment tra 500 hoac error he thong.

Cach fix:

- Them validate config ro rang trong backend de tra message de hieu.
- Tach luong:
  - `/checkout` tao order.
  - `/payment/vnpay` tao URL thanh toan.
- Frontend hien loi cau hinh thay vi chi bao "loi he thong".

### Loi 3: Thanh toan demo xong nhung admin van thay payment `pending`

Nguyen nhan:

- IPN chua goi duoc vao backend local.
- VNPay return chi dung de hien thi ket qua, khong phai nguon cap nhat chinh.
- Localhost khong truy cap duoc tu server VNPay.

Cach fix local:

- Chay `ngrok http 8080`.
- Dang ky IPN URL bang ngrok:

```text
https://<ngrok-domain>/api/public/payments/vnpay/ipn
```

Cach fix production:

- Dung backend Railway public domain lam IPN URL:

```text
https://agri-ecommerce-backend-production.up.railway.app/api/public/payments/vnpay/ipn
```

### Loi 4: `ngrok is not recognized`

Nguyen nhan:

- `ngrok.exe` da tai ve nhung folder chua ngrok chua nam trong `Path`.

Cach fix nhanh:

```powershell
cd <folder-chua-ngrok.exe>
.\ngrok.exe config add-authtoken <NGROK_AUTHTOKEN>
.\ngrok.exe http 8080
```

Cach fix lau dai:

- Them folder chua `ngrok.exe` vao Windows Environment Variables `Path`.
- Dong terminal cu, mo terminal moi.
- Chay:

```powershell
ngrok version
```

### Loi 5: Admin login bam dang nhap chi reload

Trieu chung:

- Bam login admin nhung trang reload/khong vao dashboard.
- De nghi day la loi cu vi truoc do da fix mot lan.

Nguyen nhan thuong gap:

- Form submit mac dinh cua browser chua `preventDefault`.
- Frontend luu token sai scope customer/admin.
- API login thanh cong nhung role khong duoc check dung.
- CORS/API base URL sai lam request fail nhung UI nhin nhu reload.

Cach fix trong code hien tai:

- `admin/login/page.jsx` dung `event.preventDefault()`.
- Goi `authService.login`.
- Kiem tra role bang `isAdminUser`.
- Luu session vao scope admin bang `saveAuthSession(payload, { scope: AUTH_SCOPES.admin })`.
- Redirect bang `router.replace(getNextPath())`.
- `axios-client.js` neu gap 401 o route admin thi clear admin session va redirect ve `/admin/login?next=...`.

Checklist test admin login:

1. Mo DevTools Network.
2. Login admin.
3. Request dung phai la:

```http
POST /api/auth/login
```

4. Response co `accessToken` va user role admin.
5. Local storage/session storage co key auth admin.
6. Browser redirect sang `/admin`, khong reload ve login.

### Loi 6: Frontend production bi CORS

Thong bao trong Console:

```text
Access to XMLHttpRequest at 'https://agri-ecommerce-backend-production.up.railway.app/api/...'
from origin 'https://agri-ecommerce-8sxakaj7o-dh-ung.vercel.app'
has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Nguyen nhan:

- Vercel tao nhieu deployment URL co doan random.
- Backend ban dau chi allow exact origin, nen preview deployment bi chan.

Cach fix:

- Trong `SecurityConfig.java` them ho tro:

```java
config.setAllowedOrigins(parseCsv(allowedOrigins));
config.setAllowedOriginPatterns(parseCsv(allowedOriginPatterns));
```

- Trong `application.yml`:

```yaml
app:
  cors:
    allowed-origins: ${APP_CORS_ALLOWED_ORIGINS:http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001}
    allowed-origin-patterns: ${APP_CORS_ALLOWED_ORIGIN_PATTERNS:https://agri-ecommerce*.vercel.app}
```

- Tren Railway them bien:

```properties
APP_CORS_ALLOWED_ORIGINS=https://agri-ecommerce-sigma.vercel.app,http://localhost:3000,http://127.0.0.1:3000
APP_CORS_ALLOWED_ORIGIN_PATTERNS=https://agri-ecommerce*.vercel.app
```

Sau khi sua Railway Variables phai redeploy backend.

### Loi 7: Vercel van dung URL random

Nguyen nhan:

- Moi deployment Vercel co mot URL rieng, vi du:

```text
https://agri-ecommerce-8sxakaj7o-dh-ung.vercel.app
```

- Day la preview/deployment URL, khong nen gui mentor.

Cach dung URL on dinh:

- Dung stable alias:

```text
https://agri-ecommerce-sigma.vercel.app
```

- Neu muon domain dep rieng, vao Vercel Project -> Domains -> Add Domain, tro DNS ve Vercel.

### Loi 8: Sua Vercel env xong nhung web khong doi

Nguyen nhan:

- Next.js doc `NEXT_PUBLIC_*` vao bundle luc build.
- Sua Environment Variables khong tu ap dung vao deployment cu.

Cach fix:

1. Vercel Project -> Settings -> Environment Variables.
2. Sua:

```properties
NEXT_PUBLIC_API_BASE_URL=https://agri-ecommerce-backend-production.up.railway.app/api
```

3. Save.
4. Vao Deployments.
5. Chon deployment moi nhat.
6. Bam `Redeploy`.
7. Mo lai stable domain va hard refresh.

### Loi 9: Railway build backend loi Java/JAVA_HOME

Trieu chung:

```text
JAVA_HOME environment variable is not defined correctly
```

Nguyen nhan:

- Railway build tu root repo voi builder mac dinh khong nhan dung module backend/Java.

Cach fix:

- Them Dockerfile o root repo:

```dockerfile
FROM eclipse-temurin:21-jdk AS build

WORKDIR /workspace/agri-ecommerce-backend
COPY agri-ecommerce-backend/ ./

RUN chmod +x mvnw && ./mvnw -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=build /workspace/agri-ecommerce-backend/target/agri-ecommerce-backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
```

- Them `railway.json`:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

- Them `.dockerignore`:

```text
.git
.vercel
agri-ecommerce-backend/target
agri-ecommerce-frontend/.next
agri-ecommerce-frontend/node_modules
**/.env
**/.env.*
```

## 7. Cau hinh Vercel frontend

### Import project

Tren Vercel:

1. New Project.
2. Import GitHub repo `phung086/agri-ecommerce`.
3. Branch production: `develop`.
4. Root Directory:

```text
agri-ecommerce-frontend
```

5. Framework preset: Next.js neu Vercel nhan ra; neu khong thi de Other cung duoc, mien build command dung.
6. Build Command:

```text
npm run build
```

7. Install Command:

```text
npm install
```

8. Output Directory de trong mac dinh cua Next.js.

### Environment Variables Vercel

Bat buoc:

```properties
NEXT_PUBLIC_API_BASE_URL=https://agri-ecommerce-backend-production.up.railway.app/api
```

Chon Environment:

- Nen chon `Production and Preview` de preview deployment cung goi backend production khi demo.
- Neu muon tach preview/dev sau nay thi tao them backend staging.

### Sau khi deploy

Dung stable domain:

```text
https://agri-ecommerce-sigma.vercel.app
```

Khong dung random deployment URL de gui mentor, vi moi deploy co the doi.

### Kiem tra frontend da tro dung backend

Mo DevTools -> Network -> Fetch/XHR -> reload trang.

Request dung phai co dang:

```text
https://agri-ecommerce-backend-production.up.railway.app/api/public/...
```

Neu van thay:

```text
http://localhost:8080/api/...
```

thi frontend chua doc dung env hoac chua redeploy.

## 8. Cau hinh Railway backend

### Service chinh

Service backend:

```text
agri-ecommerce-backend
```

Public domain:

```text
https://agri-ecommerce-backend-production.up.railway.app
```

Port:

```text
8080
```

Healthcheck:

```text
/api/health
```

### Root Directory tren Railway

Voi cach hien tai, de `Root Directory` trong.

Ly do:

- `Dockerfile` nam o root repo.
- `railway.json` nam o root repo.
- Dockerfile tu root copy module `agri-ecommerce-backend/`.

Neu set Root Directory la `agri-ecommerce-backend` thi Railway se khong thay dung Dockerfile root hien tai, tru khi doi lai cau truc Dockerfile/railway.json.

### Builder

Railway Settings -> Build:

```text
Builder: Dockerfile
Dockerfile Path: Dockerfile
```

### Bien moi truong Railway can co

Database:

```properties
DB_HOST=...
DB_PORT=3306
DB_NAME=...
DB_USERNAME=...
DB_PASSWORD=...
DB_URL=jdbc:mysql://...
```

JWT:

```properties
JWT_SECRET=...
JWT_EXPIRATION_MS=86400000
```

Public/CORS:

```properties
APP_PUBLIC_BASE_URL=https://agri-ecommerce-sigma.vercel.app
APP_CORS_ALLOWED_ORIGINS=https://agri-ecommerce-sigma.vercel.app,http://localhost:3000,http://127.0.0.1:3000
APP_CORS_ALLOWED_ORIGIN_PATTERNS=https://agri-ecommerce*.vercel.app
```

VNPay:

```properties
VNPAY_PAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_TMN_CODE=your_sandbox_tmn_code
VNPAY_HASH_SECRET=your_sandbox_hash_secret
VNPAY_RETURN_URL=https://agri-ecommerce-sigma.vercel.app/checkout/vnpay-return
VNPAY_EXPIRE_MINUTES=15
```

AI chatbot neu bat:

```properties
AI_CHATBOT_ENABLED=true
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=your_gemini_key
AI_MAX_PRODUCTS_CONTEXT=10
AI_TIMEOUT_SECONDS=20
```

Khong commit cac gia tri secret that vao Git.

### Apply Variables tren Railway

Khi sua variable:

1. Railway -> backend service -> Variables.
2. Sua value.
3. Bam dau check/apply.
4. Bam `Deploy` hoac `Redeploy`.
5. Xem Logs de dam bao app start thanh cong.

### Loi `GitHub Repo not found`

Neu Railway Settings -> Source hien:

```text
GitHub Repo not found
```

thi auto deploy co the khong kich hoat khi merge code moi vao GitHub.

Cach fix:

1. Railway -> Project Settings hoac Service Settings -> Source.
2. Disconnect repo neu dang loi.
3. Connect lai GitHub repo `phung086/agri-ecommerce`.
4. Cap quyen Railway GitHub App truy cap repo.
5. Chon production branch:

```text
develop
```

6. Giu Root Directory trong nhu giai thich tren.
7. Deploy lai.

Neu chua fix GitHub integration, van co the deploy thu cong bang Railway CLI.

## 9. Auto deploy khi co code moi

### Frontend Vercel

Neu project Vercel dang connect repo va branch production la `develop`:

- Code merge vao `develop` se tu deploy production.
- Neu chi push branch feature, Vercel tao preview deployment.
- Domain stable production van la `https://agri-ecommerce-sigma.vercel.app`.

### Backend Railway

Neu Railway connect repo dung va branch production la `develop`:

- Code merge vao `develop` se tu deploy backend production.

Neu Railway van bao `GitHub Repo not found`:

- Auto deploy co the khong chay.
- Can reconnect repo/GitHub App.
- Trong luc chua fix, deploy thu cong:

```powershell
cd D:\agri-ecommerce-ai-merge
git checkout develop
git pull origin develop
railway link
railway redeploy --from-source
```

Chi dung deploy thu cong khi chac chan local dang o commit moi nhat cua `develop`.

## 10. AI chatbot production

Phan chatbot AI da dong bo tu huong `agri-ecommerce-ai` va bo sung cau hinh production.

Endpoint backend:

```http
POST /api/public/ai-chat/messages
```

Cau hinh:

```properties
AI_CHATBOT_ENABLED=true
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=...
```

Neu thieu key hoac `AI_CHATBOT_ENABLED=false`:

- Backend khong crash.
- Chatbot dung fallback response.
- UI co the bao ket noi tu van gian doan hoac tra loi co tinh fallback.

De bat chatbot tren Railway:

1. Backend service -> Variables.
2. Them/sua cac bien AI.
3. Redeploy backend.
4. Test tu frontend hoac bang API.

Khong dua Gemini API key vao code, issue, screenshot public hay tai lieu nop mentor. Neu key da lo ra ngoai, nen rotate key tren Google AI Studio.

## 11. Checklist test local

### Test checkout dia chi

1. Login customer.
2. Vao checkout khi chua co dia chi.
3. Kiem tra form tu mo.
4. Chon tinh -> danh sach quan/huyen thay doi.
5. Chon quan/huyen -> danh sach xa/phuong thay doi.
6. Nhap dia chi cu the.
7. Them dia chi.
8. Reload checkout.
9. Neu co dia chi mac dinh, form them dia chi phai an; chi con nut `Them dia chi moi`.

### Test VNPay local khong IPN

1. Backend local 8080.
2. Frontend local 3000.
3. `.env` backend co VNPay sandbox.
4. `VNPAY_RETURN_URL=http://localhost:3000/checkout/vnpay-return`.
5. Checkout voi VNPay.
6. Thanh toan bang the test.
7. Browser ve trang return.
8. Payment co the van `pending` neu chua cau hinh IPN/ngrok.

### Test VNPay local co IPN

1. Chay:

```powershell
ngrok http 8080
```

2. Lay forwarding HTTPS.
3. Dat IPN test:

```text
https://<ngrok-domain>/api/public/payments/vnpay/ipn
```

4. Checkout VNPay.
5. Thanh toan bang the test.
6. Kiem tra admin order/payment phai chuyen completed sau khi IPN ve.

### Test admin login

1. Mo `/admin/login`.
2. Login tai khoan admin.
3. Network request `POST /api/auth/login` tra 200.
4. Router sang `/admin`.
5. Reload `/admin`, van giu session neu token con han.

## 12. Checklist test production

### Backend health

Mo:

```text
https://agri-ecommerce-backend-production.up.railway.app/api/health
```

Ky vong: HTTP 200.

### Frontend goi dung backend

Mo:

```text
https://agri-ecommerce-sigma.vercel.app
```

DevTools -> Network -> Fetch/XHR. Request API phai la:

```text
https://agri-ecommerce-backend-production.up.railway.app/api/...
```

### CORS

Neu co loi CORS:

1. Kiem tra Railway variable:

```properties
APP_CORS_ALLOWED_ORIGINS
APP_CORS_ALLOWED_ORIGIN_PATTERNS
```

2. Redeploy backend.
3. Hard refresh frontend.

### VNPay production sandbox

1. Railway:

```properties
VNPAY_RETURN_URL=https://agri-ecommerce-sigma.vercel.app/checkout/vnpay-return
```

2. VNPay Merchant/SIT IPN:

```text
https://agri-ecommerce-backend-production.up.railway.app/api/public/payments/vnpay/ipn
```

3. Frontend checkout chon VNPay.
4. Thanh toan bang the test.
5. Return page hien ket qua.
6. Admin Orders/Payments thay payment `completed`.

### AI chatbot

1. Railway Variables co `AI_CHATBOT_ENABLED=true` va `GEMINI_API_KEY`.
2. Redeploy backend.
3. Mo frontend, hoi:

```text
Goi y giup toi san pham ca tuoi khoang 100k
```

4. Ky vong chatbot goi y san pham tu database, khong bao fallback/mat ket noi.

## 13. Huong dan cho thanh vien khac pull code ve

Thanh vien khac pull code ve co the chay duoc neu cau hinh `.env` rieng.

Backend `.env` local toi thieu:

```properties
DB_HOST=localhost
DB_PORT=3306
DB_NAME=veggie_main
DB_USERNAME=root
DB_PASSWORD=your_password

JWT_SECRET=change_this_secret_key_min_32_chars
JWT_EXPIRATION_MS=86400000

APP_PUBLIC_BASE_URL=http://localhost:3000
APP_CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

VNPAY_PAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_TMN_CODE=team_sandbox_tmn_code
VNPAY_HASH_SECRET=team_sandbox_hash_secret
VNPAY_RETURN_URL=http://localhost:3000/checkout/vnpay-return
VNPAY_EXPIRE_MINUTES=15

AI_CHATBOT_ENABLED=false
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=
AI_MAX_PRODUCTS_CONTEXT=10
AI_TIMEOUT_SECONDS=20
```

Frontend `.env.local`:

```properties
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
```

Neu thanh vien muon test VNPay IPN local:

- Moi nguoi tu chay ngrok rieng.
- Moi nguoi co public ngrok URL rieng.
- IPN URL phai doi theo ngrok URL cua may dang test.

Dung chung sandbox secret cua team co the chap nhan cho demo noi bo, nhung:

- Khong commit secret.
- Khong dua vao chat public/tai lieu public.
- Production that phai dung secret production rieng va quan ly quyen chat che.

## 14. Thu tu thao tac deploy chuan tu dau

### Buoc 1: Merge code vao develop

```powershell
git checkout develop
git pull origin develop
git merge feature/your-feature
git push origin develop
```

Neu lam qua PR:

1. Push feature branch.
2. Tao PR vao `develop`.
3. Resolve conflict neu co.
4. Merge PR.

### Buoc 2: Vercel tu deploy frontend

Kiem tra:

- Vercel Project -> Deployments.
- Deployment moi nhat branch `develop`.
- Status `Ready`.
- Visit stable domain.

Neu env vua sua:

- Bam Redeploy.

### Buoc 3: Railway tu deploy backend

Kiem tra:

- Railway service `agri-ecommerce-backend`.
- Deployments -> deployment moi nhat `Completed`.
- Logs khong co exception.
- Healthcheck `/api/health` pass.

Neu Railway khong auto deploy vi `GitHub Repo not found`:

- Reconnect GitHub repo.
- Hoac deploy thu cong tam thoi bang CLI.

### Buoc 4: Test smoke production

1. Mo homepage.
2. Mo danh muc/san pham.
3. Login customer.
4. Them gio hang.
5. Checkout COD.
6. Checkout VNPay sandbox.
7. Login admin.
8. Xem Orders/Payments.
9. Test chatbot neu bat.

## 15. Bang tom tat loi va cach xu ly nhanh

| Loi | Nguyen nhan | Cach fix |
| --- | --- | --- |
| VNPay chua cau hinh | Thieu TMN/secret/return URL hoac chua restart backend | Them env, restart/redeploy backend |
| COD OK, VNPay loi | Luong VNPay can config va tao signed URL | Kiem tra env VNPay va logs backend |
| Paid demo nhung pending | IPN chua ve backend | Local dung ngrok, production dung Railway IPN URL |
| ngrok not recognized | Chua them PATH | Chay `.\ngrok.exe` trong folder hoac them PATH |
| Admin login reload | Form/session/scope/API base URL loi | `preventDefault`, luu scope admin, check role, CORS dung |
| CORS tren Vercel | Backend chua allow deployment domain | Them origin/pattern, redeploy Railway |
| Vercel van goi localhost | Env sai/chua redeploy | Sua `NEXT_PUBLIC_API_BASE_URL`, redeploy |
| Railway build loi JAVA_HOME | Builder mac dinh khong dung module Java | Dung Dockerfile Java 21 o root |
| URL Vercel co random | Dung deployment URL | Dung stable alias `agri-ecommerce-sigma.vercel.app` |
| Auto deploy Railway khong chay | `GitHub Repo not found` | Reconnect Railway GitHub App/repo |

## 16. Diem can nho khi len production that

Sandbox va production that khac nhau:

- Sandbox dung the test, khong co tien that.
- Production that can hop dong VNPay, terminal production va secret production.
- Return URL va IPN URL phai la HTTPS domain that.
- Khong dung ngrok trong production.
- Khong dung secret sandbox cho production that.
- Nen co domain rieng neu mentor/reviewer can URL dep va on dinh.

Production hien tai phu hop demo mentor:

- Frontend: Vercel.
- Backend: Railway.
- Database: Railway MySQL.
- Payment: VNPay Sandbox.
- AI chatbot: Gemini qua Railway env.

## 17. Cau tra loi ngan de review voi mentor

Neu mentor hoi "Dia chi lam nhu the nao?":

> Em doi checkout tu input thu cong sang bo chon dia chi Viet Nam 3 cap: tinh/thanh pho, quan/huyen, xa/phuong, sau do nhap dia chi cu the. Neu user da co dia chi mac dinh thi form them dia chi se an di de checkout gon hon; chi khi bam Them dia chi moi moi mo form.

Neu mentor hoi "VNPay chay nhu the nao?":

> App tao order truoc voi payment pending, sau do backend tao URL VNPay co checksum HMAC SHA512 va frontend redirect sang VNPay. Sau khi thanh toan, VNPay redirect ve return page de hien ket qua, con backend cap nhat trang thai thanh toan qua IPN public endpoint.

Neu mentor hoi "Tai sao can ngrok?":

> Vi VNPay IPN la server VNPay goi nguoc vao backend. Localhost khong truy cap duoc tu ben ngoai, nen dung ngrok de tao public HTTPS URL tro ve local backend. Len production Railway da co public domain nen khong can ngrok nua.

Neu mentor hoi "Len production da lam gi?":

> Frontend deploy tren Vercel tu folder `agri-ecommerce-frontend`, backend deploy tren Railway bang Dockerfile Java 21 o root repo. Vercel dung `NEXT_PUBLIC_API_BASE_URL` tro ve Railway backend, backend cau hinh CORS cho domain Vercel va pattern `agri-ecommerce*.vercel.app`, VNPay return URL tro ve Vercel, IPN tro ve Railway.

Neu mentor hoi "Code moi merge co tu update production khong?":

> Co, neu Vercel va Railway deu connect GitHub repo va production branch la `develop`. Vercel dang deploy frontend theo `develop`; Railway cung can reconnect neu con hien `GitHub Repo not found`, neu khong auto deploy backend co the khong kich hoat.
