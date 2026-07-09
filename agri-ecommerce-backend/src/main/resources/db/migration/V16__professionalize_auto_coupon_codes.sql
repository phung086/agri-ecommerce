-- V16: Rename legacy near-expiry auto coupons to customer-friendly campaign codes.
-- Example: XA_HANG_47_67 -> TUOI_NGON_47_0067. Existing usage counters and expiry dates are kept.

UPDATE `coupons`
SET `code` = CONCAT('TUOI_NGON_', COALESCE(CAST(`product_id` AS CHAR), 'SP'), '_', LPAD(`id`, 4, '0')),
    `updated_at` = NOW()
WHERE UPPER(`code`) LIKE 'XA_HANG_%';
