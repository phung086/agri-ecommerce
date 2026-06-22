package com.agri.ecommerce.dto.response.cart;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class CartItemResponse {

    private Long id;

    private Long productId;

    private String productName;

    private String productSlug;

    private BigDecimal productPrice;

    private String unit;

    private String thumbnail;

    private Integer stock;

    private String status;

    private Integer quantity;

    private BigDecimal lineTotal;
}
