-- V202607091: Normalize freeship coupon values after earlier seed/migration changes
-- SHIP20K must discount shipping by exactly 20.000đ, not make shipping fully free.
-- SHIPFREE remains a full freeship voucher for eligible orders.

UPDATE `coupons`
SET
    `coupon_type` = 'FREESHIP',
    `discount_type` = 'FIXED_AMOUNT',
    `discount_percentage` = 0,
    `discount_amount` = 20000.00,
    `min_order_value` = 100000.00,
    `guest_allowed` = 1,
    `is_active` = 1,
    `updated_at` = NOW()
WHERE `code` = 'SHIP20K';

UPDATE `coupons`
SET
    `coupon_type` = 'FREESHIP',
    `discount_type` = 'PERCENTAGE',
    `discount_percentage` = 100,
    `discount_amount` = NULL,
    `min_order_value` = 300000.00,
    `guest_allowed` = 1,
    `is_active` = 1,
    `updated_at` = NOW()
WHERE `code` = 'SHIPFREE';
