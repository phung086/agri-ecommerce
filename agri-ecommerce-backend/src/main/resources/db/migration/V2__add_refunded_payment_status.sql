ALTER TABLE `payments`
    MODIFY COLUMN `status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending';
