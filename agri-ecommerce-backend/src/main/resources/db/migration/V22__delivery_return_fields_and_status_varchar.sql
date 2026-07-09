ALTER TABLE `orders`
    MODIFY COLUMN `status` varchar(50) NOT NULL DEFAULT 'pending',
    ADD COLUMN `return_reason` text DEFAULT NULL AFTER `delivery_failure_reason`,
    ADD COLUMN `return_note` text DEFAULT NULL AFTER `return_reason`,
    ADD COLUMN `returned_at` timestamp NULL DEFAULT NULL AFTER `return_note`;

ALTER TABLE `order_status_history`
    MODIFY COLUMN `status` varchar(50) DEFAULT NULL;
