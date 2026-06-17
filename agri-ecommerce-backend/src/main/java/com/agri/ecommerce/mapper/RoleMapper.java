package com.agri.ecommerce.mapper;

import com.agri.ecommerce.dto.response.permission.PermissionResponse;
import com.agri.ecommerce.dto.response.role.RoleResponse;
import com.agri.ecommerce.entity.RoleEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

@Component
@RequiredArgsConstructor
public class RoleMapper {

    private final PermissionMapper permissionMapper;

    public RoleResponse toRoleResponse(RoleEntity role) {
        List<PermissionResponse> permissions = role.getPermissions() == null
                ? List.of()
                : role.getPermissions()
                .stream()
                .sorted(Comparator.comparing(permission -> permission.getId() == null ? 0L : permission.getId()))
                .map(permissionMapper::toPermissionResponse)
                .toList();

        return RoleResponse.builder()
                .id(role.getId())
                .name(role.getName())
                .permissions(permissions)
                .build();
    }
}