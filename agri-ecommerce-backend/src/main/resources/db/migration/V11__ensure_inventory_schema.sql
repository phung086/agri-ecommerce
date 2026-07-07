-- V11: Ensure inventory/coupon schema exists after V10 partial deployments.

SET @schema_name = DATABASE();

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `coupons` ADD COLUMN `product_id` BIGINT UNSIGNED DEFAULT NULL',
    'DO 0'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'coupons'
    AND COLUMN_NAME = 'product_id'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `coupons` ADD CONSTRAINT `fk_coupons_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL',
    'DO 0'
  )
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = @schema_name
    AND TABLE_NAME = 'coupons'
    AND CONSTRAINT_NAME = 'fk_coupons_product'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `inventory_batches` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `batch_number` VARCHAR(100) NOT NULL,
  `import_price` DECIMAL(10, 2) NOT NULL,
  `original_quantity` INT NOT NULL,
  `remaining_quantity` INT NOT NULL,
  `manufacture_date` DATETIME NULL,
  `expiry_date` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  CONSTRAINT `fk_batches_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `inventory_transactions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `batch_id` BIGINT UNSIGNED NULL,
  `quantity` INT NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `note` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL,
  CONSTRAINT `fk_transactions_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transactions_batch` FOREIGN KEY (`batch_id`) REFERENCES `inventory_batches` (`id`) ON DELETE SET NULL
);
