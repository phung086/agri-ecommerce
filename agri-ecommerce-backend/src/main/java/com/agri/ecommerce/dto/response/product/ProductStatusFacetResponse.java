package com.agri.ecommerce.dto.response.product;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class ProductStatusFacetResponse {

    private String status;

    private String label;

    private Long productCount;
}
