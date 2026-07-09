-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: veggie_main
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cart_items`
--

DROP TABLE IF EXISTS `cart_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cart_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cart_items_user_id_foreign` (`user_id`),
  KEY `cart_items_product_id_foreign` (`product_id`),
  CONSTRAINT `cart_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cart_items_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cart_items`
--

LOCK TABLES `cart_items` WRITE;
/*!40000 ALTER TABLE `cart_items` DISABLE KEYS */;
INSERT INTO `cart_items` VALUES (36,9,28,1,'2026-06-24 03:06:50','2026-06-24 03:06:50'),(37,9,46,1,'2026-06-24 07:20:06','2026-06-24 07:20:06'),(38,9,45,1,'2026-06-24 07:20:14','2026-06-24 07:20:14');
/*!40000 ALTER TABLE `cart_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `description_en` text COLLATE utf8mb4_unicode_ci,
  `image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categories_name_unique` (`name`),
  UNIQUE KEY `categories_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Rau củ','Vegetables','rau-cu','Cá loại rau củ tươi ngon','Fish loai vegetables fresh','https://res.cloudinary.com/dxypmcckx/image/upload/v1782967703/agri-ecommerce/categories/pevafm6vnlbwijwx74za.jpg','2025-11-04 13:50:32','2026-07-01 21:48:29'),(2,'Trái cây','Fruit','trai-cay','Trái cây sạch, tươi ngon','Clean, fresh and delicious fruit','https://res.cloudinary.com/dxypmcckx/image/upload/v1782967723/agri-ecommerce/categories/lcgw4447ikirvj4izziq.jpg','2025-11-04 13:50:32','2026-07-01 21:48:46'),(3,'Thịt','Meat','thit','Thịt tươi ngon, đảm bảo chất lượng','Meat fresh, quality assured','https://res.cloudinary.com/dxypmcckx/image/upload/v1782967752/agri-ecommerce/categories/o4yf7jrcgyxniavagwlp.jpg','2025-11-04 13:50:32','2026-07-01 21:49:32'),(4,'Cá','Fish','ca','Hải sản và cá tươi sống','Localized item','https://res.cloudinary.com/dxypmcckx/image/upload/v1782967790/agri-ecommerce/categories/zkus3n9etmq6qzmuwu1e.jpg','2025-11-04 13:50:32','2026-07-01 21:49:54'),(5,'Thực phẩm khác','Other foods','thuc-pham-khac','Cá loại thực phẩm bổ sung khác','Localized item','https://res.cloudinary.com/dxypmcckx/image/upload/v1782967839/agri-ecommerce/categories/iankusdobk3vyvumnjnk.jpg','2025-11-04 13:50:32','2026-07-01 21:50:51');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `guest_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sender` enum('user','bot') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `chat_messages_user_id_foreign` (`user_id`),
  KEY `chat_messages_guest_token_index` (`guest_token`),
  CONSTRAINT `chat_messages_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_messages`
--

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
INSERT INTO `chat_messages` VALUES (1,8,NULL,'user','alo','2025-11-04 14:32:59','2025-11-04 14:32:59'),(2,8,NULL,'bot','Chào bạn, tôi có thể giúp gì cho bạn ạ?\n','2025-11-04 14:33:01','2025-11-04 14:33:01'),(3,8,NULL,'user','bạn có món gì trong của hàng','2025-11-04 14:33:09','2025-11-04 14:33:09'),(4,8,NULL,'bot','Hiện tại, tôi có chanh với giá 50,000 VNĐ/kg ạ. Bạn có muốn mua không?\n','2025-11-04 14:33:12','2025-11-04 14:33:12'),(5,8,NULL,'user','co mon chanh day khong?','2025-11-04 15:37:41','2025-11-04 15:37:41'),(6,8,NULL,'bot','Dạ có chanh dây ạ, giá 123,456 VNĐ/kg ạ.\n','2025-11-04 15:37:43','2025-11-04 15:37:43'),(7,8,NULL,'user','vậy có thịt ngon không?','2025-11-04 15:38:17','2025-11-04 15:38:17'),(8,8,NULL,'bot','Dạ, hiện tại cửa hàng chỉ có chanh (50,000 VNĐ/kg) và chanh dây (123,456 VNĐ/kg) thôi ạ.\n','2025-11-04 15:38:19','2025-11-04 15:38:19'),(9,8,NULL,'user','vậy có thịt ngon không?','2025-11-04 15:38:19','2025-11-04 15:38:19'),(10,8,NULL,'bot','Dạ, hiện tại cửa hàng mình chỉ có rau củ thôi ạ, không có thịt ạ.\n','2025-11-04 15:38:21','2025-11-04 15:38:21'),(11,8,NULL,'user','tu van cho toi an tang can 5kg','2025-11-04 15:38:37','2025-11-04 15:38:37'),(12,8,NULL,'bot','Chào bạn, rất tiếc cửa hàng mình chuyên về rau củ quả, không có các sản phẩm hỗ trợ tăng cân trực tiếp ạ. Chanh và chanh dây có thể giúp bạn bổ sung vitamin thôi ạ.\n','2025-11-04 15:38:39','2025-11-04 15:38:39'),(13,8,NULL,'user','helo','2025-11-04 15:57:48','2025-11-04 15:57:48'),(14,8,NULL,'bot','Chào bạn ạ! Bạn cần hỗ trợ gì ạ?\n','2025-11-04 15:57:52','2025-11-04 15:57:52'),(15,8,NULL,'user','ban co khoe khong','2025-11-04 15:58:01','2025-11-04 15:58:01'),(16,8,NULL,'bot','Tôi ổn, cảm ơn bạn. Bạn cần hỗ trợ gì về rau củ quả ạ?\n','2025-11-04 15:58:06','2025-11-04 15:58:06'),(17,8,NULL,'user','1 + 1','2025-11-04 15:58:19','2025-11-04 15:58:19'),(18,8,NULL,'bot','Tôi không rõ câu hỏi của bạn lắm. Bạn có muốn hỏi về giá của chanh hay chanh dây không ạ?\n','2025-11-04 15:58:26','2025-11-04 15:58:26'),(19,8,NULL,'user','1 + 1 + mấy','2025-11-04 16:03:00','2025-11-04 16:03:00'),(20,8,NULL,'bot','Tôi không rõ câu hỏi của bạn lắm. Bạn có muốn hỏi về giá của chanh hay chanh dây không ạ?\n','2025-11-04 16:03:02','2025-11-04 16:03:02'),(21,8,NULL,'user','i love you','2025-11-04 16:03:10','2025-11-04 16:03:10'),(22,8,NULL,'bot','Tôi rất vui khi bạn thích các sản phẩm của chúng tôi. Bạn có muốn biết thêm thông tin về sản phẩm nào không ạ?\n','2025-11-04 16:03:11','2025-11-04 16:03:11'),(23,8,NULL,'user','có trái cây nào ngon không','2025-11-12 14:27:52','2025-11-12 14:27:52'),(24,8,NULL,'bot','Chúng tôi có Bưởi da xanh, Chuối giống Nam Mỹ, Dưa hấu Hàn Quốc, Lê Trung Quốc, Mít Thái, Nho sữa Trung, Xoài Cát và Cherry nội địa Trung. Bạn muốn biết thêm về loại nào không ạ?\n','2025-11-12 14:27:54','2025-11-12 14:27:54'),(25,8,NULL,'user','dưa hấu đi','2025-11-12 14:28:03','2025-11-12 14:28:03'),(26,8,NULL,'bot','Dạ, chúng tôi có Dưa hấu Hàn Quốc với giá 20.000đ/kg ạ.\n','2025-11-12 14:28:09','2025-11-12 14:28:09'),(27,8,NULL,'user','nó là dưa nhập khẩu phải không','2025-11-12 14:28:27','2025-11-12 14:28:27'),(28,8,NULL,'bot','Xin lỗi, AI không thể xử lý lúc này.','2025-11-12 14:28:46','2025-11-12 14:28:46'),(29,8,NULL,'user','ok','2025-11-12 14:28:53','2025-11-12 14:28:53'),(30,8,NULL,'bot','Tôi có thể giúp gì cho bạn không ạ? Bạn có muốn tìm hiểu thêm về sản phẩm nào, hoặc cần tôi gợi ý gì không?\n','2025-11-12 14:29:03','2025-11-12 14:29:03'),(31,8,NULL,'user','tư vấn cho tôi các sản phẩm sữa','2025-11-12 14:30:30','2025-11-12 14:30:30'),(32,8,NULL,'bot','Hiện tại bên em có các sản phẩm sữa sau ạ:\n\n*   **Sữa thùng Vinamilk 1l:** 330.000đ/thùng\n*   **Sữa bịch Dutchlady:** 6.000đ/hộp\n*   **Sữa hộp Dutchlady 1 thùng:** 360.000đ/thùng\n*   **Sữa bịch Vinamilk:** 6.000đ/bịch\n*   **Sữa TH:** 50.000đ/lóc\n\nAnh/Chị quan tâm đến loại sữa nào ạ? Em có thể tư vấn chi tiết hơn về thành phần, công dụng của từng loại để anh/chị lựa chọn được sản phẩm phù hợp nhất ạ.\n','2025-11-12 14:30:36','2025-11-12 14:30:36'),(33,8,NULL,'user','tư vấn cho tôi các sản phẩm sữa','2025-11-12 14:30:38','2025-11-12 14:30:38'),(34,8,NULL,'bot','Dạ, bên em đang có các loại sữa sau ạ:\n\n*   **Sữa thùng Vinamilk 1l:** 330.000đ/thùng\n*   **Sữa bịch Dutchlady:** 6.000đ/hộp\n*   **Sữa hộp Dutchlady 1 thùng:** 360.000đ/thùng\n*   **Sữa bịch Vinamilk:** 6.000đ/bịch\n*   **Sữa TH:** 50.000đ/lóc\n\nAnh/Chị muốn tìm hiểu thêm về loại sữa nào ạ? Ví dụ như thành phần dinh dưỡng, hương vị, hay công dụng của từng loại chẳng hạn?\n','2025-11-12 14:30:41','2025-11-12 14:30:41'),(35,8,NULL,'user','có trứng không','2025-11-12 14:31:24','2025-11-12 14:31:24'),(36,8,NULL,'bot','Xin lỗi, hiện tại không thể kết nối AI.','2025-11-12 14:31:36','2025-11-12 14:31:36'),(37,8,NULL,'user','cửa hàng có trứng khong','2025-11-12 14:33:23','2025-11-12 14:33:23'),(38,8,NULL,'bot','Dạ có ạ, cửa hàng em có các loại trứng sau:\n\n*   **Trứng cút hộp 30 quả:** 50.000đ/hộp\n*   **Trứng gà hộp 10 quả:** 3.000đ/quả\n*   **Trứng:** 30.000đ/hộp\n\nAnh/Chị muốn mua loại trứng nào ạ?\n','2025-11-12 14:33:25','2025-11-12 14:33:25'),(39,8,NULL,'user','xóa lịch sử chat cho tôi.','2025-11-12 14:33:41','2025-11-12 14:33:41'),(40,8,NULL,'bot','Tôi là một mô hình ngôn ngữ lớn và không thể thực hiện hành động đó. Tôi không lưu trữ lịch sử chat của bạn. Lịch sử chat có thể được lưu trữ ở phía bạn, trên trình duyệt hoặc thiết bị bạn đang sử dụng.\n','2025-11-12 14:33:43','2025-11-12 14:33:43'),(41,8,NULL,'user','ok','2025-11-12 14:34:27','2025-11-12 14:34:27'),(42,8,NULL,'bot','Xin lỗi, AI không thể xử lý lúc này.','2025-11-12 14:34:40','2025-11-12 14:34:40'),(43,8,NULL,'user','cảm ơn','2025-11-12 14:34:59','2025-11-12 14:34:59'),(44,8,NULL,'bot','Không có gì ạ! Nếu anh/chị cần thêm thông tin gì hoặc muốn đặt hàng, cứ cho em biết nhé!\n','2025-11-12 14:35:03','2025-11-12 14:35:03'),(45,8,NULL,'user','oke','2025-11-12 14:35:14','2025-11-12 14:35:14'),(46,8,NULL,'bot','Chào anh/chị! Em có thể giúp gì cho mình ạ?\n','2025-11-12 14:35:19','2025-11-12 14:35:19'),(47,8,NULL,'user','cho tôi một số món rau','2025-11-13 08:33:54','2025-11-13 08:33:54'),(48,8,NULL,'bot','Dạ, bên em hiện có các loại rau sau ạ:\n\n*   Cải ngọt: 6.000đ/túi\n*   Mầm giá đỗ: 10.000đ/túi\n*   Rau khoai lang: 10.000đ/túi\n*   Rau muống: 10.000đ/túi\n*   Hành lá: 5.000đ/túi\n*   Rau má: 3.600đ/túi\n*   Rau mồng tơi: 10.000đ/túi\n*   Rau tía tô: 10.000đ/túi\n\nAnh/chị muốn chọn loại nào ạ?\n','2025-11-13 08:33:57','2025-11-13 08:33:57'),(49,8,NULL,'user','có trứng không?','2025-11-13 08:34:38','2025-11-13 08:34:38'),(50,8,NULL,'bot','Dạ có ạ. Bên em có:\n\n*   Trứng cút hộp 30 quả: 50.000đ/hộp\n*   Trứng gà hộp 10 quả: 3.000đ/quả\n*   Trứng: 30.000đ/hộp\n','2025-11-13 08:34:41','2025-11-13 08:34:41'),(51,8,NULL,'user','Hello','2025-11-15 11:02:07','2025-11-15 11:02:07'),(52,8,NULL,'bot','Dạ, bên em có bán trứng ạ:\n\n*   Trứng cút hộp 30 quả - 50.000đ/hộp\n*   Trứng gà hộp 10 quả - 3.000đ/quả\n*   Trứng (không rõ loại) - 30.000đ/hộp\n\nAnh/Chị muốn mua loại nào ạ?\n','2025-11-15 11:02:09','2025-11-15 11:02:09'),(53,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','user','hi','2025-11-15 11:43:14','2025-11-15 11:43:14'),(54,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','bot','Chào bạn! Tôi có thể giúp gì cho bạn hôm nay? Bạn muốn tìm loại rau củ quả hay thực phẩm nào ạ?\n','2025-11-15 11:43:17','2025-11-15 11:43:17'),(55,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','user','có rau gì ngon không','2025-11-15 11:43:26','2025-11-15 11:43:26'),(56,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','bot','Bên mình có nhiều loại rau tươi ngon bạn nhé! Bạn thích rau ăn lá hay rau củ quả ạ? Hiện tại có các loại rau như cải ngọt, rau muống, rau khoai lang, mồng tơi, tía tô, rau má... đều đang tươi ngon đó ạ. Bạn muốn thử loại nào không?\n','2025-11-15 11:43:28','2025-11-15 11:43:28'),(57,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','user','cải đi','2025-11-15 11:43:37','2025-11-15 11:43:37'),(58,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','bot','Bên mình có cải ngọt giá 6000đ/túi bạn nhé!\n','2025-11-15 11:43:38','2025-11-15 11:43:38'),(59,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','user','helo','2025-11-15 11:49:40','2025-11-15 11:49:40'),(60,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','bot','Chào bạn! Hôm nay bạn muốn mua gì ạ? Bên mình có nhiều rau củ quả tươi ngon và thực phẩm tươi sống đó ạ.\n','2025-11-15 11:49:42','2025-11-15 11:49:42'),(61,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','user','có rau gì ngon không','2025-11-15 11:49:52','2025-11-15 11:49:52'),(62,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','bot','Bên mình có cải ngọt, rau muống, rau khoai lang, rau mồng tơi đều tươi ngon bạn nhé! Bạn thích loại nào ạ?\n\n\n🔗 *Các sản phẩm được nhắc tới:*\n👉 Cải ngọt: http://127.0.0.1:8000/product/cai-ngot-1762274283\n👉 Rau khoai lang: http://127.0.0.1:8000/product/rau-khoai-lang-1762274367\n👉 Rau muống: http://127.0.0.1:8000/product/rau-muong-1762274411\n👉 Rau mồng tơi: http://127.0.0.1:8000/product/rau-mong-toi-1762274524','2025-11-15 11:49:54','2025-11-15 11:49:54'),(63,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','user','helo','2025-11-15 11:52:43','2025-11-15 11:52:43'),(64,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','bot','Chào bạn ạ! Bạn cần tìm gì hôm nay ạ?\n','2025-11-15 11:52:45','2025-11-15 11:52:45'),(65,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','user','có thịt heo ko','2025-11-15 11:52:50','2025-11-15 11:52:50'),(66,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','bot','Dạ có ạ! Bên mình có ba rọi heo 500g, chân giò heo 500g, thịt heo xay CP 200g và heo sữa đó ạ. Bạn muốn mua loại nào ạ?\n<br><br>🔗 <strong>Các sản phẩm được nhắc tới:</strong><br>👉 <a href=\'http://127.0.0.1:8000/product/ba-roi-heo-500g-1762275087\' target=\'_blank\'>Ba rọi heo 500g</a><br>👉 <a href=\'http://127.0.0.1:8000/product/chan-gio-heo-500g-1762275199\' target=\'_blank\'>Chân giò heo 500g</a><br>👉 <a href=\'http://127.0.0.1:8000/product/thit-heo-xay-cp-200g-1762275309\' target=\'_blank\'>Thịt heo xay cp 200g</a><br>👉 <a href=\'http://127.0.0.1:8000/product/heo-sua-1762275646\' target=\'_blank\'>Heo sữa</a>','2025-11-15 11:52:52','2025-11-15 11:52:52'),(67,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','user','helo','2025-11-15 11:53:45','2025-11-15 11:53:45'),(68,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','bot','Chào bạn! Hôm nay bạn muốn mua gì ạ? Bên mình có nhiều loại rau củ quả và thịt tươi ngon đó ạ!\n','2025-11-15 11:53:47','2025-11-15 11:53:47'),(69,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','user','có thịt heo ko','2025-11-15 11:53:52','2025-11-15 11:53:52'),(70,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','bot','Dạ có ạ! Bên mình có ba rọi heo 500g, chân giò heo 500g, thịt heo xay CP 200g và heo sữa đó ạ.\n','2025-11-15 11:53:54','2025-11-15 11:53:54'),(71,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','user','giá','2025-11-15 11:54:04','2025-11-15 11:54:04'),(72,NULL,'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b','bot','Giá các loại thịt heo bên mình như sau ạ:\n\n*   Ba rọi heo 500g: 80.000đ/kg\n*   Chân giò heo 500g: 50.000đ/kg\n*   Thịt heo xay CP 200g: 20.000đ/kg\n*   Heo sữa: 20.000đ/kg','2025-11-15 11:54:06','2025-11-15 11:54:06'),(73,NULL,'guest_ffc92da69dc7454fb6f2','user','Gợi ý rau củ dưới 50k','2026-06-29 19:20:11','2026-06-29 19:20:11'),(74,NULL,'guest_ffc92da69dc7454fb6f2','bot','Tính năng tư vấn AI hiện tại đang tạm tắt. Bạn có thể xem danh sách sản phẩm tại trang chủ hoặc liên hệ bộ phận hỗ trợ để được tư vấn trực tiếp.','2026-06-29 19:20:11','2026-06-29 19:20:11'),(75,NULL,'guest_ffc92da69dc7454fb6f2','user','Tư vấn giỏ hàng khoảng 100k','2026-07-01 18:52:27','2026-07-01 18:52:27'),(76,NULL,'guest_ffc92da69dc7454fb6f2','bot','Tính năng tư vấn AI hiện tại đang tạm tắt. Bạn có thể xem danh sách sản phẩm tại trang chủ hoặc liên hệ bộ phận hỗ trợ để được tư vấn trực tiếp.','2026-07-01 18:52:27','2026-07-01 18:52:27');
/*!40000 ALTER TABLE `chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contacts`
--

DROP TABLE IF EXISTS `contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contacts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_replied` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contacts`
--

LOCK TABLES `contacts` WRITE;
/*!40000 ALTER TABLE `contacts` DISABLE KEYS */;
INSERT INTO `contacts` VALUES (1,'huan','0987654321','huanlee2004@gmail.com','tuw vaas mua ca chua',1,'2025-11-04 15:04:22','2026-06-28 20:04:02'),(2,'Nguyễn Thị Khang','0999333666','huanlee2004@gmail.com','tôi muốn được tư vẫn về các loại thịt',1,'2026-06-29 01:12:08','2026-06-29 01:14:53');
/*!40000 ALTER TABLE `contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coupons`
--

DROP TABLE IF EXISTS `coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `coupon_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ORDER_DISCOUNT',
  `discount_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PERCENTAGE',
  `discount_percentage` tinyint unsigned NOT NULL,
  `discount_amount` decimal(10,2) DEFAULT NULL,
  `starts_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `usage_limit` int unsigned DEFAULT NULL,
  `times_used` int unsigned NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coupons_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coupons`
--

LOCK TABLES `coupons` WRITE;
/*!40000 ALTER TABLE `coupons` DISABLE KEYS */;
INSERT INTO `coupons` VALUES (5,'SPRING','ORDER_DISCOUNT','PERCENTAGE',60,NULL,NULL,'2026-06-29 19:01:00',3,0,1,'2026-06-28 19:01:21','2026-06-28 19:05:52'),(6,'MONDAY','ORDER_DISCOUNT','PERCENTAGE',20,NULL,NULL,'2026-06-30 19:02:00',3,0,1,'2026-06-28 19:02:09','2026-06-28 19:05:51'),(7,'SHIP','FREESHIP','PERCENTAGE',0,NULL,NULL,'2026-07-03 19:02:00',2,0,1,'2026-06-28 19:02:56','2026-06-28 20:17:57'),(8,'FREESHIP','FREESHIP','PERCENTAGE',0,NULL,'2026-06-27 20:08:00','2026-07-10 19:03:00',10,0,1,'2026-06-28 19:03:50','2026-06-28 20:10:51'),(9,'SUPERSALE','ORDER_DISCOUNT','PERCENTAGE',20,NULL,'2026-06-28 23:58:00','2026-07-03 23:58:00',10,0,1,'2026-06-28 23:58:34','2026-06-28 23:58:34'),(10,'LOYAL','ORDER_DISCOUNT','PERCENTAGE',21,NULL,NULL,'2026-07-17 20:02:00',5,0,1,'2026-07-01 20:02:29','2026-07-01 20:02:29'),(11,'WEEKEND','ORDER_DISCOUNT','PERCENTAGE',18,NULL,NULL,'2026-07-17 20:02:00',21,0,1,'2026-07-01 20:02:59','2026-07-01 20:02:59'),(12,'COMBO','ORDER_DISCOUNT','PERCENTAGE',34,NULL,NULL,'2026-07-16 20:03:00',20,0,1,'2026-07-01 20:03:38','2026-07-01 20:03:38');
/*!40000 ALTER TABLE `coupons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'2025_04_05_083244_create_roles_table',1),(2,'2025_04_05_083337_create_permissions_table',1),(3,'2025_04_05_083400_create_role_permissions_table',1),(4,'2025_04_05_083422_create_users_table',1),(5,'2025_04_05_083516_create_categories_table',1),(6,'2025_04_05_083525_create_products_table',1),(7,'2025_04_05_083534_create_product_images_table',1),(8,'2025_04_05_083557_create_shipping_addresses_table',1),(9,'2025_04_05_083619_create_orders_table',1),(10,'2025_04_05_083627_create_order_items_table',1),(11,'2025_04_05_083638_create_payments_table',1),(12,'2025_04_05_083648_create_wishlists_table',1),(13,'2025_04_05_083657_create_reviews_table',1),(14,'2025_04_05_083706_create_notifications_table',1),(15,'2025_04_05_083734_create_contacts_table',1),(16,'2025_04_05_083754_create_order_status_history_table',1),(17,'2025_04_05_083821_create_cart_items_table',1),(18,'2025_04_05_083915_create_password_reset_tokens_table',1),(19,'2025_05_20_000000_create_coupons_table',1),(20,'2025_05_20_010000_add_coupon_fields_to_orders_table',1),(21,'2025_08_11_031938_create_chat_messages_table',1),(22,'2025_10_05_000001_add_delivery_fields_to_orders_table',1),(23,'2025_10_05_000002_update_status_enum_in_order_status_history',1);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_user_id_foreign` (`user_id`),
  CONSTRAINT `notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,8,'contact','Có đơn liên hệ từ huanlee2004@gmail.com','/contacts',1,'2025-11-04 15:04:22','2025-11-05 14:03:36'),(2,8,'order','Có đơn đặt hàng mới từ huanlee2004@gmail.com','/orders',0,'2025-11-04 17:16:58','2025-11-04 17:16:58'),(3,8,'order','Có đơn đặt hàng mới từ huanlee2004@gmail.com','/orders',1,'2025-11-13 08:26:06','2026-04-10 20:24:46'),(4,8,'order','Có đơn đặt hàng mới từ huanlee2004@gmail.com','/orders',0,'2026-06-13 02:16:23','2026-06-13 02:16:23'),(5,8,'order','Đơn hàng #11 đã được tạo thành công','/orders/11',0,'2026-06-23 23:50:59','2026-06-23 23:50:59'),(6,8,'order','Đơn hàng #11 đã được xác nhận','/orders/11',0,'2026-06-24 00:03:30','2026-06-24 00:03:30'),(7,8,'order','Đơn hàng #11 đã sẵn sàng giao','/orders/11',0,'2026-06-24 00:03:36','2026-06-24 00:03:36'),(8,6,'delivery','Bạn được phân công giao đơn hàng #11','/delivery/orders/11',0,'2026-06-24 00:03:51','2026-06-24 00:03:51'),(9,8,'order','Đơn hàng #11 đã được phân công nhân viên giao hàng','/orders/11',0,'2026-06-24 00:03:51','2026-06-24 00:03:51'),(10,8,'order','Đơn hàng #5 đã hoàn tất','/orders/5',0,'2026-06-24 00:04:07','2026-06-24 00:04:07'),(11,8,'order','Đơn hàng #4 đã hoàn tất','/orders/4',0,'2026-06-24 00:04:09','2026-06-24 00:04:09'),(12,8,'order','Đơn hàng #11 đang được giao','/orders/11',0,'2026-06-24 00:06:51','2026-06-24 00:06:51'),(13,8,'order','Đơn hàng #11 đã được giao thành công','/orders/11',0,'2026-06-24 00:06:52','2026-06-24 00:06:52'),(14,8,'order','Đơn hàng #11 đã hoàn tất','/orders/11',0,'2026-06-24 00:07:02','2026-06-24 00:07:02'),(15,8,'order','Đơn hàng #12 đã được tạo thành công','/orders/12',0,'2026-06-24 01:16:08','2026-06-24 01:16:08'),(16,9,'order','Đơn hàng #13 đã được tạo thành công','/orders/13',0,'2026-06-24 03:02:47','2026-06-24 03:02:47'),(17,9,'order','Đơn hàng #13 đã được xác nhận','/orders/13',0,'2026-06-24 03:03:36','2026-06-24 03:03:36'),(18,9,'order','Đơn hàng #13 đã sẵn sàng giao','/orders/13',0,'2026-06-24 03:03:41','2026-06-24 03:03:41'),(19,6,'delivery','Bạn được phân công giao đơn hàng #13','/delivery/orders/13',0,'2026-06-24 03:03:50','2026-06-24 03:03:50'),(20,9,'order','Đơn hàng #13 đã được phân công nhân viên giao hàng','/orders/13',0,'2026-06-24 03:03:50','2026-06-24 03:03:50'),(21,9,'order','Đơn hàng #13 đang được giao','/orders/13',0,'2026-06-24 03:04:23','2026-06-24 03:04:23'),(22,9,'order','Đơn hàng #13 đã được giao thành công','/orders/13',0,'2026-06-24 03:04:28','2026-06-24 03:04:28'),(23,9,'order','Đơn hàng #13 đã hoàn tất','/orders/13',0,'2026-06-24 03:05:09','2026-06-24 03:05:09'),(24,8,'order','Đơn hàng #14 đã được tạo thành công','/orders/14',0,'2026-06-26 13:05:43','2026-06-26 13:05:43'),(25,6,'delivery','Bạn được phân công giao đơn hàng #9','/delivery/orders/9',0,'2026-06-26 20:47:18','2026-06-26 20:47:18'),(26,8,'order','Đơn hàng #9 đã được phân công nhân viên giao hàng','/orders/9',0,'2026-06-26 20:47:18','2026-06-26 20:47:18'),(27,6,'delivery','Bạn được phân công giao đơn hàng #8','/delivery/orders/8',0,'2026-06-26 20:47:23','2026-06-26 20:47:23'),(28,8,'order','Đơn hàng #8 đã được phân công nhân viên giao hàng','/orders/8',0,'2026-06-26 20:47:23','2026-06-26 20:47:23'),(29,8,'order','Đơn hàng #7 đã bị hủy','/orders/7',0,'2026-06-27 00:11:37','2026-06-27 00:11:37'),(30,8,'order','Đơn hàng #15 đã được tạo thành công','/orders/15',0,'2026-06-27 20:04:46','2026-06-27 20:04:46'),(31,8,'order','Đơn hàng #15 đã được xác nhận','/orders/15',0,'2026-06-27 20:07:21','2026-06-27 20:07:21'),(32,8,'order','Đơn hàng #15 đã sẵn sàng giao','/orders/15',0,'2026-06-28 19:10:43','2026-06-28 19:10:43'),(33,6,'delivery','Bạn được phân công giao đơn hàng #15','/delivery/orders/15',0,'2026-06-28 19:10:50','2026-06-28 19:10:50'),(34,8,'order','Đơn hàng #15 đã được phân công nhân viên giao hàng','/orders/15',0,'2026-06-28 19:10:50','2026-06-28 19:10:50'),(35,8,'order','Đơn hàng #9 đã sẵn sàng giao','/orders/9',0,'2026-06-28 19:10:58','2026-06-28 19:10:58'),(36,6,'delivery','Đơn hàng #9 đã sẵn sàng để giao','/delivery/orders/9',0,'2026-06-28 19:10:58','2026-06-28 19:10:58'),(37,8,'order','Đơn hàng #8 đã sẵn sàng giao','/orders/8',0,'2026-06-28 19:10:58','2026-06-28 19:10:58'),(38,6,'delivery','Đơn hàng #8 đã sẵn sàng để giao','/delivery/orders/8',0,'2026-06-28 19:10:58','2026-06-28 19:10:58'),(39,4,'contact','Có liên hệ hỗ trợ mới từ Nguyễn Thị Khang','/admin/contacts/2',0,'2026-06-29 01:12:08','2026-06-29 01:12:08'),(40,8,'order','Đơn hàng #20 đã được tạo thành công','/orders/20',0,'2026-07-01 00:53:24','2026-07-01 00:53:24'),(41,8,'order','Đơn hàng #20 đã được xác nhận','/orders/20',0,'2026-07-01 01:11:14','2026-07-01 01:11:14'),(42,8,'order','Đơn hàng #21 đã được tạo thành công','/orders/21',0,'2026-07-01 18:51:59','2026-07-01 18:51:59'),(43,8,'order','Đơn hàng #22 đã được tạo thành công','/orders/22',0,'2026-07-01 20:29:34','2026-07-01 20:29:34');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_items_order_id_foreign` (`order_id`),
  KEY `order_items_product_id_foreign` (`product_id`),
  CONSTRAINT `order_items_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (4,3,34,1,6000.00,'2025-11-04 17:22:42','2025-11-04 17:22:42'),(5,4,43,1,50000.00,'2025-11-05 13:25:59','2025-11-05 13:25:59'),(6,4,27,1,150000.00,'2025-11-05 13:25:59','2025-11-05 13:25:59'),(7,4,24,1,80000.00,'2025-11-05 13:25:59','2025-11-05 13:25:59'),(8,5,47,1,30000.00,'2025-11-05 14:11:49','2025-11-05 14:11:49'),(9,6,7,2,10000.00,'2025-11-12 14:16:39','2025-11-12 14:16:39'),(10,6,6,1,6000.00,'2025-11-12 14:16:39','2025-11-12 14:16:39'),(11,7,7,1,10000.00,'2025-11-13 08:26:06','2025-11-13 08:26:06'),(12,7,23,1,200000.00,'2025-11-13 08:26:06','2025-11-13 08:26:06'),(13,7,14,1,20000.00,'2025-11-13 08:26:06','2025-11-13 08:26:06'),(14,7,6,1,6000.00,'2025-11-13 08:26:06','2025-11-13 08:26:06'),(15,8,6,1,6000.00,'2025-11-13 08:27:07','2025-11-13 08:27:07'),(16,9,14,1,20000.00,'2026-04-10 20:22:09','2026-04-10 20:22:09'),(17,9,15,1,50000.00,'2026-04-10 20:22:09','2026-04-10 20:22:09'),(18,9,24,1,80000.00,'2026-04-10 20:22:09','2026-04-10 20:22:09'),(19,9,25,1,250000.00,'2026-04-10 20:22:09','2026-04-10 20:22:09'),(20,9,43,2,50000.00,'2026-04-10 20:22:09','2026-04-10 20:22:09'),(21,10,45,1,50000.00,'2026-06-13 02:16:23','2026-06-13 02:16:23'),(22,11,40,1,50000.00,'2026-06-23 23:50:59','2026-06-23 23:50:59'),(23,11,7,1,10000.00,'2026-06-23 23:50:59','2026-06-23 23:50:59'),(24,12,40,1,50000.00,'2026-06-24 01:16:08','2026-06-24 01:16:08'),(25,12,45,1,50000.00,'2026-06-24 01:16:08','2026-06-24 01:16:08'),(26,12,37,1,3000.00,'2026-06-24 01:16:08','2026-06-24 01:16:08'),(27,13,44,1,30000.00,'2026-06-24 03:02:47','2026-06-24 03:02:47'),(28,13,11,1,3600.00,'2026-06-24 03:02:47','2026-06-24 03:02:47'),(29,13,35,1,360000.00,'2026-06-24 03:02:47','2026-06-24 03:02:47'),(30,13,46,2,20000.00,'2026-06-24 03:02:47','2026-06-24 03:02:47'),(31,13,20,1,50000.00,'2026-06-24 03:02:47','2026-06-24 03:02:47'),(32,14,40,1,50000.00,'2026-06-26 13:05:43','2026-06-26 13:05:43'),(33,14,45,2,50000.00,'2026-06-26 13:05:43','2026-06-26 13:05:43'),(34,14,46,1,20000.00,'2026-06-26 13:05:43','2026-06-26 13:05:43'),(35,14,41,1,50000.00,'2026-06-26 13:05:43','2026-06-26 13:05:43'),(36,15,35,1,360000.00,'2026-06-27 20:04:46','2026-06-27 20:04:46'),(37,15,39,2,6000.00,'2026-06-27 20:04:46','2026-06-27 20:04:46'),(38,15,44,1,30000.00,'2026-06-27 20:04:46','2026-06-27 20:04:46'),(39,15,47,1,40000.00,'2026-06-27 20:04:46','2026-06-27 20:04:46'),(60,20,27,1,150000.00,'2026-07-01 00:53:24','2026-07-01 00:53:24'),(61,20,28,1,50000.00,'2026-07-01 00:53:24','2026-07-01 00:53:24'),(62,20,21,1,10000.00,'2026-07-01 00:53:24','2026-07-01 00:53:24'),(63,20,33,1,20000.00,'2026-07-01 00:53:24','2026-07-01 00:53:24'),(64,20,37,1,3000.00,'2026-07-01 00:53:24','2026-07-01 00:53:24'),(65,21,46,1,20000.00,'2026-07-01 18:51:59','2026-07-01 18:51:59'),(66,22,44,1,30000.00,'2026-07-01 20:29:34','2026-07-01 20:29:34');
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_status_history`
--

DROP TABLE IF EXISTS `order_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_status_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `status` enum('pending','processing','ready_for_delivery','out_for_delivery','delivered','completed','canceled') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_status_history_order_id_foreign` (`order_id`),
  CONSTRAINT `order_status_history_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_status_history`
--

LOCK TABLES `order_status_history` WRITE;
/*!40000 ALTER TABLE `order_status_history` DISABLE KEYS */;
INSERT INTO `order_status_history` VALUES (1,1,'processing','2025-11-04 15:02:06','Order confirmed by Admin User','2025-11-04 15:02:06','2025-11-04 15:02:06'),(2,1,'ready_for_delivery','2025-11-04 15:02:38','giao hang cho khach','2025-11-04 15:02:38','2025-11-04 15:02:38'),(3,1,'out_for_delivery','2025-11-04 15:03:26',NULL,'2025-11-04 15:03:26','2025-11-04 15:03:26'),(4,1,'delivered','2025-11-04 15:03:33',NULL,'2025-11-04 15:03:33','2025-11-04 15:03:33'),(5,1,'completed','2025-11-04 15:43:39','Order completed by customer confirmation','2025-11-04 15:43:39','2025-11-04 15:43:39'),(10,3,'processing','2025-11-04 17:24:45','Order confirmed by Admin User','2025-11-04 17:24:45','2025-11-04 17:24:45'),(11,3,'ready_for_delivery','2025-11-04 17:25:06',NULL,'2025-11-04 17:25:06','2025-11-04 17:25:06'),(12,3,'out_for_delivery','2025-11-04 17:25:14',NULL,'2025-11-04 17:25:14','2025-11-04 17:25:14'),(13,3,'delivered','2025-11-04 17:25:15',NULL,'2025-11-04 17:25:15','2025-11-04 17:25:15'),(14,4,'processing','2025-11-05 13:26:18','Order confirmed by Admin User','2025-11-05 13:26:18','2025-11-05 13:26:18'),(15,4,'ready_for_delivery','2025-11-05 13:26:47','hang ngon','2025-11-05 13:26:47','2025-11-05 13:26:47'),(16,4,'ready_for_delivery','2025-11-05 13:34:34',NULL,'2025-11-05 13:34:34','2025-11-05 13:34:34'),(17,4,'ready_for_delivery','2025-11-05 13:37:34','ok','2025-11-05 13:37:34','2025-11-05 13:37:34'),(18,4,'out_for_delivery','2025-11-05 13:40:17',NULL,'2025-11-05 13:40:17','2025-11-05 13:40:17'),(19,4,'delivered','2025-11-05 13:40:29',NULL,'2025-11-05 13:40:29','2025-11-05 13:40:29'),(20,5,'processing','2025-11-05 14:13:28','Order confirmed by Admin User','2025-11-05 14:13:28','2025-11-05 14:13:28'),(21,5,'ready_for_delivery','2025-11-05 14:13:46','ok','2025-11-05 14:13:46','2025-11-05 14:13:46'),(22,5,'out_for_delivery','2025-11-05 14:14:36',NULL,'2025-11-05 14:14:36','2025-11-05 14:14:36'),(23,5,'delivered','2025-11-05 14:14:46',NULL,'2025-11-05 14:14:46','2025-11-05 14:14:46'),(24,6,'processing','2025-11-12 14:18:02','Order confirmed by Admin User','2025-11-12 14:18:02','2025-11-12 14:18:02'),(25,6,'ready_for_delivery','2025-11-12 14:18:24',NULL,'2025-11-12 14:18:24','2025-11-12 14:18:24'),(26,6,'out_for_delivery','2025-11-12 14:18:34',NULL,'2025-11-12 14:18:34','2025-11-12 14:18:34'),(27,6,'delivered','2025-11-12 14:18:36',NULL,'2025-11-12 14:18:36','2025-11-12 14:18:36'),(28,3,'completed','2025-11-12 14:23:52','Order completed by customer confirmation','2025-11-12 14:23:52','2025-11-12 14:23:52'),(29,6,'completed','2025-11-12 15:28:59','Order completed by customer confirmation','2025-11-12 15:28:59','2025-11-12 15:28:59'),(30,7,'processing','2025-11-15 11:16:38','Order confirmed by Admin User','2025-11-15 11:16:38','2025-11-15 11:16:38'),(31,9,'processing','2026-04-10 20:23:49','Order confirmed by Admin User','2026-04-10 20:23:49','2026-04-10 20:23:49'),(32,8,'processing','2026-04-10 20:23:52','Order confirmed by Admin User','2026-04-10 20:23:52','2026-04-10 20:23:52'),(33,11,'pending','2026-06-23 23:50:59','Customer created order','2026-06-23 23:50:59','2026-06-23 23:50:59'),(34,11,'processing','2026-06-24 00:03:30','Xác nhận từ trang quản trị đơn hàng.','2026-06-24 00:03:30','2026-06-24 00:03:30'),(35,11,'ready_for_delivery','2026-06-24 00:03:36','Cập nhật trạng thái từ trang quản trị đơn hàng.','2026-06-24 00:03:36','2026-06-24 00:03:36'),(36,11,'ready_for_delivery','2026-06-24 00:03:51','Assigned delivery staff: Delivery User (#6). Phân công từ trang quản lí giao hàng.','2026-06-24 00:03:51','2026-06-24 00:03:51'),(37,5,'completed','2026-06-24 00:04:07','Cập nhật từ trang quản lí giao hàng.','2026-06-24 00:04:07','2026-06-24 00:04:07'),(38,4,'completed','2026-06-24 00:04:09','Cập nhật từ trang quản lí giao hàng.','2026-06-24 00:04:09','2026-06-24 00:04:09'),(39,11,'out_for_delivery','2026-06-24 00:06:51','Nhân viên giao hàng bắt đầu giao.','2026-06-24 00:06:51','2026-06-24 00:06:51'),(40,11,'delivered','2026-06-24 00:06:52','Nhân viên giao hàng xác nhận đã giao.','2026-06-24 00:06:52','2026-06-24 00:06:52'),(41,11,'completed','2026-06-24 00:07:02','Cập nhật trạng thái từ trang quản trị đơn hàng.','2026-06-24 00:07:02','2026-06-24 00:07:02'),(42,12,'pending','2026-06-24 01:16:08','Customer created order','2026-06-24 01:16:08','2026-06-24 01:16:08'),(43,13,'pending','2026-06-24 03:02:47','Customer created order','2026-06-24 03:02:47','2026-06-24 03:02:47'),(44,13,'processing','2026-06-24 03:03:36','Xác nhận từ trang quản trị đơn hàng.','2026-06-24 03:03:36','2026-06-24 03:03:36'),(45,13,'ready_for_delivery','2026-06-24 03:03:41','Cập nhật trạng thái từ trang quản trị đơn hàng.','2026-06-24 03:03:41','2026-06-24 03:03:41'),(46,13,'ready_for_delivery','2026-06-24 03:03:50','Assigned delivery staff: Delivery User (#6). Phân công từ trang quản lí giao hàng.','2026-06-24 03:03:50','2026-06-24 03:03:50'),(47,13,'out_for_delivery','2026-06-24 03:04:23','Nhân viên giao hàng bắt đầu giao.','2026-06-24 03:04:23','2026-06-24 03:04:23'),(48,13,'delivered','2026-06-24 03:04:28','Nhân viên giao hàng xác nhận đã giao.','2026-06-24 03:04:28','2026-06-24 03:04:28'),(49,13,'completed','2026-06-24 03:05:09','Cập nhật trạng thái từ trang quản trị đơn hàng.','2026-06-24 03:05:09','2026-06-24 03:05:09'),(50,14,'pending','2026-06-26 13:05:43','Customer created order','2026-06-26 13:05:43','2026-06-26 13:05:43'),(51,9,'processing','2026-06-26 20:47:18','Assigned delivery staff: Delivery User (#6). Phân công từ trang quản lí giao hàng.','2026-06-26 20:47:18','2026-06-26 20:47:18'),(52,8,'processing','2026-06-26 20:47:23','Assigned delivery staff: Delivery User (#6). Phân công từ trang quản lí giao hàng.','2026-06-26 20:47:23','2026-06-26 20:47:23'),(53,7,'canceled','2026-06-27 00:11:37','Hủy từ trang quản trị đơn hàng.','2026-06-27 00:11:37','2026-06-27 00:11:37'),(54,15,'pending','2026-06-27 20:04:46','Customer created order','2026-06-27 20:04:46','2026-06-27 20:04:46'),(55,15,'processing','2026-06-27 20:07:21','Xác nhận từ trang quản trị đơn hàng.','2026-06-27 20:07:21','2026-06-27 20:07:21'),(56,15,'ready_for_delivery','2026-06-28 19:10:43','Cập nhật từ trang quản lí giao hàng.','2026-06-28 19:10:43','2026-06-28 19:10:43'),(57,15,'ready_for_delivery','2026-06-28 19:10:50','Assigned delivery staff: Delivery User (#6). Phân công từ trang quản lí giao hàng.','2026-06-28 19:10:50','2026-06-28 19:10:50'),(58,9,'ready_for_delivery','2026-06-28 19:10:58','Cập nhật từ trang quản lí giao hàng.','2026-06-28 19:10:58','2026-06-28 19:10:58'),(59,8,'ready_for_delivery','2026-06-28 19:10:58','Cập nhật từ trang quản lí giao hàng.','2026-06-28 19:10:58','2026-06-28 19:10:58'),(60,20,'pending','2026-07-01 00:53:24','Customer created order','2026-07-01 00:53:24','2026-07-01 00:53:24'),(61,20,'processing','2026-07-01 01:11:14','Xác nhận từ trang quản trị đơn hàng.','2026-07-01 01:11:14','2026-07-01 01:11:14'),(62,21,'pending','2026-07-01 18:51:59','Customer created order','2026-07-01 18:51:59','2026-07-01 18:51:59'),(63,22,'pending','2026-07-01 20:29:34','Customer created order','2026-07-01 20:29:34','2026-07-01 20:29:34');
/*!40000 ALTER TABLE `order_status_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `delivery_staff_id` bigint unsigned DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `shipping_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `coupon_id` bigint unsigned DEFAULT NULL,
  `coupon_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `dispatched_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `shipping_address_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `delivery_proof_image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `delivery_signature` text COLLATE utf8mb4_unicode_ci,
  `delivery_failure_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `orders_user_id_foreign` (`user_id`),
  KEY `orders_shipping_address_id_foreign` (`shipping_address_id`),
  KEY `orders_coupon_id_foreign` (`coupon_id`),
  KEY `orders_delivery_staff_id_foreign` (`delivery_staff_id`),
  CONSTRAINT `orders_coupon_id_foreign` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE SET NULL,
  CONSTRAINT `orders_delivery_staff_id_foreign` FOREIGN KEY (`delivery_staff_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `orders_shipping_address_id_foreign` FOREIGN KEY (`shipping_address_id`) REFERENCES `shipping_addresses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `orders_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,8,6,50000.00,0.00,25000.00,NULL,NULL,75000.00,'completed','2025-11-04 15:03:26','2025-11-04 15:03:33',1,'2025-11-04 15:01:08','2025-11-04 15:43:39',NULL,NULL,NULL),(3,8,6,6000.00,600.00,25000.00,NULL,'KKKKKK',30400.00,'completed','2025-11-04 17:25:14','2025-11-04 17:25:15',1,'2025-11-04 17:22:42','2025-11-12 14:23:52',NULL,NULL,NULL),(4,8,6,280000.00,56000.00,25000.00,NULL,'KK',249000.00,'completed','2025-11-05 13:40:17','2025-11-05 13:40:28',1,'2025-11-05 13:25:59','2026-06-24 00:04:09',NULL,NULL,NULL),(5,8,6,30000.00,0.00,25000.00,NULL,NULL,55000.00,'completed','2025-11-05 14:14:36','2025-11-05 14:14:46',1,'2025-11-05 14:11:49','2026-06-24 00:04:07',NULL,NULL,NULL),(6,8,6,26000.00,0.00,25000.00,NULL,NULL,51000.00,'completed','2025-11-12 14:18:34','2025-11-12 14:18:36',1,'2025-11-12 14:16:39','2025-11-12 15:28:59',NULL,NULL,NULL),(7,8,NULL,236000.00,0.00,25000.00,NULL,NULL,261000.00,'canceled',NULL,NULL,1,'2025-11-13 08:26:06','2026-06-27 00:11:37',NULL,NULL,NULL),(8,8,6,6000.00,0.00,25000.00,NULL,NULL,31000.00,'ready_for_delivery',NULL,NULL,1,'2025-11-13 08:27:07','2026-06-28 19:10:58',NULL,NULL,NULL),(9,8,6,500000.00,0.00,25000.00,NULL,NULL,525000.00,'ready_for_delivery',NULL,NULL,1,'2026-04-10 20:22:09','2026-06-28 19:10:58',NULL,NULL,NULL),(10,8,NULL,50000.00,0.00,25000.00,NULL,NULL,75000.00,'pending',NULL,NULL,1,'2026-06-13 02:16:23','2026-06-13 02:16:23',NULL,NULL,NULL),(11,8,6,60000.00,0.00,25000.00,NULL,NULL,85000.00,'completed','2026-06-24 00:06:51','2026-06-24 00:06:52',1,'2026-06-23 23:50:59','2026-06-24 00:07:02',NULL,NULL,NULL),(12,8,NULL,103000.00,0.00,25000.00,NULL,NULL,128000.00,'pending',NULL,NULL,1,'2026-06-24 01:16:08','2026-06-24 01:16:08',NULL,NULL,NULL),(13,9,6,483600.00,0.00,25000.00,NULL,NULL,508600.00,'completed','2026-06-24 03:04:23','2026-06-24 03:04:28',2,'2026-06-24 03:02:47','2026-06-24 03:05:09',NULL,NULL,NULL),(14,8,NULL,220000.00,0.00,25000.00,NULL,NULL,245000.00,'pending',NULL,NULL,1,'2026-06-26 13:05:43','2026-06-26 13:05:43',NULL,NULL,NULL),(15,8,6,442000.00,0.00,25000.00,NULL,NULL,467000.00,'ready_for_delivery',NULL,NULL,1,'2026-06-27 20:04:46','2026-06-28 19:10:50',NULL,NULL,NULL),(20,8,NULL,233000.00,0.00,25000.00,NULL,NULL,258000.00,'processing',NULL,NULL,3,'2026-07-01 00:53:24','2026-07-01 01:11:14',NULL,NULL,NULL),(21,8,NULL,20000.00,0.00,25000.00,NULL,NULL,45000.00,'pending',NULL,NULL,3,'2026-07-01 18:51:59','2026-07-01 18:51:59',NULL,NULL,NULL),(22,8,NULL,30000.00,0.00,25000.00,NULL,NULL,55000.00,'pending',NULL,NULL,3,'2026-07-01 20:29:34','2026-07-01 20:29:34',NULL,NULL,NULL);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `payment_method` enum('cash','paypal','vnpay') COLLATE utf8mb4_unicode_ci NOT NULL,
  `transaction_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('pending','completed','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `paid_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `payments_order_id_foreign` (`order_id`),
  CONSTRAINT `payments_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,1,'paypal','5LG51430HH032792F',75000.00,'completed','2025-11-04 15:01:08','2025-11-04 15:01:08','2025-11-04 15:01:08'),(3,3,'paypal','3AV60331RL485783F',30400.00,'completed','2025-11-04 17:22:42','2025-11-04 17:22:42','2025-11-04 17:22:42'),(4,4,'paypal','82E922528F059771P',249000.00,'completed','2025-11-05 13:25:59','2025-11-05 13:25:59','2025-11-05 13:25:59'),(5,5,'paypal','9UF92746VG915981X',55000.00,'completed','2025-11-05 14:11:49','2025-11-05 14:11:49','2025-11-05 14:11:49'),(6,6,'paypal','6NY40969XX551711S',51000.00,'completed','2025-11-12 14:16:39','2025-11-12 14:16:39','2025-11-12 14:16:39'),(7,7,'cash',NULL,261000.00,'failed',NULL,'2025-11-13 08:26:06','2026-06-27 00:11:37'),(8,8,'paypal','15Y01153L1803531N',31000.00,'completed','2025-11-13 08:27:07','2025-11-13 08:27:07','2025-11-13 08:27:07'),(9,9,'paypal','7R1277399K647941C',525000.00,'completed','2026-04-10 20:22:09','2026-04-10 20:22:09','2026-04-10 20:22:09'),(10,10,'cash',NULL,75000.00,'pending',NULL,'2026-06-13 02:16:23','2026-06-13 02:16:23'),(11,11,'cash',NULL,85000.00,'completed','2026-06-24 00:06:52','2026-06-23 23:50:59','2026-06-24 00:06:52'),(12,12,'paypal',NULL,128000.00,'pending',NULL,'2026-06-24 01:16:08','2026-06-24 01:16:08'),(13,13,'cash',NULL,508600.00,'completed','2026-06-24 03:04:28','2026-06-24 03:02:47','2026-06-24 03:04:28'),(14,14,'cash',NULL,245000.00,'pending',NULL,'2026-06-26 13:05:43','2026-06-26 13:05:43'),(15,15,'cash',NULL,467000.00,'pending',NULL,'2026-06-27 20:04:46','2026-06-27 20:04:46'),(16,20,'vnpay',NULL,258000.00,'pending',NULL,'2026-07-01 00:53:24','2026-07-01 00:53:24'),(17,21,'vnpay',NULL,45000.00,'pending',NULL,'2026-07-01 18:51:59','2026-07-01 18:51:59'),(18,22,'cash',NULL,55000.00,'pending',NULL,'2026-07-01 20:29:34','2026-07-01 20:29:34');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'manage_users','2025-11-04 13:50:30','2025-11-04 13:50:30'),(2,'manage_products','2025-11-04 13:50:30','2025-11-04 13:50:30'),(3,'manage_orders','2025-11-04 13:50:30','2025-11-04 13:50:30'),(4,'manage_categories','2025-11-04 13:50:30','2025-11-04 13:50:30'),(5,'manage_contacts','2025-11-04 13:50:30','2025-11-04 13:50:30'),(6,'manage_deliveries','2025-11-04 13:50:30','2025-11-04 13:50:30');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_images`
--

DROP TABLE IF EXISTS `product_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_images` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_images_product_id_foreign` (`product_id`),
  CONSTRAINT `product_images_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=130 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_images`
--

LOCK TABLES `product_images` WRITE;
/*!40000 ALTER TABLE `product_images` DISABLE KEYS */;
INSERT INTO `product_images` VALUES (10,10,'uploads/products/1762274448_690a2c90e8452.jpg','2025-11-04 16:40:49','2025-11-04 16:40:49'),(11,11,'uploads/products/1762274494_690a2cbecf370.jpg','2025-11-04 16:41:34','2025-11-04 16:41:34'),(22,22,'uploads/products/1762274947_690a2e8311db2.jpg','2025-11-04 16:49:07','2025-11-04 16:49:07'),(27,27,'uploads/products/1762275234_690a2fa28bb03.jpg','2025-11-04 16:53:54','2025-11-04 16:53:54'),(28,28,'uploads/products/1762275267_690a2fc3da71a.jpg','2025-11-04 16:54:28','2025-11-04 16:54:28'),(29,29,'uploads/products/1762275309_690a2fed729ba.jpg','2025-11-04 16:55:09','2025-11-04 16:55:09'),(30,30,'uploads/products/1762275343_690a300f3d18a.jpg','2025-11-04 16:55:43','2025-11-04 16:55:43'),(31,31,'uploads/products/1762275418_690a305a442e4.jpg','2025-11-04 16:56:58','2025-11-04 16:56:58'),(32,32,'uploads/products/1762275609_690a3119182c3.jpg','2025-11-04 17:00:09','2025-11-04 17:00:09'),(33,33,'uploads/products/1762275646_690a313e91944.jpg','2025-11-04 17:00:46','2025-11-04 17:00:46'),(34,34,'uploads/products/1762276023_690a32b7e1716.jpg','2025-11-04 17:07:04','2025-11-04 17:07:04'),(58,38,'uploads/products/1782186697710_eb034926-5bb3-4bdd-ba3b-2b1105e77eba.jpg','2026-06-22 20:51:41','2026-06-22 20:51:41'),(60,35,'uploads/products/1782310768285_7883da92-e797-4aa9-a509-547172893fb7.jpg','2026-06-24 07:19:30','2026-06-24 07:19:30'),(61,35,'uploads/products/1762276065_690a32e1e91a4.jpg','2026-06-24 07:19:30','2026-06-24 07:19:30'),(65,36,'uploads/products/1782505573503_33b320fa-01b8-4a5f-9e56-26ab18f07704.jpg','2026-06-26 13:26:15','2026-06-26 13:26:15'),(66,36,'uploads/products/1762276110_690a330eb4735.jpg','2026-06-26 13:26:15','2026-06-26 13:26:15'),(68,13,'uploads/products/1782961577701_247c309a-3ba5-4ef7-9b16-77f8c545e203.jpg','2026-07-01 20:06:21','2026-07-01 20:06:21'),(69,13,'uploads/products/1762274544_690a2cf0e11c8.jpg','2026-07-01 20:06:21','2026-07-01 20:06:21'),(70,8,'uploads/products/1782961609031_e515fc8b-c07f-477c-a5d9-c4ba9c919ee9.jpg','2026-07-01 20:06:51','2026-07-01 20:06:51'),(71,8,'uploads/products/1762274367_690a2c3f2e5d6.jpg','2026-07-01 20:06:51','2026-07-01 20:06:51'),(72,9,'uploads/products/1782961622491_cb3d2b88-3597-4d36-b8ac-8d90e277e38d.jpg','2026-07-01 20:07:04','2026-07-01 20:07:04'),(73,9,'uploads/products/1762274411_690a2c6b12272.jpg','2026-07-01 20:07:04','2026-07-01 20:07:04'),(74,12,'uploads/products/1782961632683_24d1dd1a-f23f-4118-a66c-7f3c6e688873.jpg','2026-07-01 20:07:16','2026-07-01 20:07:16'),(75,12,'uploads/products/1762274524_690a2cdc218a9.jpg','2026-07-01 20:07:16','2026-07-01 20:07:16'),(76,7,'uploads/products/1782961645446_05e36a37-5ab9-4033-a215-0bd45fa341c4.jpg','2026-07-01 20:07:28','2026-07-01 20:07:28'),(77,7,'uploads/products/1762274326_690a2c16bcdfe.jpg','2026-07-01 20:07:28','2026-07-01 20:07:28'),(78,6,'uploads/products/1782961655389_c5749590-5fca-4ecf-b541-a32e51871195.jpg','2026-07-01 20:07:37','2026-07-01 20:07:37'),(79,6,'uploads/products/1762274283_690a2beb5d391.jpg','2026-07-01 20:07:37','2026-07-01 20:07:37'),(80,14,'uploads/products/1782961674266_ba87845d-0460-428d-8c2b-72cb5f8478a3.jpg','2026-07-01 20:07:56','2026-07-01 20:07:56'),(81,14,'uploads/products/1762274598_690a2d26ea7b5.jpg','2026-07-01 20:07:56','2026-07-01 20:07:56'),(82,15,'uploads/products/1782961684173_c582dd0c-7196-449f-a847-b7888bfb8668.jpg','2026-07-01 20:08:06','2026-07-01 20:08:06'),(83,15,'uploads/products/1762274674_690a2d72ba0d1.jpg','2026-07-01 20:08:06','2026-07-01 20:08:06'),(84,16,'uploads/products/1782961693999_770291dd-068c-4a32-8eea-2966729d9f78.jpg','2026-07-01 20:08:16','2026-07-01 20:08:16'),(85,16,'uploads/products/1762274733_690a2dad035b3.jpg','2026-07-01 20:08:16','2026-07-01 20:08:16'),(86,17,'uploads/products/1782961702191_42372172-fd03-4078-9e3c-155b61997aea.jpg','2026-07-01 20:08:23','2026-07-01 20:08:23'),(87,17,'uploads/products/1762274770_690a2dd25f975.jpg','2026-07-01 20:08:23','2026-07-01 20:08:23'),(88,18,'uploads/products/1782961711866_fe8888f3-db5f-4c80-9584-01a4ba69f066.jpg','2026-07-01 20:08:34','2026-07-01 20:08:34'),(89,18,'uploads/products/1762274810_690a2dfa5c9d7.jpg','2026-07-01 20:08:34','2026-07-01 20:08:34'),(90,19,'uploads/products/1782961721317_d6500995-344d-45ba-b186-36c594ae9cc2.jpg','2026-07-01 20:08:43','2026-07-01 20:08:43'),(91,19,'uploads/products/1762274843_690a2e1bb4330.jpg','2026-07-01 20:08:43','2026-07-01 20:08:43'),(92,20,'uploads/products/1782961745103_ea122102-3975-4ef2-bc1d-af1a7c127e43.jpg','2026-07-01 20:09:09','2026-07-01 20:09:09'),(93,20,'uploads/products/1762274882_690a2e42a17fb.jpg','2026-07-01 20:09:09','2026-07-01 20:09:09'),(94,21,'uploads/products/1782961757326_7b1ed657-aebf-41cc-929c-df29af01ba00.jpg','2026-07-01 20:09:19','2026-07-01 20:09:19'),(95,21,'uploads/products/1762274908_690a2e5c25dd8.jpg','2026-07-01 20:09:19','2026-07-01 20:09:19'),(96,23,'uploads/products/1782961775677_6355732e-91d3-4f09-816d-17a53d683bff.jpg','2026-07-01 20:09:37','2026-07-01 20:09:37'),(97,23,'uploads/products/1762275033_690a2ed9ddf81.jpg','2026-07-01 20:09:37','2026-07-01 20:09:37'),(98,24,'uploads/products/1782961792981_210b7a4e-6fce-4b49-9a6c-b7efdc48470f.jpg','2026-07-01 20:09:55','2026-07-01 20:09:55'),(99,24,'uploads/products/1762275087_690a2f0f3c930.jpg','2026-07-01 20:09:55','2026-07-01 20:09:55'),(104,47,'https://res.cloudinary.com/dxypmcckx/image/upload/v1782967920/agri-ecommerce/products/gbk2pdneaswm3qv8d5wo.jpg','2026-07-01 21:52:05','2026-07-01 21:52:05'),(105,47,'uploads/products/1782186606673_4a31ed24-79b3-4241-a815-68472d885521.jpg','2026-07-01 21:52:05','2026-07-01 21:52:05'),(106,46,'https://res.cloudinary.com/dxypmcckx/image/upload/v1783303014/agri-ecommerce/products/w5px1llzhclszoabrsad.jpg','2026-07-05 18:57:02','2026-07-05 18:57:02'),(107,46,'uploads/products/1782186619357_86ba830d-515c-41de-92e5-659c25225ba8.jpg','2026-07-05 18:57:02','2026-07-05 18:57:02'),(108,45,'https://res.cloudinary.com/dxypmcckx/image/upload/v1783303109/agri-ecommerce/products/stbaibuqyjqv9gg29mga.jpg','2026-07-05 18:58:34','2026-07-05 18:58:34'),(109,45,'uploads/products/1782186633584_4eb85157-3b0d-46e8-9669-f79c58e88660.jpg','2026-07-05 18:58:34','2026-07-05 18:58:34'),(110,44,'https://res.cloudinary.com/dxypmcckx/image/upload/v1783303126/agri-ecommerce/products/mexu4zxgtdxvgjawunbr.jpg','2026-07-05 18:58:51','2026-07-05 18:58:51'),(111,44,'uploads/products/1782186647519_3da7f859-e159-44f7-b6d3-98698b4a9ab7.jpg','2026-07-05 18:58:51','2026-07-05 18:58:51'),(112,43,'https://res.cloudinary.com/dxypmcckx/image/upload/v1783303141/agri-ecommerce/products/x1vsqpssvw4rk1wmnf0m.jpg','2026-07-05 18:59:05','2026-07-05 18:59:05'),(113,43,'uploads/products/1782186663925_d002b024-535c-432c-a7f4-823cc39ecb41.jpg','2026-07-05 18:59:05','2026-07-05 18:59:05'),(114,42,'https://res.cloudinary.com/dxypmcckx/image/upload/v1783303156/agri-ecommerce/products/gntwcu7k2aps56l8pbmx.jpg','2026-07-05 18:59:19','2026-07-05 18:59:19'),(115,42,'uploads/products/1782186673282_22ba559d-8934-4d5a-a578-217f24a4ab09.jpg','2026-07-05 18:59:19','2026-07-05 18:59:19'),(116,41,'https://res.cloudinary.com/dxypmcckx/image/upload/v1783303167/agri-ecommerce/products/tnjkorvrtluqdq4j8nh7.jpg','2026-07-05 18:59:31','2026-07-05 18:59:31'),(117,41,'uploads/products/1782186684735_981529bb-7376-4251-9099-94b8839d97c8.jpg','2026-07-05 18:59:31','2026-07-05 18:59:31'),(118,40,'https://res.cloudinary.com/dxypmcckx/image/upload/v1783303187/agri-ecommerce/products/mrvbo58u0mjqlglirv2y.jpg','2026-07-05 18:59:50','2026-07-05 18:59:50'),(119,40,'uploads/products/1782178930535_91c6d83b-7585-4ee0-87db-45302cb9f062.jpg','2026-07-05 18:59:50','2026-07-05 18:59:50'),(120,39,'https://res.cloudinary.com/dxypmcckx/image/upload/v1783303228/agri-ecommerce/products/wrtjmxxc5dt8pfjd8s0l.jpg','2026-07-05 19:00:31','2026-07-05 19:00:31'),(121,39,'uploads/products/1782178905859_88abfacb-8727-4887-b91b-4f8447b042b9.jpg','2026-07-05 19:00:31','2026-07-05 19:00:31'),(122,37,'https://res.cloudinary.com/dxypmcckx/image/upload/v1783303241/agri-ecommerce/products/ll8ieb7vzvrq5fqmdgqw.jpg','2026-07-05 19:00:45','2026-07-05 19:00:45'),(123,37,'uploads/products/1782186709917_cade1d62-fd01-4bea-b081-84d773cc0cc0.jpg','2026-07-05 19:00:45','2026-07-05 19:00:45'),(124,26,'https://res.cloudinary.com/dxypmcckx/image/upload/v1783303273/agri-ecommerce/products/jmqdrvrtdmdpdiepcmdo.jpg','2026-07-05 19:01:16','2026-07-05 19:01:16'),(125,26,'uploads/products/1782961860958_6b015345-904b-420f-b9ff-ded90bada417.jpg','2026-07-05 19:01:16','2026-07-05 19:01:16'),(126,26,'uploads/products/1762275199_690a2f7fe2770.jpg','2026-07-05 19:01:16','2026-07-05 19:01:16'),(127,25,'https://res.cloudinary.com/dxypmcckx/image/upload/v1783303309/agri-ecommerce/products/tgcllwk7d8ixz819kt6a.jpg','2026-07-05 19:01:53','2026-07-05 19:01:53'),(128,25,'uploads/products/1782961883572_506f19ee-cb24-4a06-ba22-413620c775b2.jpg','2026-07-05 19:01:53','2026-07-05 19:01:53'),(129,25,'uploads/products/1762275158_690a2f56a6bd5.jpg','2026-07-05 19:01:53','2026-07-05 19:01:53');
/*!40000 ALTER TABLE `product_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `description_en` text COLLATE utf8mb4_unicode_ci,
  `price` decimal(10,2) NOT NULL,
  `stock` int NOT NULL DEFAULT '0',
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'in_stock',
  `unit` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_slug_unique` (`slug`),
  KEY `products_category_id_foreign` (`category_id`),
  CONSTRAINT `products_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (6,'Cải ngọt','Choy sum','cai-ngot-1762274283',1,'Cải ngon','Fishi fresh',6000.00,28,'in_stock','túi','bag','2025-11-04 16:38:03','2026-07-01 20:07:37'),(7,'Mầm giá đỗ','Bean sprouts','mam-gia-do-1762274326',1,'Giá ngon rẻ','Good value',10000.00,17,'in_stock','túi','bag','2025-11-04 16:38:46','2026-07-01 20:07:28'),(8,'Rau khoai lang','Rau khoai lang','rau-khoai-lang-1762274367',1,'Rau sạch','Vegetables clean',10000.00,50,'in_stock','túi','bag','2025-11-04 16:39:27','2026-07-01 20:06:51'),(9,'Rau muống','Water spinach','rau-muong-1762274411',1,'Giá ngon rẻ','Good value',10000.00,10,'in_stock','túi','bag','2025-11-04 16:40:11','2026-07-01 20:07:04'),(10,'Hành lá',NULL,'hanh-la-1762274448',1,'Giá ngon rẻ',NULL,5000.00,20,'in_stock','túi',NULL,'2025-11-04 16:40:48','2025-11-04 16:40:48'),(11,'Rau má',NULL,'rau-ma-1762274494',1,'Rau sạch',NULL,3600.00,35,'in_stock','túi',NULL,'2025-11-04 16:41:34','2026-06-24 03:02:47'),(12,'Rau mồng tơi','Malabar spinach','rau-mong-toi-1762274524',1,'Rau sạch','Vegetables clean',10000.00,19,'in_stock','túi','bag','2025-11-04 16:42:04','2026-07-01 20:07:16'),(13,'Rau tía tô','Perilla leaves','rau-tia-to-1762274544',1,'Rau sạch','Vegetables clean',10000.00,20,'in_stock','túi','bag','2025-11-04 16:42:24','2026-07-01 20:06:21'),(14,'Bưởi da xanh','Green-skin pomelo','buoi-da-xanh-1762274598',2,'Bưởi ngọt lắm kk','Buoi ngot lam kk',20000.00,29,'in_stock','kg','kg','2025-11-04 16:43:18','2026-07-01 20:07:56'),(15,'Chuối giống Nam Mỹ','Banana giong nam my','chuoi-giong-nam-my-1762274674',2,'Siêu ngon','Sieu fresh',50000.00,29,'in_stock','kg','kg','2025-11-04 16:44:34','2026-07-01 20:08:06'),(16,'Dưa hấu Hàn Quốc','Watermelon han quoc','dua-hau-han-quoc-1762274733',2,'Ngon','Ngon',20000.00,30,'in_stock','kg','kg','2025-11-04 16:45:33','2026-07-01 20:08:16'),(17,'Dừa Xiêm tiện lợi','Siamese coconut tien loi','dua-xiem-tien-loi-1762274770',2,'Giá ngon rẻ','Good value',100000.00,20,'in_stock','quả','piece','2025-11-04 16:46:10','2026-07-01 20:08:23'),(18,'Lê Trung Quốc','Le trung quoc','le-trung-quoc-1762274810',2,'Giá ngon rẻ','Good value',10000.00,20,'in_stock','kg','kg','2025-11-04 16:46:50','2026-07-01 20:08:34'),(19,'Mít Thái','Thai jackfruit','mit-thai-1762274843',2,'Giá ngon rẻ','Good value',50000.00,30,'in_stock','kg','kg','2025-11-04 16:47:23','2026-07-01 20:08:43'),(20,'Nho sữa Trung','Nho sua trung','nho-sua-trung-1762274882',2,'Giá ngon rẻ','Good value',50000.00,49,'in_stock','kg','kg','2025-11-04 16:48:02','2026-07-01 20:09:09'),(21,'Xoài Cát','Xoai fisht','xoai-cat-1762274908',2,'Giá ngon rẻ','Good value',10000.00,29,'in_stock','kg','kg','2025-11-04 16:48:28','2026-07-01 20:09:19'),(22,'Cherry nội địa Trung',NULL,'cherry-noi-dia-trung-1762274947',2,'Giá ngon rẻ',NULL,50000.00,20,'in_stock','kg',NULL,'2025-11-04 16:49:07','2025-11-04 16:49:07'),(23,'Ba chỉ bò Đức','Ba chi bo duc','ba-chi-bo-duc-1762275033',3,'Thịt tươi ngon thượng hạng','Localized item',200000.00,20,'in_stock','kg','kg','2025-11-04 16:50:33','2026-07-01 20:09:37'),(24,'Ba rọi heo 500g','Ba roi heo 500g','ba-roi-heo-500g-1762275087',3,'Thịt tươi ngon thượng hạng','Localized item',80000.00,18,'in_stock','kg','kg','2025-11-04 16:51:27','2026-07-01 20:09:55'),(25,'Cá Hồi cắt khúc 1kg','Fish hoi fisht khuc 1kg','ca-hoi-cat-khuc-1kg-1762275158',4,'Cá hồi nhập khẩu từ Châu Âu','Fish hoi nhap khau tu chau au',250000.00,25,'in_stock','kg','kg','2025-11-04 16:52:38','2026-07-01 20:11:29'),(26,'Chân giò heo 500g','Chan gio heo 500g','chan-gio-heo-500g-1762275199',3,'Giá ngon bổ rẻ','Localized item',50000.00,30,'in_stock','kg','kg','2025-11-04 16:53:19','2026-07-01 20:11:03'),(27,'Sườn non',NULL,'suon-non-1762275234',3,'Thịt tươi ngon thượng hạng',NULL,150000.00,48,'in_stock','kg',NULL,'2025-11-04 16:53:54','2026-07-01 00:53:24'),(28,'Thịt bò xay 200g',NULL,'thit-bo-xay-200g-1762275267',3,'Thịt tươi ngon thượng hạng',NULL,50000.00,19,'in_stock','kg',NULL,'2025-11-04 16:54:27','2026-07-01 00:53:24'),(29,'Thịt heo xay cp 200g',NULL,'thit-heo-xay-cp-200g-1762275309',3,'Thịt tươi ngon thượng hạng',NULL,20000.00,50,'in_stock','kg',NULL,'2025-11-04 16:55:09','2025-11-04 16:55:09'),(30,'Thịt thăn bò Áo',NULL,'thit-than-bo-ao-1762275343',3,'Thịt tươi ngon thượng hạng',NULL,500000.00,50,'in_stock','kg',NULL,'2025-11-04 16:55:43','2025-11-04 16:55:43'),(31,'Sữa thùng Vinamilk 1l',NULL,'sua-thung-vinamilk-1l-1762275418',5,'Chất lượng tốt nhất',NULL,330000.00,20,'in_stock','thùng',NULL,'2025-11-04 16:56:58','2025-11-04 16:56:58'),(32,'Thịt bò Úc',NULL,'thit-bo-uc-1762275609',3,'Thịt tươi ngon thượng hạng',NULL,123456.00,30,'in_stock','kg',NULL,'2025-11-04 17:00:09','2025-11-04 17:00:09'),(33,'Heo sữa',NULL,'heo-sua-1762275646',3,'Thịt tươi ngon thượng hạng',NULL,20000.00,29,'in_stock','kg',NULL,'2025-11-04 17:00:46','2026-07-01 00:53:24'),(34,'Sữa bịch dutchlady',NULL,'sua-bich-dutchlady-1762276023',5,'Chất lượng tốt nhất',NULL,6000.00,29,'in_stock','hộp',NULL,'2025-11-04 17:07:03','2025-11-04 17:22:42'),(35,'Sữa hộp dutchlady 1 thùng',NULL,'sua-hop-dutchlady-1-thung-1762276065',5,'Chất lượng tốt nhất',NULL,360000.00,34,'in_stock','thùng',NULL,'2025-11-04 17:07:45','2026-06-27 20:04:46'),(36,'Trứng cút hộp 30 quả',NULL,'trung-cut-hop-30-qua-1762276110',5,'Chất lượng tốt nhất',NULL,50000.00,20,'in_stock','hộp',NULL,'2025-11-04 17:08:30','2025-11-04 17:08:30'),(37,'Trứng gà hộp 10 quả','Trung ga hop 10 qua','trung-ga-hop-10-qua-1762276156',5,'Giá ngon rẻ','Good value',3000.00,28,'in_stock','quả','piece','2025-11-04 17:09:16','2026-07-05 19:00:45'),(38,'trứng',NULL,'trung-1762276183',5,'Chất lượng tốt nhất',NULL,30000.00,30,'hidden','hộp',NULL,'2025-11-04 17:09:43','2026-06-22 20:51:59'),(39,'Sữa bịch vinamilk','Sua bich vinamilk','sua-bich-vinamilk-1762276218',5,'Giá ngon rẻ','Good value',6000.00,18,'in_stock','bịch','Bich','2025-11-04 17:10:18','2026-07-05 19:00:31'),(40,'Sữa TH','Sua th','sua-th-1762276260',5,'Giá ngon rẻ','Good value',50000.00,17,'in_stock','lóc','Loc','2025-11-04 17:11:00','2026-07-05 18:59:50'),(41,'Ức cá BASA','Uc fish basa','uc-ca-basa-1762276304',4,'Cá tươi ngon thượng hạng.','Localized item',50000.00,29,'in_stock','hộp','box','2025-11-04 17:11:44','2026-07-05 18:59:31'),(42,'Cá diêu hồng','Red tilapia','ca-dieu-hong-1762276339',4,'Ca','Ca',50000.00,20,'in_stock','kg','kg','2025-11-04 17:12:19','2026-07-05 18:59:19'),(43,'Cá lóc','Fish loc','ca-loc-1762276372',4,'cá','Fish',60000.00,27,'in_stock','kg','kg','2025-11-04 17:12:52','2026-07-05 18:59:05'),(44,'Cá BASA cắt khúc','Basa fish steaks','ca-basa-cat-khuc-1762276415',4,'Chất lượng tốt nhất','Cnuts luong tot nnuts',30000.00,27,'in_stock','kg','kg','2025-11-04 17:13:35','2026-07-05 18:58:51'),(45,'Cá chim','Pomfret','ca-chim-1762276444',4,'Chất lượng tốt nhất','Cnuts luong tot nnuts',50000.00,26,'in_stock','kg','kg','2025-11-04 17:14:04','2026-07-05 18:58:34'),(46,'Cá mó làm sạch','Cleaned fish','ca-mo-lam-sach-1762276468',4,'Chất lượng tốt nhất','Cnuts luong tot nnuts',20000.00,46,'in_stock','kg','kg','2025-11-04 17:14:28','2026-07-05 18:57:02'),(47,'Cá Ngừ làm sạch','Cleaned tuna','ca-ngu-lam-sach-1762276520',4,'Chất lượng tốt nhất','Cnuts luong tot nnuts',40000.00,48,'in_stock','kg','kg','2025-11-04 17:15:20','2026-07-01 21:52:05');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `rating` tinyint unsigned NOT NULL,
  `comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `reviews_user_id_foreign` (`user_id`),
  KEY `reviews_product_id_foreign` (`product_id`),
  CONSTRAINT `reviews_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reviews_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
INSERT INTO `reviews` VALUES (2,8,34,5,'ngon','2025-11-12 14:24:19','2025-11-12 14:24:19'),(3,8,7,5,'Giá đỗ tươi ngon, sẽ ủng hộ thêm.','2026-06-26 19:22:18','2026-06-26 19:22:18'),(4,8,6,5,'Cải tươi ngon, rất hợp nấu canh.','2026-06-26 19:23:09','2026-06-26 19:23:09');
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` bigint unsigned NOT NULL,
  `permission_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  KEY `role_permissions_role_id_foreign` (`role_id`),
  KEY `role_permissions_permission_id_foreign` (`permission_id`),
  CONSTRAINT `role_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,4,NULL,NULL),(1,5,NULL,NULL),(1,6,NULL,NULL),(1,3,NULL,NULL),(1,2,NULL,NULL),(1,1,NULL,NULL),(2,5,NULL,NULL),(2,2,NULL,NULL),(3,6,NULL,NULL);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin','2025-11-04 13:50:30','2025-11-04 13:50:30'),(2,'staff','2025-11-04 13:50:30','2025-11-04 13:50:30'),(3,'delivery_staff','2025-11-04 13:50:30','2025-11-04 13:50:30'),(4,'customer','2025-11-04 13:50:30','2025-11-04 13:50:30');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipping_addresses`
--

DROP TABLE IF EXISTS `shipping_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipping_addresses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `shipping_addresses_user_id_foreign` (`user_id`),
  CONSTRAINT `shipping_addresses_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipping_addresses`
--

LOCK TABLES `shipping_addresses` WRITE;
/*!40000 ALTER TABLE `shipping_addresses` DISABLE KEYS */;
INSERT INTO `shipping_addresses` VALUES (1,8,'Huan','0987654321','Ha Noi','Ha Noi',0,'2025-11-04 14:34:32','2025-11-04 14:34:32'),(2,9,'LE VIET HUAN','0374333333','kkk','Quang Tri',1,'2026-06-24 03:02:40','2026-06-24 03:02:40'),(3,8,'LE VIET HUAN','0374323333','Phường Dương Nội, Quận Hà Đông','Hà Nội',1,'2026-07-01 00:34:26','2026-07-01 00:34:26');
/*!40000 ALTER TABLE `shipping_addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','active','banned','deleted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `phone_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `role_id` bigint unsigned NOT NULL,
  `activation_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `google_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_role_id_foreign` (`role_id`),
  CONSTRAINT `users_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Nguyen Van A','nguyenvana@example.com','$2y$12$ufaIy3g2/dBf1h7ihj31P.WvfBn.sqq7jKBRE3Ld/1L5GBS0Z6Lvu','pending','0123456789','','Da Nang, Vietnam',1,NULL,NULL,'2025-11-04 13:50:30','2025-11-04 13:50:30'),(2,'Tran Thi B','tranthib@example.com','$2y$12$raC7TfeVXBX4Ss224jyahuH39TFwxDEpgCmqmZdBxPM9h4Flo0GpC','pending','0987654321','','Gia Lai, Vietnam',2,NULL,NULL,'2025-11-04 13:50:30','2025-11-04 13:50:30'),(4,'Admin User','admin@example.com','$2a$12$56LqdiYi4Jn/uLgMU3LoMOxswIYYMagHkOvhcIv0MocKvWmh3NnM.','active','0999999999','https://res.cloudinary.com/dxypmcckx/image/upload/v1782967491/agri-ecommerce/avatars/goji6vt5fyqrg8ht0yeb.webp','Da Nang, Vietnam',1,NULL,NULL,'2025-11-04 13:50:31','2026-07-01 21:44:52'),(5,'Staff User','staff@example.com','$2y$12$1qHsFINxjNHDuirezFD31ODBJUAwkA91qLc0vwmQQygSV/u1LNOlq','active','0888888880','uploads/users/1762277995_690a3a6b52207.jpg','QB, Vietnam',2,NULL,NULL,'2025-11-04 13:50:31','2026-06-22 01:12:56'),(6,'Delivery User','delivery@example.com','$2y$12$SpGljFNkD0e6pfIzuosNfO0vGaLwzDDQ9LTa6nHCy8Z0Z/X74pIiK','active','077777777','','Hoi An, Vietnam',3,NULL,NULL,'2025-11-04 13:50:32','2025-11-04 13:50:32'),(8,'huan','huanlee2004@gmail.com','$2a$10$59Uiw/uo5irwXVO5SP2UseXQclZARdti8q464hvQRaxW6hnW/ltJy','active','0987654321','https://res.cloudinary.com/dxypmcckx/image/upload/v1782966945/agri-ecommerce/avatars/qadtzv5myynkxclsx4jm.webp','Quảng Bình',4,NULL,NULL,'2025-11-04 13:57:15','2026-07-01 21:35:46'),(9,'Nguyễn A','guest@example.com','$2a$10$ipu8m2/AwYQIgV3/GQEYl.m2J1iSU/jQzbZvs.MACo7KdKUnja.R2','active','0374333333',NULL,'Dương Nội, Hà Nội',4,NULL,NULL,'2026-06-22 00:46:00','2026-06-22 00:46:00'),(10,'Nguyễn B','guest1@example.com','$2a$10$ObPtTffl9WIduz.aVQ7j1.zgWnm8Ee2HwZZ69WM.i0kx6hSD0IcNm','active','0374333334',NULL,'Dương Nội, Hà Nội',4,NULL,NULL,'2026-06-22 00:54:28','2026-06-22 03:22:02');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wishlists`
--

DROP TABLE IF EXISTS `wishlists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wishlists` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `wishlists_user_id_foreign` (`user_id`),
  KEY `wishlists_product_id_foreign` (`product_id`),
  CONSTRAINT `wishlists_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `wishlists_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wishlists`
--

LOCK TABLES `wishlists` WRITE;
/*!40000 ALTER TABLE `wishlists` DISABLE KEYS */;
INSERT INTO `wishlists` VALUES (2,8,27,'2025-11-15 11:00:23','2025-11-15 11:00:23'),(3,8,28,'2025-11-15 11:00:25','2025-11-15 11:00:25'),(4,8,26,'2025-11-15 11:00:26','2025-11-15 11:00:26'),(5,8,21,'2026-06-27 00:07:07','2026-06-27 00:07:07'),(7,8,33,'2026-06-27 20:23:34','2026-06-27 20:23:34'),(9,8,37,'2026-06-29 00:13:29','2026-06-29 00:13:29');
/*!40000 ALTER TABLE `wishlists` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-06  9:32:31
