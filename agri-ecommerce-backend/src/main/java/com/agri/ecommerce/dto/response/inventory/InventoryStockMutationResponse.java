package com.agri.ecommerce.dto.response.inventory;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class InventoryStockMutationResponse {

    private Long productId;

    private String productName;

    private String productSlug;

    private Integer previousStock;

    private Integer newStock;

    private Integer stockDelta;

    private String previousStatus;

    private String newStatus;

    private String alertLevel;

    private boolean restockRecommended;

    private String note;
}
