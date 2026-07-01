package com.agri.ecommerce.ai;

import java.util.Locale;

public enum AiChatRole {
    GUEST,
    CUSTOMER,
    DELIVERY,
    ADMIN,
    STAFF;

    public static AiChatRole fromAudience(String audience) {
        if (audience == null || audience.isBlank()) {
            return GUEST;
        }

        return switch (audience.trim().toLowerCase(Locale.ROOT)) {
            case "admin", "administrator" -> ADMIN;
            case "staff", "support" -> STAFF;
            case "delivery", "delivery_staff", "shipper" -> DELIVERY;
            case "customer", "user" -> CUSTOMER;
            default -> GUEST;
        };
    }

    public boolean canSeeAdminContext() {
        return this == ADMIN || this == STAFF;
    }
}
