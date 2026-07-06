-- V8: Inventory batches, stock transactions, and product-specific coupons

-- 1. Add product_id to coupons table
ALTER TABLE `coupons` ADD COLUMN `product_id` BIGINT UNSIGNED DEFAULT NULL;
ALTER TABLE `coupons` ADD CONSTRAINT `fk_coupons_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL;

-- 2. Create inventory_batches table
CREATE TABLE `inventory_batches` (
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

-- 3. Create inventory_transactions table
CREATE TABLE `inventory_transactions` (
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
