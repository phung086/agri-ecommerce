package com.agri.ecommerce.dto.response.product;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class ProductSearchSuggestionResponse {

    private Long id;

    private String name;

    private String nameEn;

    private String slug;

    private BigDecimal price;

    private Integer stock;

    private String unit;

    private String unitEn;

    private String status;

    private Long categoryId;

    private String categoryName;

    private String categoryNameEn;

    private String categorySlug;

    private String thumbnail;
}
