package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.response.role.RoleResponse;

import java.util.List;

public interface RoleService {

    List<RoleResponse> getAllRoles();

    RoleResponse getRoleById(Long id);
}