package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.response.role.RoleResponse;
import com.agri.ecommerce.entity.RoleEntity;
import com.agri.ecommerce.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.RoleMapper;
import com.agri.ecommerce.repository.RoleRepository;
import com.agri.ecommerce.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;

    private final RoleMapper roleMapper;

    @Override
    @Transactional(readOnly = true)
    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAll(Sort.by(Sort.Direction.ASC, "id"))
                .stream()
                .map(roleMapper::toRoleResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public RoleResponse getRoleById(Long id) {
        RoleEntity role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy vai trò với id: " + id));

        return roleMapper.toRoleResponse(role);
    }
}