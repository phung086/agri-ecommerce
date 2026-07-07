-- V14: Seed sample product discounts and freeship coupons for stacking test
-- This includes FREESHIP coupon and PRODUCT_DISCOUNT coupons for specific products.

INSERT INTO `coupons` (
  `code`, 
  `discount_percentage`, 
  `discount_amount`,
  `min_order_value`, 
  `product_id`,
  `starts_at`, 
  `expires_at`, 
  `usage_limit`, 
  `times_used`, 
  `is_active`, 
  `coupon_type`, 
  `discount_type`, 
  `created_at`, 
  `updated_at`
)
VALUES 
  ('FREESHIP', 0, 0.00, 0.00, NULL, NOW(), '2030-12-31 23:59:59', 10000, 0, 1, 'FREESHIP', 'PERCENTAGE', NOW(), NOW()),
  ('THIT10K', 0, 10000.00, 0.00, 24, NOW(), '2030-12-31 23:59:59', 10000, 0, 1, 'PRODUCT_DISCOUNT', 'FIXED_AMOUNT', NOW(), NOW()),
  ('CA20K', 0, 20000.00, 0.00, 25, NOW(), '2030-12-31 23:59:59', 10000, 0, 1, 'PRODUCT_DISCOUNT', 'FIXED_AMOUNT', NOW(), NOW()),
  ('RAU5K', 0, 5000.00, 0.00, 6, NOW(), '2030-12-31 23:59:59', 10000, 0, 1, 'PRODUCT_DISCOUNT', 'FIXED_AMOUNT', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `discount_percentage` = VALUES(`discount_percentage`),
  `discount_amount` = VALUES(`discount_amount`),
  `min_order_value` = VALUES(`min_order_value`),
  `product_id` = VALUES(`product_id`),
  `starts_at` = VALUES(`starts_at`),
  `expires_at` = VALUES(`expires_at`),
  `usage_limit` = VALUES(`usage_limit`),
  `is_active` = VALUES(`is_active`),
  `coupon_type` = VALUES(`coupon_type`),
  `discount_type` = VALUES(`discount_type`),
  `updated_at` = NOW();
