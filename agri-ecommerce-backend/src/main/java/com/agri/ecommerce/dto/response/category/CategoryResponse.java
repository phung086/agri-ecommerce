package com.agri.ecommerce.dto.response.category;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class CategoryResponse {

    private Long id;

    private String name;

    private String nameEn;

    private String slug;

    private String description;

    private String descriptionEn;

    private String image;
}
