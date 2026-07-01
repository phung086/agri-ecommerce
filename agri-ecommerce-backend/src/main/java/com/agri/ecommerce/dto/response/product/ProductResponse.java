package com.agri.ecommerce.dto.response.product;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@Builder
public class ProductResponse {

    private Long id;

    private String name;

    private String nameEn;

    private String slug;

    private String description;

    private String descriptionEn;

    private BigDecimal price;

    private Integer stock;

    private String status;

    private String unit;

    private String unitEn;

    private Long categoryId;

    private String categoryName;

    private String categoryNameEn;

    private String categorySlug;

    private String thumbnail;

    private List<String> images;
}
