-- V20: Add eligibility control fields to coupons table safely
-- required_membership_tier: NULL = all users, 'SILVER'/'GOLD'/'PLATINUM' = tier-restricted
-- guest_allowed: 1 = guests can use, 0 = must be logged-in customer

SET @schema_name = DATABASE();

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `coupons` ADD COLUMN `required_membership_tier` VARCHAR(20) NULL DEFAULT NULL AFTER `product_id`',
    'SELECT 0'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'coupons'
    AND COLUMN_NAME = 'required_membership_tier'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `coupons` ADD COLUMN `guest_allowed` TINYINT(1) NOT NULL DEFAULT 1 AFTER `required_membership_tier`',
    'SELECT 0'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'coupons'
    AND COLUMN_NAME = 'guest_allowed'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Seed existing tier-based membership coupons as member-only (not available to guests)
UPDATE `coupons` SET `required_membership_tier` = 'SILVER', `guest_allowed` = 0 WHERE `code` = 'SILVER10';
UPDATE `coupons` SET `required_membership_tier` = 'GOLD',   `guest_allowed` = 0 WHERE `code` IN ('GOLD25', 'GOLD5');
UPDATE `coupons` SET `required_membership_tier` = 'PLATINUM', `guest_allowed` = 0 WHERE `code` IN ('PLATINUM50', 'PLATINUM10');

-- BRONZE5 stays usable for all (no tier restriction), but guests not eligible since it rewards loyalty
UPDATE `coupons` SET `guest_allowed` = 0 WHERE `code` = 'BRONZE5';

-- Freeship coupons: insert tiered freeship coupons if not exist
INSERT INTO `coupons` (`code`, `discount_percentage`, `discount_amount`, `min_order_value`, `starts_at`, `expires_at`, `usage_limit`, `times_used`, `is_active`, `coupon_type`, `discount_type`, `required_membership_tier`, `guest_allowed`, `created_at`, `updated_at`)
VALUES
    ('SHIP20K', 0, 20000.00, 100000.00, NOW(), '2030-12-31 23:59:59', 50000, 0, 1, 'FREESHIP', 'FIXED_AMOUNT', NULL, 1, NOW(), NOW()),
    ('SHIPFREE', 0, NULL, 300000.00, NOW(), '2030-12-31 23:59:59', 50000, 0, 1, 'FREESHIP', 'PERCENTAGE', NULL, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    `discount_amount` = VALUES(`discount_amount`),
    `min_order_value` = VALUES(`min_order_value`),
    `guest_allowed` = VALUES(`guest_allowed`),
    `updated_at` = NOW();
