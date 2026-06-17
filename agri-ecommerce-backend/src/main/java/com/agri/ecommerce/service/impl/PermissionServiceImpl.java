package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.response.permission.PermissionResponse;
import com.agri.ecommerce.entity.PermissionEntity;
import com.agri.ecommerce.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.PermissionMapper;
import com.agri.ecommerce.repository.PermissionRepository;
import com.agri.ecommerce.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionServiceImpl implements PermissionService {

    private final PermissionRepository permissionRepository;

    private final PermissionMapper permissionMapper;

    @Override
    @Transactional(readOnly = true)
    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAll(Sort.by(Sort.Direction.ASC, "id"))
                .stream()
                .map(permissionMapper::toPermissionResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PermissionResponse getPermissionById(Long id) {
        PermissionEntity permission = permissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy quyền với id: " + id));

        return permissionMapper.toPermissionResponse(permission);
    }
}