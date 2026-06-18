package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.product.ProductResponse;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.ProductImageEntity;
import com.agri.ecommerce.exception.BadRequestException;
import com.agri.ecommerce.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.ProductMapper;
import com.agri.ecommerce.repository.ProductImageRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.service.ProductService;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private static final String DEFAULT_STATUS = "in_stock";
    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_FEATURED_LIMIT = 50;
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "name", "slug", "price", "stock", "status", "unit", "createdAt", "updatedAt"
    );

    private final ProductRepository productRepository;

    private final ProductImageRepository productImageRepository;

    private final ProductMapper productMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> getProducts(
            String keyword,
            String categorySlug,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String status,
            int page,
            int size,
            String sort
    ) {
        validatePaging(page, size);
        validatePriceRange(minPrice, maxPrice);

        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Specification<ProductEntity> specification = buildSpecification(
                cleanBlank(keyword),
                cleanBlank(categorySlug),
                minPrice,
                maxPrice,
                cleanBlank(status) == null ? DEFAULT_STATUS : cleanBlank(status)
        );

        Page<ProductEntity> productPage = productRepository.findAll(specification, pageable);
        Map<Long, List<ProductImageEntity>> imagesByProductId = getImagesByProductId(productPage.getContent());
        List<ProductResponse> content = productPage.getContent()
                .stream()
                .map(product -> productMapper.toProductResponse(
                        product,
                        imagesByProductId.getOrDefault(product.getId(), List.of())
                ))
                .toList();

        return PageResponse.<ProductResponse>builder()
                .content(content)
                .page(productPage.getNumber())
                .size(productPage.getSize())
                .totalElements(productPage.getTotalElements())
                .totalPages(productPage.getTotalPages())
                .last(productPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> getFeaturedProducts(Integer limit) {
        int safeLimit = limit == null ? 8 : limit;
        validateFeaturedLimit(safeLimit);

        Pageable pageable = PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt"));
        List<ProductEntity> products = productRepository.findByStatus(DEFAULT_STATUS, pageable);
        Map<Long, List<ProductImageEntity>> imagesByProductId = getImagesByProductId(products);

        return products.stream()
                .map(product -> productMapper.toProductResponse(
                        product,
                        imagesByProductId.getOrDefault(product.getId(), List.of())
                ))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getProductBySlug(String slug) {
        ProductEntity product = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với slug: " + slug));
        List<ProductImageEntity> images = productImageRepository.findAllByProductId(product.getId());

        return productMapper.toProductResponse(product, images);
    }

    private Specification<ProductEntity> buildSpecification(
            String keyword,
            String categorySlug,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String status
    ) {
        return Specification.where(hasKeyword(keyword))
                .and(hasCategorySlug(categorySlug))
                .and(hasMinPrice(minPrice))
                .and(hasMaxPrice(maxPrice))
                .and(hasStatus(status));
    }

    private Specification<ProductEntity> hasKeyword(String keyword) {
        return (root, query, criteriaBuilder) -> {
            if (keyword == null) {
                return criteriaBuilder.conjunction();
            }

            String pattern = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
            return criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), pattern)
            );
        };
    }

    private Specification<ProductEntity> hasCategorySlug(String categorySlug) {
        return (root, query, criteriaBuilder) -> {
            if (categorySlug == null) {
                return criteriaBuilder.conjunction();
            }

            return criteriaBuilder.equal(root.join("category", JoinType.INNER).get("slug"), categorySlug);
        };
    }

    private Specification<ProductEntity> hasMinPrice(BigDecimal minPrice) {
        return (root, query, criteriaBuilder) ->
                minPrice == null ? criteriaBuilder.conjunction() : criteriaBuilder.greaterThanOrEqualTo(root.get("price"), minPrice);
    }

    private Specification<ProductEntity> hasMaxPrice(BigDecimal maxPrice) {
        return (root, query, criteriaBuilder) ->
                maxPrice == null ? criteriaBuilder.conjunction() : criteriaBuilder.lessThanOrEqualTo(root.get("price"), maxPrice);
    }

    private Specification<ProductEntity> hasStatus(String status) {
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("status"), status);
    }

    private Map<Long, List<ProductImageEntity>> getImagesByProductId(List<ProductEntity> products) {
        if (products.isEmpty()) {
            return Map.of();
        }

        List<Long> productIds = products.stream()
                .map(ProductEntity::getId)
                .toList();

        return productImageRepository.findAllByProductIds(productIds)
                .stream()
                .collect(Collectors.groupingBy(image -> image.getProduct().getId(), LinkedHashMap::new, Collectors.toList()));
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

    private void validateFeaturedLimit(int limit) {
        if (limit < 1 || limit > MAX_FEATURED_LIMIT) {
            throw new BadRequestException("limit phải nằm trong khoảng 1 đến " + MAX_FEATURED_LIMIT);
        }
    }

    private void validatePriceRange(BigDecimal minPrice, BigDecimal maxPrice) {
        if (minPrice != null && minPrice.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("minPrice phải lớn hơn hoặc bằng 0");
        }

        if (maxPrice != null && maxPrice.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("maxPrice phải lớn hơn hoặc bằng 0");
        }

        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
            throw new BadRequestException("minPrice không được lớn hơn maxPrice");
        }
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }
}
