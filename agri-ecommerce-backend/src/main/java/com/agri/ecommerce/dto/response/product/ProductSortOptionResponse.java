package com.agri.ecommerce.dto.response.product;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class ProductSortOptionResponse {

    private String value;

    private String label;
}
