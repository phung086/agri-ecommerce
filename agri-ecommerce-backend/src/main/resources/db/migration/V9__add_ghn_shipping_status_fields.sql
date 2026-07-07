ALTER TABLE `orders`
    ADD COLUMN `shipping_provider` varchar(50) DEFAULT NULL AFTER `tracking_number`,
    ADD COLUMN `shipping_status` varchar(100) DEFAULT NULL AFTER `shipping_provider`,
    ADD COLUMN `shipping_status_updated_at` timestamp NULL DEFAULT NULL AFTER `shipping_status`;

CREATE INDEX `idx_orders_tracking_number` ON `orders` (`tracking_number`);
