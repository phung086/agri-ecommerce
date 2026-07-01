package com.agri.ecommerce.dto.response.order;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class OrderItemResponse {

    private Long id;

    private Long productId;

    private String productName;

    private String productNameEn;

    private String productSlug;

    private String unit;

    private String unitEn;

    private Integer quantity;

    private BigDecimal price;

    private BigDecimal lineTotal;
}
