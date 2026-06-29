ALTER TABLE `coupons`
    ADD COLUMN `coupon_type` varchar(50) NOT NULL DEFAULT 'ORDER_DISCOUNT' AFTER `code`,
    ADD COLUMN `discount_type` varchar(50) NOT NULL DEFAULT 'PERCENTAGE' AFTER `coupon_type`,
    ADD COLUMN `discount_amount` decimal(10,2) DEFAULT NULL AFTER `discount_percentage`,
    ADD COLUMN `starts_at` timestamp NULL DEFAULT NULL AFTER `discount_amount`;

UPDATE `coupons`
SET `coupon_type` = 'ORDER_DISCOUNT',
    `discount_type` = 'PERCENTAGE'
WHERE `coupon_type` IS NULL
   OR `discount_type` IS NULL;
