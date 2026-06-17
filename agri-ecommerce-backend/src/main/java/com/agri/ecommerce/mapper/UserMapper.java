package com.agri.ecommerce.mapper;

import com.agri.ecommerce.dto.response.user.UserResponse;
import com.agri.ecommerce.entity.RoleEntity;
import com.agri.ecommerce.entity.UserEntity;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserResponse toUserResponse(UserEntity user) {
        RoleEntity role = user.getRole();

        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .status(user.getStatus() == null ? null : user.getStatus().name())
                .phoneNumber(user.getPhoneNumber())
                .avatar(user.getAvatar())
                .address(user.getAddress())
                .roleId(role == null ? null : role.getId())
                .roleName(role == null ? null : role.getName())
                .build();
    }
}