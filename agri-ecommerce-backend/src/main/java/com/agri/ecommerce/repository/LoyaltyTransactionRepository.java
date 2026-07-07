package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.LoyaltyTransactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoyaltyTransactionRepository extends JpaRepository<LoyaltyTransactionEntity, Long> {
    List<LoyaltyTransactionEntity> findByUser_IdOrderByCreatedAtDesc(Long userId);
}
