-- V15: Allow customers to attach one Cloudinary image URL to a product review.
SET @schema_name = DATABASE();

SET @add_review_image_url = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `reviews` ADD COLUMN `image_url` VARCHAR(1024) NULL AFTER `comment`',
    'DO 0'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'reviews'
    AND COLUMN_NAME = 'image_url'
);

PREPARE stmt FROM @add_review_image_url;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
