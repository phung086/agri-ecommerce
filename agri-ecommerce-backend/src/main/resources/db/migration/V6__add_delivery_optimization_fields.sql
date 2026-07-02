ALTER TABLE `orders`
  ADD COLUMN `delivery_proof_image` varchar(255) DEFAULT NULL,
  ADD COLUMN `delivery_signature` text DEFAULT NULL,
  ADD COLUMN `delivery_failure_reason` varchar(255) DEFAULT NULL;
