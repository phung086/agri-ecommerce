-- V16: Update THIT coupon to be PRODUCT_DISCOUNT type and link to pork/meat product
-- This transforms the existing 'THIT' coupon from ORDER_DISCOUNT to PRODUCT_DISCOUNT

UPDATE `coupons`
SET 
  `coupon_type` = 'PRODUCT_DISCOUNT',
  `discount_type` = 'FIXED_AMOUNT',
  `discount_amount` = 10000.00,
  `discount_percentage` = 0,
  `product_id` = (
    SELECT `id` FROM `products` 
    WHERE `name` LIKE '%Ba rọi%' OR `name` LIKE '%ba rọi%' OR `name` LIKE '%heo%' OR `name` LIKE '%Thịt%' OR `name` LIKE '%thịt%'
    ORDER BY `id` ASC
    LIMIT 1
  )
WHERE `code` = 'THIT';
