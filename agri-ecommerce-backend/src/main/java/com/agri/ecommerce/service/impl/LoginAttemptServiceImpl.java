package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.service.LoginAttemptService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptServiceImpl implements LoginAttemptService {

    private final Map<String, LoginAttemptState> attemptsByEmail = new ConcurrentHashMap<>();

    @Value("${app.security.login.max-failed-attempts:5}")
    private int maxFailedAttempts;

    @Value("${app.security.login.lock-minutes:15}")
    private long lockMinutes;

    @Value("${app.security.login.window-minutes:15}")
    private long windowMinutes;

    @Override
    public void assertNotBlocked(String email) {
        String key = normalizeKey(email);
        if (key == null) {
            return;
        }

        LoginAttemptState state = attemptsByEmail.get(key);
        if (state == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        if (state.lockedUntil() != null && state.lockedUntil().isAfter(now)) {
            throw new BadRequestException("Too many failed login attempts. Please try again later.");
        }

        if (state.firstFailedAt().plusMinutes(windowMinutes).isBefore(now)) {
            attemptsByEmail.remove(key);
        }
    }

    @Override
    public void recordFailure(String email) {
        String key = normalizeKey(email);
        if (key == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        attemptsByEmail.compute(key, (ignoredKey, currentState) -> {
            if (currentState == null || currentState.firstFailedAt().plusMinutes(windowMinutes).isBefore(now)) {
                return new LoginAttemptState(1, now, null);
            }

            int failedAttempts = currentState.failedAttempts() + 1;
            LocalDateTime lockedUntil = failedAttempts >= maxFailedAttempts ? now.plusMinutes(lockMinutes) : null;
            return new LoginAttemptState(failedAttempts, currentState.firstFailedAt(), lockedUntil);
        });
    }

    @Override
    public void clear(String email) {
        String key = normalizeKey(email);
        if (key != null) {
            attemptsByEmail.remove(key);
        }
    }

    private String normalizeKey(String email) {
        if (email == null || email.trim().isBlank()) {
            return null;
        }

        return email.trim().toLowerCase();
    }

    private record LoginAttemptState(int failedAttempts, LocalDateTime firstFailedAt, LocalDateTime lockedUntil) {
    }
}
