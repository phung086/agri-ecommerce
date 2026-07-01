ALTER TABLE `categories`
  ADD COLUMN `name_en` varchar(255) DEFAULT NULL AFTER `name`,
  ADD COLUMN `description_en` text DEFAULT NULL AFTER `description`;

ALTER TABLE `products`
  ADD COLUMN `name_en` varchar(255) DEFAULT NULL AFTER `name`,
  ADD COLUMN `description_en` text DEFAULT NULL AFTER `description`,
  ADD COLUMN `unit_en` varchar(255) DEFAULT NULL AFTER `unit`;

