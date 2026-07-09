package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.UserEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    @Override
    @EntityGraph(attributePaths = {"role", "role.permissions"})
    Optional<UserEntity> findById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select userEntity from UserEntity userEntity where userEntity.id = :id")
    Optional<UserEntity> findByIdForUpdate(@Param("id") Long id);

    Optional<UserEntity> findByEmail(String email);

    Optional<UserEntity> findFirstByPhoneNumberOrderByIdAsc(String phoneNumber);

    boolean existsByEmail(String email);

    @EntityGraph(attributePaths = "role")
    List<UserEntity> findByRole_NameAndStatus(String roleName, com.agri.ecommerce.entity.UserStatus status, Sort sort);

    long countByRole_Name(String roleName);

    long countByRole_NameAndStatus(String roleName, com.agri.ecommerce.entity.UserStatus status);
}
