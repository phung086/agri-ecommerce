package com.agri.ecommerce.dto.response.role;

import com.agri.ecommerce.dto.response.permission.PermissionResponse;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class RoleResponse {

    private Long id;

    private String name;

    private List<PermissionResponse> permissions;
}