package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.response.permission.PermissionResponse;

import java.util.List;

public interface PermissionService {

    List<PermissionResponse> getAllPermissions();

    PermissionResponse getPermissionById(Long id);
}