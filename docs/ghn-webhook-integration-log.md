# GHN Webhook Integration Log

Ngày thực hiện: 2026-07-06

## Mục tiêu

Tích hợp luồng đồng bộ trạng thái vận chuyển từ Giao Hàng Nhanh (GHN) về AgriMarket.

Kết luận nghiệp vụ:

- Chiều GHN -> AgriMarket: làm được bằng webhook.
- Chiều Delivery nội bộ AgriMarket -> GHN: không làm theo hướng production, vì trạng thái chính thức của GHN do GHN/courier/sandbox simulator cập nhật.

## Nguồn tham chiếu GHN

- Callback order status: https://api.ghn.vn/home/docs/detail?id=47
- List of shipping status: https://api.ghn.vn/home/docs/detail?id=48
- Order detail API: https://api.ghn.vn/home/docs/detail?id=66

Thông tin quan trọng từ tài liệu GHN:

- GHN gửi webhook bằng method `POST`, format JSON.
- Payload có các field chính: `OrderCode`, `Status`, `Type`, `Time`.
- Backend cần trả HTTP 200 để GHN không retry.
- Nếu HTTP status khác 200, GHN có thể retry nhiều lần.

## Những thay đổi đã làm

### Backend

Thêm endpoint webhook:

```text
POST /api/webhooks/ghn
```

Endpoint nhận secret qua:

```text
?secret=<GHN_WEBHOOK_SECRET>
```

hoặc header:

```text
X-GHN-Webhook-Secret: <GHN_WEBHOOK_SECRET>
```

Các file chính:

- `agri-ecommerce-backend/src/main/java/com/agri/ecommerce/controller/webhook/GhnWebhookController.java`
- `agri-ecommerce-backend/src/main/java/com/agri/ecommerce/service/GhnWebhookService.java`
- `agri-ecommerce-backend/src/main/java/com/agri/ecommerce/service/impl/GhnWebhookServiceImpl.java`
- `agri-ecommerce-backend/src/main/java/com/agri/ecommerce/dto/request/webhook/GhnOrderStatusWebhookRequest.java`
- `agri-ecommerce-backend/src/main/java/com/agri/ecommerce/dto/response/webhook/GhnWebhookResponse.java`

### Database

Thêm migration:

```text
agri-ecommerce-backend/src/main/resources/db/migration/V9__add_ghn_shipping_status_fields.sql
```

Các cột mới trong bảng `orders`:

- `shipping_provider`
- `shipping_status`
- `shipping_status_updated_at`

Thêm index:

- `idx_orders_tracking_number`

### API response

`OrderResponse` trả thêm:

- `shippingProvider`
- `shippingStatus`
- `shippingStatusUpdatedAt`

### Security

Đã mở public route:

```text
/api/webhooks/**
```

nhưng endpoint vẫn bắt buộc `GHN_WEBHOOK_SECRET`, nên không phải webhook mở tự do.

### Tạo vận đơn GHN

Khi hệ thống tạo mã vận đơn GHN thành công, đơn được gắn:

```text
shippingProvider = GHN
```

## Mapping trạng thái

Webhook luôn lưu raw status của GHN vào `orders.shipping_status`.

Chỉ một số trạng thái GHN được map sang trạng thái nội bộ:

| GHN status | Trạng thái AgriMarket |
| --- | --- |
| `picked`, `storing`, `transporting`, `sorting`, `delivering`, `money_collect_delivering` | `out_for_delivery` |
| `delivered` | `delivered` |
| `cancel`, `return`, `return_transporting`, `return_sorting`, `returning`, `return_fail`, `returned`, `damage`, `lost` | `canceled` |

Các trạng thái như `ready_to_pick`, `picking`, `delivery_fail`, `waiting_to_return`, `exception` chỉ lưu vào `shipping_status` và ghi timeline note, không ép đổi trạng thái nội bộ nếu chưa chắc chắn.

## Chống lỗi production

Đã xử lý các trường hợp:

- Webhook thiếu/sai secret -> trả 401.
- GHN gửi event trùng do retry -> không save lại, không gửi email lại.
- GHN gửi event cũ làm lùi trạng thái -> không kéo đơn từ `delivered/completed` về `out_for_delivery`.
- Không tìm thấy `tracking_number` trong AgriMarket -> trả 200 với `ignored=true` để tránh GHN retry vô hạn.
- Khi GHN báo `delivered`, hệ thống gọi `completeCashPaymentIfPending(orderId)` để hoàn tất thanh toán COD nếu còn pending.

## Biến môi trường

Local `.env` cần có:

```env
GHN_WEBHOOK_SECRET=<long-random-secret>
```

Railway production đã thêm biến:

```env
GHN_WEBHOOK_SECRET
```

Không ghi giá trị secret thật vào báo cáo hoặc commit.

## URL cấu hình trên GHN Sandbox

Nếu GHN Sandbox cho nhập webhook URL, dùng:

```text
https://agri-ecommerce-backend-production.up.railway.app/api/webhooks/ghn?secret=<GHN_WEBHOOK_SECRET>
```

Nếu test local qua tunnel/ngrok, dùng:

```text
https://<ngrok-domain>/api/webhooks/ghn?secret=<GHN_WEBHOOK_SECRET>
```

## Test thủ công bằng curl

Ví dụ test local với một mã vận đơn đã tồn tại trong DB:

```bash
curl -X POST "http://localhost:8080/api/webhooks/ghn?secret=<GHN_WEBHOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "OrderCode": "LAUC3Y",
    "Status": "delivered",
    "Type": "Switch_status",
    "Time": "2026-07-06T11:34:00Z"
  }'
```

Kết quả mong đợi:

- HTTP 200.
- `orders.shipping_status = delivered`.
- `orders.status = delivered` nếu trạng thái hiện tại chưa terminal.
- `order_status_history` có note bắt đầu bằng `GHN webhook`.
- Khách nhận notification/email cập nhật trạng thái nếu trạng thái nội bộ đổi.

## Test tự động đã chạy

Command:

```bash
./mvnw test
```

Kết quả:

```text
Tests run: 75, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## Smoke test production đã chạy

Sau khi push lên `develop`, Railway tạo deployment mới:

```text
d926e76f-11f4-4a15-bc04-744995028fe8 | SUCCESS | 2026-07-06 15:17:33 +07:00
```

Đã gọi thử production webhook với mã vận đơn giả `CODEX-NOT-EXIST` và secret thật lấy từ `.env`.

Kết quả mong đợi và thực tế:

```json
{
  "success": true,
  "message": "GHN webhook received",
  "data": {
    "processed": false,
    "ignored": true,
    "orderCode": "CODEX-NOT-EXIST",
    "ghnStatus": "delivering",
    "message": "No AgriMarket order found for GHN order code"
  },
  "statusCode": 200
}
```

Ý nghĩa:

- Endpoint production đã chạy.
- `GHN_WEBHOOK_SECRET` trên Railway đã khớp.
- Migration DB đã sẵn sàng, vì backend query được entity `orders` có các cột shipping mới.

## Ghi chú báo cáo

Lỗi/giới hạn ban đầu:

- AgriMarket mới tạo được mã vận đơn GHN nhưng chưa nhận trạng thái ngược từ GHN.
- Delivery nội bộ không nên cập nhật trạng thái chính thức của GHN.
- Nếu chỉ dùng `orders.status`, sẽ mất chi tiết trạng thái GHN như `ready_to_pick`, `sorting`, `returning`.

Cách khắc phục:

- Thêm webhook GHN -> AgriMarket.
- Lưu raw GHN status vào cột riêng.
- Map an toàn sang trạng thái nội bộ để UI hiện đúng tiến trình.
- Thêm secret để bảo vệ endpoint public.
- Thêm test chống duplicate/retry.

## Fix phí vận chuyển GHN - 2026-07-06

Vấn đề phát hiện khi kiểm thử production:

- Trang giỏ hàng/trang chủ vẫn hiển thị phí giao dự kiến cố định `25.000đ`.
- Checkout luôn ra `75.900đ` với các đơn cùng địa chỉ vì backend gọi GHN với cùng địa chỉ nhận, cùng khối lượng mặc định và origin cũ.
- `GhnShippingCarrierServiceImpl` đang hardcode nơi gửi là quận 12, TP.HCM (`from_district_id=1454`, `from_ward_code=21211`) thay vì shop GHN `200980 - Agri Market` ở Hà Đông.

Cách xử lý:

- Bỏ hardcode `25.000đ` ở frontend. Giỏ hàng chỉ còn hiển thị `Tính khi chọn địa chỉ`, vì chưa chọn địa chỉ thì chưa thể có phí GHN chính xác.
- Checkout tiếp tục gọi backend để tính phí thật theo GHN sau khi đã có địa chỉ nhận hàng.
- Backend đọc origin từ GHN `/v2/shop/all` theo `GHN_SHOP_ID`; nếu không gọi được API thì fallback về biến môi trường:
  - `GHN_FROM_DISTRICT_ID=1542`
  - `GHN_FROM_WARD_CODE=1B1506`
- Đã thêm hai biến fallback này vào `.env.example`, `application.yml`, local `.env` và Railway Variables.

Cách tính phí hiện tại:

- Origin: shop GHN `200980 - Agri Market` hoặc fallback Hà Đông/La Khê.
- Destination: tỉnh/quận/phường lấy từ địa chỉ nhận hàng của khách.
- Khối lượng: `max(tổng số lượng sản phẩm * 500g, 500g)`.
- Kích thước mặc định gửi GHN: `15 x 15 x 10 cm`.
- Dịch vụ GHN: `service_type_id=2` (giao chuẩn ecommerce).
- Nếu áp coupon freeship thì backend đặt `shippingFee = 0`.

Kết quả mong đợi:

- Cart/trang chủ không còn hiển thị phí cố định.
- Checkout thay đổi phí theo địa chỉ nhận và khối lượng đơn.
- Nếu cùng một địa chỉ, cùng số lượng/khối lượng và cùng kích thước, phí GHN giống nhau là hành vi bình thường.
