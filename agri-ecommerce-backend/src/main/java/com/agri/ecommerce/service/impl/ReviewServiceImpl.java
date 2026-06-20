package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.review.ReviewRequest;
import com.agri.ecommerce.dto.request.review.ReviewUpdateRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.review.ProductReviewSummaryResponse;
import com.agri.ecommerce.dto.response.review.ProductReviewsResponse;
import com.agri.ecommerce.dto.response.review.ReviewResponse;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.ReviewEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.ReviewMapper;
import com.agri.ecommerce.repository.OrderItemRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.repository.ReviewRepository;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.service.ReviewService;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private static final String HIDDEN_STATUS = "hidden";
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("id", "rating", "createdAt", "updatedAt");

    private final ReviewRepository reviewRepository;

    private final ProductRepository productRepository;

    private final UserRepository userRepository;

    private final OrderItemRepository orderItemRepository;

    private final ReviewMapper reviewMapper;

    @Override
    @Transactional(readOnly = true)
    public ProductReviewsResponse getProductReviews(String productSlug, int page, int size, String sort) {
        validatePaging(page, size);
        ProductEntity product = findPublicProductBySlug(productSlug);

        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<ReviewEntity> reviewPage = reviewRepository.findByProduct_IdOrderByCreatedAtDesc(product.getId(), pageable);
        PageResponse<ReviewResponse> reviews = toPageResponse(reviewPage);

        return ProductReviewsResponse.builder()
                .summary(buildProductReviewSummary(product))
                .reviews(reviews)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ReviewResponse> getMyReviews(Long userId, int page, int size, String sort) {
        validatePaging(page, size);

        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        return toPageResponse(reviewRepository.findByUser_IdOrderByCreatedAtDesc(userId, pageable));
    }

    @Override
    @Transactional
    public ReviewResponse createReview(Long userId, ReviewRequest request) {
        UserEntity user = findUserById(userId);
        ProductEntity product = findPublicProductById(request.getProductId());

        if (reviewRepository.existsByUser_IdAndProduct_Id(userId, product.getId())) {
            throw new BadRequestException("Bạn đã đánh giá sản phẩm này");
        }

        if (!orderItemRepository.existsDeliveredOrCompletedPurchase(userId, product.getId())) {
            throw new BadRequestException("Bạn chỉ có thể đánh giá sản phẩm đã mua và đã giao thành công");
        }

        ReviewEntity review = ReviewEntity.builder()
                .user(user)
                .product(product)
                .rating(request.getRating())
                .comment(cleanBlank(request.getComment()))
                .build();

        return reviewMapper.toReviewResponse(reviewRepository.save(review));
    }

    @Override
    @Transactional
    public ReviewResponse updateReview(Long userId, Long reviewId, ReviewUpdateRequest request) {
        ReviewEntity review = findReviewByIdAndUserId(reviewId, userId);

        review.setRating(request.getRating());
        review.setComment(cleanBlank(request.getComment()));

        return reviewMapper.toReviewResponse(reviewRepository.save(review));
    }

    @Override
    @Transactional
    public void deleteMyReview(Long userId, Long reviewId) {
        ReviewEntity review = findReviewByIdAndUserId(reviewId, userId);
        reviewRepository.delete(review);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ReviewResponse> getAdminReviews(
            Long productId,
            Long userId,
            Integer rating,
            int page,
            int size,
            String sort
    ) {
        validatePaging(page, size);
        validateOptionalRating(rating);

        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Specification<ReviewEntity> specification = Specification.where(hasProductId(productId))
                .and(hasUserId(userId))
                .and(hasRating(rating));

        return toPageResponse(reviewRepository.findAll(specification, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewResponse getAdminReview(Long reviewId) {
        return reviewMapper.toReviewResponse(findReviewById(reviewId));
    }

    @Override
    @Transactional
    public void deleteReviewAsAdmin(Long reviewId) {
        ReviewEntity review = findReviewById(reviewId);
        reviewRepository.delete(review);
    }

    private PageResponse<ReviewResponse> toPageResponse(Page<ReviewEntity> reviewPage) {
        return PageResponse.<ReviewResponse>builder()
                .content(reviewPage.getContent().stream().map(reviewMapper::toReviewResponse).toList())
                .page(reviewPage.getNumber())
                .size(reviewPage.getSize())
                .totalElements(reviewPage.getTotalElements())
                .totalPages(reviewPage.getTotalPages())
                .last(reviewPage.isLast())
                .build();
    }

    private ProductReviewSummaryResponse buildProductReviewSummary(ProductEntity product) {
        long totalReviews = reviewRepository.countByProduct_Id(product.getId());
        Double averageRatingValue = reviewRepository.getAverageRatingByProductId(product.getId());
        double averageRating = averageRatingValue == null
                ? 0
                : BigDecimal.valueOf(averageRatingValue)
                        .setScale(1, RoundingMode.HALF_UP)
                        .doubleValue();

        return ProductReviewSummaryResponse.builder()
                .productId(product.getId())
                .productSlug(product.getSlug())
                .totalReviews(totalReviews)
                .averageRating(averageRating)
                .build();
    }

    private Specification<ReviewEntity> hasProductId(Long productId) {
        return (root, query, criteriaBuilder) -> {
            if (productId == null) {
                return criteriaBuilder.conjunction();
            }

            return criteriaBuilder.equal(root.join("product", JoinType.INNER).get("id"), productId);
        };
    }

    private Specification<ReviewEntity> hasUserId(Long userId) {
        return (root, query, criteriaBuilder) -> {
            if (userId == null) {
                return criteriaBuilder.conjunction();
            }

            return criteriaBuilder.equal(root.join("user", JoinType.INNER).get("id"), userId);
        };
    }

    private Specification<ReviewEntity> hasRating(Integer rating) {
        return (root, query, criteriaBuilder) ->
                rating == null ? criteriaBuilder.conjunction() : criteriaBuilder.equal(root.get("rating"), rating);
    }

    private ReviewEntity findReviewById(Long reviewId) {
        return reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá với id: " + reviewId));
    }

    private ReviewEntity findReviewByIdAndUserId(Long reviewId, Long userId) {
        return reviewRepository.findByIdAndUser_Id(reviewId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá với id: " + reviewId));
    }

    private ProductEntity findPublicProductById(Long productId) {
        ProductEntity product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + productId));

        if (HIDDEN_STATUS.equals(product.getStatus())) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + productId);
        }

        return product;
    }

    private ProductEntity findPublicProductBySlug(String productSlug) {
        ProductEntity product = productRepository.findBySlug(productSlug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với slug: " + productSlug));

        if (HIDDEN_STATUS.equals(product.getStatus())) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm với slug: " + productSlug);
        }

        return product;
    }

    private UserEntity findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với id: " + userId));
    }

    private Sort parseSort(String sort) {
        String cleanSort = cleanBlank(sort);
        if (cleanSort == null) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }

        String[] parts = cleanSort.split(",");
        String field = parts[0].trim();
        if (!ALLOWED_SORT_FIELDS.contains(field)) {
            throw new BadRequestException("Trường sắp xếp không hợp lệ: " + field);
        }

        Sort.Direction direction = Sort.Direction.DESC;
        if (parts.length > 1) {
            try {
                direction = Sort.Direction.fromString(parts[1].trim());
            } catch (IllegalArgumentException exception) {
                throw new BadRequestException("Chiều sắp xếp không hợp lệ. Giá trị hợp lệ: asc, desc");
            }
        }

        return Sort.by(direction, field);
    }

    private void validatePaging(int page, int size) {
        if (page < 0) {
            throw new BadRequestException("page phải lớn hơn hoặc bằng 0");
        }

        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("size phải nằm trong khoảng 1 đến " + MAX_PAGE_SIZE);
        }
    }

    private void validateOptionalRating(Integer rating) {
        if (rating != null && (rating < 1 || rating > 5)) {
            throw new BadRequestException("rating phải nằm trong khoảng 1 đến 5");
        }
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }
}
