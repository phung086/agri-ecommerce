package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.user.UpdateProfileRequest;
import com.agri.ecommerce.dto.request.user.UpdateUserStatusRequest;
import com.agri.ecommerce.dto.response.user.UserResponse;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.entity.UserStatus;
import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.UserMapper;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.agri.ecommerce.dto.request.user.ChangePasswordRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.agri.ecommerce.service.LoyaltyService;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final Pattern VIETNAM_PHONE_PATTERN = Pattern.compile("^(0[2-9][0-9]{8}|84[2-9][0-9]{8}|\\+84[2-9][0-9]{8})$");

    private final UserRepository userRepository;

    private final UserMapper userMapper;

    private final PasswordEncoder passwordEncoder;

    private final LoyaltyService loyaltyService;

    @Override
    @Transactional
    public UserResponse getCurrentProfile(Long userId) {
        // Tự động quét và cập nhật lại hạng thành viên dựa trên chi tiêu tích lũy trước khi trả về dữ liệu profile
        try {
            loyaltyService.recalculateMembershipTier(userId);
        } catch (Exception ex) {
            log.warn("Không thể cập nhật hạng thành viên cho userId={}", userId, ex);
        }
        UserEntity user = findUserById(userId);
        return userMapper.toUserResponse(user);
    }

    @Override
    @Transactional
    public UserResponse updateCurrentProfile(Long userId, UpdateProfileRequest request) {
        UserEntity user = findUserById(userId);

        String nextEmail = normalizeEmail(request.getEmail());
        if (nextEmail != null && !EMAIL_PATTERN.matcher(nextEmail).matches()) {
            throw new BadRequestException("Email phải đúng định dạng, ví dụ customer@example.com");
        }
        if (nextEmail != null && !nextEmail.equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmailAndIdNot(nextEmail, userId)) {
                throw new BadRequestException("Email đã được sử dụng bởi tài khoản khác");
            }
            user.setEmail(nextEmail);
        }

        user.setName(request.getName().trim());
        user.setPhoneNumber(normalizeOptionalVietnamPhone(request.getPhoneNumber()));
        user.setAddress(cleanBlank(request.getAddress()));
        user.setAvatar(cleanBlank(request.getAvatar()));

        UserEntity savedUser = userRepository.save(user);

        return userMapper.toUserResponse(savedUser);
    }

    @Override
    @Transactional
    public UserResponse updateCurrentProfileAvatar(Long userId, String avatarPath) {
        UserEntity user = findUserById(userId);

        user.setAvatar(cleanBlank(avatarPath));

        UserEntity savedUser = userRepository.save(user);

        return userMapper.toUserResponse(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(userMapper::toUserResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        UserEntity user = findUserById(id);
        return userMapper.toUserResponse(user);
    }
    @Override
    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        UserEntity user = findUserById(userId);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu hiện tại không đúng");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Xác nhận mật khẩu mới không khớp");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu mới không được trùng với mật khẩu hiện tại");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));

        userRepository.save(user);
    }
    @Override
    @Transactional
    public UserResponse updateUserStatus(Long id, UpdateUserStatusRequest request) {
        UserEntity user = findUserById(id);
        UserStatus status = parseStatus(request.getStatus());

        user.setStatus(status);

        UserEntity savedUser = userRepository.save(user);

        return userMapper.toUserResponse(savedUser);
    }

    private UserEntity findUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với id: " + id));
    }

    private UserStatus parseStatus(String status) {
        try {
            return UserStatus.valueOf(status.trim().toLowerCase());
        } catch (Exception exception) {
            throw new BadRequestException("Trạng thái người dùng không hợp lệ. Giá trị hợp lệ: pending, active, banned, deleted");
        }
    }

    private String normalizeEmail(String value) {
        String email = cleanBlank(value);
        return email == null ? null : email.toLowerCase(Locale.ROOT);
    }

    private String normalizeOptionalVietnamPhone(String value) {
        String phone = cleanBlank(value);
        if (phone == null) {
            return null;
        }

        String compactPhone = phone.replaceAll("[\\s.-]", "");
        if (!VIETNAM_PHONE_PATTERN.matcher(compactPhone).matches()) {
            throw new BadRequestException("Số điện thoại phải đúng đầu số Việt Nam, ví dụ 0987654321 hoặc +84987654321");
        }

        if (compactPhone.startsWith("+84")) {
            return "0" + compactPhone.substring(3);
        }
        if (compactPhone.startsWith("84")) {
            return "0" + compactPhone.substring(2);
        }
        return compactPhone;
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }
}
