package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.PasswordResetTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, String> {
}