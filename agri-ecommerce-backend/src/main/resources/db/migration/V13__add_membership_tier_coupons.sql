-- V13: Seed membership tier special coupons (BRONZE5, SILVER10, GOLD25, PLATINUM50)
-- These coupons are tied to specific membership tiers and have custom min order values.

INSERT INTO `coupons` (
  `code`, 
  `discount_percentage`, 
  `min_order_value`, 
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
  ('BRONZE5', 5, 50000.00, NOW(), '2030-12-31 23:59:59', 10000, 0, 1, 'ORDER_DISCOUNT', 'PERCENTAGE', NOW(), NOW()),
  ('SILVER10', 10, 100000.00, NOW(), '2030-12-31 23:59:59', 10000, 0, 1, 'ORDER_DISCOUNT', 'PERCENTAGE', NOW(), NOW()),
  ('GOLD25', 25, 250000.00, NOW(), '2030-12-31 23:59:59', 10000, 0, 1, 'ORDER_DISCOUNT', 'PERCENTAGE', NOW(), NOW()),
  ('PLATINUM50', 50, 400000.00, NOW(), '2030-12-31 23:59:59', 10000, 0, 1, 'ORDER_DISCOUNT', 'PERCENTAGE', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `discount_percentage` = VALUES(`discount_percentage`),
  `min_order_value` = VALUES(`min_order_value`),
  `starts_at` = VALUES(`starts_at`),
  `expires_at` = VALUES(`expires_at`),
  `usage_limit` = VALUES(`usage_limit`),
  `is_active` = VALUES(`is_active`),
  `coupon_type` = VALUES(`coupon_type`),
  `discount_type` = VALUES(`discount_type`),
  `updated_at` = NOW();
