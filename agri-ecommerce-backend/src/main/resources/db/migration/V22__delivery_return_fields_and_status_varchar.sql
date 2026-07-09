ALTER TABLE `orders`
    MODIFY COLUMN `status` varchar(50) NOT NULL DEFAULT 'pending',
    ADD COLUMN `return_reason` text DEFAULT NULL,
    ADD COLUMN `return_note` text DEFAULT NULL,
    ADD COLUMN `returned_at` timestamp NULL DEFAULT NULL;

ALTER TABLE `order_status_history`
    MODIFY COLUMN `status` varchar(50) DEFAULT NULL;
