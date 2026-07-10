-- V202607104: Allow VNPay refund workflow payment statuses
-- Minimal migration for the customer refund-cancel flow.
-- The original payments.status column was ENUM('pending','completed','failed'),
-- which rejects refund_requested/refunded and causes /refund-cancel to return 500.

ALTER TABLE `payments`
  MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'pending';

UPDATE `payments`
SET `status` = 'pending'
WHERE `status` IS NULL OR TRIM(`status`) = '';
