# Báo cáo audit đồng bộ Frontend - Backend

Ngày kiểm tra: 2026-06-23  
Dự án: Hệ thống Quản lý và Kinh doanh Nông sản Trực tuyến  
Phạm vi: `agri-ecommerce-frontend`, `agri-ecommerce-backend`, `database/veggie-main.sql`

## 1. Tổng quan

Kết luận nhanh: Backend đã có phần lớn API nghiệp vụ, theo layer Controller -> Service -> Repository -> Entity và đa số endpoint trả `ApiResponse`. Frontend build được, UI khá đầy ở marketplace/admin, nhưng nhiều flow chỉ là demo/local state. Luồng mua hàng chính hiện dừng ở giỏ hàng client-side; checkout/order/payment chưa nối API.

Kiểm chứng kỹ thuật:

| Hạng mục | Lệnh | Kết quả |
|---|---|---|
| Frontend lint | `npm run lint` | Pass |
| Frontend build | `npm run build` | Pass, sinh 14 route app |
| Backend test | `.\mvnw.cmd test` | Pass, 1 test context |

Rủi ro lớn nhất:

| Mức | Vấn đề | Tác động |
|---|---|---|
| P0 | `/` có cart local và nút Thanh toán nhưng không gọi cart/checkout API | Khách không tạo được đơn hàng thật |
| P0 | Admin orders/delivery/coupons/contacts dùng mock data | Nút/trang có hiển thị nhưng không vận hành dữ liệu thật |
| P1 | Admin categories/products chỉ đọc public API; create/update/delete là demo | Quản trị danh mục/sản phẩm không lưu DB |
| P1 | Thiếu route customer cho orders, shipping addresses, wishlist, reviews, notifications, AI chat | Backend có API nhưng người dùng không dùng được |
| P1 | Status order FE demo lệch backend (`processing` bị dùng như đang giao; backend có `ready_for_delivery`, `out_for_delivery`) | Khi nối API sẽ sai trạng thái nghiệp vụ |
| P2 | Response unwrap chưa thống nhất giữa service và page | Dễ phát sinh lỗi đọc `response.data`/`response.data.data` khi mở rộng |

## 2. FE Route/Page Inventory

| Route | File | Role | Service/API đang gọi | Trạng thái | Ghi chú |
|---|---|---|---|---|---|
| `/` | `src/app/page.js` | Guest/Customer | `marketplaceService.getCategories`, `getProducts` -> `/public/categories`, `/public/products` | Có lỗi logic flow | Browse/filter OK; cart local; checkout không có handler/API |
| `/profile` | `src/app/profile/page.jsx` | Customer/Guest | `/auth/register`, `/auth/login`, `/customer/profile` | Hoàn thiện một phần | Có profile/change password; chưa có shipping address CRUD thật |
| `/admin/login` | `src/app/admin/login/page.jsx` | Guest | `/auth/login` | Hoàn thiện phần login | Có loading/disable/error; chỉ cho `roleName === admin` |
| `/admin` | `src/app/admin/page.jsx` | Admin | users/categories/products; orders mock | Thiếu API đúng module | Dashboard chưa dùng `/admin/dashboard/*`, orders mock |
| `/admin/users` | `src/app/admin/users/page.jsx` | Admin | `/admin/users`, `/admin/roles`, PATCH status | Gần hoàn thiện | Có list/filter/status; thiếu create/edit role nếu cần |
| `/admin/categories` | `src/app/admin/categories/page.jsx` | Admin | GET `/public/categories` | Có UI/event nhưng chưa đúng API | Create/update/delete local demo; nên dùng `/admin/categories` |
| `/admin/products` | `src/app/admin/products/page.jsx` | Admin | GET `/public/products`, `/public/categories` | Có UI/event nhưng chưa đúng API | CRUD local demo; chưa upload ảnh; nên dùng `/admin/products` |
| `/admin/orders` | `src/app/admin/orders/page.jsx` | Admin | Không gọi API, dùng `mockOrders` | Thiếu API | BE đã có `/admin/orders` và status APIs |
| `/admin/delivery` | `src/app/admin/delivery/page.jsx` | Admin | Không gọi API, dùng `mockDeliveryOrders`, `mockDeliveryStaff` | Thiếu API/sai status | BE có assign delivery và delivery APIs |
| `/admin/coupons` | `src/app/admin/coupons/page.jsx` | Admin | Không gọi API, dùng `mockCoupons` | Thiếu API | BE có full `/admin/coupons` |
| `/admin/contacts` | `src/app/admin/contacts/page.jsx` | Admin | Không gọi API, dùng `mockContacts` | Thiếu API | BE có full `/admin/contacts` |
| `/admin/profile` | `src/app/admin/profile/page.jsx` | Admin | `/customer/profile` | Có logic nhưng lệch domain | Chạy được vì BE profile chỉ yêu cầu authenticated |
| `/test-api` | `src/app/test-api/page.jsx` | Dev | `/health` | Dev-only | Nên ẩn khỏi production nav |
| `/test-ui` | `src/app/test-ui/page.jsx` | Dev | Không API | Dev-only | Nên ẩn khỏi production nav |

Không thấy route FE riêng cho `/checkout`, `/cart`, `/orders`, `/wishlist`, `/notifications`, `/reviews`, `/contact`, `/chat`, `/delivery`, `/staff`.

## 3. Button & Event Flow Inventory

| Nhóm hành động | Page/component | Luồng hiện tại | API cần/đang gọi | Validate/loading/disable | Kết luận |
|---|---|---|---|---|---|
| Search/filter sản phẩm | `/` | Debounce 300ms, gọi list sản phẩm | GET `/public/products?page=0&size=12&keyword&categorySlug&minPrice&maxPrice&sort&status` | Có loading/empty/error; thiếu pagination URL | Đạt một phần |
| Reset filter | `/` | Reset state filter | Tự refetch `/public/products` | OK | Đạt |
| Add to cart | `ProductCard`, `QuickView` | Thêm vào `cart` local state | Chưa gọi; nên POST `/customer/cart/items` `{productId, quantity}` | Không loading/toast/auth | Chưa đạt |
| Cart +/-/remove/clear | `CartDrawer` | Update local state | Nên GET/PUT/DELETE `/customer/cart` | Không loading/API error | Chưa đạt |
| Thanh toán | `CartDrawer` | Button chỉ hiển thị, không handler | Nên sang `/checkout`, POST `/customer/orders/checkout/preview`, POST `/customer/orders/checkout` | Không handler | P0 |
| Login admin | `/admin/login` | Submit login, save scoped token | POST `/auth/login` | Có required/loading/disable/error | Đạt |
| Customer login/register | `/profile` | Login/register, save token | POST `/auth/login`, POST `/auth/register` | Có required/loading/disable/error | Đạt một phần |
| Profile update/change password | `/profile`, `/admin/profile` | Gọi profile API | GET/PUT/PATCH `/customer/profile` | Có loading/notice/error | Đạt một phần |
| Admin user status | `/admin/users` | Select đổi status, refetch thủ công | PATCH `/admin/users/{id}/status` `{status}` | Có disable theo row; thiếu confirm/toast | Đạt một phần |
| Category create/edit/delete | `/admin/categories` | Lưu/xóa local state demo | BE có POST/PUT/DELETE `/admin/categories` nhưng FE chưa dùng | Có form required; không API loading | Chưa đạt |
| Product create/edit/delete | `/admin/products` | Lưu/xóa local state demo | BE có POST/PUT/PATCH/DELETE `/admin/products` nhưng FE chưa dùng | Có form required; không API loading/upload | Chưa đạt |
| Orders view/update | `/admin/orders` | Xem dialog từ mock | BE có GET/PATCH `/admin/orders/*` | Không API/loading | Chưa đạt |
| Delivery assign/filter | `/admin/delivery` | Mock staff/orders | BE có GET `/admin/orders/delivery-staff`, PATCH assign, GET/PATCH `/delivery/orders` | Không API/loading | Chưa đạt |
| Coupon CRUD/toggle | `/admin/coupons` | Local demo | BE có `/admin/coupons` | Không API/loading | Chưa đạt |
| Contact view/replied | `/admin/contacts` | Local demo | BE có `/admin/contacts` | Không API/loading | Chưa đạt |

## 4. API Contract Matrix

| Module | FE service/function | FE endpoint | BE endpoint có chưa | Method khớp | Response | Vấn đề |
|---|---|---|---|---|---|---|
| Auth | `authService.login` | `/auth/login` | `/api/auth/login` | Có | `ApiResponse<AuthResponse>` | Page unwrap local; OK |
| Auth | `authService.register` | `/auth/register` | `/api/auth/register` | Có | `ApiResponse<AuthResponse>` | FE register không tự login; chấp nhận được |
| Auth | `authService.me` | `/auth/me` | `/api/auth/me` | Có | `ApiResponse<UserResponse>` | Chưa thấy FE dùng rộng |
| Profile | `profileService.*` | `/customer/profile` | `/api/customer/profile` | Có | `ApiResponse<UserResponse/Object>` | Tên API customer dùng cả admin; nên cân nhắc alias `/api/me` |
| Marketplace | `marketplaceService.getCategories` | `/public/categories` | `/api/public/categories` | Có | `ApiResponse<List<CategoryResponse>>` | OK |
| Marketplace | `marketplaceService.getProducts` | `/public/products` | `/api/public/products` | Có | `ApiResponse<PageResponse<ProductResponse>>` | FE chưa có pagination control |
| Admin users | `adminService.getUsers` | `/admin/users` | `/api/admin/users` | Có | `ApiResponse<List<UserResponse>>` | OK |
| Admin users | `adminService.updateUserStatus` | `/admin/users/{id}/status` | `/api/admin/users/{id}/status` | Có | `ApiResponse<UserResponse>` | OK |
| Admin roles | `adminService.getRoles` | `/admin/roles` | `/api/admin/roles` | Có | `ApiResponse<List<RoleResponse>>` | OK |
| Admin categories | `adminService.getCategories` | `/public/categories` | Có admin `/api/admin/categories` | Không đúng scope | Public list | Thiếu create/update/delete service |
| Admin products | `adminService.getProducts` | `/public/products` | Có admin `/api/admin/products` | Không đúng scope | Public page | Không thấy hidden/out_of_stock theo admin |
| Cart | Không có service | Local state | `/api/customer/cart`, `/items` | Chưa dùng | `ApiResponse<CartResponse>` | P0 |
| Checkout/order | Không có service | Không endpoint | `/api/customer/orders/checkout/*` | Chưa dùng | `ApiResponse<CheckoutPreview/Order>` | P0 |
| Admin orders | Không có service | Mock | `/api/admin/orders` | Chưa dùng | `PageResponse<OrderResponse>` | P0/P1 |
| Delivery | Không có service | Mock | `/api/delivery/orders` | Chưa dùng | `PageResponse<OrderResponse>` | P1 |
| Coupon | Không có service | Mock | `/api/admin/coupons` | Chưa dùng | `PageResponse<CouponResponse>` | P1 |
| Contact | Không có service | Mock | `/api/public/contacts`, `/api/admin/contacts` | Chưa dùng | `ContactResponse` | P1 |
| Review | Không có service | Không UI | `/api/public/products/{slug}/reviews`, `/api/customer/reviews` | Chưa dùng | Review DTOs | P2 |
| Wishlist | Không có service | Không UI | `/api/customer/wishlist` | Chưa dùng | Wishlist DTOs | P2 |
| Notification | Không có service | Bell icon static | `/api/notifications` | Chưa dùng | Notification DTOs | P2 |
| AI Chat | Không có service | Không UI | `/api/public/chat`, `/api/customer/chat`, `/api/admin/chat` | Chưa dùng | Chat DTOs | P2 |

## 5. FE có UI/nút nhưng Backend thiếu API

| Chức năng | FE đang cần | API đề xuất | Ghi chú | Ưu tiên |
|---|---|---|---|---|
| Upload ảnh category/product từ file | Admin category/product có file input, hiện base64 demo | `POST /api/admin/uploads` hoặc multipart endpoint hiện có nếu bổ sung | SQL chỉ lưu path; không thêm bảng | P1 |
| Delivery thất bại | Yêu cầu nghiệp vụ có “giao thất bại” | Cần quyết định status/migration vì `order_status_history.status` SQL không có `failed` | Không tự thêm enum/table khi chưa xác nhận | P1 |
| Staff xử lý đơn | DB có role `staff`, FE yêu cầu staff | `/api/staff/orders` hoặc mở một phần admin order API cho STAFF | Hiện admin order API chỉ `hasRole('ADMIN')` | P1 |

Phần còn lại chủ yếu không thiếu BE; là FE chưa dùng API đã có.

## 6. Backend API có nhưng Frontend chưa dùng

| API | Chức năng | FE nên tích hợp | Ưu tiên |
|---|---|---|---|
| `/api/customer/cart` | Giỏ hàng server-side | `/`, cart drawer | P0 |
| `/api/customer/orders/checkout/preview`, `/checkout` | Tạo đơn | Route `/checkout` mới | P0 |
| `/api/customer/orders` | Lịch sử/trạng thái đơn | Route `/orders` hoặc profile tab | P1 |
| `/api/customer/shipping-addresses` | Địa chỉ giao hàng | `/profile` hoặc `/checkout` | P0/P1 |
| `/api/customer/payments`, `/orders/{id}/payment/paypal/confirm` | Thanh toán | `/checkout`, order detail | P1 |
| `/api/admin/orders` | Quản lý đơn | `/admin/orders` | P0/P1 |
| `/api/admin/orders/delivery-staff`, PATCH assign | Phân công giao | `/admin/delivery`, `/admin/orders` | P1 |
| `/api/delivery/orders` | Màn hình shipper | Route `/delivery` mới | P1 |
| `/api/admin/dashboard/*` | Dashboard thật | `/admin` | P1 |
| `/api/admin/inventory/*` | Quản lý tồn kho | `/admin/products` hoặc route inventory | P1 |
| `/api/admin/products`, `/api/admin/categories` | CRUD admin | Admin product/category pages | P1 |
| `/api/admin/coupons` | Coupon CRUD | `/admin/coupons` | P1 |
| `/api/public/contacts`, `/api/admin/contacts` | Gửi/xử lý liên hệ | Public contact UI + admin contacts | P1 |
| `/api/customer/wishlist` | Wishlist | Product cards/profile | P2 |
| `/api/public/products/{slug}/reviews`, `/api/customer/reviews` | Review | Product detail/quick view | P2 |
| `/api/notifications` | Notification | Bell/header/profile | P2 |
| `/api/public/chat`, `/api/customer/chat`, `/api/admin/chat` | AI/chat history/admin reply | Chat widget + admin chat | P2 |

## 7. Search, Filter, Pagination, Sort

| Mục | Hiện trạng | Cần sửa |
|---|---|---|
| Search debounce | Trang chủ có debounce 300ms; admin pages filter client-side không debounce | OK cho marketplace; admin nên server-side khi dùng API page |
| Search fields | FE gửi `keyword`; BE tìm theo tên/mô tả/category tùy service | Cần thống nhất placeholder với field thật |
| Filter | Marketplace gửi `categorySlug`, `minPrice`, `maxPrice`, `status` | OK; admin products đang filter local và dùng `categoryId`, trong khi BE admin nhận `categorySlug` |
| Pagination | BE có `page/size/totalPages`; FE marketplace hard-code `page:0,size:12` | Thêm pagination UI và đọc `totalPages` |
| Sort | FE dùng `createdAt,desc`, `price`, `name`; BE nhận sort string | Cần whitelist hoặc xử lý lỗi sort không hợp lệ |
| Empty/error | Marketplace và DataTable có empty/error | OK cơ bản |
| URL query | Chưa sync filter vào URL | P2 nếu cần chia sẻ link |

## 8. Auth/JWT/Phân quyền

| Mục | Đánh giá |
|---|---|
| Token storage | FE lưu token theo scope `admin`/`customer`, có remember local/session |
| Axios Bearer | Có interceptor gắn `Authorization: Bearer ...` theo pathname |
| 401 | Admin redirect về `/admin/login`; customer chỉ clear session, profile tự về auth panel |
| Route guard | AdminShell guard admin; `/profile` tự kiểm session; chưa có staff/delivery guard |
| Backend public/protected | SecurityConfig permit `/api/auth/*`, `/api/public/**`, health, swagger; còn lại authenticated |
| Role backend | Controllers có `@PreAuthorize`: admin, customer, delivery. Staff chưa có route riêng |
| Role DB | `roles`: admin, staff, delivery_staff, customer. FE chỉ phân biệt admin/customer |

## 9. Database Mapping

| Mục | Kết luận |
|---|---|
| Entity/table | Entity chính khớp bảng SQL thật: users, roles, permissions, categories, products, product_images, cart_items, orders, order_items, order_status_history, payments, coupons, contacts, reviews, wishlists, notifications, chat_messages |
| Delivery | Đúng yêu cầu: dựa trên `orders.delivery_staff_id`, `dispatched_at`, `delivered_at`, `order_status_history`; không có bảng `shipments` |
| Enum/status | User status khớp enum SQL. Product/order/payment status là string ở entity/service; cần FE dùng đúng danh sách |
| Rủi ro test | Backend test context đang kết nối MySQL local `veggie_main`, không có test datasource riêng |

## 10. End-to-end Flow

| Flow | Chạy được tới đâu | Điểm gãy |
|---|---|---|
| Guest xem sản phẩm -> search/filter -> detail nhanh -> add cart -> checkout | Xem/search/filter/quick view/add cart local | Checkout không handler; cart không server; không tạo order |
| Customer register -> login -> update profile -> shipping address | Register/login/profile OK một phần | Shipping address CRUD chưa có UI; profile address không phải `shipping_addresses` |
| Admin quản lý category/product/order/delivery | Login OK; user status OK; category/product list OK | CRUD category/product demo; order/delivery mock |
| Staff xử lý đơn | Chưa có FE route | BE chưa có staff API riêng |
| Delivery xem đơn/cập nhật trạng thái | BE có API delivery | FE delivery riêng chưa có; `/admin/delivery` là mock admin |
| Customer review sau mua | BE có API review | Không có product detail/review UI |
| Contact -> admin reply | BE có public/admin contact | FE public contact không có; admin contacts mock |
| AI Assistant/chat history | BE có public/customer/admin chat | FE chat widget/admin chat chưa có |

## 11. Kế hoạch sửa theo ưu tiên

| Priority | Task | FE/BE | File chính | Tiêu chí hoàn thành | Test thủ công |
|---|---|---|---|---|---|
| P0 | Nối cart + checkout tối thiểu | FE | `src/app/page.js`, service mới, route `/checkout` | Login customer, add cart server, preview, create order COD | Customer login -> add product -> checkout -> thấy order |
| P0 | Admin orders dùng API thật | FE | `src/app/admin/orders/page.jsx`, `src/services/admin.service.js` | List/filter/detail/confirm/cancel/status từ `/admin/orders` | Admin login -> đổi status đơn |
| P1 | Admin category/product CRUD thật | FE | `admin.service.js`, category/product pages | POST/PUT/DELETE/PATCH gọi `/admin/categories`, `/admin/products` | Thêm/sửa/ẩn sản phẩm và refresh còn dữ liệu |
| P1 | Admin delivery phân công thật | FE | admin delivery/orders pages | Load delivery staff, assign, status đúng `ready_for_delivery/out_for_delivery` | Admin assign -> delivery thấy đơn |
| P1 | Delivery portal | FE | route `/delivery`, service mới | Delivery login/guard/list/update | Login delivery -> out_for_delivery -> delivered |
| P1 | Contact/coupon API thật | FE | contacts/coupons pages | Không còn mock; có loading/toast/error | CRUD coupon, mark contact replied |
| P2 | Customer account tabs | FE | `/profile` hoặc route mới | Shipping addresses, orders, wishlist, notifications | Customer quản lý địa chỉ/order |
| P2 | Review + product detail | FE | route product detail | Public reviews + customer create/update/delete | Customer đã mua tạo review |
| P2 | Toast/empty/error chuẩn | FE | shared utils/components | Sonner toast, confirm dialog thay `window.confirm` | Thao tác lỗi/thành công hiển thị rõ |
| P3 | Refactor service response | FE | services/lib | Service trả payload thống nhất, page không unwrap lặp | Không còn `response?.data ?? response` rải rác |

## 12. Checklist test thủ công theo vai trò

| Role | Checklist |
|---|---|
| Guest | Mở `/`, search, filter category/price/sort, quick view, empty state, fallback API error |
| Customer | Register, login, profile update, change password, add cart, update quantity, checkout COD/PayPal, view orders, cancel/complete, review, wishlist |
| Admin | Login admin, users list/status, dashboard real metrics, category/product CRUD, order confirm/cancel/status, assign delivery, coupon CRUD, contact replied, inventory stock |
| Staff | Login staff, xem đơn cần xử lý, confirm/prepare order, kiểm quyền không vào admin-only |
| Delivery | Login delivery, xem assigned/history, start delivery, delivered, không thấy đơn của người khác |

## 13. Batch sửa đầu tiên đề xuất

Mục tiêu batch 1: làm luồng khách mua hàng tạo được đơn thật, tối đa 5 file.

| File | Việc làm |
|---|---|
| `src/services/cart.service.js` | Thêm GET cart, POST item, PUT quantity, DELETE item, DELETE cart |
| `src/services/order.service.js` | Thêm checkout preview, checkout, get customer orders |
| `src/services/shipping-address.service.js` | Thêm list/create/update/default/delete địa chỉ |
| `src/app/page.js` | Khi customer đã login thì add/update cart qua API; nút Thanh toán dẫn `/checkout`; giữ local cart cho guest |
| `src/app/checkout/page.jsx` | Màn checkout tối thiểu: chọn địa chỉ, payment method `cash/paypal`, couponCode, preview, submit order |

Sau khi batch 1 pass, batch 2 nên nối `/admin/orders` với API thật để admin xử lý đơn vừa tạo.
