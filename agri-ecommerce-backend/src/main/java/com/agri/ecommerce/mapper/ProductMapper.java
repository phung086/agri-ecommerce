package com.agri.ecommerce.mapper;

import com.agri.ecommerce.dto.response.product.ProductResponse;
import com.agri.ecommerce.entity.CategoryEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.ProductImageEntity;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

@Component
public class ProductMapper {

    public ProductResponse toProductResponse(ProductEntity product, List<ProductImageEntity> productImages) {
        CategoryEntity category = product.getCategory();
        List<String> images = productImages == null ? List.of() : productImages.stream()
                .map(ProductImageEntity::getImage)
                .filter(Objects::nonNull)
                .toList();

        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .nameEn(product.getNameEn())
                .slug(product.getSlug())
                .description(product.getDescription())
                .descriptionEn(product.getDescriptionEn())
                .price(product.getPrice())
                .stock(product.getStock())
                .status(product.getStatus())
                .unit(product.getUnit())
                .unitEn(product.getUnitEn())
                .categoryId(category == null ? null : category.getId())
                .categoryName(category == null ? null : category.getName())
                .categoryNameEn(category == null ? null : category.getNameEn())
                .categorySlug(category == null ? null : category.getSlug())
                .thumbnail(images.isEmpty() ? null : images.getFirst())
                .images(images)
                .build();
    }
}
