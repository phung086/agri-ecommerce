package com.agri.ecommerce.dto.response.inventory;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class InventoryBatchResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String productSlug;
    private Long categoryId;
    private String categoryName;
    private String batchNumber;
    private BigDecimal importPrice;
    private Integer originalQuantity;
    private Integer remainingQuantity;
    private LocalDateTime receivedAt;
    private LocalDateTime manufactureDate;
    private LocalDateTime expiryDate;
    private String supplierName;
    private String storageLocation;
    private String status;
    private String freshnessStatus;
    private Integer daysUntilExpiry;
    private boolean usableForSale;
    private boolean legacyBatch;
    private String note;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
