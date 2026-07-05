package com.agri.ecommerce.service;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.dto.request.auth.LoginRequest;
import com.agri.ecommerce.dto.request.auth.RegisterRequest;
import com.agri.ecommerce.dto.response.auth.AuthResponse;
import com.agri.ecommerce.dto.response.user.UserResponse;
import com.agri.ecommerce.entity.RoleEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.entity.UserStatus;
import com.agri.ecommerce.mapper.UserMapper;
import com.agri.ecommerce.repository.PasswordResetTokenRepository;
import com.agri.ecommerce.repository.RoleRepository;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.security.JwtTokenProvider;
import com.agri.ecommerce.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private LoginAttemptService loginAttemptService;

    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private AuthServiceImpl authService;

    @Test
    void register_whenEmailAlreadyExists_shouldThrowException() {
        // Given
        RegisterRequest request = registerRequest("User@Test.com", "Secret123");
        when(userRepository.existsByEmail("user@test.com")).thenReturn(true);

        // When / Then
        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Email is already used");
        verify(userRepository, never()).save(any(UserEntity.class));
    }

    @Test
    void register_withValidData_shouldHashPasswordAndSave() {
        // Given
        RegisterRequest request = registerRequest(" User@Test.com ", "Secret123");
        RoleEntity role = RoleEntity.builder().id(2L).name("customer").build();
        UserResponse userResponse = UserResponse.builder().id(1L).email("user@test.com").build();
        when(userRepository.existsByEmail("user@test.com")).thenReturn(false);
        when(roleRepository.findByName("customer")).thenReturn(Optional.of(role));
        when(passwordEncoder.encode("Secret123")).thenReturn("encoded-password");
        when(userRepository.save(any(UserEntity.class))).thenAnswer(invocation -> {
            UserEntity user = invocation.getArgument(0);
            user.setId(1L);
            return user;
        });
        when(jwtTokenProvider.generateToken(1L, "user@test.com")).thenReturn("jwt-token");
        when(jwtTokenProvider.getExpirationMs()).thenReturn(86400000L);
        when(userMapper.toUserResponse(any(UserEntity.class))).thenReturn(userResponse);

        // When
        AuthResponse response = authService.register(request);

        // Then
        assertThat(response.getAccessToken()).isEqualTo("jwt-token");
        assertThat(response.getTokenType()).isEqualTo("Bearer");
        verify(passwordEncoder).encode("Secret123");
        verify(userRepository).save(any(UserEntity.class));
        verify(loginAttemptService).clear("user@test.com");
    }

    @Test
    void login_whenUserNotFound_shouldThrowException() {
        // Given
        LoginRequest request = loginRequest("missing@test.com", "Secret123");
        when(userRepository.findByEmail("missing@test.com")).thenReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Email or password is incorrect");
        verify(loginAttemptService).recordFailure("missing@test.com");
    }

    @Test
    void login_whenWrongPassword_shouldThrowException() {
        // Given
        LoginRequest request = loginRequest("user@test.com", "bad-password");
        UserEntity user = user("user@test.com", UserStatus.active);
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("bad-password", "encoded-password")).thenReturn(false);

        // When / Then
        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Email or password is incorrect");
        verify(loginAttemptService).recordFailure("user@test.com");
    }

    @Test
    void login_whenAccountLocked_shouldThrowException() {
        // Given
        LoginRequest request = loginRequest("user@test.com", "Secret123");
        UserEntity user = user("user@test.com", UserStatus.banned);
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Secret123", "encoded-password")).thenReturn(true);

        // When / Then
        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Account is not active");
        verify(loginAttemptService).recordFailure("user@test.com");
    }

    @Test
    void login_withValidCredentials_shouldReturnToken() {
        // Given
        LoginRequest request = loginRequest(" User@Test.com ", "Secret123");
        UserEntity user = user("user@test.com", UserStatus.active);
        UserResponse userResponse = UserResponse.builder().id(1L).email("user@test.com").build();
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Secret123", "encoded-password")).thenReturn(true);
        when(jwtTokenProvider.generateToken(1L, "user@test.com")).thenReturn("jwt-token");
        when(jwtTokenProvider.getExpirationMs()).thenReturn(86400000L);
        when(userMapper.toUserResponse(user)).thenReturn(userResponse);

        // When
        AuthResponse response = authService.login(request);

        // Then
        assertThat(response.getAccessToken()).isEqualTo("jwt-token");
        assertThat(response.getUser().getEmail()).isEqualTo("user@test.com");
        verify(loginAttemptService).clear("user@test.com");
    }

    private RegisterRequest registerRequest(String email, String password) {
        RegisterRequest request = new RegisterRequest();
        request.setName("Test User");
        request.setEmail(email);
        request.setPassword(password);
        request.setPhoneNumber("0987654321");
        request.setAddress("Hanoi");
        return request;
    }

    private LoginRequest loginRequest(String email, String password) {
        LoginRequest request = new LoginRequest();
        request.setEmail(email);
        request.setPassword(password);
        return request;
    }

    private UserEntity user(String email, UserStatus status) {
        return UserEntity.builder()
                .id(1L)
                .name("Test User")
                .email(email)
                .password("encoded-password")
                .status(status)
                .role(RoleEntity.builder().id(2L).name("customer").build())
                .build();
    }
}
