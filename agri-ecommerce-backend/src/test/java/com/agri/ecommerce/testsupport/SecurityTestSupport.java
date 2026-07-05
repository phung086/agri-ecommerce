package com.agri.ecommerce.testsupport;

import com.agri.ecommerce.entity.UserStatus;
import com.agri.ecommerce.security.UserPrincipal;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;

public final class SecurityTestSupport {

    private SecurityTestSupport() {
    }

    public static RequestPostProcessor userWithRole(Long userId, String role) {
        UserPrincipal principal = new UserPrincipal(
                userId,
                role.toLowerCase() + " user",
                role.toLowerCase() + "@test.com",
                "password",
                UserStatus.active,
                List.of(new SimpleGrantedAuthority("ROLE_" + role))
        );
        Authentication auth = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                principal.getAuthorities()
        );

        return authentication(auth);
    }
}
