package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.UserEntity;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    @Override
    @EntityGraph(attributePaths = {"role", "role.permissions"})
    Optional<UserEntity> findById(Long id);

    Optional<UserEntity> findByEmail(String email);

    boolean existsByEmail(String email);

    @EntityGraph(attributePaths = "role")
    List<UserEntity> findByRole_NameAndStatus(String roleName, com.agri.ecommerce.entity.UserStatus status, Sort sort);
}
