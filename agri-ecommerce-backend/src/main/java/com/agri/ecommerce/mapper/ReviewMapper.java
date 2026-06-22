package com.agri.ecommerce.mapper;

import com.agri.ecommerce.dto.response.review.ReviewResponse;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.ReviewEntity;
import com.agri.ecommerce.entity.UserEntity;
import org.springframework.stereotype.Component;

@Component
public class ReviewMapper {

    public ReviewResponse toReviewResponse(ReviewEntity review) {
        UserEntity user = review.getUser();
        ProductEntity product = review.getProduct();

        return ReviewResponse.builder()
                .id(review.getId())
                .userId(user == null ? null : user.getId())
                .userName(user == null ? null : user.getName())
                .productId(product == null ? null : product.getId())
                .productName(product == null ? null : product.getName())
                .productSlug(product == null ? null : product.getSlug())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
}
