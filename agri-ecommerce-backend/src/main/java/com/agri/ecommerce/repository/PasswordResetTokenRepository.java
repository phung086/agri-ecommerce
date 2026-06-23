package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.PasswordResetTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, String> {

    void deleteByCreatedAtBefore(LocalDateTime createdAt);
}
