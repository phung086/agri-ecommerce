package com.agri.ecommerce.dto.response.product;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@Builder
public class ProductSearchFacetsResponse {

    private Long totalProducts;

    private BigDecimal minPrice;

    private BigDecimal maxPrice;

    private List<ProductCategoryFacetResponse> categories;

    private List<ProductStatusFacetResponse> statuses;

    private List<ProductSortOptionResponse> sortOptions;
}
