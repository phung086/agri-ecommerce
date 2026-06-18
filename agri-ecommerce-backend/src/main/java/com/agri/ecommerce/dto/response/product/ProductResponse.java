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

    private String slug;

    private String description;

    private BigDecimal price;

    private Integer stock;

    private String status;

    private String unit;

    private Long categoryId;

    private String categoryName;

    private String categorySlug;

    private String thumbnail;

    private List<String> images;
}
