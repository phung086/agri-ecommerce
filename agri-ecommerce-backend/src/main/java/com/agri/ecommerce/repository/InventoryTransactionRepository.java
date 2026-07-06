package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.InventoryTransactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransactionEntity, Long>, JpaSpecificationExecutor<InventoryTransactionEntity> {
    List<InventoryTransactionEntity> findByProductId(Long productId);
    List<InventoryTransactionEntity> findByBatchId(Long batchId);
}
