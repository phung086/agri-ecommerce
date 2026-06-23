package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.NotificationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long>, JpaSpecificationExecutor<NotificationEntity> {

    @Override
    @EntityGraph(attributePaths = "user")
    Page<NotificationEntity> findAll(org.springframework.data.jpa.domain.Specification<NotificationEntity> specification, Pageable pageable);

    @EntityGraph(attributePaths = "user")
    Optional<NotificationEntity> findByIdAndUser_Id(Long id, Long userId);

    long countByUser_IdAndReadFalse(Long userId);

    @Modifying
    @Query("update NotificationEntity notification set notification.read = true, notification.updatedAt = current_timestamp where notification.user.id = :userId and notification.read = false")
    int markAllAsReadByUserId(@Param("userId") Long userId);

    void deleteByUser_Id(Long userId);
}
