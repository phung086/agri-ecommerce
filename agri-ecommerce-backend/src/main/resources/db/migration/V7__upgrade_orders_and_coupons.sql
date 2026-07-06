-- V7: Upgrade orders table with shipping address snapshot and coupon min order value

-- 1. Add snapshot columns to orders table
ALTER TABLE `orders`
  ADD COLUMN `shipping_name` varchar(255) DEFAULT NULL,
  ADD COLUMN `shipping_phone` varchar(255) DEFAULT NULL,
  ADD COLUMN `shipping_address_detail` varchar(255) DEFAULT NULL,
  ADD COLUMN `shipping_city` varchar(255) DEFAULT NULL;

-- 2. Backfill snapshots for existing orders before making the address relation nullable
UPDATE `orders` o
JOIN `shipping_addresses` sa ON sa.`id` = o.`shipping_address_id`
SET
  o.`shipping_name` = sa.`full_name`,
  o.`shipping_phone` = sa.`phone`,
  o.`shipping_address_detail` = sa.`address`,
  o.`shipping_city` = sa.`city`
WHERE o.`shipping_address_id` IS NOT NULL;

-- 3. Modify foreign key constraint on shipping_address_id to avoid cascade delete
ALTER TABLE `orders` DROP FOREIGN KEY `orders_shipping_address_id_foreign`;

ALTER TABLE `orders` MODIFY COLUMN `shipping_address_id` bigint(20) UNSIGNED DEFAULT NULL;

ALTER TABLE `orders` ADD CONSTRAINT `orders_shipping_address_id_foreign` FOREIGN KEY (`shipping_address_id`) REFERENCES `shipping_addresses` (`id`) ON DELETE SET NULL;

-- 4. Add min_order_value column to coupons table
ALTER TABLE `coupons`
  ADD COLUMN `min_order_value` decimal(10,2) DEFAULT NULL AFTER `discount_amount`;

-- 5. Seed coupon GIAM20 (Giảm 20% cho đơn từ 2.000.000đ)
INSERT INTO `coupons` (`code`, `discount_percentage`, `expires_at`, `usage_limit`, `times_used`, `is_active`, `coupon_type`, `discount_type`, `min_order_value`, `created_at`, `updated_at`)
VALUES ('GIAM20', 20, '2030-12-31 23:59:59', 1000, 0, 1, 'ORDER_DISCOUNT', 'PERCENTAGE', 2000000.00, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `discount_percentage` = VALUES(`discount_percentage`),
  `expires_at` = VALUES(`expires_at`),
  `usage_limit` = VALUES(`usage_limit`),
  `is_active` = VALUES(`is_active`),
  `coupon_type` = VALUES(`coupon_type`),
  `discount_type` = VALUES(`discount_type`),
  `min_order_value` = VALUES(`min_order_value`),
  `updated_at` = NOW();
