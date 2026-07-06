package com.agri.ecommerce.testsupport;

import com.agri.ecommerce.security.CustomUserDetailsService;
import com.agri.ecommerce.security.JwtTokenProvider;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

import static org.mockito.Mockito.mock;

@TestConfiguration
@EnableMethodSecurity
public class ControllerTestSecurityConfig {

    @Bean
    SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) -> response.sendError(401))
                        .accessDeniedHandler((request, response, accessDeniedException) -> response.sendError(403))
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/auth/forgot-password",
                                "/api/auth/reset-password",
                                "/api/public/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .build();
    }

    @Bean
    JwtTokenProvider jwtTokenProvider() {
        return mock(JwtTokenProvider.class);
    }

    @Bean
    CustomUserDetailsService customUserDetailsService() {
        return mock(CustomUserDetailsService.class);
    }
}
