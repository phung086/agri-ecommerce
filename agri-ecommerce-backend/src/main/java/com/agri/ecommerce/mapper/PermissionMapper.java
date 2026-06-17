package com.agri.ecommerce.mapper;

import com.agri.ecommerce.dto.response.permission.PermissionResponse;
import com.agri.ecommerce.entity.PermissionEntity;
import org.springframework.stereotype.Component;

@Component
public class PermissionMapper {

    public PermissionResponse toPermissionResponse(PermissionEntity permission) {
        return PermissionResponse.builder()
                .id(permission.getId())
                .name(permission.getName())
                .build();
    }
}