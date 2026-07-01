# Báo cáo tổng hợp quá trình build backend Agri E-commerce

Ngày lập: 28/06/2026  
Chuẩn bị cho buổi review: 29/06/2026  
Dự án: Hệ thống quản lý và kinh doanh nông sản trực tuyến  
Phạm vi: `agri-ecommerce-backend`, schema MySQL trong `database/veggie-main.sql`, audit FE-BE trong `docs/fe-be-audit-2026-06-23.md`

## 1. Tóm tắt điều hành

Backend được build để biến giao diện bán hàng nông sản từ mức hiển thị dữ liệu thành một hệ thống vận hành thật: có tài khoản, phân quyền, danh mục, sản phẩm, giỏ hàng, đặt hàng, thanh toán, giao hàng, tồn kho, dashboard, thông báo, đánh giá, liên hệ và chat hỗ trợ.

Cách triển khai chính là xây dựng API bằng Spring Boot theo kiến trúc nhiều lớp: Controller nhận request, Service xử lý nghiệp vụ, Repository truy cập MySQL, Entity ánh xạ bảng, DTO/Mapper chuẩn hóa dữ liệu trả về. Backend dùng JWT để xác thực stateless, BCrypt để mã hóa mật khẩu, `@PreAuthorize` để phân quyền theo vai trò, transaction để đảm bảo các luồng quan trọng như checkout, hủy đơn, hoàn tiền và cập nhật tồn kho không bị sai lệch.

Kết quả hiện tại là một backend có phạm vi nghiệp vụ khá đầy đủ: 241 file Java, 34 controller, 126 endpoint mapping, 20 entity/domain class, 19 repository, 24 service interface và 24 service implementation. Các module chính đã có API thật cho public marketplace, customer, admin và delivery staff. Điểm cần lưu ý là test context hiện tại phụ thuộc MySQL local nên khi môi trường không có credential phù hợp thì `mvnw test` sẽ fail ở bước kết nối database.

## 2. Vì sao phải build backend?

### 2.1. Vì frontend cần dữ liệu và nghiệp vụ thật

Nếu chỉ có frontend, các chức năng như thêm giỏ hàng, checkout, cập nhật đơn hàng hoặc dashboard chỉ dừng ở mock data/local state. Backend giải quyết phần dữ liệu thật và quy tắc thật:

- Lưu người dùng, vai trò, sản phẩm, giỏ hàng, đơn hàng, thanh toán, coupon, đánh giá, wishlist, thông báo và chat vào MySQL.
- Chuẩn hóa API để frontend gọi thống nhất qua `/api/...`.
- Đảm bảo thao tác quan trọng có kiểm tra quyền, kiểm tra dữ liệu, kiểm tra tồn kho và xử lý lỗi nhất quán.

### 2.2. Vì hệ thống thương mại điện tử cần kiểm soát nghiệp vụ tập trung

Các luồng như đặt hàng và giao hàng không thể xử lý an toàn ở frontend vì dễ bị sửa request hoặc sai trạng thái. Backend là nơi giữ luật nghiệp vụ:

- Sản phẩm phải còn hàng mới được thêm vào giỏ.
- Checkout phải kiểm tra tồn kho, coupon, địa chỉ giao hàng và phương thức thanh toán.
- Khi tạo đơn phải trừ tồn kho, tạo payment, tạo lịch sử trạng thái và xóa cart.
- Khi hủy đơn phải hoàn tồn kho, giảm lượt dùng coupon và cập nhật payment.
- PayPal order phải được xác nhận thanh toán trước khi admin chuyển sang processing.
- Delivery staff chỉ được xem và cập nhật đơn được phân công.

### 2.3. Vì cần bảo mật và phân quyền

Dự án có nhiều nhóm người dùng: guest, customer, admin, delivery staff và staff. Backend cần tách quyền rõ ràng:

- Public API cho khách xem danh mục, sản phẩm, review, SEO, sitemap và chat guest.
- Customer API cho profile, cart, checkout, order, payment, shipping address, wishlist, review, notification và chat.
- Admin API cho quản lý users, roles, permissions, categories, products, uploads, orders, payments, coupons, contacts, reviews, dashboard và inventory.
- Delivery API cho nhân viên giao hàng xem đơn được phân công và cập nhật trạng thái giao.

### 2.4. Vì cần nền tảng có thể mở rộng và kiểm thử

Kiến trúc nhiều lớp giúp dự án dễ mở rộng:

- Thêm API mới bằng cách đi theo cùng pattern Controller - Service - Repository - DTO - Mapper.
- Dễ tách rule nghiệp vụ khỏi controller.
- Dễ thay đổi database/schema mà ít ảnh hưởng tới frontend.
- Dễ bổ sung test theo từng service hoặc controller.

## 3. Backend được build như thế nào?

### 3.1. Phân tích domain và database

Backend được thiết kế quanh schema MySQL có sẵn trong `database/veggie-main.sql` và migration `V1__baseline_veggie_schema.sql`. Các bảng nghiệp vụ chính gồm:

| Nhóm | Bảng/entity chính | Vai trò |
|---|---|---|
| Tài khoản | `users`, `roles`, `permissions`, `role_permissions` | Quản lý người dùng, vai trò, quyền truy cập |
| Catalog | `categories`, `products`, `product_images` | Danh mục, sản phẩm, ảnh, tồn kho, trạng thái bán |
| Mua hàng | `cart_items`, `shipping_addresses`, `orders`, `order_items` | Giỏ hàng, địa chỉ giao, đơn hàng, chi tiết đơn |
| Vận hành | `order_status_history`, `payments`, `coupons`, `notifications` | Trạng thái đơn, thanh toán, giảm giá, thông báo |
| Tương tác | `contacts`, `reviews`, `wishlists`, `chat_messages` | Liên hệ, đánh giá, wishlist, chat hỗ trợ |
| Bảo mật | `password_reset_tokens` | Quên mật khẩu và reset password |

Từ domain này, backend tạo các Entity tương ứng, Repository để truy vấn, DTO request/response để không lộ trực tiếp Entity ra ngoài API, và Mapper để chuyển đổi dữ liệu.

### 3.2. Chọn stack kỹ thuật

Backend dùng stack:

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Framework | Spring Boot 4.1.0 | Phù hợp REST API, security, JPA, validation |
| Ngôn ngữ | Java 21 | Ổn định, mạnh cho backend doanh nghiệp |
| Build tool | Maven wrapper | Build nhất quán giữa các máy |
| Database | MySQL/MariaDB | Phù hợp schema hiện có của dự án |
| ORM | Spring Data JPA/Hibernate | Mapping entity và query repository nhanh |
| Security | Spring Security + JWT | API stateless, phù hợp frontend Next.js |
| Validation | Bean Validation | Chặn request sai từ controller boundary |
| API Docs | springdoc OpenAPI/Swagger UI | Dễ review và test contract API |
| Migration | Flyway tùy bật | Có baseline schema và migration bổ sung |
| Boilerplate | Lombok | Giảm code getter/setter/builder |

### 3.3. Tổ chức project theo layer

Cấu trúc backend hiện tại:

| Package | Trách nhiệm |
|---|---|
| `controller` | Định nghĩa REST endpoint theo nhóm admin/auth/customer/delivery/public |
| `service` và `service.impl` | Xử lý nghiệp vụ, transaction, validation logic |
| `repository` | Truy vấn database bằng Spring Data JPA |
| `entity` | Ánh xạ bảng database |
| `dto.request` và `dto.response` | Chuẩn hóa input/output API |
| `mapper` | Chuyển Entity sang DTO response |
| `security` | JWT filter, token provider, principal, handler lỗi auth |
| `config` | Security, OpenAPI, Jackson, static resource, admin seeder |
| `common.exception` | Exception riêng và global exception handler |

Luồng request điển hình:

1. Frontend gọi API, ví dụ `POST /api/customer/orders/checkout`.
2. `OrderController` nhận request và lấy user id từ `UserPrincipal`.
3. `OrderServiceImpl` kiểm tra địa chỉ giao hàng, payment method, cart, tồn kho, coupon.
4. Repository lock/truy vấn dữ liệu cần thiết trong MySQL.
5. Service tạo order, order items, payment, status history, notification, trừ stock và xóa cart trong transaction.
6. Mapper trả `OrderResponse`.
7. Controller bọc kết quả trong `ApiResponse.success(...)`.

### 3.4. Build nền tảng bảo mật

Các bước bảo mật đã làm:

- Tạo `UserEntity`, `RoleEntity`, `PermissionEntity`, repository, DTO và mapper.
- Cấu hình Spring Security stateless, tắt session server-side.
- Dùng JWT để frontend gửi `Authorization: Bearer <token>`.
- Dùng `JwtAuthenticationFilter` để đọc token trước `UsernamePasswordAuthenticationFilter`.
- Dùng `BCryptPasswordEncoder` để hash password.
- Dùng `@EnableMethodSecurity` và `@PreAuthorize` để khóa API theo role.
- Tạo `JwtAuthenticationEntryPoint` và `CustomAccessDeniedHandler` để lỗi 401/403 trả response thống nhất.
- Seed tài khoản admin mặc định `admin@example.com` nếu database chưa có hoặc sai trạng thái.

Các route public được permit gồm health, uploads, auth register/login/forgot/reset password, public API, Swagger, sitemap và robots. Các route còn lại yêu cầu authenticated.

### 3.5. Chuẩn hóa response và lỗi

Backend dùng `ApiResponse<T>` cho response thống nhất:

- `success`: trạng thái thành công.
- `message`: thông báo cho frontend.
- `data`: payload chính.
- `errors`: lỗi validation hoặc lỗi chi tiết.
- `statusCode`: mã HTTP tương ứng.
- `timestamp`: thời điểm trả response.

`GlobalExceptionHandler` xử lý:

- `BadRequestException` thành HTTP 400.
- `ResourceNotFoundException` thành HTTP 404.
- Validation error thành HTTP 400 kèm map field lỗi.
- Malformed JSON thành HTTP 400.
- Access denied thành HTTP 403.
- Lỗi không bắt được thành HTTP 500.

## 4. Các giai đoạn build theo timeline

| Ngày | Giai đoạn | Nội dung chính |
|---|---|---|
| 17/06/2026 | Nền tảng auth và user | Tạo entity user/role, repository/DTO/mapper, JWT security, register/login/me, chuẩn hóa lỗi security, profile, admin user, role/permission, change password |
| 18/06/2026 | Catalog | Public category/product API, admin category/product management API |
| 20/06/2026 | Core ecommerce | Cart, customer checkout/order, admin order, delivery order, wishlist, review, notification, contact, coupon, dashboard, payment, support chat, seed admin, dọn local secret, chỉnh cấu trúc |
| 21/06/2026 | Hardening và mở rộng | Password reset, SEO metadata, sitemap/robots, product search facets, checkout stock preview, inventory alerts, consistency khi cancel/refund order |
| 22/06/2026 | Fix lỗi | Fix duplicate keyword trong AI assistant, trả 400 cho malformed JSON |
| 23/06/2026 | Upload | Admin upload ảnh sản phẩm/danh mục, ignore config local |
| 27/06/2026 | Enrich catalog | Bổ sung rating/review count và related products cho product catalog |

## 5. Các module backend đã hoàn thành

### 5.1. Public marketplace

Mục tiêu: khách chưa đăng nhập vẫn xem được sản phẩm, danh mục, review và nội dung SEO.

API chính:

- `GET /api/public/categories`
- `GET /api/public/categories/{slug}`
- `GET /api/public/products`
- `GET /api/public/products/{slug}`
- `GET /api/public/products/featured`
- `GET /api/public/products/search/suggestions`
- `GET /api/public/products/search/facets`
- `GET /api/public/products/{slug}/related`
- `GET /api/public/products/{productSlug}/reviews`
- `GET /api/public/seo/home`
- `GET /api/public/seo/products/{slug}`
- `GET /sitemap.xml`
- `GET /robots.txt`

Điểm đáng nói khi review:

- Public product mặc định chỉ trả sản phẩm `in_stock`, không lộ sản phẩm `hidden`.
- Có filter theo keyword, category slug, min/max price, status, page/size/sort.
- Có suggestion và facets để frontend làm search UX tốt hơn.
- Product response được enrich thêm ảnh, rating trung bình, review count và sản phẩm liên quan.

### 5.2. Auth và profile

Mục tiêu: tạo nền tảng đăng ký, đăng nhập, xác thực và quản lý thông tin người dùng.

API chính:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `GET /api/customer/profile`
- `PUT /api/customer/profile`
- `PATCH /api/customer/profile/change-password`

Nghiệp vụ chính:

- Email được normalize lowercase/trim.
- Password được hash bằng BCrypt.
- Login có `LoginAttemptService` để giới hạn số lần sai.
- Reset token được sinh random, lưu hash SHA-256, có thời hạn.
- Register customer tự động gán role `customer` và status `active`.

### 5.3. Customer cart và checkout

Mục tiêu: khách hàng có giỏ hàng server-side và tạo đơn thật.

API chính:

- `GET /api/customer/cart`
- `POST /api/customer/cart/items`
- `PUT /api/customer/cart/items/{itemId}`
- `DELETE /api/customer/cart/items/{itemId}`
- `DELETE /api/customer/cart`
- `POST /api/customer/orders/checkout/preview`
- `POST /api/customer/orders/checkout`
- `GET /api/customer/orders`
- `GET /api/customer/orders/{orderId}`
- `PATCH /api/customer/orders/{orderId}/cancel`
- `PATCH /api/customer/orders/{orderId}/complete`

Nghiệp vụ checkout:

1. Kiểm tra user và shipping address.
2. Kiểm tra payment method chỉ nhận `cash` hoặc `paypal`.
3. Lấy cart của user.
4. Lock sản phẩm bằng query `for update` khi checkout.
5. Kiểm tra sản phẩm còn bán, tồn kho đủ, số lượng hợp lệ.
6. Tính subtotal, coupon discount, shipping fee mặc định 25.000 VND, total.
7. Tạo `orders`, `order_items`, `payments`, `order_status_history`.
8. Trừ tồn kho sản phẩm, tự chuyển status sang `out_of_stock` nếu stock về 0.
9. Xóa cart sau khi tạo đơn.
10. Tạo notification cho customer.

Điểm mạnh: `checkout/preview` cho frontend kiểm tra trước khả năng đặt hàng, giúp giảm lỗi khi khách submit.

### 5.4. Admin order và delivery workflow

Mục tiêu: admin quản lý vòng đời đơn hàng và phân công giao hàng.

API admin chính:

- `GET /api/admin/orders`
- `GET /api/admin/orders/{orderId}`
- `PATCH /api/admin/orders/{orderId}/confirm`
- `PATCH /api/admin/orders/{orderId}/cancel`
- `PATCH /api/admin/orders/{orderId}/delivery-staff`
- `PATCH /api/admin/orders/{orderId}/status`
- `PATCH /api/admin/orders/{orderId}/payment/refund`
- `GET /api/admin/orders/delivery-staff`

Luồng trạng thái order:

`pending` -> `processing` -> `ready_for_delivery` -> `out_for_delivery` -> `delivered` -> `completed`

Luồng hủy:

- `pending`, `processing`, `ready_for_delivery` có thể chuyển sang `canceled` theo rule.
- Khi hủy sẽ restore inventory, release coupon usage, payment pending chuyển failed hoặc completed chuyển refunded nếu cần.

Rule quan trọng:

- Không cho chuyển trạng thái sai thứ tự.
- PayPal order phải thanh toán completed trước khi confirm processing.
- Muốn chuyển `out_for_delivery` phải có delivery staff.
- Mỗi lần đổi trạng thái đều lưu lịch sử và gửi notification.

### 5.5. Delivery staff

Mục tiêu: nhân viên giao hàng chỉ thao tác trên đơn được phân công.

API chính:

- `GET /api/delivery/orders`
- `GET /api/delivery/orders/history`
- `GET /api/delivery/orders/{orderId}`
- `PATCH /api/delivery/orders/{orderId}/out-for-delivery`
- `PATCH /api/delivery/orders/{orderId}/delivered`

Rule chính:

- Chỉ role `DELIVERY_STAFF` được gọi API delivery.
- Chỉ thấy đơn có `delivery_staff_id` là chính mình.
- Chỉ được mark out-for-delivery khi đơn `ready_for_delivery`.
- Chỉ được mark delivered khi đơn `out_for_delivery`.
- Khi delivered, hệ thống set `deliveredAt` và tự complete cash payment nếu đang pending.

### 5.6. Product, category, upload và inventory

Mục tiêu: admin quản lý catalog và tồn kho thật.

API chính:

- `GET/POST/PUT/DELETE /api/admin/categories`
- `GET/POST/PUT/DELETE /api/admin/products`
- `PATCH /api/admin/products/{id}/status`
- `PATCH /api/admin/products/{id}/stock`
- `POST /api/admin/uploads/images`
- `GET /api/admin/inventory/summary`
- `GET /api/admin/inventory/alerts`
- `PATCH /api/admin/inventory/products/{productId}/stock`
- `PATCH /api/admin/inventory/products/{productId}/stock/adjust`

Điểm đáng nói:

- Delete product là soft delete bằng cách chuyển status `hidden`, tránh mất dữ liệu lịch sử order.
- Stock về 0 thì tự chuyển `out_of_stock` nếu sản phẩm không hidden.
- Inventory alerts hỗ trợ ngưỡng low stock, critical, out_of_stock và gợi ý restock.

### 5.7. Payment và refund

Mục tiêu: quản lý thanh toán cho customer và admin.

API chính:

- `GET /api/customer/payments`
- `GET /api/customer/orders/{orderId}/payment`
- `PATCH /api/customer/orders/{orderId}/payment/paypal/confirm`
- `GET /api/admin/payments`
- `GET /api/admin/payments/{paymentId}`
- `PATCH /api/admin/payments/{paymentId}/status`
- `PATCH /api/admin/payments/{paymentId}/refund`

Rule chính:

- Payment method hợp lệ: `cash`, `paypal`.
- Payment status hợp lệ: `pending`, `completed`, `failed`, `refunded`.
- PayPal phải có transaction id và không được trùng payment khác.
- Payment đã completed/failed/refunded thì không cập nhật tùy tiện.
- Refund chỉ cho payment completed và order ở trạng thái có thể refund.

### 5.8. Dashboard, coupon, contact, review, wishlist, notification và chat

Các module hỗ trợ vận hành:

- Dashboard: tổng đơn, doanh thu, customer, product, low stock, contacts, coupons, reviews, revenue report, top products.
- Coupon: CRUD, active/inactive, usage limit, expiration, validate khi checkout.
- Contact: public gửi liên hệ, admin xem/mark replied/delete.
- Review: customer tạo/sửa/xóa review, public xem review theo sản phẩm, admin quản lý review.
- Wishlist: customer thêm/xóa/clear wishlist.
- Notification: list, unread count, mark read, read all, delete.
- Chat/AI assistant: guest/customer hỏi assistant, admin xem conversation và reply.

## 6. Kết quả đạt được

### 6.1. Kết quả định lượng

| Hạng mục | Kết quả hiện tại |
|---|---:|
| Tổng file Java backend | 241 |
| Controller | 34 |
| Endpoint mapping `GET/POST/PUT/PATCH/DELETE` | 126 |
| Entity/domain class | 20 |
| Repository | 19 |
| Service interface | 24 |
| Service implementation | 24 |
| DTO request/response | 85 |
| Migration SQL trong backend | 2 |
| Test class hiện có | 1 context test |

### 6.2. Kết quả theo vai trò người dùng

| Vai trò | Kết quả backend đã hỗ trợ |
|---|---|
| Guest | Xem danh mục/sản phẩm/review, search/filter/sort, featured, related products, SEO metadata, sitemap, contact, chat guest |
| Customer | Register/login, profile, change password, cart, checkout preview, checkout, orders, payment, shipping address, wishlist, review, notification, chat |
| Admin | Quản lý user/role/permission, category/product/upload, orders, delivery assignment, payment/refund, coupon, contact, review, dashboard, inventory |
| Delivery staff | Xem đơn được giao, lịch sử giao, chuyển out-for-delivery, xác nhận delivered |

### 6.3. Kết quả về chất lượng kỹ thuật

- API response thống nhất giúp frontend dễ xử lý success/error.
- JWT stateless giúp frontend Next.js dùng token linh hoạt.
- Role-based authorization giảm rủi ro admin/customer/delivery gọi nhầm API.
- Transaction bảo vệ các luồng có nhiều bước như checkout, cancel, refund, delivered.
- Query lock tồn kho giúp giảm nguy cơ bán vượt stock khi nhiều request đồng thời.
- Status transition rõ ràng giúp quy trình order không bị nhảy trạng thái sai.
- Có Swagger/OpenAPI UI để review contract API.
- Có cấu hình môi trường qua biến môi trường cho database, JWT, password reset, login lock, sitemap.

### 6.4. Kết quả kiểm chứng hiện tại

Lệnh đã chạy ngày 28/06/2026:

```powershell
.\mvnw.cmd test
.\mvnw.cmd -DskipTests package
```

Kết quả build/package: `.\mvnw.cmd -DskipTests package` pass, tạo JAR `target/agri-ecommerce-backend-0.0.1-SNAPSHOT.jar` và Spring Boot repackage thành công.

Kết quả test: Maven compile không cần biên dịch thêm vì class đã cập nhật, test bắt đầu chạy `AgriEcommerceBackendApplicationTests`, nhưng fail khi Spring Boot khởi tạo datasource MySQL:

```text
Access denied for user 'root'@'localhost' (using password: NO)
```

Kết luận kiểm chứng: lỗi nằm ở cấu hình môi trường test đang dùng database local mặc định `jdbc:mysql://localhost:3306/veggie_main` với user `root` không mật khẩu. Để test pass ổn định trong CI/local, cần thêm test profile riêng, ví dụ dùng H2/Testcontainers hoặc cung cấp `DB_USERNAME`, `DB_PASSWORD`, `DB_URL` phù hợp cho MySQL test.

## 7. Những vấn đề/rủi ro còn lại

| Mức | Vấn đề | Tác động | Hướng xử lý |
|---|---|---|---|
| Cao | Test context phụ thuộc MySQL local | Máy khác hoặc CI dễ fail nếu thiếu credential | Thêm `application-test.yml` và datasource test riêng |
| Cao | Frontend chưa dùng hết API backend | Một số màn vẫn mock/local state dù backend đã có API | Tiếp tục nối FE với admin orders, cart/checkout, delivery, coupons, contacts |
| Trung bình | Một số message trong code đang bị mojibake khi xem bằng terminal encoding hiện tại | Khó đọc log/source nếu encoding không thống nhất | Chuẩn hóa UTF-8 trong editor/terminal, kiểm tra file encoding |
| Trung bình | Staff role chưa có flow riêng hoàn chỉnh | Role có trong DB nhưng API nghiệp vụ staff chưa rõ | Xác định trách nhiệm staff và bổ sung endpoint nếu cần |
| Trung bình | Test coverage mới ở mức contextLoads | Chưa bắt được regression nghiệp vụ | Bổ sung unit/integration tests cho Auth, Cart, Checkout, Order transition, Payment |

## 8. Hướng phát triển tiếp theo

Ưu tiên 1: ổn định test và môi trường

- Tạo test profile không phụ thuộc MySQL local production.
- Thêm seed/test data tối thiểu.
- Bổ sung test cho checkout, cancel/refund, payment, delivery transition.

Ưu tiên 2: hoàn thiện tích hợp frontend

- Nối cart/checkout với API thật.
- Nối admin orders/delivery/coupon/contact/dashboard/inventory với API thật.
- Thêm customer order history, wishlist, notification, review UI.

Ưu tiên 3: nâng chất lượng vận hành

- Bổ sung logging request/error quan trọng.
- Thêm audit trail cho thao tác admin nhạy cảm.
- Tối ưu pagination/sort/filter cho bảng lớn.
- Chuẩn hóa message đa ngôn ngữ qua `messages_vi.properties` và `messages_en.properties`.

## 9. Gợi ý trình bày trong buổi review

Nếu cần trình bày ngắn trong 3-5 phút, có thể nói theo mạch sau:

1. "Mục tiêu backend là biến hệ thống bán nông sản từ giao diện/mock data thành hệ thống vận hành thật có database, phân quyền và nghiệp vụ."
2. "Em chọn Spring Boot, MySQL, JPA, Spring Security JWT vì phù hợp REST API, dễ tích hợp với frontend Next.js và dễ quản lý role admin/customer/delivery."
3. "Em tổ chức backend theo Controller - Service - Repository - Entity - DTO - Mapper để tách API, nghiệp vụ và database."
4. "Các module được build theo từng lớp: đầu tiên auth/JWT, sau đó catalog, cart-checkout-order, admin order/delivery, rồi các module vận hành như payment, coupon, notification, dashboard, inventory, SEO và chat."
5. "Điểm quan trọng nhất là các rule nghiệp vụ nằm ở backend: checkout kiểm tra tồn kho/coupon/payment, order chuyển trạng thái đúng luồng, hủy đơn hoàn stock/coupon/payment, delivery staff chỉ thấy đơn được phân công."
6. "Kết quả là backend hiện có 34 controller, 126 endpoint, 20 entity, 19 repository và API đã bao phủ hầu hết luồng guest/customer/admin/delivery."
7. "Việc còn lại là ổn định test profile database và tiếp tục nối frontend với toàn bộ API thật."

## 10. Kết luận

Quá trình build backend đã tạo được nền tảng kỹ thuật và nghiệp vụ chính cho hệ thống Agri E-commerce. Backend không chỉ cung cấp API CRUD đơn giản, mà đã xử lý các luồng quan trọng của thương mại điện tử: xác thực, phân quyền, catalog, giỏ hàng, checkout, order lifecycle, thanh toán, giao hàng, tồn kho, thông báo và dashboard.

Giá trị lớn nhất của phần backend là chuyển logic nhạy cảm từ frontend về server, giúp dữ liệu nhất quán hơn, bảo mật hơn và đủ nền tảng để frontend vận hành bằng API thật. Trạng thái hiện tại đủ tốt để review quá trình xây dựng, đồng thời cũng chỉ ra rõ các bước tiếp theo: chuẩn hóa test environment, tăng test coverage và hoàn thiện tích hợp frontend.
