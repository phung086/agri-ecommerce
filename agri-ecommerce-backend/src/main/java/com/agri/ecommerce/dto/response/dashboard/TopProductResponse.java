package com.agri.ecommerce.dto.response.dashboard;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class TopProductResponse {

    private Long productId;

    private String productName;

    private String productSlug;

    private Long quantitySold;

    private BigDecimal revenue;
}
