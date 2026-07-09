ALTER TABLE `order_status_history`
    MODIFY COLUMN `status` enum(
        'pending',
        'processing',
        'ready_for_delivery',
        'out_for_delivery',
        'delivered',
        'completed',
        'failed_delivery_attempt',
        'canceled'
    ) DEFAULT NULL;
