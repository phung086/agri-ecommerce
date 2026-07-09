package com.agri.ecommerce.mapper;

import com.agri.ecommerce.dto.response.review.ReviewResponse;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.ReviewEntity;
import com.agri.ecommerce.entity.ReviewImageEntity;
import com.agri.ecommerce.entity.UserEntity;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ReviewMapper {

    public ReviewResponse toReviewResponse(ReviewEntity review) {
        UserEntity user = review.getUser();
        ProductEntity product = review.getProduct();
        List<String> images = review.getImages() == null
                ? List.of()
                : review.getImages().stream()
                        .map(ReviewImageEntity::getImageUrl)
                        .toList();

        return ReviewResponse.builder()
                .id(review.getId())
                .userId(user == null ? null : user.getId())
                .userName(user == null ? null : user.getName())
                .productId(product == null ? null : product.getId())
                .productName(product == null ? null : product.getName())
                .productSlug(product == null ? null : product.getSlug())
                .rating(review.getRating())
                .comment(review.getComment())
                .images(images)
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
}
