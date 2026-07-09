-- V202607103: Inventory lot / expiry management foundation
-- Safe branch-only migration. It creates batch and transaction tables if missing,
-- extends product freshness snapshot fields, and backfills current products.stock
-- into LEGACY batches so the admin inventory page matches existing products.

CREATE TABLE IF NOT EXISTS `inventory_batches` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT NOT NULL,
  `batch_number` VARCHAR(100) NOT NULL,
  `import_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `original_quantity` INT NOT NULL DEFAULT 0,
  `remaining_quantity` INT NOT NULL DEFAULT 0,
  `received_at` DATETIME NULL,
  `manufacture_date` DATETIME NULL,
  `expiry_date` DATETIME NULL,
  `supplier_name` VARCHAR(255) NULL,
  `storage_location` VARCHAR(255) NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  `note` VARCHAR(500) NULL,
  `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inventory_batch_number` (`batch_number`),
  KEY `idx_inventory_batch_product` (`product_id`),
  KEY `idx_inventory_batch_expiry` (`expiry_date`),
  KEY `idx_inventory_batch_status` (`status`),
  CONSTRAINT `fk_inventory_batch_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `inventory_batches`
  ADD COLUMN IF NOT EXISTS `received_at` DATETIME NULL AFTER `remaining_quantity`,
  ADD COLUMN IF NOT EXISTS `supplier_name` VARCHAR(255) NULL AFTER `expiry_date`,
  ADD COLUMN IF NOT EXISTS `storage_location` VARCHAR(255) NULL AFTER `supplier_name`,
  ADD COLUMN IF NOT EXISTS `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' AFTER `storage_location`,
  ADD COLUMN IF NOT EXISTS `note` VARCHAR(500) NULL AFTER `status`,
  MODIFY COLUMN `expiry_date` DATETIME NULL;

CREATE TABLE IF NOT EXISTS `inventory_transactions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT NOT NULL,
  `batch_id` BIGINT NULL,
  `quantity` INT NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `previous_stock` INT NULL,
  `new_stock` INT NULL,
  `reference_type` VARCHAR(50) NULL,
  `reference_id` BIGINT NULL,
  `note` VARCHAR(500) NULL,
  `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inventory_tx_product` (`product_id`),
  KEY `idx_inventory_tx_batch` (`batch_id`),
  KEY `idx_inventory_tx_type` (`type`),
  CONSTRAINT `fk_inventory_tx_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_inventory_tx_batch` FOREIGN KEY (`batch_id`) REFERENCES `inventory_batches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `inventory_transactions`
  ADD COLUMN IF NOT EXISTS `previous_stock` INT NULL AFTER `type`,
  ADD COLUMN IF NOT EXISTS `new_stock` INT NULL AFTER `previous_stock`,
  ADD COLUMN IF NOT EXISTS `reference_type` VARCHAR(50) NULL AFTER `new_stock`,
  ADD COLUMN IF NOT EXISTS `reference_id` BIGINT NULL AFTER `reference_type`,
  MODIFY COLUMN `note` VARCHAR(500) NULL;

ALTER TABLE `products`
  ADD COLUMN IF NOT EXISTS `latest_import_date` DATETIME NULL AFTER `unit_en`,
  ADD COLUMN IF NOT EXISTS `latest_manufacture_date` DATETIME NULL AFTER `latest_import_date`,
  ADD COLUMN IF NOT EXISTS `earliest_expiry_date` DATETIME NULL AFTER `latest_manufacture_date`,
  ADD COLUMN IF NOT EXISTS `freshness_status` VARCHAR(50) NULL AFTER `earliest_expiry_date`;

INSERT INTO `inventory_batches` (
  `product_id`,
  `batch_number`,
  `import_price`,
  `original_quantity`,
  `remaining_quantity`,
  `received_at`,
  `manufacture_date`,
  `expiry_date`,
  `status`,
  `note`,
  `created_at`,
  `updated_at`
)
SELECT
  p.`id`,
  CONCAT('LEGACY-', p.`id`),
  COALESCE(p.`price`, 1.00),
  COALESCE(p.`stock`, 0),
  COALESCE(p.`stock`, 0),
  COALESCE(p.`created_at`, NOW()),
  NULL,
  NULL,
  'NEED_DATE_UPDATE',
  'Lô tồn kho được đồng bộ từ products.stock. Cần cập nhật ngày sản xuất/hạn sử dụng.',
  NOW(),
  NOW()
FROM `products` p
WHERE COALESCE(p.`stock`, 0) > 0
  AND p.`status` <> 'hidden'
  AND NOT EXISTS (
    SELECT 1 FROM `inventory_batches` b WHERE b.`product_id` = p.`id`
  );

INSERT INTO `inventory_transactions` (
  `product_id`,
  `batch_id`,
  `quantity`,
  `type`,
  `previous_stock`,
  `new_stock`,
  `reference_type`,
  `reference_id`,
  `note`,
  `created_at`
)
SELECT
  b.`product_id`,
  b.`id`,
  b.`original_quantity`,
  'BACKFILL',
  0,
  b.`remaining_quantity`,
  'PRODUCT',
  b.`product_id`,
  'Backfill tồn kho sản phẩm cũ vào lô legacy',
  NOW()
FROM `inventory_batches` b
WHERE b.`batch_number` LIKE 'LEGACY-%'
  AND NOT EXISTS (
    SELECT 1 FROM `inventory_transactions` tx
    WHERE tx.`batch_id` = b.`id` AND tx.`type` = 'BACKFILL'
  );

UPDATE `products` p
LEFT JOIN (
  SELECT
    `product_id`,
    SUM(CASE WHEN `status` NOT IN ('EXPIRED', 'DEPLETED') THEN COALESCE(`remaining_quantity`, 0) ELSE 0 END) AS tracked_stock,
    MAX(`received_at`) AS latest_import_date,
    MAX(`manufacture_date`) AS latest_manufacture_date,
    MIN(CASE WHEN `expiry_date` IS NOT NULL AND COALESCE(`remaining_quantity`, 0) > 0 THEN `expiry_date` END) AS earliest_expiry_date,
    SUM(CASE WHEN `status` = 'NEED_DATE_UPDATE' AND COALESCE(`remaining_quantity`, 0) > 0 THEN 1 ELSE 0 END) AS need_date_count,
    SUM(CASE WHEN `status` = 'NEAR_EXPIRY' AND COALESCE(`remaining_quantity`, 0) > 0 THEN 1 ELSE 0 END) AS near_expiry_count
  FROM `inventory_batches`
  GROUP BY `product_id`
) s ON s.`product_id` = p.`id`
SET
  p.`latest_import_date` = s.`latest_import_date`,
  p.`latest_manufacture_date` = s.`latest_manufacture_date`,
  p.`earliest_expiry_date` = s.`earliest_expiry_date`,
  p.`freshness_status` = CASE
    WHEN s.`product_id` IS NULL THEN 'untracked'
    WHEN s.`need_date_count` > 0 THEN 'need_date_update'
    WHEN s.`near_expiry_count` > 0 THEN 'near_expiry'
    ELSE 'fresh'
  END
WHERE p.`status` <> 'hidden';
