package com.agri.ecommerce.dto.response.product;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class ProductCategoryFacetResponse {

    private Long categoryId;

    private String categoryName;

    private String categoryNameEn;

    private String categorySlug;

    private Long productCount;
}
