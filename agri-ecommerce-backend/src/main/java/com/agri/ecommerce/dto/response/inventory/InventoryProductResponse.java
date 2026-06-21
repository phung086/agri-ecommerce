package com.agri.ecommerce.dto.response.inventory;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class InventoryProductResponse {

    private Long productId;

    private String productName;

    private String productSlug;

    private Long categoryId;

    private String categoryName;

    private String categorySlug;

    private Integer stock;

    private String unit;

    private String status;

    private BigDecimal price;

    private String alertLevel;

    private boolean restockRecommended;

    private LocalDateTime updatedAt;
}
