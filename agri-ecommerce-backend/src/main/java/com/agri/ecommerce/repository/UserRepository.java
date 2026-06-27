package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.UserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long>, JpaSpecificationExecutor<UserEntity> {

    @Override
    @EntityGraph(attributePaths = {"role", "role.permissions"})
    Optional<UserEntity> findById(Long id);

    @Override
    @EntityGraph(attributePaths = "role")
    Page<UserEntity> findAll(Specification<UserEntity> specification, Pageable pageable);

    Optional<UserEntity> findByEmail(String email);

    boolean existsByEmail(String email);

    @EntityGraph(attributePaths = "role")
    List<UserEntity> findByRole_NameAndStatus(String roleName, com.agri.ecommerce.entity.UserStatus status, Sort sort);

    long countByRole_Name(String roleName);

    long countByRole_NameAndStatus(String roleName, com.agri.ecommerce.entity.UserStatus status);
}
