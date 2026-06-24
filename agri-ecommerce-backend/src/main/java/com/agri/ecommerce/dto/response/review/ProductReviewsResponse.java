package com.agri.ecommerce.dto.response.review;

import com.agri.ecommerce.dto.response.common.PageResponse;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class ProductReviewsResponse {

    private ProductReviewSummaryResponse summary;

    private PageResponse<ReviewResponse> reviews;
}
