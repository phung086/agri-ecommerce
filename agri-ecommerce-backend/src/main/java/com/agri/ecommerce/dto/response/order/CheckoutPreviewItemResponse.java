package com.agri.ecommerce.dto.response.order;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class CheckoutPreviewItemResponse {

    private Long productId;

    private String productName;

    private String productSlug;

    private String unit;

    private Integer requestedQuantity;

    private Integer availableStock;

    private String status;

    private BigDecimal price;

    private BigDecimal lineTotal;

    private boolean available;

    private String message;
}
