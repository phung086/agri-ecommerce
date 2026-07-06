package com.agri.ecommerce.controller.auth;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.GlobalExceptionHandler;
import com.agri.ecommerce.dto.request.auth.LoginRequest;
import com.agri.ecommerce.dto.request.auth.RegisterRequest;
import com.agri.ecommerce.dto.response.auth.AuthResponse;
import com.agri.ecommerce.dto.response.user.UserResponse;
import com.agri.ecommerce.service.AuthService;
import com.agri.ecommerce.testsupport.ControllerTestSecurityConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({ControllerTestSecurityConfig.class, GlobalExceptionHandler.class})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private AuthService authService;

    @Test
    void login_withValidCredentials_returns200WithToken() throws Exception {
        // Given
        LoginRequest request = loginRequest("user@test.com", "Secret123");
        when(authService.login(any(LoginRequest.class))).thenReturn(authResponse());

        // When / Then
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("jwt-token"));
    }

    @Test
    void login_withInvalidCredentials_returns401() throws Exception {
        // Given
        LoginRequest request = loginRequest("user@test.com", "wrong-password");
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new BadRequestException("Email or password is incorrect"));

        // When / Then
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void login_withMissingFields_returns400() throws Exception {
        // Given
        LoginRequest request = new LoginRequest();

        // When / Then
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void register_withDuplicateEmail_returns409() throws Exception {
        // Given
        RegisterRequest request = registerRequest();
        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new BadRequestException("Email is already used"));

        // When / Then
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void register_withValidData_returns201() throws Exception {
        // Given
        RegisterRequest request = registerRequest();
        when(authService.register(any(RegisterRequest.class))).thenReturn(authResponse());

        // When / Then
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"));
    }

    private LoginRequest loginRequest(String email, String password) {
        LoginRequest request = new LoginRequest();
        request.setEmail(email);
        request.setPassword(password);
        return request;
    }

    private RegisterRequest registerRequest() {
        RegisterRequest request = new RegisterRequest();
        request.setName("Test User");
        request.setEmail("user@test.com");
        request.setPassword("Secret123");
        request.setPhoneNumber("0987654321");
        request.setAddress("Hanoi");
        return request;
    }

    private AuthResponse authResponse() {
        return AuthResponse.builder()
                .accessToken("jwt-token")
                .tokenType("Bearer")
                .expiresIn(86400000L)
                .user(UserResponse.builder().id(1L).email("user@test.com").build())
                .build();
    }
}
