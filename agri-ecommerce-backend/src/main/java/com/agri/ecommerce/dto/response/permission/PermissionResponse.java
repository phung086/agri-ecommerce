package com.agri.ecommerce.dto.response.permission;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class PermissionResponse {

    private Long id;

    private String name;
}