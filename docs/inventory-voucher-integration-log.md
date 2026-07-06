# Inventory Voucher Integration Log

## 2026-07-06 - Near-expiry voucher campaign cleanup

Context:
- Admin inventory can scan FIFO batches and create product-specific coupons for near-expiry stock.
- The first implementation generated technical codes such as `XA_HANG_47_67`, which exposed product IDs and sounded too direct for customers.
- The project owner decided to keep the minimum near-expiry quantity threshold at 5 units before an automatic voucher is issued.

Changes made:
- Kept the automatic voucher threshold at 5 near-expiry units per product.
- Replaced the old `XA_HANG_*` generator with customer-friendly campaign codes:
  - `BEP_NHA_<PRODUCT>_<DDMM>` for seafood/meat.
  - `TUOI_NGON_<PRODUCT>_<DDMM>` for vegetables/fruit.
  - `MON_NGON_<PRODUCT>_<DDMM>` for other products.
- Added product/category based discount rules:
  - Low-value products use fixed discounts, capped at 40% of unit price.
  - Seafood/meat use stronger percentage discounts as expiry gets closer.
  - Vegetables/fruit use either fixed or percentage discounts depending on price.
- Auto-created coupons now use the earliest near-expiry batch as the coupon expiry date.
- Existing legacy auto coupons are reused/renamed when the product still qualifies.
- Legacy or campaign auto coupons are automatically deactivated when the product has no near-expiry stock or near-expiry quantity drops below 5.
- Near-expiry batch query now orders by expiry date ascending so the earliest batch consistently drives the campaign.

Validation:
- Added `InventorySchedulerTest` for:
  - Creating a friendly product-specific campaign code when stock qualifies.
  - Deactivating legacy `XA_HANG_*` coupons when stock is below threshold.
- Ran backend test suite: `./mvnw.cmd test` passed, 79 tests.
- Ran frontend production build: `npm run build` passed.
- Pushed commit `adb2415` to `develop`.
- Railway deployed backend successfully with deployment `68f90645-86cc-49c8-9b67-a6a1abc17632`.
- Production health endpoint returned success.

Notes for report:
- This is a controlled stock rotation promotion, not a generic discount.
- The system avoids showing "clearance" language to customers while still helping the shop sell near-expiry products responsibly.
- Combo/meal-kit discounts should be implemented as a separate bundle feature because checkout must deduct stock from multiple component products. Implementing that only as a coupon would risk incorrect inventory.
