package com.agri.ecommerce.dto.response.inventory;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class InventoryTransactionResponse {
    private Long id;
    private Long productId;
    private String productName;
    private Long batchId;
    private String batchNumber;
    private Integer quantity;
    private String type;
    private Integer previousStock;
    private Integer newStock;
    private String referenceType;
    private Long referenceId;
    private String note;
    private LocalDateTime createdAt;
}
