package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.user.ChangePasswordRequest;
import com.agri.ecommerce.dto.request.user.UpdateProfileRequest;
import com.agri.ecommerce.dto.request.user.UpdateUserStatusRequest;
import com.agri.ecommerce.dto.response.user.UserResponse;

import java.util.List;

public interface UserService {

    UserResponse getCurrentProfile(Long userId);

    UserResponse updateCurrentProfile(Long userId, UpdateProfileRequest request);

    void changePassword(Long userId, ChangePasswordRequest request);

    List<UserResponse> getAllUsers();

    UserResponse getUserById(Long id);

    UserResponse updateUserStatus(Long id, UpdateUserStatusRequest request);
}