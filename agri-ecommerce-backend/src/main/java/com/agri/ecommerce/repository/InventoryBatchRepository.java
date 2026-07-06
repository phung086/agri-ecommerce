package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.InventoryBatchEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface InventoryBatchRepository extends JpaRepository<InventoryBatchEntity, Long>, JpaSpecificationExecutor<InventoryBatchEntity> {

    @Query("SELECT b FROM InventoryBatchEntity b WHERE b.product.id = :productId AND b.remainingQuantity > 0 AND b.expiryDate > :now ORDER BY b.expiryDate ASC")
    List<InventoryBatchEntity> findAvailableBatchesFifo(@Param("productId") Long productId, @Param("now") LocalDateTime now);

    @Query("SELECT b FROM InventoryBatchEntity b WHERE b.expiryDate < :now AND b.remainingQuantity > 0")
    List<InventoryBatchEntity> findExpiredBatchesWithStock(@Param("now") LocalDateTime now);

    @Query("SELECT b FROM InventoryBatchEntity b WHERE b.product.id = :productId AND b.expiryDate > :now AND b.expiryDate <= :nearExpiryThreshold AND b.remainingQuantity > 0 ORDER BY b.expiryDate ASC")
    List<InventoryBatchEntity> findNearExpiryBatches(@Param("productId") Long productId, @Param("now") LocalDateTime now, @Param("nearExpiryThreshold") LocalDateTime nearExpiryThreshold);
}
