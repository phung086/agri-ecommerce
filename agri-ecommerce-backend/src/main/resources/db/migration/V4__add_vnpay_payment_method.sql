ALTER TABLE `payments`
    MODIFY COLUMN `payment_method` enum('cash','paypal','vnpay') NOT NULL;
