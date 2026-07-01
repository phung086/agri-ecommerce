CREATE DATABASE IF NOT EXISTS veggie_main
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE veggie_main;-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 13, 2026 at 04:41 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `veggie-main`
--

-- --------------------------------------------------------

--
-- Table structure for table `cart_items`
--

CREATE TABLE `cart_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `quantity` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cart_items`
--

INSERT INTO `cart_items` (`id`, `user_id`, `product_id`, `quantity`, `created_at`, `updated_at`) VALUES
(25, 8, 7, 1, '2026-06-13 02:32:28', '2026-06-13 02:32:28');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `image`, `created_at`, `updated_at`) VALUES
(1, 'Rau củ', 'rau-cu', 'Cá loại rau củ tươi ngon', 'uploads/categories/1762274094_690a2b2ecb974.jpg', '2025-11-04 13:50:32', '2025-11-04 16:34:54'),
(2, 'Trái cây', 'trai-cay', 'Trái cây sạch, tươi ngon', 'uploads/categories/1762274115_690a2b43cee2d.jpg', '2025-11-04 13:50:32', '2025-11-04 16:35:15'),
(3, 'Thịt', 'thit', 'Thịt tươi ngon, đảm bảo chất lượng', 'uploads/categories/1762274133_690a2b550c05b.jpg', '2025-11-04 13:50:32', '2025-11-04 16:35:33'),
(4, 'Cá', 'ca', 'Hải sản và cá tươi sống', 'uploads/categories/1762274150_690a2b6655f7d.jpg', '2025-11-04 13:50:32', '2025-11-04 16:35:50'),
(5, 'Thực phẩm khác', 'thuc-pham-khac', 'Cá loại thực phẩm bổ sung khác', 'uploads/categories/1762274164_690a2b74f063c.jpg', '2025-11-04 13:50:32', '2025-11-04 16:36:04');

-- --------------------------------------------------------

--
-- Table structure for table `chat_messages`
--

CREATE TABLE `chat_messages` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `guest_token` varchar(100) DEFAULT NULL,
  `sender` enum('user','bot') NOT NULL DEFAULT 'user',
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chat_messages`
--

INSERT INTO `chat_messages` (`id`, `user_id`, `guest_token`, `sender`, `message`, `created_at`, `updated_at`) VALUES
(1, 8, NULL, 'user', 'alo', '2025-11-04 14:32:59', '2025-11-04 14:32:59'),
(2, 8, NULL, 'bot', 'Chào bạn, tôi có thể giúp gì cho bạn ạ?\n', '2025-11-04 14:33:01', '2025-11-04 14:33:01'),
(3, 8, NULL, 'user', 'bạn có món gì trong của hàng', '2025-11-04 14:33:09', '2025-11-04 14:33:09'),
(4, 8, NULL, 'bot', 'Hiện tại, tôi có chanh với giá 50,000 VNĐ/kg ạ. Bạn có muốn mua không?\n', '2025-11-04 14:33:12', '2025-11-04 14:33:12'),
(5, 8, NULL, 'user', 'co mon chanh day khong?', '2025-11-04 15:37:41', '2025-11-04 15:37:41'),
(6, 8, NULL, 'bot', 'Dạ có chanh dây ạ, giá 123,456 VNĐ/kg ạ.\n', '2025-11-04 15:37:43', '2025-11-04 15:37:43'),
(7, 8, NULL, 'user', 'vậy có thịt ngon không?', '2025-11-04 15:38:17', '2025-11-04 15:38:17'),
(8, 8, NULL, 'bot', 'Dạ, hiện tại cửa hàng chỉ có chanh (50,000 VNĐ/kg) và chanh dây (123,456 VNĐ/kg) thôi ạ.\n', '2025-11-04 15:38:19', '2025-11-04 15:38:19'),
(9, 8, NULL, 'user', 'vậy có thịt ngon không?', '2025-11-04 15:38:19', '2025-11-04 15:38:19'),
(10, 8, NULL, 'bot', 'Dạ, hiện tại cửa hàng mình chỉ có rau củ thôi ạ, không có thịt ạ.\n', '2025-11-04 15:38:21', '2025-11-04 15:38:21'),
(11, 8, NULL, 'user', 'tu van cho toi an tang can 5kg', '2025-11-04 15:38:37', '2025-11-04 15:38:37'),
(12, 8, NULL, 'bot', 'Chào bạn, rất tiếc cửa hàng mình chuyên về rau củ quả, không có các sản phẩm hỗ trợ tăng cân trực tiếp ạ. Chanh và chanh dây có thể giúp bạn bổ sung vitamin thôi ạ.\n', '2025-11-04 15:38:39', '2025-11-04 15:38:39'),
(13, 8, NULL, 'user', 'helo', '2025-11-04 15:57:48', '2025-11-04 15:57:48'),
(14, 8, NULL, 'bot', 'Chào bạn ạ! Bạn cần hỗ trợ gì ạ?\n', '2025-11-04 15:57:52', '2025-11-04 15:57:52'),
(15, 8, NULL, 'user', 'ban co khoe khong', '2025-11-04 15:58:01', '2025-11-04 15:58:01'),
(16, 8, NULL, 'bot', 'Tôi ổn, cảm ơn bạn. Bạn cần hỗ trợ gì về rau củ quả ạ?\n', '2025-11-04 15:58:06', '2025-11-04 15:58:06'),
(17, 8, NULL, 'user', '1 + 1', '2025-11-04 15:58:19', '2025-11-04 15:58:19'),
(18, 8, NULL, 'bot', 'Tôi không rõ câu hỏi của bạn lắm. Bạn có muốn hỏi về giá của chanh hay chanh dây không ạ?\n', '2025-11-04 15:58:26', '2025-11-04 15:58:26'),
(19, 8, NULL, 'user', '1 + 1 + mấy', '2025-11-04 16:03:00', '2025-11-04 16:03:00'),
(20, 8, NULL, 'bot', 'Tôi không rõ câu hỏi của bạn lắm. Bạn có muốn hỏi về giá của chanh hay chanh dây không ạ?\n', '2025-11-04 16:03:02', '2025-11-04 16:03:02'),
(21, 8, NULL, 'user', 'i love you', '2025-11-04 16:03:10', '2025-11-04 16:03:10'),
(22, 8, NULL, 'bot', 'Tôi rất vui khi bạn thích các sản phẩm của chúng tôi. Bạn có muốn biết thêm thông tin về sản phẩm nào không ạ?\n', '2025-11-04 16:03:11', '2025-11-04 16:03:11'),
(23, 8, NULL, 'user', 'có trái cây nào ngon không', '2025-11-12 14:27:52', '2025-11-12 14:27:52'),
(24, 8, NULL, 'bot', 'Chúng tôi có Bưởi da xanh, Chuối giống Nam Mỹ, Dưa hấu Hàn Quốc, Lê Trung Quốc, Mít Thái, Nho sữa Trung, Xoài Cát và Cherry nội địa Trung. Bạn muốn biết thêm về loại nào không ạ?\n', '2025-11-12 14:27:54', '2025-11-12 14:27:54'),
(25, 8, NULL, 'user', 'dưa hấu đi', '2025-11-12 14:28:03', '2025-11-12 14:28:03'),
(26, 8, NULL, 'bot', 'Dạ, chúng tôi có Dưa hấu Hàn Quốc với giá 20.000đ/kg ạ.\n', '2025-11-12 14:28:09', '2025-11-12 14:28:09'),
(27, 8, NULL, 'user', 'nó là dưa nhập khẩu phải không', '2025-11-12 14:28:27', '2025-11-12 14:28:27'),
(28, 8, NULL, 'bot', 'Xin lỗi, AI không thể xử lý lúc này.', '2025-11-12 14:28:46', '2025-11-12 14:28:46'),
(29, 8, NULL, 'user', 'ok', '2025-11-12 14:28:53', '2025-11-12 14:28:53'),
(30, 8, NULL, 'bot', 'Tôi có thể giúp gì cho bạn không ạ? Bạn có muốn tìm hiểu thêm về sản phẩm nào, hoặc cần tôi gợi ý gì không?\n', '2025-11-12 14:29:03', '2025-11-12 14:29:03'),
(31, 8, NULL, 'user', 'tư vấn cho tôi các sản phẩm sữa', '2025-11-12 14:30:30', '2025-11-12 14:30:30'),
(32, 8, NULL, 'bot', 'Hiện tại bên em có các sản phẩm sữa sau ạ:\n\n*   **Sữa thùng Vinamilk 1l:** 330.000đ/thùng\n*   **Sữa bịch Dutchlady:** 6.000đ/hộp\n*   **Sữa hộp Dutchlady 1 thùng:** 360.000đ/thùng\n*   **Sữa bịch Vinamilk:** 6.000đ/bịch\n*   **Sữa TH:** 50.000đ/lóc\n\nAnh/Chị quan tâm đến loại sữa nào ạ? Em có thể tư vấn chi tiết hơn về thành phần, công dụng của từng loại để anh/chị lựa chọn được sản phẩm phù hợp nhất ạ.\n', '2025-11-12 14:30:36', '2025-11-12 14:30:36'),
(33, 8, NULL, 'user', 'tư vấn cho tôi các sản phẩm sữa', '2025-11-12 14:30:38', '2025-11-12 14:30:38'),
(34, 8, NULL, 'bot', 'Dạ, bên em đang có các loại sữa sau ạ:\n\n*   **Sữa thùng Vinamilk 1l:** 330.000đ/thùng\n*   **Sữa bịch Dutchlady:** 6.000đ/hộp\n*   **Sữa hộp Dutchlady 1 thùng:** 360.000đ/thùng\n*   **Sữa bịch Vinamilk:** 6.000đ/bịch\n*   **Sữa TH:** 50.000đ/lóc\n\nAnh/Chị muốn tìm hiểu thêm về loại sữa nào ạ? Ví dụ như thành phần dinh dưỡng, hương vị, hay công dụng của từng loại chẳng hạn?\n', '2025-11-12 14:30:41', '2025-11-12 14:30:41'),
(35, 8, NULL, 'user', 'có trứng không', '2025-11-12 14:31:24', '2025-11-12 14:31:24'),
(36, 8, NULL, 'bot', 'Xin lỗi, hiện tại không thể kết nối AI.', '2025-11-12 14:31:36', '2025-11-12 14:31:36'),
(37, 8, NULL, 'user', 'cửa hàng có trứng khong', '2025-11-12 14:33:23', '2025-11-12 14:33:23'),
(38, 8, NULL, 'bot', 'Dạ có ạ, cửa hàng em có các loại trứng sau:\n\n*   **Trứng cút hộp 30 quả:** 50.000đ/hộp\n*   **Trứng gà hộp 10 quả:** 3.000đ/quả\n*   **Trứng:** 30.000đ/hộp\n\nAnh/Chị muốn mua loại trứng nào ạ?\n', '2025-11-12 14:33:25', '2025-11-12 14:33:25'),
(39, 8, NULL, 'user', 'xóa lịch sử chat cho tôi.', '2025-11-12 14:33:41', '2025-11-12 14:33:41'),
(40, 8, NULL, 'bot', 'Tôi là một mô hình ngôn ngữ lớn và không thể thực hiện hành động đó. Tôi không lưu trữ lịch sử chat của bạn. Lịch sử chat có thể được lưu trữ ở phía bạn, trên trình duyệt hoặc thiết bị bạn đang sử dụng.\n', '2025-11-12 14:33:43', '2025-11-12 14:33:43'),
(41, 8, NULL, 'user', 'ok', '2025-11-12 14:34:27', '2025-11-12 14:34:27'),
(42, 8, NULL, 'bot', 'Xin lỗi, AI không thể xử lý lúc này.', '2025-11-12 14:34:40', '2025-11-12 14:34:40'),
(43, 8, NULL, 'user', 'cảm ơn', '2025-11-12 14:34:59', '2025-11-12 14:34:59'),
(44, 8, NULL, 'bot', 'Không có gì ạ! Nếu anh/chị cần thêm thông tin gì hoặc muốn đặt hàng, cứ cho em biết nhé!\n', '2025-11-12 14:35:03', '2025-11-12 14:35:03'),
(45, 8, NULL, 'user', 'oke', '2025-11-12 14:35:14', '2025-11-12 14:35:14'),
(46, 8, NULL, 'bot', 'Chào anh/chị! Em có thể giúp gì cho mình ạ?\n', '2025-11-12 14:35:19', '2025-11-12 14:35:19'),
(47, 8, NULL, 'user', 'cho tôi một số món rau', '2025-11-13 08:33:54', '2025-11-13 08:33:54'),
(48, 8, NULL, 'bot', 'Dạ, bên em hiện có các loại rau sau ạ:\n\n*   Cải ngọt: 6.000đ/túi\n*   Mầm giá đỗ: 10.000đ/túi\n*   Rau khoai lang: 10.000đ/túi\n*   Rau muống: 10.000đ/túi\n*   Hành lá: 5.000đ/túi\n*   Rau má: 3.600đ/túi\n*   Rau mồng tơi: 10.000đ/túi\n*   Rau tía tô: 10.000đ/túi\n\nAnh/chị muốn chọn loại nào ạ?\n', '2025-11-13 08:33:57', '2025-11-13 08:33:57'),
(49, 8, NULL, 'user', 'có trứng không?', '2025-11-13 08:34:38', '2025-11-13 08:34:38'),
(50, 8, NULL, 'bot', 'Dạ có ạ. Bên em có:\n\n*   Trứng cút hộp 30 quả: 50.000đ/hộp\n*   Trứng gà hộp 10 quả: 3.000đ/quả\n*   Trứng: 30.000đ/hộp\n', '2025-11-13 08:34:41', '2025-11-13 08:34:41'),
(51, 8, NULL, 'user', 'Hello', '2025-11-15 11:02:07', '2025-11-15 11:02:07'),
(52, 8, NULL, 'bot', 'Dạ, bên em có bán trứng ạ:\n\n*   Trứng cút hộp 30 quả - 50.000đ/hộp\n*   Trứng gà hộp 10 quả - 3.000đ/quả\n*   Trứng (không rõ loại) - 30.000đ/hộp\n\nAnh/Chị muốn mua loại nào ạ?\n', '2025-11-15 11:02:09', '2025-11-15 11:02:09'),
(53, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'user', 'hi', '2025-11-15 11:43:14', '2025-11-15 11:43:14'),
(54, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'bot', 'Chào bạn! Tôi có thể giúp gì cho bạn hôm nay? Bạn muốn tìm loại rau củ quả hay thực phẩm nào ạ?\n', '2025-11-15 11:43:17', '2025-11-15 11:43:17'),
(55, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'user', 'có rau gì ngon không', '2025-11-15 11:43:26', '2025-11-15 11:43:26'),
(56, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'bot', 'Bên mình có nhiều loại rau tươi ngon bạn nhé! Bạn thích rau ăn lá hay rau củ quả ạ? Hiện tại có các loại rau như cải ngọt, rau muống, rau khoai lang, mồng tơi, tía tô, rau má... đều đang tươi ngon đó ạ. Bạn muốn thử loại nào không?\n', '2025-11-15 11:43:28', '2025-11-15 11:43:28'),
(57, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'user', 'cải đi', '2025-11-15 11:43:37', '2025-11-15 11:43:37'),
(58, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'bot', 'Bên mình có cải ngọt giá 6000đ/túi bạn nhé!\n', '2025-11-15 11:43:38', '2025-11-15 11:43:38'),
(59, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'user', 'helo', '2025-11-15 11:49:40', '2025-11-15 11:49:40'),
(60, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'bot', 'Chào bạn! Hôm nay bạn muốn mua gì ạ? Bên mình có nhiều rau củ quả tươi ngon và thực phẩm tươi sống đó ạ.\n', '2025-11-15 11:49:42', '2025-11-15 11:49:42'),
(61, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'user', 'có rau gì ngon không', '2025-11-15 11:49:52', '2025-11-15 11:49:52'),
(62, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'bot', 'Bên mình có cải ngọt, rau muống, rau khoai lang, rau mồng tơi đều tươi ngon bạn nhé! Bạn thích loại nào ạ?\n\n\n🔗 *Các sản phẩm được nhắc tới:*\n👉 Cải ngọt: http://127.0.0.1:8000/product/cai-ngot-1762274283\n👉 Rau khoai lang: http://127.0.0.1:8000/product/rau-khoai-lang-1762274367\n👉 Rau muống: http://127.0.0.1:8000/product/rau-muong-1762274411\n👉 Rau mồng tơi: http://127.0.0.1:8000/product/rau-mong-toi-1762274524', '2025-11-15 11:49:54', '2025-11-15 11:49:54'),
(63, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'user', 'helo', '2025-11-15 11:52:43', '2025-11-15 11:52:43'),
(64, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'bot', 'Chào bạn ạ! Bạn cần tìm gì hôm nay ạ?\n', '2025-11-15 11:52:45', '2025-11-15 11:52:45'),
(65, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'user', 'có thịt heo ko', '2025-11-15 11:52:50', '2025-11-15 11:52:50'),
(66, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'bot', 'Dạ có ạ! Bên mình có ba rọi heo 500g, chân giò heo 500g, thịt heo xay CP 200g và heo sữa đó ạ. Bạn muốn mua loại nào ạ?\n<br><br>🔗 <strong>Các sản phẩm được nhắc tới:</strong><br>👉 <a href=\'http://127.0.0.1:8000/product/ba-roi-heo-500g-1762275087\' target=\'_blank\'>Ba rọi heo 500g</a><br>👉 <a href=\'http://127.0.0.1:8000/product/chan-gio-heo-500g-1762275199\' target=\'_blank\'>Chân giò heo 500g</a><br>👉 <a href=\'http://127.0.0.1:8000/product/thit-heo-xay-cp-200g-1762275309\' target=\'_blank\'>Thịt heo xay cp 200g</a><br>👉 <a href=\'http://127.0.0.1:8000/product/heo-sua-1762275646\' target=\'_blank\'>Heo sữa</a>', '2025-11-15 11:52:52', '2025-11-15 11:52:52'),
(67, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'user', 'helo', '2025-11-15 11:53:45', '2025-11-15 11:53:45'),
(68, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'bot', 'Chào bạn! Hôm nay bạn muốn mua gì ạ? Bên mình có nhiều loại rau củ quả và thịt tươi ngon đó ạ!\n', '2025-11-15 11:53:47', '2025-11-15 11:53:47'),
(69, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'user', 'có thịt heo ko', '2025-11-15 11:53:52', '2025-11-15 11:53:52'),
(70, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'bot', 'Dạ có ạ! Bên mình có ba rọi heo 500g, chân giò heo 500g, thịt heo xay CP 200g và heo sữa đó ạ.\n', '2025-11-15 11:53:54', '2025-11-15 11:53:54'),
(71, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'user', 'giá', '2025-11-15 11:54:04', '2025-11-15 11:54:04'),
(72, NULL, 'guest_7WrzW0Eo52ISfACKreHjL382lnunYt2b', 'bot', 'Giá các loại thịt heo bên mình như sau ạ:\n\n*   Ba rọi heo 500g: 80.000đ/kg\n*   Chân giò heo 500g: 50.000đ/kg\n*   Thịt heo xay CP 200g: 20.000đ/kg\n*   Heo sữa: 20.000đ/kg', '2025-11-15 11:54:06', '2025-11-15 11:54:06');

-- --------------------------------------------------------

--
-- Table structure for table `contacts`
--

CREATE TABLE `contacts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `phone_number` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `message` varchar(255) NOT NULL,
  `is_replied` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `contacts`
--

INSERT INTO `contacts` (`id`, `full_name`, `phone_number`, `email`, `message`, `is_replied`, `created_at`, `updated_at`) VALUES
(1, 'huan', '0987654321', 'huanlee2004@gmail.com', 'tuw vaas mua ca chua', 1, '2025-11-04 15:04:22', '2025-11-04 15:04:43');

-- --------------------------------------------------------

--
-- Table structure for table `coupons`
--

CREATE TABLE `coupons` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(255) NOT NULL,
  `coupon_type` varchar(50) NOT NULL DEFAULT 'ORDER_DISCOUNT',
  `discount_type` varchar(50) NOT NULL DEFAULT 'PERCENTAGE',
  `discount_percentage` tinyint(3) UNSIGNED NOT NULL,
  `discount_amount` decimal(10,2) DEFAULT NULL,
  `starts_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `usage_limit` int(10) UNSIGNED DEFAULT NULL,
  `times_used` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `coupons`
--

INSERT INTO `coupons` (`id`, `code`, `coupon_type`, `discount_type`, `discount_percentage`, `discount_amount`, `starts_at`, `expires_at`, `usage_limit`, `times_used`, `is_active`, `created_at`, `updated_at`) VALUES
(3, 'KK', 'ORDER_DISCOUNT', 'PERCENTAGE', 5, NULL, NULL, '2025-11-13 15:22:00', 1, 0, 1, '2025-11-12 15:22:35', '2025-11-12 15:22:35'),
(4, 'KKKKKKD', 'ORDER_DISCOUNT', 'PERCENTAGE', 5, NULL, NULL, '2025-11-22 11:15:00', 1, 0, 1, '2025-11-15 11:15:32', '2025-11-15 11:15:32');

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '2025_04_05_083244_create_roles_table', 1),
(2, '2025_04_05_083337_create_permissions_table', 1),
(3, '2025_04_05_083400_create_role_permissions_table', 1),
(4, '2025_04_05_083422_create_users_table', 1),
(5, '2025_04_05_083516_create_categories_table', 1),
(6, '2025_04_05_083525_create_products_table', 1),
(7, '2025_04_05_083534_create_product_images_table', 1),
(8, '2025_04_05_083557_create_shipping_addresses_table', 1),
(9, '2025_04_05_083619_create_orders_table', 1),
(10, '2025_04_05_083627_create_order_items_table', 1),
(11, '2025_04_05_083638_create_payments_table', 1),
(12, '2025_04_05_083648_create_wishlists_table', 1),
(13, '2025_04_05_083657_create_reviews_table', 1),
(14, '2025_04_05_083706_create_notifications_table', 1),
(15, '2025_04_05_083734_create_contacts_table', 1),
(16, '2025_04_05_083754_create_order_status_history_table', 1),
(17, '2025_04_05_083821_create_cart_items_table', 1),
(18, '2025_04_05_083915_create_password_reset_tokens_table', 1),
(19, '2025_05_20_000000_create_coupons_table', 1),
(20, '2025_05_20_010000_add_coupon_fields_to_orders_table', 1),
(21, '2025_08_11_031938_create_chat_messages_table', 1),
(22, '2025_10_05_000001_add_delivery_fields_to_orders_table', 1),
(23, '2025_10_05_000002_update_status_enum_in_order_status_history', 1);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `message` text NOT NULL,
  `link` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `link`, `is_read`, `created_at`, `updated_at`) VALUES
(1, 8, 'contact', 'Có đơn liên hệ từ huanlee2004@gmail.com', '/contacts', 1, '2025-11-04 15:04:22', '2025-11-05 14:03:36'),
(2, 8, 'order', 'Có đơn đặt hàng mới từ huanlee2004@gmail.com', '/orders', 0, '2025-11-04 17:16:58', '2025-11-04 17:16:58'),
(3, 8, 'order', 'Có đơn đặt hàng mới từ huanlee2004@gmail.com', '/orders', 1, '2025-11-13 08:26:06', '2026-04-10 20:24:46'),
(4, 8, 'order', 'Có đơn đặt hàng mới từ huanlee2004@gmail.com', '/orders', 0, '2026-06-13 02:16:23', '2026-06-13 02:16:23');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `delivery_staff_id` bigint(20) UNSIGNED DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `shipping_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `coupon_id` bigint(20) UNSIGNED DEFAULT NULL,
  `coupon_code` varchar(255) DEFAULT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'pending',
  `dispatched_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `shipping_address_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `user_id`, `delivery_staff_id`, `subtotal`, `discount_amount`, `shipping_fee`, `coupon_id`, `coupon_code`, `total_price`, `status`, `dispatched_at`, `delivered_at`, `shipping_address_id`, `created_at`, `updated_at`) VALUES
(1, 8, 6, 50000.00, 0.00, 25000.00, NULL, NULL, 75000.00, 'completed', '2025-11-04 15:03:26', '2025-11-04 15:03:33', 1, '2025-11-04 15:01:08', '2025-11-04 15:43:39'),
(3, 8, 6, 6000.00, 600.00, 25000.00, NULL, 'KKKKKK', 30400.00, 'completed', '2025-11-04 17:25:14', '2025-11-04 17:25:15', 1, '2025-11-04 17:22:42', '2025-11-12 14:23:52'),
(4, 8, 6, 280000.00, 56000.00, 25000.00, NULL, 'KK', 249000.00, 'delivered', '2025-11-05 13:40:17', '2025-11-05 13:40:28', 1, '2025-11-05 13:25:59', '2025-11-05 13:40:28'),
(5, 8, 6, 30000.00, 0.00, 25000.00, NULL, NULL, 55000.00, 'delivered', '2025-11-05 14:14:36', '2025-11-05 14:14:46', 1, '2025-11-05 14:11:49', '2025-11-05 14:14:46'),
(6, 8, 6, 26000.00, 0.00, 25000.00, NULL, NULL, 51000.00, 'completed', '2025-11-12 14:18:34', '2025-11-12 14:18:36', 1, '2025-11-12 14:16:39', '2025-11-12 15:28:59'),
(7, 8, NULL, 236000.00, 0.00, 25000.00, NULL, NULL, 261000.00, 'processing', NULL, NULL, 1, '2025-11-13 08:26:06', '2025-11-15 11:16:37'),
(8, 8, NULL, 6000.00, 0.00, 25000.00, NULL, NULL, 31000.00, 'processing', NULL, NULL, 1, '2025-11-13 08:27:07', '2026-04-10 20:23:52'),
(9, 8, NULL, 500000.00, 0.00, 25000.00, NULL, NULL, 525000.00, 'processing', NULL, NULL, 1, '2026-04-10 20:22:09', '2026-04-10 20:23:49'),
(10, 8, NULL, 50000.00, 0.00, 25000.00, NULL, NULL, 75000.00, 'pending', NULL, NULL, 1, '2026-06-13 02:16:23', '2026-06-13 02:16:23');

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `quantity`, `price`, `created_at`, `updated_at`) VALUES
(4, 3, 34, 1, 6000.00, '2025-11-04 17:22:42', '2025-11-04 17:22:42'),
(5, 4, 43, 1, 50000.00, '2025-11-05 13:25:59', '2025-11-05 13:25:59'),
(6, 4, 27, 1, 150000.00, '2025-11-05 13:25:59', '2025-11-05 13:25:59'),
(7, 4, 24, 1, 80000.00, '2025-11-05 13:25:59', '2025-11-05 13:25:59'),
(8, 5, 47, 1, 30000.00, '2025-11-05 14:11:49', '2025-11-05 14:11:49'),
(9, 6, 7, 2, 10000.00, '2025-11-12 14:16:39', '2025-11-12 14:16:39'),
(10, 6, 6, 1, 6000.00, '2025-11-12 14:16:39', '2025-11-12 14:16:39'),
(11, 7, 7, 1, 10000.00, '2025-11-13 08:26:06', '2025-11-13 08:26:06'),
(12, 7, 23, 1, 200000.00, '2025-11-13 08:26:06', '2025-11-13 08:26:06'),
(13, 7, 14, 1, 20000.00, '2025-11-13 08:26:06', '2025-11-13 08:26:06'),
(14, 7, 6, 1, 6000.00, '2025-11-13 08:26:06', '2025-11-13 08:26:06'),
(15, 8, 6, 1, 6000.00, '2025-11-13 08:27:07', '2025-11-13 08:27:07'),
(16, 9, 14, 1, 20000.00, '2026-04-10 20:22:09', '2026-04-10 20:22:09'),
(17, 9, 15, 1, 50000.00, '2026-04-10 20:22:09', '2026-04-10 20:22:09'),
(18, 9, 24, 1, 80000.00, '2026-04-10 20:22:09', '2026-04-10 20:22:09'),
(19, 9, 25, 1, 250000.00, '2026-04-10 20:22:09', '2026-04-10 20:22:09'),
(20, 9, 43, 2, 50000.00, '2026-04-10 20:22:09', '2026-04-10 20:22:09'),
(21, 10, 45, 1, 50000.00, '2026-06-13 02:16:23', '2026-06-13 02:16:23');

-- --------------------------------------------------------

--
-- Table structure for table `order_status_history`
--

CREATE TABLE `order_status_history` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `status` enum('pending','processing','ready_for_delivery','out_for_delivery','delivered','completed','canceled') DEFAULT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `note` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `order_status_history`
--

INSERT INTO `order_status_history` (`id`, `order_id`, `status`, `changed_at`, `note`, `created_at`, `updated_at`) VALUES
(1, 1, 'processing', '2025-11-04 15:02:06', 'Order confirmed by Admin User', '2025-11-04 15:02:06', '2025-11-04 15:02:06'),
(2, 1, 'ready_for_delivery', '2025-11-04 15:02:38', 'giao hang cho khach', '2025-11-04 15:02:38', '2025-11-04 15:02:38'),
(3, 1, 'out_for_delivery', '2025-11-04 15:03:26', NULL, '2025-11-04 15:03:26', '2025-11-04 15:03:26'),
(4, 1, 'delivered', '2025-11-04 15:03:33', NULL, '2025-11-04 15:03:33', '2025-11-04 15:03:33'),
(5, 1, 'completed', '2025-11-04 15:43:39', 'Order completed by customer confirmation', '2025-11-04 15:43:39', '2025-11-04 15:43:39'),
(10, 3, 'processing', '2025-11-04 17:24:45', 'Order confirmed by Admin User', '2025-11-04 17:24:45', '2025-11-04 17:24:45'),
(11, 3, 'ready_for_delivery', '2025-11-04 17:25:06', NULL, '2025-11-04 17:25:06', '2025-11-04 17:25:06'),
(12, 3, 'out_for_delivery', '2025-11-04 17:25:14', NULL, '2025-11-04 17:25:14', '2025-11-04 17:25:14'),
(13, 3, 'delivered', '2025-11-04 17:25:15', NULL, '2025-11-04 17:25:15', '2025-11-04 17:25:15'),
(14, 4, 'processing', '2025-11-05 13:26:18', 'Order confirmed by Admin User', '2025-11-05 13:26:18', '2025-11-05 13:26:18'),
(15, 4, 'ready_for_delivery', '2025-11-05 13:26:47', 'hang ngon', '2025-11-05 13:26:47', '2025-11-05 13:26:47'),
(16, 4, 'ready_for_delivery', '2025-11-05 13:34:34', NULL, '2025-11-05 13:34:34', '2025-11-05 13:34:34'),
(17, 4, 'ready_for_delivery', '2025-11-05 13:37:34', 'ok', '2025-11-05 13:37:34', '2025-11-05 13:37:34'),
(18, 4, 'out_for_delivery', '2025-11-05 13:40:17', NULL, '2025-11-05 13:40:17', '2025-11-05 13:40:17'),
(19, 4, 'delivered', '2025-11-05 13:40:29', NULL, '2025-11-05 13:40:29', '2025-11-05 13:40:29'),
(20, 5, 'processing', '2025-11-05 14:13:28', 'Order confirmed by Admin User', '2025-11-05 14:13:28', '2025-11-05 14:13:28'),
(21, 5, 'ready_for_delivery', '2025-11-05 14:13:46', 'ok', '2025-11-05 14:13:46', '2025-11-05 14:13:46'),
(22, 5, 'out_for_delivery', '2025-11-05 14:14:36', NULL, '2025-11-05 14:14:36', '2025-11-05 14:14:36'),
(23, 5, 'delivered', '2025-11-05 14:14:46', NULL, '2025-11-05 14:14:46', '2025-11-05 14:14:46'),
(24, 6, 'processing', '2025-11-12 14:18:02', 'Order confirmed by Admin User', '2025-11-12 14:18:02', '2025-11-12 14:18:02'),
(25, 6, 'ready_for_delivery', '2025-11-12 14:18:24', NULL, '2025-11-12 14:18:24', '2025-11-12 14:18:24'),
(26, 6, 'out_for_delivery', '2025-11-12 14:18:34', NULL, '2025-11-12 14:18:34', '2025-11-12 14:18:34'),
(27, 6, 'delivered', '2025-11-12 14:18:36', NULL, '2025-11-12 14:18:36', '2025-11-12 14:18:36'),
(28, 3, 'completed', '2025-11-12 14:23:52', 'Order completed by customer confirmation', '2025-11-12 14:23:52', '2025-11-12 14:23:52'),
(29, 6, 'completed', '2025-11-12 15:28:59', 'Order completed by customer confirmation', '2025-11-12 15:28:59', '2025-11-12 15:28:59'),
(30, 7, 'processing', '2025-11-15 11:16:38', 'Order confirmed by Admin User', '2025-11-15 11:16:38', '2025-11-15 11:16:38'),
(31, 9, 'processing', '2026-04-10 20:23:49', 'Order confirmed by Admin User', '2026-04-10 20:23:49', '2026-04-10 20:23:49'),
(32, 8, 'processing', '2026-04-10 20:23:52', 'Order confirmed by Admin User', '2026-04-10 20:23:52', '2026-04-10 20:23:52');

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `payment_method` enum('cash','paypal','vnpay') NOT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  `paid_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `order_id`, `payment_method`, `transaction_id`, `amount`, `status`, `paid_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'paypal', '5LG51430HH032792F', 75000.00, 'completed', '2025-11-04 15:01:08', '2025-11-04 15:01:08', '2025-11-04 15:01:08'),
(3, 3, 'paypal', '3AV60331RL485783F', 30400.00, 'completed', '2025-11-04 17:22:42', '2025-11-04 17:22:42', '2025-11-04 17:22:42'),
(4, 4, 'paypal', '82E922528F059771P', 249000.00, 'completed', '2025-11-05 13:25:59', '2025-11-05 13:25:59', '2025-11-05 13:25:59'),
(5, 5, 'paypal', '9UF92746VG915981X', 55000.00, 'completed', '2025-11-05 14:11:49', '2025-11-05 14:11:49', '2025-11-05 14:11:49'),
(6, 6, 'paypal', '6NY40969XX551711S', 51000.00, 'completed', '2025-11-12 14:16:39', '2025-11-12 14:16:39', '2025-11-12 14:16:39'),
(7, 7, 'cash', NULL, 261000.00, 'pending', NULL, '2025-11-13 08:26:06', '2025-11-13 08:26:06'),
(8, 8, 'paypal', '15Y01153L1803531N', 31000.00, 'completed', '2025-11-13 08:27:07', '2025-11-13 08:27:07', '2025-11-13 08:27:07'),
(9, 9, 'paypal', '7R1277399K647941C', 525000.00, 'completed', '2026-04-10 20:22:09', '2026-04-10 20:22:09', '2026-04-10 20:22:09'),
(10, 10, 'cash', NULL, 75000.00, 'pending', NULL, '2026-06-13 02:16:23', '2026-06-13 02:16:23');

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `name`, `created_at`, `updated_at`) VALUES
(1, 'manage_users', '2025-11-04 13:50:30', '2025-11-04 13:50:30'),
(2, 'manage_products', '2025-11-04 13:50:30', '2025-11-04 13:50:30'),
(3, 'manage_orders', '2025-11-04 13:50:30', '2025-11-04 13:50:30'),
(4, 'manage_categories', '2025-11-04 13:50:30', '2025-11-04 13:50:30'),
(5, 'manage_contacts', '2025-11-04 13:50:30', '2025-11-04 13:50:30'),
(6, 'manage_deliveries', '2025-11-04 13:50:30', '2025-11-04 13:50:30');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `category_id` bigint(20) UNSIGNED NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `status` varchar(255) NOT NULL DEFAULT 'in_stock',
  `unit` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `name`, `slug`, `category_id`, `description`, `price`, `stock`, `status`, `unit`, `created_at`, `updated_at`) VALUES
(6, 'Cải ngọt', 'cai-ngot-1762274283', 1, 'Cải ngon', 6000.00, 27, 'in_stock', 'túi', '2025-11-04 16:38:03', '2025-11-13 08:27:07'),
(7, 'Mầm giá đỗ', 'mam-gia-do-1762274326', 1, 'Giá ngon rẻ', 10000.00, 17, 'in_stock', 'túi', '2025-11-04 16:38:46', '2025-11-13 08:26:06'),
(8, 'Rau khoai lang', 'rau-khoai-lang-1762274367', 1, 'Rau sạch', 10000.00, 50, 'in_stock', 'túi', '2025-11-04 16:39:27', '2025-11-04 16:39:27'),
(9, 'Rau muống', 'rau-muong-1762274411', 1, 'Giá ngon rẻ', 10000.00, 10, 'in_stock', 'túi', '2025-11-04 16:40:11', '2025-11-04 16:40:11'),
(10, 'Hành lá', 'hanh-la-1762274448', 1, 'Giá ngon rẻ', 5000.00, 20, 'in_stock', 'túi', '2025-11-04 16:40:48', '2025-11-04 16:40:48'),
(11, 'Rau má', 'rau-ma-1762274494', 1, 'Rau sạch', 3600.00, 36, 'in_stock', 'túi', '2025-11-04 16:41:34', '2025-11-04 16:41:34'),
(12, 'Rau mồng tơi', 'rau-mong-toi-1762274524', 1, 'Rau sạch', 10000.00, 19, 'in_stock', 'túi', '2025-11-04 16:42:04', '2025-11-04 17:16:58'),
(13, 'Rau tía tô', 'rau-tia-to-1762274544', 1, 'Rau sạch', 10000.00, 20, 'in_stock', 'túi', '2025-11-04 16:42:24', '2025-11-04 16:42:24'),
(14, 'Bưởi da xanh', 'buoi-da-xanh-1762274598', 2, 'Bưởi ngọt lắm kk', 20000.00, 28, 'in_stock', 'kg', '2025-11-04 16:43:18', '2026-04-10 20:22:09'),
(15, 'Chuối giống Nam Mỹ', 'chuoi-giong-nam-my-1762274674', 2, 'Siêu ngon', 50000.00, 29, 'in_stock', 'kg', '2025-11-04 16:44:34', '2026-04-10 20:22:09'),
(16, 'Dưa hấu Hàn Quốc', 'dua-hau-han-quoc-1762274733', 2, 'Ngon', 20000.00, 30, 'in_stock', 'kg', '2025-11-04 16:45:33', '2025-11-04 16:45:33'),
(17, 'Dừa Xiêm tiện lợi', 'dua-xiem-tien-loi-1762274770', 2, 'Giá ngon rẻ', 100000.00, 20, 'in_stock', 'quả', '2025-11-04 16:46:10', '2025-11-04 16:46:10'),
(18, 'Lê Trung Quốc', 'le-trung-quoc-1762274810', 2, 'Giá ngon rẻ', 10000.00, 20, 'in_stock', 'kg', '2025-11-04 16:46:50', '2025-11-04 16:46:50'),
(19, 'Mít Thái', 'mit-thai-1762274843', 2, 'Giá ngon rẻ', 50000.00, 30, 'in_stock', 'kg', '2025-11-04 16:47:23', '2025-11-04 16:47:23'),
(20, 'Nho sữa Trung', 'nho-sua-trung-1762274882', 2, 'Giá ngon rẻ', 50000.00, 50, 'in_stock', 'kg', '2025-11-04 16:48:02', '2025-11-04 16:48:02'),
(21, 'Xoài Cát', 'xoai-cat-1762274908', 2, 'Giá ngon rẻ', 10000.00, 30, 'in_stock', 'kg', '2025-11-04 16:48:28', '2025-11-04 16:48:28'),
(22, 'Cherry nội địa Trung', 'cherry-noi-dia-trung-1762274947', 2, 'Giá ngon rẻ', 50000.00, 20, 'in_stock', 'kg', '2025-11-04 16:49:07', '2025-11-04 16:49:07'),
(23, 'Ba chỉ bò Đức', 'ba-chi-bo-duc-1762275033', 3, 'Thịt tươi ngon thượng hạng', 200000.00, 19, 'in_stock', 'kg', '2025-11-04 16:50:33', '2025-11-13 08:26:06'),
(24, 'Ba rọi heo 500g', 'ba-roi-heo-500g-1762275087', 3, 'Thịt tươi ngon thượng hạng', 80000.00, 18, 'in_stock', 'kg', '2025-11-04 16:51:27', '2026-04-10 20:22:09'),
(25, 'Cá Hồi cắt khúc 1kg', 'ca-hoi-cat-khuc-1kg-1762275158', 4, 'Cá hồi nhập khẩu từ Châu Âu', 250000.00, 25, 'in_stock', 'kg', '2025-11-04 16:52:38', '2026-04-10 20:22:09'),
(26, 'Chân giò heo 500g', 'chan-gio-heo-500g-1762275199', 3, 'Giá ngon bổ rẻ', 50000.00, 30, 'in_stock', 'kg', '2025-11-04 16:53:19', '2025-11-04 16:53:19'),
(27, 'Sườn non', 'suon-non-1762275234', 3, 'Thịt tươi ngon thượng hạng', 150000.00, 49, 'in_stock', 'kg', '2025-11-04 16:53:54', '2025-11-05 13:25:59'),
(28, 'Thịt bò xay 200g', 'thit-bo-xay-200g-1762275267', 3, 'Thịt tươi ngon thượng hạng', 50000.00, 20, 'in_stock', 'kg', '2025-11-04 16:54:27', '2025-11-04 16:54:27'),
(29, 'Thịt heo xay cp 200g', 'thit-heo-xay-cp-200g-1762275309', 3, 'Thịt tươi ngon thượng hạng', 20000.00, 50, 'in_stock', 'kg', '2025-11-04 16:55:09', '2025-11-04 16:55:09'),
(30, 'Thịt thăn bò Áo', 'thit-than-bo-ao-1762275343', 3, 'Thịt tươi ngon thượng hạng', 500000.00, 50, 'in_stock', 'kg', '2025-11-04 16:55:43', '2025-11-04 16:55:43'),
(31, 'Sữa thùng Vinamilk 1l', 'sua-thung-vinamilk-1l-1762275418', 5, 'Chất lượng tốt nhất', 330000.00, 20, 'in_stock', 'thùng', '2025-11-04 16:56:58', '2025-11-04 16:56:58'),
(32, 'Thịt bò Úc', 'thit-bo-uc-1762275609', 3, 'Thịt tươi ngon thượng hạng', 123456.00, 30, 'in_stock', 'kg', '2025-11-04 17:00:09', '2025-11-04 17:00:09'),
(33, 'Heo sữa', 'heo-sua-1762275646', 3, 'Thịt tươi ngon thượng hạng', 20000.00, 30, 'in_stock', 'kg', '2025-11-04 17:00:46', '2025-11-04 17:00:46'),
(34, 'Sữa bịch dutchlady', 'sua-bich-dutchlady-1762276023', 5, 'Chất lượng tốt nhất', 6000.00, 29, 'in_stock', 'hộp', '2025-11-04 17:07:03', '2025-11-04 17:22:42'),
(35, 'Sữa hộp dutchlady 1 thùng', 'sua-hop-dutchlady-1-thung-1762276065', 5, 'Chất lượng tốt nhất', 360000.00, 36, 'in_stock', 'thùng', '2025-11-04 17:07:45', '2025-11-04 17:07:45'),
(36, 'Trứng cút hộp 30 quả', 'trung-cut-hop-30-qua-1762276110', 5, 'Chất lượng tốt nhất', 50000.00, 20, 'in_stock', 'hộp', '2025-11-04 17:08:30', '2025-11-04 17:08:30'),
(37, 'Trứng gà hộp 10 quả', 'trung-ga-hop-10-qua-1762276156', 5, 'Giá ngon rẻ', 3000.00, 30, 'in_stock', 'quả', '2025-11-04 17:09:16', '2025-11-04 17:09:16'),
(38, 'trứng', 'trung-1762276183', 5, 'Chất lượng tốt nhất', 30000.00, 30, 'in_stock', 'hộp', '2025-11-04 17:09:43', '2025-11-04 17:09:43'),
(39, 'Sữa bịch vinamilk', 'sua-bich-vinamilk-1762276218', 5, 'Giá ngon rẻ', 6000.00, 20, 'in_stock', 'bịch', '2025-11-04 17:10:18', '2025-11-04 17:10:18'),
(40, 'Sữa TH', 'sua-th-1762276260', 5, 'Giá ngon rẻ', 50000.00, 20, 'in_stock', 'lóc', '2025-11-04 17:11:00', '2025-11-04 17:11:00'),
(41, 'Ức cá BASA', 'uc-ca-basa-1762276304', 4, 'Cá tươi ngon thượng hạng.', 50000.00, 30, 'in_stock', 'hộp', '2025-11-04 17:11:44', '2025-11-04 17:11:44'),
(42, 'Cá diêu hồng', 'ca-dieu-hong-1762276339', 4, 'Ca', 50000.00, 20, 'in_stock', 'kg', '2025-11-04 17:12:19', '2025-11-04 17:12:19'),
(43, 'Cá lóc', 'ca-loc-1762276372', 4, 'cá', 50000.00, 27, 'in_stock', 'kg', '2025-11-04 17:12:52', '2026-04-10 20:22:09'),
(44, 'Cá BASA cắt khúc', 'ca-basa-cat-khuc-1762276415', 4, 'Chất lượng tốt nhất', 30000.00, 30, 'in_stock', 'kg', '2025-11-04 17:13:35', '2025-11-04 17:13:35'),
(45, 'Cá chim', 'ca-chim-1762276444', 4, 'Chất lượng tốt nhất', 50000.00, 29, 'in_stock', 'kg', '2025-11-04 17:14:04', '2026-06-13 02:16:23'),
(46, 'Cá mó làm sạch', 'ca-mo-lam-sach-1762276468', 4, 'Chất lượng tốt nhất', 20000.00, 50, 'in_stock', 'kg', '2025-11-04 17:14:28', '2025-11-04 17:14:28'),
(47, 'Cá Ngừ làm sạch', 'ca-ngu-lam-sach-1762276520', 4, 'Chất lượng tốt nhất', 30000.00, 49, 'in_stock', 'kg', '2025-11-04 17:15:20', '2025-11-05 14:11:49');

-- --------------------------------------------------------

--
-- Table structure for table `product_images`
--

CREATE TABLE `product_images` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product_images`
--

INSERT INTO `product_images` (`id`, `product_id`, `image`, `created_at`, `updated_at`) VALUES
(6, 6, 'uploads/products/1762274283_690a2beb5d391.jpg', '2025-11-04 16:38:03', '2025-11-04 16:38:03'),
(7, 7, 'uploads/products/1762274326_690a2c16bcdfe.jpg', '2025-11-04 16:38:46', '2025-11-04 16:38:46'),
(8, 8, 'uploads/products/1762274367_690a2c3f2e5d6.jpg', '2025-11-04 16:39:27', '2025-11-04 16:39:27'),
(9, 9, 'uploads/products/1762274411_690a2c6b12272.jpg', '2025-11-04 16:40:11', '2025-11-04 16:40:11'),
(10, 10, 'uploads/products/1762274448_690a2c90e8452.jpg', '2025-11-04 16:40:49', '2025-11-04 16:40:49'),
(11, 11, 'uploads/products/1762274494_690a2cbecf370.jpg', '2025-11-04 16:41:34', '2025-11-04 16:41:34'),
(12, 12, 'uploads/products/1762274524_690a2cdc218a9.jpg', '2025-11-04 16:42:04', '2025-11-04 16:42:04'),
(13, 13, 'uploads/products/1762274544_690a2cf0e11c8.jpg', '2025-11-04 16:42:25', '2025-11-04 16:42:25'),
(14, 14, 'uploads/products/1762274598_690a2d26ea7b5.jpg', '2025-11-04 16:43:19', '2025-11-04 16:43:19'),
(15, 15, 'uploads/products/1762274674_690a2d72ba0d1.jpg', '2025-11-04 16:44:34', '2025-11-04 16:44:34'),
(16, 16, 'uploads/products/1762274733_690a2dad035b3.jpg', '2025-11-04 16:45:33', '2025-11-04 16:45:33'),
(17, 17, 'uploads/products/1762274770_690a2dd25f975.jpg', '2025-11-04 16:46:10', '2025-11-04 16:46:10'),
(18, 18, 'uploads/products/1762274810_690a2dfa5c9d7.jpg', '2025-11-04 16:46:50', '2025-11-04 16:46:50'),
(19, 19, 'uploads/products/1762274843_690a2e1bb4330.jpg', '2025-11-04 16:47:23', '2025-11-04 16:47:23'),
(20, 20, 'uploads/products/1762274882_690a2e42a17fb.jpg', '2025-11-04 16:48:02', '2025-11-04 16:48:02'),
(21, 21, 'uploads/products/1762274908_690a2e5c25dd8.jpg', '2025-11-04 16:48:28', '2025-11-04 16:48:28'),
(22, 22, 'uploads/products/1762274947_690a2e8311db2.jpg', '2025-11-04 16:49:07', '2025-11-04 16:49:07'),
(23, 23, 'uploads/products/1762275033_690a2ed9ddf81.jpg', '2025-11-04 16:50:34', '2025-11-04 16:50:34'),
(24, 24, 'uploads/products/1762275087_690a2f0f3c930.jpg', '2025-11-04 16:51:27', '2025-11-04 16:51:27'),
(25, 25, 'uploads/products/1762275158_690a2f56a6bd5.jpg', '2025-11-04 16:52:38', '2025-11-04 16:52:38'),
(26, 26, 'uploads/products/1762275199_690a2f7fe2770.jpg', '2025-11-04 16:53:20', '2025-11-04 16:53:20'),
(27, 27, 'uploads/products/1762275234_690a2fa28bb03.jpg', '2025-11-04 16:53:54', '2025-11-04 16:53:54'),
(28, 28, 'uploads/products/1762275267_690a2fc3da71a.jpg', '2025-11-04 16:54:28', '2025-11-04 16:54:28'),
(29, 29, 'uploads/products/1762275309_690a2fed729ba.jpg', '2025-11-04 16:55:09', '2025-11-04 16:55:09'),
(30, 30, 'uploads/products/1762275343_690a300f3d18a.jpg', '2025-11-04 16:55:43', '2025-11-04 16:55:43'),
(31, 31, 'uploads/products/1762275418_690a305a442e4.jpg', '2025-11-04 16:56:58', '2025-11-04 16:56:58'),
(32, 32, 'uploads/products/1762275609_690a3119182c3.jpg', '2025-11-04 17:00:09', '2025-11-04 17:00:09'),
(33, 33, 'uploads/products/1762275646_690a313e91944.jpg', '2025-11-04 17:00:46', '2025-11-04 17:00:46'),
(34, 34, 'uploads/products/1762276023_690a32b7e1716.jpg', '2025-11-04 17:07:04', '2025-11-04 17:07:04'),
(35, 35, 'uploads/products/1762276065_690a32e1e91a4.jpg', '2025-11-04 17:07:46', '2025-11-04 17:07:46'),
(36, 36, 'uploads/products/1762276110_690a330eb4735.jpg', '2025-11-04 17:08:30', '2025-11-04 17:08:30'),
(37, 37, 'uploads/products/1762276156_690a333c3a05f.jpg', '2025-11-04 17:09:16', '2025-11-04 17:09:16'),
(38, 38, 'uploads/products/1762276183_690a33578d97b.jpg', '2025-11-04 17:09:43', '2025-11-04 17:09:43'),
(39, 39, 'uploads/products/1762276218_690a337ac0a9c.jpg', '2025-11-04 17:10:18', '2025-11-04 17:10:18'),
(40, 40, 'uploads/products/1762276260_690a33a4a847a.jpg', '2025-11-04 17:11:00', '2025-11-04 17:11:00'),
(41, 41, 'uploads/products/1762276304_690a33d0ae558.jpg', '2025-11-04 17:11:44', '2025-11-04 17:11:44'),
(42, 42, 'uploads/products/1762276339_690a33f372a32.jpg', '2025-11-04 17:12:19', '2025-11-04 17:12:19'),
(43, 43, 'uploads/products/1762276372_690a34149724e.jpg', '2025-11-04 17:12:52', '2025-11-04 17:12:52'),
(44, 44, 'uploads/products/1762276415_690a343f4cd6a.jpg', '2025-11-04 17:13:35', '2025-11-04 17:13:35'),
(45, 45, 'uploads/products/1762276444_690a345c7259f.jpg', '2025-11-04 17:14:04', '2025-11-04 17:14:04'),
(46, 46, 'uploads/products/1762276468_690a3474cb2de.jpg', '2025-11-04 17:14:28', '2025-11-04 17:14:28'),
(47, 47, 'uploads/products/1762276520_690a34a8445ed.jpg', '2025-11-04 17:15:20', '2025-11-04 17:15:20');

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `rating` tinyint(3) UNSIGNED NOT NULL,
  `comment` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reviews`
--

INSERT INTO `reviews` (`id`, `user_id`, `product_id`, `rating`, `comment`, `created_at`, `updated_at`) VALUES
(2, 8, 34, 5, 'ngon', '2025-11-12 14:24:19', '2025-11-12 14:24:19');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `created_at`, `updated_at`) VALUES
(1, 'admin', '2025-11-04 13:50:30', '2025-11-04 13:50:30'),
(2, 'staff', '2025-11-04 13:50:30', '2025-11-04 13:50:30'),
(3, 'delivery_staff', '2025-11-04 13:50:30', '2025-11-04 13:50:30'),
(4, 'customer', '2025-11-04 13:50:30', '2025-11-04 13:50:30');

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `permission_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`, `updated_at`) VALUES
(1, 4, NULL, NULL),
(1, 5, NULL, NULL),
(1, 6, NULL, NULL),
(1, 3, NULL, NULL),
(1, 2, NULL, NULL),
(1, 1, NULL, NULL),
(2, 5, NULL, NULL),
(2, 2, NULL, NULL),
(3, 6, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `shipping_addresses`
--

CREATE TABLE `shipping_addresses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `city` varchar(255) NOT NULL,
  `default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `shipping_addresses`
--

INSERT INTO `shipping_addresses` (`id`, `user_id`, `full_name`, `phone`, `address`, `city`, `default`, `created_at`, `updated_at`) VALUES
(1, 8, 'Huan', '0987654321', 'Ha Noi', 'Ha Noi', 1, '2025-11-04 14:34:32', '2025-11-04 14:34:32');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `status` enum('pending','active','banned','deleted') NOT NULL DEFAULT 'pending',
  `phone_number` varchar(255) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `activation_token` varchar(255) DEFAULT NULL,
  `google_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `status`, `phone_number`, `avatar`, `address`, `role_id`, `activation_token`, `google_id`, `created_at`, `updated_at`) VALUES
(1, 'Nguyen Van A', 'nguyenvana@example.com', '$2y$12$ufaIy3g2/dBf1h7ihj31P.WvfBn.sqq7jKBRE3Ld/1L5GBS0Z6Lvu', 'pending', '0123456789', '', 'Da Nang, Vietnam', 1, NULL, NULL, '2025-11-04 13:50:30', '2025-11-04 13:50:30'),
(2, 'Tran Thi B', 'tranthib@example.com', '$2y$12$raC7TfeVXBX4Ss224jyahuH39TFwxDEpgCmqmZdBxPM9h4Flo0GpC', 'pending', '0987654321', '', 'Gia Lai, Vietnam', 2, NULL, NULL, '2025-11-04 13:50:30', '2025-11-04 13:50:30'),
(4, 'Admin User', 'admin@example.com', '$2y$12$xsmx5bC7a4jbSsTmuv4GeuJXyJsC71oZPziZ7oCTWZPTpu0y71Oz2', 'active', '099999999', 'uploads/users/1762275810_690a31e290894.webp', 'Da Nang, Vietnam', 1, NULL, NULL, '2025-11-04 13:50:31', '2025-11-04 17:03:30'),
(5, 'Staff User', 'staff@example.com', '$2y$12$1qHsFINxjNHDuirezFD31ODBJUAwkA91qLc0vwmQQygSV/u1LNOlq', 'active', '0888888880', 'uploads/users/1762277995_690a3a6b52207.jpg', 'QB, Vietnam', 2, NULL, NULL, '2025-11-04 13:50:31', '2025-11-04 17:40:06'),
(6, 'Delivery User', 'delivery@example.com', '$2y$12$SpGljFNkD0e6pfIzuosNfO0vGaLwzDDQ9LTa6nHCy8Z0Z/X74pIiK', 'active', '077777777', '', 'Hoi An, Vietnam', 3, NULL, NULL, '2025-11-04 13:50:32', '2025-11-04 13:50:32'),
(8, 'huan', 'huanlee2004@gmail.com', '$2y$12$rJysn5K8I9zGc3GLB.FuzeC1sD4RqHCK0Ne.wz9y0liJVnDAu7wJO', 'active', '098765432', 'uploads/users/1762266854_690a0ee63d82d_png', 'Quảng Bình', 4, NULL, NULL, '2025-11-04 13:57:15', '2025-11-15 11:01:37');

-- --------------------------------------------------------

--
-- Table structure for table `wishlists`
--

CREATE TABLE `wishlists` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `wishlists`
--

INSERT INTO `wishlists` (`id`, `user_id`, `product_id`, `created_at`, `updated_at`) VALUES
(2, 8, 27, '2025-11-15 11:00:23', '2025-11-15 11:00:23'),
(3, 8, 28, '2025-11-15 11:00:25', '2025-11-15 11:00:25'),
(4, 8, 26, '2025-11-15 11:00:26', '2025-11-15 11:00:26');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cart_items`
--
ALTER TABLE `cart_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cart_items_user_id_foreign` (`user_id`),
  ADD KEY `cart_items_product_id_foreign` (`product_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `categories_name_unique` (`name`),
  ADD UNIQUE KEY `categories_slug_unique` (`slug`);

--
-- Indexes for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `chat_messages_user_id_foreign` (`user_id`),
  ADD KEY `chat_messages_guest_token_index` (`guest_token`);

--
-- Indexes for table `contacts`
--
ALTER TABLE `contacts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `coupons`
--
ALTER TABLE `coupons`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `coupons_code_unique` (`code`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notifications_user_id_foreign` (`user_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `orders_user_id_foreign` (`user_id`),
  ADD KEY `orders_shipping_address_id_foreign` (`shipping_address_id`),
  ADD KEY `orders_coupon_id_foreign` (`coupon_id`),
  ADD KEY `orders_delivery_staff_id_foreign` (`delivery_staff_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_items_order_id_foreign` (`order_id`),
  ADD KEY `order_items_product_id_foreign` (`product_id`);

--
-- Indexes for table `order_status_history`
--
ALTER TABLE `order_status_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_status_history_order_id_foreign` (`order_id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`email`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `payments_order_id_foreign` (`order_id`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `permissions_name_unique` (`name`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `products_slug_unique` (`slug`),
  ADD KEY `products_category_id_foreign` (`category_id`);

--
-- Indexes for table `product_images`
--
ALTER TABLE `product_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_images_product_id_foreign` (`product_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reviews_user_id_foreign` (`user_id`),
  ADD KEY `reviews_product_id_foreign` (`product_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `roles_name_unique` (`name`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD KEY `role_permissions_role_id_foreign` (`role_id`),
  ADD KEY `role_permissions_permission_id_foreign` (`permission_id`);

--
-- Indexes for table `shipping_addresses`
--
ALTER TABLE `shipping_addresses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `shipping_addresses_user_id_foreign` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`),
  ADD KEY `users_role_id_foreign` (`role_id`);

--
-- Indexes for table `wishlists`
--
ALTER TABLE `wishlists`
  ADD PRIMARY KEY (`id`),
  ADD KEY `wishlists_user_id_foreign` (`user_id`),
  ADD KEY `wishlists_product_id_foreign` (`product_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cart_items`
--
ALTER TABLE `cart_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `chat_messages`
--
ALTER TABLE `chat_messages`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=73;

--
-- AUTO_INCREMENT for table `contacts`
--
ALTER TABLE `contacts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `coupons`
--
ALTER TABLE `coupons`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `order_status_history`
--
ALTER TABLE `order_status_history`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `shipping_addresses`
--
ALTER TABLE `shipping_addresses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `wishlists`
--
ALTER TABLE `wishlists`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cart_items`
--
ALTER TABLE `cart_items`
  ADD CONSTRAINT `cart_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `cart_items_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD CONSTRAINT `chat_messages_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_coupon_id_foreign` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `orders_delivery_staff_id_foreign` FOREIGN KEY (`delivery_staff_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `orders_shipping_address_id_foreign` FOREIGN KEY (`shipping_address_id`) REFERENCES `shipping_addresses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `orders_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `order_status_history`
--
ALTER TABLE `order_status_history`
  ADD CONSTRAINT `order_status_history_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_images`
--
ALTER TABLE `product_images`
  ADD CONSTRAINT `product_images_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reviews_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `shipping_addresses`
--
ALTER TABLE `shipping_addresses`
  ADD CONSTRAINT `shipping_addresses_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `wishlists`
--
ALTER TABLE `wishlists`
  ADD CONSTRAINT `wishlists_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `wishlists_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
