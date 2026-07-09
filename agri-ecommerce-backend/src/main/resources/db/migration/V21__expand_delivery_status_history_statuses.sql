ALTER TABLE `order_status_history`
    MODIFY COLUMN `status` enum(
        'pending',
        'processing',
        'ready_for_delivery',
        'picking_up',
        'out_for_delivery',
        'delivered',
        'completed',
        'failed_delivery_attempt',
        'redelivery_requested',
        'returning',
        'returned',
        'canceled'
    ) DEFAULT NULL;
