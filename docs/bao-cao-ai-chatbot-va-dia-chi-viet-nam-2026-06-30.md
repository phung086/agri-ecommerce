# Bao cao phat trien AI chatbot va dia chi Viet Nam

Ngay thuc hien: 30/06/2026  
Nhanh lam viec: `feature/ai-chatbot-multi-role`  
Pham vi: hoan thien luong AI chatbot da tich hop truoc do va chuan hoa thao tac dia chi tren frontend bang JSON dia chi Viet Nam.

## 1. Muc tieu

- AI chatbot phai ho tro tu van dung ngu canh cua du an, khong chi tra loi chung chung.
- Chatbot can phan biet ngu canh nguoi dung: khach hang, admin, giao hang hoac khach chua dang nhap.
- Dia chi trong he thong can dung chung bo du lieu Viet Nam, gom tinh/thanh pho, quan/huyen, phuong/xa va dia chi cu the.
- Khong thay doi schema DB, khong doi contract API dang on dinh de tranh loi production.

## 2. Phan AI chatbot da phat trien

### 2.1. Backend

- Giu endpoint chinh: `POST /api/public/ai-chat/messages`.
- Mo rong request chatbot de nhan them:
  - `message`: noi dung nguoi dung hoi.
  - `audience`: ngu canh man hinh/nhom nguoi dung.
  - `contextType`: loai ngu canh, hien dang ho tro `auto`.
  - `currentPath`: duong dan man hinh frontend de router hieu ngu canh.
- Them lop phan tich vai tro va y dinh:
  - `AiChatRole`: phan loai `GUEST`, `CUSTOMER`, `ADMIN`, `DELIVERY`.
  - `AiChatIntent`: phan loai nhom cau hoi nhu san pham, gio hang, don hang, thanh toan, giao hang, admin, ho so.
  - `AiChatRoleResolver`: xac dinh vai tro dua tren token va duong dan.
  - `AiChatIntentRouter`: doc noi dung message de suy ra y dinh.
  - `AiChatContextAggregator`: lay du lieu doc-only tu database de dua vao prompt.
- Bo sung repository query doc-only:
  - `OrderRepository`: ho tro lay du lieu don hang theo ngu canh.
  - `PaymentRepository`: ho tro ngu canh thanh toan.
- `AiChatServiceImpl` xu ly theo flow:
  1. Nhan message tu frontend.
  2. Xac dinh vai tro nguoi hoi.
  3. Xac dinh y dinh cau hoi.
  4. Tong hop du lieu lien quan, gioi han so dong theo config.
  5. Goi Gemini neu co cau hinh.
  6. Neu AI loi hoac chua cau hinh, tra loi bang fallback rule-based de UI khong bi chet.
  7. Luu lich su chat nhu logic hien co.

### 2.2. Frontend

- `AiChatWidget.jsx` gui them:
  - `audience`
  - `contextType`
  - `currentPath`
  - token dang nhap neu co
- Widget van hien duoc tren production, neu backend AI tam loi se hien thong bao gian doan thay vi lam vo trang.
- Chatbot co kha nang goi y san pham, doc ngu canh gio hang/don hang/thanh toan va tra loi khac nhau theo vai tro.

### 2.3. Cau hinh production

- Khong hard-code API key trong code.
- Cac bien moi duoc mo ta trong `.env.example` va `application.yml`.
- Production can cau hinh key tren Railway environment variables, vi backend moi la noi goi Gemini.

## 3. Phan dia chi Viet Nam da phat trien

### 3.1. Huong tiep can

- Khong tao bang DB moi.
- Khong thay doi DTO backend:
  - Dang ky/profile van gui `address` dang chuoi.
  - Checkout shipping address van gui `fullName`, `phone`, `city`, `address`, `defaultAddress`.
- Frontend chiu trach nhiem lay JSON dia chi Viet Nam, cho nguoi dung chon va ghep chuoi dia chi truoc khi goi API.

### 3.2. File dung chung moi

- `agri-ecommerce-frontend/src/lib/vietnam-addresses.js`
  - Doc `src/data/vietnam-addresses.json`.
  - Export danh sach 63 tinh/thanh pho.
  - Tao form dia chi mac dinh.
  - Tim tinh/quan/xa theo code.
  - Validate dia chi co du tinh, quan/huyen, phuong/xa va dia chi cu the.
  - Ghep dia chi cho profile/register.
  - Ghep payload shipping address cho checkout.

- `agri-ecommerce-frontend/src/components/address/VietnamAddressFields.jsx`
  - Component dung chung cho tinh/thanh pho, quan/huyen, phuong/xa, dia chi cu the.
  - Khi doi tinh se reset quan/huyen va phuong/xa.
  - Khi doi quan/huyen se reset phuong/xa.
  - Component dung native select de nhe, it phu thuoc va phu hop UI hien tai.

### 3.3. Checkout

- Da refactor man hinh checkout de dung `VietnamAddressFields`.
- Logic tao dia chi giao hang khong doi contract voi backend:
  - `city`: ten tinh/thanh pho.
  - `address`: dia chi cu the + phuong/xa + quan/huyen.
  - `defaultAddress`: giu logic dia chi dau tien la mac dinh.
- Validation checkout bat buoc day du:
  - nguoi nhan
  - so dien thoai
  - tinh/thanh pho
  - quan/huyen
  - phuong/xa
  - dia chi cu the

### 3.4. Dang ky tai khoan khach hang

- Form dang ky khong con nhap dia chi tu do bang mot input don.
- Neu nguoi dung nhap dia chi khi dang ky, bat buoc chon du:
  - tinh/thanh pho
  - quan/huyen
  - phuong/xa
  - dia chi cu the
- Neu khong nhap dia chi, van cho dang ky de khong lam nang luong tao tai khoan.
- Payload gui backend van la `address` dang chuoi, nen backend khong can sua.

### 3.5. Profile khach hang

- Thay textarea dia chi bang component chon dia chi Viet Nam.
- Khi profile cu da co dia chi dang text, gia tri cu duoc dua vao o dia chi cu the de khong mat du lieu.
- Neu nguoi dung chon tinh/quan/xa moi nhung chua du thong tin, frontend chan submit va bao loi.
- Khi luu ho so, frontend ghep lai thanh chuoi `address` va goi API profile cu.

### 3.6. Profile admin

- Thay textarea dia chi lien he bang component chon dia chi Viet Nam.
- Giu payload backend cu: `address` dang chuoi.
- Giu dong bo session admin sau khi cap nhat profile.

## 4. Ly do lam theo cach nay

- Giam rui ro DB migration trong luc production dang on dinh.
- Mot component dung chung tranh viec checkout, dang ky va profile moi noi co logic dia chi khac nhau.
- JSON dia chi duoc import mot lan qua helper, de sau nay co the doi nguon du lieu ma khong can sua tung man hinh.
- Backend contract giu nguyen nen cac thanh vien khac pull code ve khong bi vo API cu.

## 5. Kiem thu da chay

Da chay cac lenh sau:

```powershell
npm run lint
```

Ket qua: pass.

```powershell
npm run build
```

Ket qua: pass, Next.js build thanh cong toan bo route.

```powershell
.\mvnw.cmd test
```

Ket qua: pass, backend test thanh cong.

```powershell
.\mvnw.cmd clean package -DskipTests
```

Ket qua: pass, build jar backend thanh cong.

## 6. Anh huong va rui ro

- Khong co migration database.
- Khong doi API endpoint.
- Khong doi logic thanh toan VNPay, coupon, checkout order, login admin.
- Dia chi profile cu dang text van duoc bao toan.
- Neu nguoi dung bat dau chon tinh/quan/xa ma chua chon du, frontend se chan luu de tranh dia chi dang do.

## 7. Viec can lam truoc khi dua len production

- Review diff lan cuoi.
- Neu muon deploy production, commit va push nhanh `feature/ai-chatbot-multi-role`, merge vao `develop`.
- Cho Vercel/Railway build tu `develop`.
- Kiem tra tren production:
  - Dang ky tai khoan moi co dia chi.
  - Cap nhat profile khach hang.
  - Cap nhat profile admin.
  - Them dia chi checkout.
  - Tao don COD.
  - Tao don VNPay sandbox.
  - Hoi chatbot o trang public, checkout, profile/admin neu co quyen.
