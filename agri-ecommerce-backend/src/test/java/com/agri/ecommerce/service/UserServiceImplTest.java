package com.agri.ecommerce.service;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.dto.request.user.UpdateProfileRequest;
import com.agri.ecommerce.dto.response.user.UserResponse;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.entity.UserStatus;
import com.agri.ecommerce.mapper.UserMapper;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.service.impl.UserServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserMapper userMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private LoyaltyService loyaltyService;

    @InjectMocks
    private UserServiceImpl userService;

    @Test
    void updateCurrentProfile_shouldNormalizeIdentityFields() {
        UserEntity user = UserEntity.builder()
                .id(1L)
                .name("Old name")
                .email("old@example.com")
                .status(UserStatus.active)
                .build();
        UpdateProfileRequest request = profileRequest(" New Name ", " NEW@EXAMPLE.COM ", "+84987654321");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.existsByEmailAndIdNot("new@example.com", 1L)).thenReturn(false);
        when(userRepository.save(any(UserEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userMapper.toUserResponse(any(UserEntity.class)))
                .thenReturn(UserResponse.builder().id(1L).build());

        userService.updateCurrentProfile(1L, request);

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("New Name");
        assertThat(captor.getValue().getEmail()).isEqualTo("new@example.com");
        assertThat(captor.getValue().getPhoneNumber()).isEqualTo("0987654321");
    }

    @Test
    void updateCurrentProfile_withInvalidEmail_shouldRejectBeforeSaving() {
        UserEntity user = UserEntity.builder()
                .id(1L)
                .email("old@example.com")
                .status(UserStatus.active)
                .build();
        UpdateProfileRequest request = profileRequest("Valid Name", "invalid-email", "0987654321");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.updateCurrentProfile(1L, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Email");
        verify(userRepository, never()).save(any(UserEntity.class));
    }

    @Test
    void updateCurrentProfile_withInvalidPhone_shouldRejectBeforeSaving() {
        UserEntity user = UserEntity.builder()
                .id(1L)
                .email("old@example.com")
                .status(UserStatus.active)
                .build();
        UpdateProfileRequest request = profileRequest("Valid Name", "old@example.com", "0123");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.updateCurrentProfile(1L, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Số điện thoại");
        verify(userRepository, never()).save(any(UserEntity.class));
    }

    private UpdateProfileRequest profileRequest(String name, String email, String phone) {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setName(name);
        request.setEmail(email);
        request.setPhoneNumber(phone);
        request.setAddress("Hà Nội");
        return request;
    }
}
