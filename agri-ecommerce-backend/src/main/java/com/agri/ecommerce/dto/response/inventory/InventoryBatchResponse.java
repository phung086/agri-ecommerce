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
    private String batchNumber;
    private BigDecimal importPrice;
    private Integer originalQuantity;
    private Integer remainingQuantity;
    private LocalDateTime manufactureDate;
    private LocalDateTime expiryDate;
    private LocalDateTime createdAt;
}
