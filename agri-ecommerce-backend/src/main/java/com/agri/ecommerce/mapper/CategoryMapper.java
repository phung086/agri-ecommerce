package com.agri.ecommerce.mapper;

import com.agri.ecommerce.dto.response.category.CategoryResponse;
import com.agri.ecommerce.entity.CategoryEntity;
import org.springframework.stereotype.Component;

@Component
public class CategoryMapper {

    public CategoryResponse toCategoryResponse(CategoryEntity category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .nameEn(category.getNameEn())
                .slug(category.getSlug())
                .description(category.getDescription())
                .descriptionEn(category.getDescriptionEn())
                .image(category.getImage())
                .build();
    }
}
