package com.agri.ecommerce.ai;

import com.agri.ecommerce.security.UserPrincipal;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class AiChatRoleResolver {

    public AiChatRole resolve(UserPrincipal principal, String requestedAudience) {
        if (principal == null) {
            return AiChatRole.fromAudience(requestedAudience);
        }

        boolean admin = hasAuthority(principal, "ROLE_ADMIN") || hasContainingAuthority(principal, "ADMIN");
        if (admin) {
            return AiChatRole.ADMIN;
        }

        boolean staff = hasAuthority(principal, "ROLE_STAFF") || hasContainingAuthority(principal, "STAFF");
        if (staff) {
            return AiChatRole.STAFF;
        }

        boolean delivery = hasAuthority(principal, "ROLE_DELIVERY")
                || hasAuthority(principal, "ROLE_DELIVERY_STAFF")
                || hasContainingAuthority(principal, "DELIVERY");
        if (delivery) {
            return AiChatRole.DELIVERY;
        }

        return AiChatRole.CUSTOMER;
    }

    private boolean hasAuthority(UserPrincipal principal, String expected) {
        return principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority -> expected.equalsIgnoreCase(authority));
    }

    private boolean hasContainingAuthority(UserPrincipal principal, String token) {
        String normalizedToken = token.toUpperCase(Locale.ROOT);
        return principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(authority -> authority.toUpperCase(Locale.ROOT))
                .anyMatch(authority -> authority.contains(normalizedToken));
    }
}
