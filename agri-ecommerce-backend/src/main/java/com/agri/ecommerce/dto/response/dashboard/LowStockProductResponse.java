package com.agri.ecommerce.dto.response.dashboard;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class LowStockProductResponse {

    private Long productId;

    private String productName;

    private String productSlug;

    private Long categoryId;

    private String categoryName;

    private Integer stock;

    private String unit;

    private String status;

    private BigDecimal price;
}
