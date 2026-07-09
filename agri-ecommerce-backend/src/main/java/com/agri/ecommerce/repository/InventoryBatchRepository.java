package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.InventoryBatchEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryBatchRepository extends JpaRepository<InventoryBatchEntity, Long>, JpaSpecificationExecutor<InventoryBatchEntity> {

    boolean existsByBatchNumberIgnoreCase(String batchNumber);

    boolean existsByProduct_Id(Long productId);

    List<InventoryBatchEntity> findByProduct_IdOrderByExpiryDateAscCreatedAtAsc(Long productId);

    List<InventoryBatchEntity> findByProduct_Id(Long productId, Sort sort);

    List<InventoryBatchEntity> findByStatusIn(Collection<String> statuses, Sort sort);

    List<InventoryBatchEntity> findByProduct_IdAndStatusIn(Long productId, Collection<String> statuses, Sort sort);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select batch from InventoryBatchEntity batch where batch.id = :id")
    Optional<InventoryBatchEntity> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT b FROM InventoryBatchEntity b WHERE b.product.id = :productId AND b.remainingQuantity > 0 AND (b.expiryDate IS NULL OR b.expiryDate > :now) ORDER BY CASE WHEN b.expiryDate IS NULL THEN 1 ELSE 0 END, b.expiryDate ASC, b.createdAt ASC")
    List<InventoryBatchEntity> findAvailableBatchesFefo(@Param("productId") Long productId, @Param("now") LocalDateTime now);

    @Query("SELECT b FROM InventoryBatchEntity b WHERE b.product.id = :productId AND b.remainingQuantity > 0 AND b.expiryDate > :now ORDER BY b.expiryDate ASC")
    List<InventoryBatchEntity> findAvailableBatchesFifo(@Param("productId") Long productId, @Param("now") LocalDateTime now);

    @Query("SELECT b FROM InventoryBatchEntity b WHERE b.expiryDate < :now AND b.remainingQuantity > 0")
    List<InventoryBatchEntity> findExpiredBatchesWithStock(@Param("now") LocalDateTime now);

    @Query("SELECT b FROM InventoryBatchEntity b WHERE b.product.id = :productId AND b.expiryDate > :now AND b.expiryDate <= :nearExpiryThreshold AND b.remainingQuantity > 0 ORDER BY b.expiryDate ASC")
    List<InventoryBatchEntity> findNearExpiryBatches(@Param("productId") Long productId, @Param("now") LocalDateTime now, @Param("nearExpiryThreshold") LocalDateTime nearExpiryThreshold);
}
