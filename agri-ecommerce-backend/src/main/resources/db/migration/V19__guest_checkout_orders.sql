-- V19: Allow guest checkout orders while keeping account-based orders intact.

SET @schema_name = DATABASE();

SET @sql = (
  SELECT IF(
    IS_NULLABLE = 'NO',
    'ALTER TABLE `orders` MODIFY COLUMN `user_id` BIGINT UNSIGNED NULL',
    'DO 0'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'user_id'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    IS_NULLABLE = 'NO',
    'ALTER TABLE `orders` MODIFY COLUMN `shipping_address_id` BIGINT UNSIGNED NULL',
    'DO 0'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'shipping_address_id'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `orders` ADD COLUMN `checkout_type` VARCHAR(20) NOT NULL DEFAULT ''CUSTOMER'' AFTER `status`',
    'DO 0'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'checkout_type'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `orders` ADD COLUMN `guest_email` VARCHAR(255) NULL AFTER `checkout_type`',
    'DO 0'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'guest_email'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `orders` ADD COLUMN `guest_token` VARCHAR(64) NULL AFTER `guest_email`',
    'DO 0'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'guest_token'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `orders`
SET `checkout_type` = 'CUSTOMER'
WHERE `checkout_type` IS NULL OR TRIM(`checkout_type`) = '';

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX `idx_orders_checkout_type` ON `orders` (`checkout_type`)',
    'DO 0'
  )
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'orders'
    AND INDEX_NAME = 'idx_orders_checkout_type'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE UNIQUE INDEX `uk_orders_guest_token` ON `orders` (`guest_token`)',
    'DO 0'
  )
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'orders'
    AND INDEX_NAME = 'uk_orders_guest_token'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
