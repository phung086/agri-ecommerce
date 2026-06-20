package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.review.ReviewRequest;
import com.agri.ecommerce.dto.request.review.ReviewUpdateRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.review.ProductReviewsResponse;
import com.agri.ecommerce.dto.response.review.ReviewResponse;

public interface ReviewService {

    ProductReviewsResponse getProductReviews(String productSlug, int page, int size, String sort);

    PageResponse<ReviewResponse> getMyReviews(Long userId, int page, int size, String sort);

    ReviewResponse createReview(Long userId, ReviewRequest request);

    ReviewResponse updateReview(Long userId, Long reviewId, ReviewUpdateRequest request);

    void deleteMyReview(Long userId, Long reviewId);

    PageResponse<ReviewResponse> getAdminReviews(
            Long productId,
            Long userId,
            Integer rating,
            int page,
            int size,
            String sort
    );

    ReviewResponse getAdminReview(Long reviewId);

    void deleteReviewAsAdmin(Long reviewId);
}
