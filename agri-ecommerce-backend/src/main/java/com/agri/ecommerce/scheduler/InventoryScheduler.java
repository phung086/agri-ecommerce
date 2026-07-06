package com.agri.ecommerce.scheduler;

import com.agri.ecommerce.entity.CouponEntity;
import com.agri.ecommerce.entity.InventoryBatchEntity;
import com.agri.ecommerce.entity.InventoryTransactionEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.repository.CouponRepository;
import com.agri.ecommerce.repository.InventoryBatchRepository;
import com.agri.ecommerce.repository.InventoryTransactionRepository;
import com.agri.ecommerce.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class InventoryScheduler {

    private final InventoryBatchRepository inventoryBatchRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final ProductRepository productRepository;
    private final CouponRepository couponRepository;

    @Scheduled(cron = "0 0 1 * * ?") // Runs every day at 1 AM
    @Transactional
    public void runDailyInventoryScan() {
        log.info("[Inventory Scheduler] Starting daily inventory scan at {}", LocalDateTime.now());
        scanExpiredBatches();
        scanNearExpiryBatchesAndCreateCoupons();
        log.info("[Inventory Scheduler] Daily inventory scan completed successfully.");
    }

    @Transactional
    public void scanExpiredBatches() {
        LocalDateTime now = LocalDateTime.now();
        List<InventoryBatchEntity> expiredBatches = inventoryBatchRepository.findExpiredBatchesWithStock(now);
        
        log.info("[Inventory Scheduler] Found {} expired batches with positive remaining quantity.", expiredBatches.size());
        
        for (InventoryBatchEntity batch : expiredBatches) {
            ProductEntity product = batch.getProduct();
            int expiredQty = batch.getRemainingQuantity();
            
            // 1. Zero out batch stock
            batch.setRemainingQuantity(0);
            inventoryBatchRepository.save(batch);
            
            // 2. Log expired transaction
            inventoryTransactionRepository.save(InventoryTransactionEntity.builder()
                    .product(product)
                    .batch(batch)
                    .quantity(-expiredQty)
                    .type("EXPORT_EXPIRED")
                    .note("Hủy hàng quá hạn sử dụng (Batch #" + batch.getBatchNumber() + ")")
                    .build());
            
            // 3. Deduct total product stock
            int currentStock = product.getStock() == null ? 0 : product.getStock();
            int updatedStock = Math.max(0, currentStock - expiredQty);
            product.setStock(updatedStock);
            if (updatedStock == 0) {
                product.setStatus("out_of_stock");
            }
            productRepository.save(product);
            
            log.info("[Inventory Scheduler] Cleared {} expired units of product '{}' (Batch #{})", 
                    expiredQty, product.getName(), batch.getBatchNumber());
        }
    }

    @Transactional
    public void scanNearExpiryBatchesAndCreateCoupons() {
        LocalDateTime now = LocalDateTime.now();
        // Threshold: 3 days from now
        LocalDateTime threshold = now.plusDays(3);
        
        List<ProductEntity> products = productRepository.findAll();
        for (ProductEntity product : products) {
            List<InventoryBatchEntity> nearExpiryBatches = inventoryBatchRepository.findNearExpiryBatches(product.getId(), now, threshold);
            if (nearExpiryBatches.isEmpty()) {
                continue;
            }
            
            // Calculate total near expiry stock
            int totalNearExpiryStock = nearExpiryBatches.stream()
                    .mapToInt(InventoryBatchEntity::getRemainingQuantity)
                    .sum();
            
            // Suggest coupon if near expiry stock is substantial (e.g. >= 5 units)
            if (totalNearExpiryStock >= 5) {
                String couponCode = "XA_HANG_" + product.getId() + "_" + now.getDayOfMonth() + now.getMonthValue();
                
                // Check if coupon code already exists
                if (couponRepository.existsByCodeIgnoreCase(couponCode)) {
                    continue;
                }
                
                // Create clearance coupon for this specific product
                CouponEntity coupon = CouponEntity.builder()
                        .code(couponCode)
                        .couponType("PRODUCT_DISCOUNT")
                        .discountType("PERCENTAGE")
                        .discountPercentage(30) // 30% discount to clear stock
                        .productId(product.getId())
                        .minOrderValue(BigDecimal.ZERO)
                        .startsAt(now)
                        // Expires when the earliest batch expires
                        .expiresAt(nearExpiryBatches.get(0).getExpiryDate())
                        .usageLimit(100)
                        .timesUsed(0)
                        .active(true)
                        .build();
                        
                couponRepository.save(coupon);
                log.info("[Inventory Scheduler] Auto-created product clearance coupon '{}' (30% off) for product '{}' (Stock near expiry: {})", 
                        couponCode, product.getName(), totalNearExpiryStock);
            }
        }
    }
}
