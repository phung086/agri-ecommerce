# Loyalty Points Integration Log

## 2026-07-07 - Checkout points, membership tier, and loyalty history

Tom tat tieng Viet cho bao cao:
- Da hoan thien module Loyalty/tich diem cho khach hang, gan truc tiep voi checkout, ho so nguoi dung, don hang, danh gia san pham va dong bo trang thai giao hang.
- Khach hang co the dung diem de giam gia khi thanh toan. Backend tinh toan tong tien theo cach tap trung de tranh sai lech giua giao dien va database.
- Don hang giao thanh cong se tu dong cong diem mua hang. Neu don bi huy hoac GHN bao trang thai loi/huy/hoan, diem da dung se duoc hoan lai.
- He thong co bang lich su giao dich diem rieng de phuc vu kiem tra va giai thich trong bao cao.
- Da bo sung khoa pessimistic lock cho cac thao tac diem quan trong de tranh cong/tru diem hai lan khi admin, shipper, khach hang hoac webhook GHN cap nhat cung mot don.
- Da khoi phuc migration cu `V9__add_ghn_shipping_status_fields.sql` ve noi dung goc de tranh loi checksum Flyway tren production. Schema loyalty moi duoc dat trong migration moi `V12__loyalty_system.sql`.
- Da kiem thu lai backend bang `./mvnw.cmd test` va frontend bang `npm run build`; ca hai deu thanh cong.

Context:
- The project needed a more complete customer loyalty feature for the internship demo.
- Customers should be able to earn points from successful orders, redeem points during checkout, and see their membership value reflected in the account UI.
- The implementation had to fit existing order flows: customer checkout, admin status changes, delivery staff updates, GHN webhook synchronization, reviews, coupons, and profile display.

Business rules implemented:
- Customers can redeem loyalty points at checkout when `usePoints` is enabled.
- 1 loyalty point equals 1 VND discount value.
- Points redemption is capped at 20% of cart subtotal to avoid fully zeroing normal orders.
- Purchase reward is 1% of the final order total.
- Product reviews award 200 points after a valid review is created.
- Membership tier is recalculated from delivered order spending in the last 365 days:
  - `BRONZE`: default tier.
  - `SILVER`: from 1,000,000 VND.
  - `GOLD`: from 5,000,000 VND.
  - `PLATINUM`: from 15,000,000 VND.
- Tier-only coupons are validated through loyalty tier checks:
  - `GOLD5` requires Gold or Platinum.
  - `PLATINUM10` requires Platinum.

Backend changes:
- Added loyalty database schema in `V12__loyalty_system.sql`.
- Added `loyalty_points` and `membership_tier` to users.
- Added `points_used` and `points_earned` to orders.
- Added `loyalty_transactions` table to record earn, redeem, review reward, and refund events.
- Added `LoyaltyService` and `LoyaltyServiceImpl`.
- Added pessimistic locks for user/order updates during loyalty operations:
  - Prevents double point awards for the same order.
  - Prevents checkout from recording more points than were actually deducted.
- Added `LoyaltyController` with DTO-based transaction history response, avoiding raw JPA entity exposure.
- Extended checkout preview response with:
  - `couponDiscountAmount`
  - `pointsDiscount`
  - `pointsUsed`
- Updated checkout to use the actual deducted points returned by the loyalty service.
- Updated order responses and user responses to include loyalty fields.
- Updated order lifecycle integrations:
  - Customer completes delivered order: award purchase points.
  - Admin marks delivered/completed: award purchase points.
  - Delivery staff marks delivered: award purchase points.
  - GHN webhook marks delivered: award purchase points.
  - Customer/admin/delivery/GHN cancellation paths: refund redeemed points.
- Updated review creation to award review points only after a valid review is saved.

Frontend changes:
- Checkout loads profile data to read the current loyalty point balance.
- Checkout sends `usePoints` in checkout preview and final checkout payloads.
- Checkout displays coupon discount and loyalty point discount as separate rows.
- Checkout shows the exact points used from backend preview instead of estimating locally.
- Customer profile displays loyalty points and membership tier in the profile stats.
- New profile loyalty labels pass through `t(...)` for translation consistency.

Issues found and fixes:
- Issue: Checkout could save `pointsUsed` based on a pre-calculated estimate, even if fewer points were actually available at deduction time.
  - Fix: `deductPointsForCheckout` now returns the actual deducted amount; checkout saves that value and recalculates total from it.
- Issue: Loyalty transaction history originally returned `LoyaltyTransactionEntity` directly.
  - Fix: Added `LoyaltyTransactionResponse` DTO to keep API output clean and avoid lazy entity serialization problems.
- Issue: Purchase points could be awarded by multiple flows for the same order.
  - Fix: `awardPointsForPurchase` locks the order and skips if `pointsEarned > 0`.
- Issue: Some cancellation paths did not refund redeemed points.
  - Fix: Added refund handling for customer, admin, delivery failure cancellation, and GHN canceled/returned/lost/damaged statuses.
- Issue: Old local change attempted to rewrite `V9__add_ghn_shipping_status_fields.sql`.
  - Fix: Restored V9 to its original content to avoid Flyway checksum mismatch on databases where V9 already ran. Loyalty uses a new migration `V12` instead.

Validation:
- Backend full test suite passed:
  - Command: `./mvnw.cmd test`
  - Result: 82 tests passed, 0 failures.
- Frontend production build passed:
  - Command: `npm run build`
  - Result: Next.js build completed successfully.
- Pushed implementation commit:
  - `1de4391 Implement loyalty points checkout flow`
- Production smoke checks after push:
  - Frontend production URL returned HTTP 200.
  - Backend public product/category APIs returned HTTP 200.

Notes for report:
- The feature is designed as a customer retention mechanism rather than only a discount mechanism.
- Checkout remains server-authoritative: the backend calculates coupon discount, loyalty discount, shipping fee, and final total.
- The point ledger gives a clear audit trail for earned, redeemed, reviewed, and refunded points.
- Pessimistic locking is used because order status updates can come from multiple roles and GHN webhook events.
- Old Flyway migrations should not be edited after production deployment; schema corrections should be added as a new migration.
