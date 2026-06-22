package com.agri.ecommerce.dto.response.review;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class ProductReviewSummaryResponse {

    private Long productId;

    private String productSlug;

    private long totalReviews;

    private double averageRating;
}
