package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.dto.request.auth.ForgotPasswordRequest;
import com.agri.ecommerce.dto.request.auth.LoginRequest;
import com.agri.ecommerce.dto.request.auth.RegisterRequest;
import com.agri.ecommerce.dto.request.auth.ResetPasswordRequest;
import com.agri.ecommerce.dto.response.auth.AuthResponse;
import com.agri.ecommerce.dto.response.auth.PasswordResetResponse;
import com.agri.ecommerce.dto.response.user.UserResponse;
import com.agri.ecommerce.entity.PasswordResetTokenEntity;
import com.agri.ecommerce.entity.RoleEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.entity.UserStatus;
import com.agri.ecommerce.mapper.UserMapper;
import com.agri.ecommerce.repository.PasswordResetTokenRepository;
import com.agri.ecommerce.repository.RoleRepository;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.security.JwtTokenProvider;
import com.agri.ecommerce.service.AuthService;
import com.agri.ecommerce.service.LoginAttemptService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final String CUSTOMER_ROLE = "customer";
    private static final String INVALID_LOGIN_MESSAGE = "Email or password is incorrect";
    private static final String GENERIC_RESET_MESSAGE = "If the email exists, password reset instructions are ready.";
    private static final String RESET_TOKEN_DIGEST_ALGORITHM = "SHA-256";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;

    private final RoleRepository roleRepository;

    private final PasswordResetTokenRepository passwordResetTokenRepository;

    private final PasswordEncoder passwordEncoder;

    private final JwtTokenProvider jwtTokenProvider;

    private final LoginAttemptService loginAttemptService;

    private final UserMapper userMapper;

    @Value("${app.auth.password-reset.expiration-minutes:30}")
    private long passwordResetExpirationMinutes;

    @Value("${app.auth.password-reset.expose-token:true}")
    private boolean exposePasswordResetToken;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email is already used");
        }

        RoleEntity customerRole = roleRepository.findByName(CUSTOMER_ROLE)
                .orElseThrow(() -> new ResourceNotFoundException("Customer role was not found in database"));

        UserEntity user = UserEntity.builder()
                .name(request.getName().trim())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .status(UserStatus.active)
                .phoneNumber(cleanBlank(request.getPhoneNumber()))
                .address(cleanBlank(request.getAddress()))
                .role(customerRole)
                .build();

        UserEntity savedUser = userRepository.save(user);
        loginAttemptService.clear(email);

        return buildAuthResponse(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        loginAttemptService.assertNotBlocked(email);

        Optional<UserEntity> userOptional = userRepository.findByEmail(email);
        if (userOptional.isEmpty()) {
            loginAttemptService.recordFailure(email);
            throw new BadRequestException(INVALID_LOGIN_MESSAGE);
        }

        UserEntity user = userOptional.get();
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            loginAttemptService.recordFailure(email);
            throw new BadRequestException(INVALID_LOGIN_MESSAGE);
        }

        if (user.getStatus() != UserStatus.active) {
            loginAttemptService.recordFailure(email);
            throw new BadRequestException("Account is not active or has been locked");
        }

        loginAttemptService.clear(email);
        return buildAuthResponse(user);
    }

    @Override
    @Transactional
    public PasswordResetResponse forgotPassword(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.getEmail());
        LocalDateTime now = LocalDateTime.now();
        deleteExpiredResetTokens(now);

        Optional<UserEntity> userOptional = userRepository.findByEmail(email);
        if (userOptional.isEmpty() || userOptional.get().getStatus() != UserStatus.active) {
            return buildForgotPasswordResponse(email, null, false);
        }

        String rawToken = generateRawResetToken();
        String tokenHash = hashResetToken(rawToken);

        passwordResetTokenRepository.save(PasswordResetTokenEntity.builder()
                .email(email)
                .token(tokenHash)
                .createdAt(now)
                .build());

        return buildForgotPasswordResponse(email, rawToken, exposePasswordResetToken);
    }

    @Override
    @Transactional
    public PasswordResetResponse resetPassword(ResetPasswordRequest request) {
        String email = normalizeEmail(request.getEmail());
        String rawToken = cleanRequiredToken(request.getToken());

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Password confirmation does not match");
        }

        PasswordResetTokenEntity resetToken = passwordResetTokenRepository.findById(email)
                .orElseThrow(() -> new BadRequestException("Reset token is invalid or expired"));

        if (isResetTokenExpired(resetToken, LocalDateTime.now())) {
            passwordResetTokenRepository.delete(resetToken);
            throw new BadRequestException("Reset token is invalid or expired");
        }

        if (!isSameTokenHash(resetToken.getToken(), hashResetToken(rawToken))) {
            throw new BadRequestException("Reset token is invalid or expired");
        }

        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Reset token is invalid or expired"));

        if (user.getStatus() != UserStatus.active) {
            throw new BadRequestException("Account is not active or has been locked");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        passwordResetTokenRepository.delete(resetToken);
        loginAttemptService.clear(email);

        return PasswordResetResponse.builder()
                .email(email)
                .expiresInMinutes(passwordResetExpirationMinutes)
                .tokenExposed(false)
                .message("Password has been reset successfully")
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User was not found"));

        return userMapper.toUserResponse(user);
    }

    private AuthResponse buildAuthResponse(UserEntity user) {
        String accessToken = jwtTokenProvider.generateToken(user.getId(), user.getEmail());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getExpirationMs())
                .user(userMapper.toUserResponse(user))
                .build();
    }

    private PasswordResetResponse buildForgotPasswordResponse(String email, String rawToken, boolean tokenExposed) {
        return PasswordResetResponse.builder()
                .email(email)
                .resetToken(tokenExposed ? rawToken : null)
                .expiresInMinutes(passwordResetExpirationMinutes)
                .tokenExposed(tokenExposed)
                .message(GENERIC_RESET_MESSAGE)
                .build();
    }

    private String generateRawResetToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashResetToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance(RESET_TOKEN_DIGEST_ALGORITHM);
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 algorithm is not available", exception);
        }
    }

    private boolean isSameTokenHash(String storedHash, String incomingHash) {
        return MessageDigest.isEqual(
                storedHash.getBytes(StandardCharsets.UTF_8),
                incomingHash.getBytes(StandardCharsets.UTF_8)
        );
    }

    private boolean isResetTokenExpired(PasswordResetTokenEntity resetToken, LocalDateTime now) {
        LocalDateTime createdAt = resetToken.getCreatedAt();
        return createdAt == null || createdAt.plusMinutes(passwordResetExpirationMinutes).isBefore(now);
    }

    private void deleteExpiredResetTokens(LocalDateTime now) {
        passwordResetTokenRepository.deleteByCreatedAtBefore(now.minusMinutes(passwordResetExpirationMinutes));
    }

    private String cleanRequiredToken(String token) {
        String cleanToken = cleanBlank(token);
        if (cleanToken == null) {
            throw new BadRequestException("Reset token must not be blank");
        }

        return cleanToken;
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }
}
