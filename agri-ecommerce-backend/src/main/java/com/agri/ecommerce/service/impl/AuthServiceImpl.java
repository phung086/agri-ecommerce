package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.auth.LoginRequest;
import com.agri.ecommerce.dto.request.auth.RegisterRequest;
import com.agri.ecommerce.dto.response.auth.AuthResponse;
import com.agri.ecommerce.dto.response.user.UserResponse;
import com.agri.ecommerce.entity.RoleEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.entity.UserStatus;
import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.UserMapper;
import com.agri.ecommerce.repository.RoleRepository;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.security.JwtTokenProvider;
import com.agri.ecommerce.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final String CUSTOMER_ROLE = "customer";

    private final UserRepository userRepository;

    private final RoleRepository roleRepository;

    private final PasswordEncoder passwordEncoder;

    private final JwtTokenProvider jwtTokenProvider;

    private final UserMapper userMapper;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email đã được sử dụng");
        }

        RoleEntity customerRole = roleRepository.findByName(CUSTOMER_ROLE)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy role customer trong database"));

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

        return buildAuthResponse(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());

        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Email hoặc mật khẩu không đúng"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Email hoặc mật khẩu không đúng");
        }

        if (user.getStatus() != UserStatus.active) {
            throw new BadRequestException("Tài khoản chưa được kích hoạt hoặc đã bị khóa");
        }

        return buildAuthResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

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