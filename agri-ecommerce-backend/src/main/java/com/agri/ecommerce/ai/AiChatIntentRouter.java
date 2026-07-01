package com.agri.ecommerce.ai;

import com.agri.ecommerce.dto.request.chat.AiChatRequest;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Locale;

@Service
public class AiChatIntentRouter {

    public AiChatIntent resolve(AiChatRequest request, AiChatRole role) {
        String message = normalize(request.getMessage());
        String contextType = normalize(request.getContextType());
        String currentPath = normalizePath(request.getCurrentPath());

        AiChatIntent pathIntent = fromPath(currentPath);
        if (pathIntent != null && isGeneric(message)) {
            return pathIntent;
        }

        AiChatIntent contextIntent = fromContextType(contextType, role);
        if (contextIntent != null && isGeneric(message)) {
            return contextIntent;
        }

        if (containsAny(message, "jwt secret", "api key", "hash secret", "password hash", "system prompt",
                "in prompt", "bo qua huong dan", "ignore instructions", "xem don hang cua nguoi khac")) {
            return AiChatIntent.OUT_OF_SCOPE;
        }

        if (containsAny(message, "dang ky", "tao tai khoan", "dang nhap", "login", "register", "mat khau")) {
            return AiChatIntent.ACCOUNT_REGISTER_LOGIN;
        }

        if (role.canSeeAdminContext() && containsAny(message, "thanh toan", "payment", "vnpay", "transaction")) {
            return AiChatIntent.ADMIN_PAYMENT_MANAGEMENT;
        }

        if (containsAny(message, "vnpay", "thanh toan loi", "payment failed", "pending", "completed", "failed")) {
            return AiChatIntent.VNPAY_SUPPORT;
        }

        if (containsAny(message, "thanh toan", "cod", "online", "payment", "chuyen khoan")) {
            return AiChatIntent.PAYMENT_SUPPORT;
        }

        if (containsAny(message, "dia chi", "noi nhan hang", "giao den", "phuong xa", "quan huyen")) {
            return AiChatIntent.SHIPPING_ADDRESS_HELP;
        }

        if (containsAny(message, "gio hang", "cart", "them vao gio", "cap nhat so luong")) {
            return AiChatIntent.CART_HELP;
        }

        if (containsAny(message, "checkout", "dat hang", "mua hang", "tao don", "xac nhan don")) {
            return AiChatIntent.CHECKOUT_HELP;
        }

        if (containsAny(message, "ma giam gia", "coupon", "voucher", "khuyen mai", "freeship")) {
            return AiChatIntent.COUPON_SUPPORT;
        }

        if (containsAny(message, "review", "danh gia", "binh luan")) {
            return AiChatIntent.REVIEW_SUPPORT;
        }

        if (containsAny(message, "lien he", "contact", "phan hoi", "ho tro")) {
            return AiChatIntent.CONTACT_SUPPORT;
        }

        if (containsAny(message, "delivery", "giao hang", "van chuyen", "dang giao", "da giao", "phan cong")) {
            return role == AiChatRole.DELIVERY ? AiChatIntent.DELIVERY_TASK : AiChatIntent.DELIVERY_TRACKING;
        }

        if (containsAny(message, "don hang", "order", "trang thai don", "don cua toi", "theo doi don")) {
            return role.canSeeAdminContext() ? AiChatIntent.ORDER_MANAGEMENT : AiChatIntent.ORDER_STATUS;
        }

        if (containsAny(message, "admin", "quan ly", "dashboard", "doanh thu", "bao cao")) {
            return adminIntentFromMessage(message, role);
        }

        if (containsAny(message, "danh muc", "category", "nhom hang")) {
            return role.canSeeAdminContext() ? AiChatIntent.ADMIN_CATEGORY_MANAGEMENT : AiChatIntent.CATEGORY_SEARCH;
        }

        if (containsAny(message, "san pham", "product", "rau", "cu", "qua", "ca", "thit", "gao", "gia", "ton kho")) {
            return role.canSeeAdminContext() ? AiChatIntent.ADMIN_PRODUCT_MANAGEMENT : AiChatIntent.PRODUCT_SEARCH;
        }

        if (pathIntent != null) {
            return pathIntent;
        }

        if (contextIntent != null) {
            return contextIntent;
        }

        return AiChatIntent.GENERAL_SYSTEM_HELP;
    }

    private AiChatIntent fromPath(String path) {
        if (path == null || path.isBlank()) {
            return null;
        }

        if (path.startsWith("/admin/categories")) return AiChatIntent.ADMIN_CATEGORY_MANAGEMENT;
        if (path.startsWith("/admin/products")) return AiChatIntent.ADMIN_PRODUCT_MANAGEMENT;
        if (path.startsWith("/admin/orders")) return AiChatIntent.ADMIN_ORDER_MANAGEMENT;
        if (path.startsWith("/admin/payments")) return AiChatIntent.ADMIN_PAYMENT_MANAGEMENT;
        if (path.startsWith("/admin/coupons")) return AiChatIntent.ADMIN_COUPON_MANAGEMENT;
        if (path.startsWith("/admin/contacts") || path.startsWith("/admin/reviews")) {
            return AiChatIntent.ADMIN_REVIEW_CONTACT_MANAGEMENT;
        }
        if (path.startsWith("/admin")) return AiChatIntent.ADMIN_DASHBOARD;
        if (path.startsWith("/delivery")) return AiChatIntent.DELIVERY_TASK;
        if (path.startsWith("/checkout")) return AiChatIntent.CHECKOUT_HELP;
        if (path.startsWith("/cart")) return AiChatIntent.CART_HELP;
        if (path.startsWith("/profile")) return AiChatIntent.ORDER_STATUS;
        if (path.startsWith("/products")) return AiChatIntent.PRODUCT_DETAIL_HELP;
        if (path.startsWith("/promotions")) return AiChatIntent.COUPON_SUPPORT;
        return null;
    }

    private AiChatIntent fromContextType(String contextType, AiChatRole role) {
        if (contextType == null || contextType.isBlank() || "auto".equals(contextType)) {
            return null;
        }

        return switch (contextType) {
            case "product" -> role.canSeeAdminContext() ? AiChatIntent.ADMIN_PRODUCT_MANAGEMENT : AiChatIntent.PRODUCT_SEARCH;
            case "order" -> role.canSeeAdminContext() ? AiChatIntent.ADMIN_ORDER_MANAGEMENT : AiChatIntent.ORDER_STATUS;
            case "payment" -> role.canSeeAdminContext() ? AiChatIntent.ADMIN_PAYMENT_MANAGEMENT : AiChatIntent.PAYMENT_SUPPORT;
            case "delivery" -> role == AiChatRole.DELIVERY ? AiChatIntent.DELIVERY_TASK : AiChatIntent.DELIVERY_TRACKING;
            case "admin" -> AiChatIntent.ADMIN_DASHBOARD;
            case "account" -> AiChatIntent.ACCOUNT_REGISTER_LOGIN;
            case "coupon" -> AiChatIntent.COUPON_SUPPORT;
            case "system_help" -> AiChatIntent.GENERAL_SYSTEM_HELP;
            default -> null;
        };
    }

    private AiChatIntent adminIntentFromMessage(String message, AiChatRole role) {
        if (!role.canSeeAdminContext()) {
            return AiChatIntent.GENERAL_SYSTEM_HELP;
        }
        if (containsAny(message, "danh muc", "category")) return AiChatIntent.ADMIN_CATEGORY_MANAGEMENT;
        if (containsAny(message, "san pham", "product", "ton kho")) return AiChatIntent.ADMIN_PRODUCT_MANAGEMENT;
        if (containsAny(message, "don hang", "order", "giao hang")) return AiChatIntent.ADMIN_ORDER_MANAGEMENT;
        if (containsAny(message, "thanh toan", "payment", "vnpay")) return AiChatIntent.ADMIN_PAYMENT_MANAGEMENT;
        if (containsAny(message, "coupon", "ma giam gia", "voucher")) return AiChatIntent.ADMIN_COUPON_MANAGEMENT;
        if (containsAny(message, "review", "danh gia", "contact", "lien he")) {
            return AiChatIntent.ADMIN_REVIEW_CONTACT_MANAGEMENT;
        }
        return AiChatIntent.ADMIN_DASHBOARD;
    }

    private boolean containsAny(String value, String... tokens) {
        if (value == null || value.isBlank()) {
            return false;
        }
        for (String token : tokens) {
            if (value.contains(normalize(token))) {
                return true;
            }
        }
        return false;
    }

    private boolean isGeneric(String message) {
        return message == null
                || message.isBlank()
                || containsAny(message, "huong dan", "lam sao", "o dau", "nhu the nao", "giup toi", "can ho tro");
    }

    private String normalizePath(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('\u0111', 'd')
                .replace('\u0110', 'D')
                .toLowerCase(Locale.ROOT);
        return normalized.replaceAll("[^a-z0-9/\\s_-]", " ").replaceAll("\\s+", " ").trim();
    }
}
