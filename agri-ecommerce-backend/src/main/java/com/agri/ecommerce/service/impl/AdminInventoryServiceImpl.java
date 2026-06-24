package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.dto.request.inventory.InventoryStockAdjustmentRequest;
import com.agri.ecommerce.dto.request.inventory.InventoryStockSetRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.inventory.InventoryProductResponse;
import com.agri.ecommerce.dto.response.inventory.InventoryStockMutationResponse;
import com.agri.ecommerce.dto.response.inventory.InventorySummaryResponse;
import com.agri.ecommerce.entity.CategoryEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.service.AdminInventoryService;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminInventoryServiceImpl implements AdminInventoryService {

    private static final String IN_STOCK_STATUS = "in_stock";
    private static final String OUT_OF_STOCK_STATUS = "out_of_stock";
    private static final String HIDDEN_STATUS = "hidden";
    private static final int DEFAULT_LOW_STOCK_THRESHOLD = 10;
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> ALLOWED_STATUSES = Set.of(IN_STOCK_STATUS, OUT_OF_STOCK_STATUS, HIDDEN_STATUS);
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "name", "slug", "price", "stock", "status", "unit", "createdAt", "updatedAt"
    );

    private final ProductRepository productRepository;

    @Override
    @Transactional(readOnly = true)
    public InventorySummaryResponse getSummary(Integer threshold) {
        int safeThreshold = normalizeThreshold(threshold);

        return InventorySummaryResponse.builder()
                .lowStockThreshold(safeThreshold)
                .totalProducts(productRepository.countByStatusNot(HIDDEN_STATUS))
                .inStockProducts(productRepository.countByStatus(IN_STOCK_STATUS))
                .outOfStockProducts(productRepository.countByStatus(OUT_OF_STOCK_STATUS))
                .hiddenProducts(productRepository.countByStatus(HIDDEN_STATUS))
                .lowStockProducts(productRepository.countByStockLessThanEqualAndStatusNot(safeThreshold, HIDDEN_STATUS))
                .totalStockUnits(productRepository.sumStockByStatusNot(HIDDEN_STATUS))
                .generatedAt(LocalDateTime.now())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<InventoryProductResponse> getStockAlerts(
            String keyword,
            String categorySlug,
            String status,
            Integer threshold,
            Boolean includeOk,
            int page,
            int size,
            String sort
    ) {
        validatePaging(page, size);
        int safeThreshold = normalizeThreshold(threshold);
        boolean showOkProducts = Boolean.TRUE.equals(includeOk);
        Specification<ProductEntity> specification = Specification
                .where(hasKeyword(cleanBlank(keyword)))
                .and(hasCategorySlug(cleanBlank(categorySlug)))
                .and(hasInventoryStatus(normalizeOptionalStatus(status)))
                .and(hasStockAlert(safeThreshold, showOkProducts));
        Page<ProductEntity> productPage = productRepository.findAll(
                specification,
                PageRequest.of(page, size, parseSort(sort))
        );

        return PageResponse.<InventoryProductResponse>builder()
                .content(productPage.getContent().stream()
                        .map(product -> toInventoryProductResponse(product, safeThreshold))
                        .toList())
                .page(productPage.getNumber())
                .size(productPage.getSize())
                .totalElements(productPage.getTotalElements())
                .totalPages(productPage.getTotalPages())
                .last(productPage.isLast())
                .build();
    }

    @Override
    @Transactional
    public InventoryStockMutationResponse setStock(Long productId, InventoryStockSetRequest request) {
        ProductEntity product = findProductByIdForUpdate(productId);
        int previousStock = safeStock(product);
        String previousStatus = product.getStatus();
        int newStock = request.getStock();

        product.setStock(newStock);
        applyStatusForStock(product, newStock);
        ProductEntity savedProduct = productRepository.save(product);

        return toMutationResponse(
                savedProduct,
                previousStock,
                newStock,
                previousStatus,
                cleanBlank(request.getNote()),
                DEFAULT_LOW_STOCK_THRESHOLD
        );
    }

    @Override
    @Transactional
    public InventoryStockMutationResponse adjustStock(Long productId, InventoryStockAdjustmentRequest request) {
        ProductEntity product = findProductByIdForUpdate(productId);
        int quantityDelta = request.getQuantityDelta();
        if (quantityDelta == 0) {
            throw new BadRequestException("quantityDelta must not be 0");
        }

        int previousStock = safeStock(product);
        int newStock = previousStock + quantityDelta;
        if (newStock < 0) {
            throw new BadRequestException("Stock adjustment would make product stock negative");
        }

        String previousStatus = product.getStatus();
        product.setStock(newStock);
        applyStatusForStock(product, newStock);
        ProductEntity savedProduct = productRepository.save(product);

        return toMutationResponse(
                savedProduct,
                previousStock,
                newStock,
                previousStatus,
                cleanBlank(request.getNote()),
                DEFAULT_LOW_STOCK_THRESHOLD
        );
    }

    private InventoryProductResponse toInventoryProductResponse(ProductEntity product, int threshold) {
        CategoryEntity category = product.getCategory();

        return InventoryProductResponse.builder()
                .productId(product.getId())
                .productName(product.getName())
                .productSlug(product.getSlug())
                .categoryId(category == null ? null : category.getId())
                .categoryName(category == null ? null : category.getName())
                .categorySlug(category == null ? null : category.getSlug())
                .stock(safeStock(product))
                .unit(product.getUnit())
                .status(product.getStatus())
                .price(product.getPrice())
                .alertLevel(toAlertLevel(product, threshold))
                .restockRecommended(isRestockRecommended(product, threshold))
                .updatedAt(product.getUpdatedAt())
                .build();
    }

    private InventoryStockMutationResponse toMutationResponse(
            ProductEntity product,
            int previousStock,
            int newStock,
            String previousStatus,
            String note,
            int threshold
    ) {
        return InventoryStockMutationResponse.builder()
                .productId(product.getId())
                .productName(product.getName())
                .productSlug(product.getSlug())
                .previousStock(previousStock)
                .newStock(newStock)
                .stockDelta(newStock - previousStock)
                .previousStatus(previousStatus)
                .newStatus(product.getStatus())
                .alertLevel(toAlertLevel(product, threshold))
                .restockRecommended(isRestockRecommended(product, threshold))
                .note(note)
                .build();
    }

    private ProductEntity findProductByIdForUpdate(Long productId) {
        return productRepository.findAllByIdInForUpdate(List.of(productId))
                .stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Product was not found with id: " + productId));
    }

    private void applyStatusForStock(ProductEntity product, int newStock) {
        if (HIDDEN_STATUS.equals(product.getStatus())) {
            return;
        }

        if (newStock == 0) {
            product.setStatus(OUT_OF_STOCK_STATUS);
            return;
        }

        if (newStock > 0 && (product.getStatus() == null || OUT_OF_STOCK_STATUS.equals(product.getStatus()))) {
            product.setStatus(IN_STOCK_STATUS);
        }
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

    private Specification<ProductEntity> hasInventoryStatus(String status) {
        return (root, query, criteriaBuilder) -> {
            if (status == null) {
                return criteriaBuilder.notEqual(root.get("status"), HIDDEN_STATUS);
            }

            return criteriaBuilder.equal(root.get("status"), status);
        };
    }

    private Specification<ProductEntity> hasStockAlert(int threshold, boolean includeOk) {
        return (root, query, criteriaBuilder) -> {
            if (includeOk) {
                return criteriaBuilder.conjunction();
            }

            return criteriaBuilder.or(
                    criteriaBuilder.lessThanOrEqualTo(root.get("stock"), threshold),
                    criteriaBuilder.equal(root.get("status"), OUT_OF_STOCK_STATUS)
            );
        };
    }

    private Sort parseSort(String sort) {
        String cleanSort = cleanBlank(sort);
        if (cleanSort == null) {
            return Sort.by(Sort.Direction.ASC, "stock").and(Sort.by(Sort.Direction.DESC, "updatedAt"));
        }

        String[] parts = cleanSort.split(",");
        String field = parts[0].trim();
        if (!ALLOWED_SORT_FIELDS.contains(field)) {
            throw new BadRequestException("Invalid sort field: " + field);
        }

        Sort.Direction direction = Sort.Direction.ASC;
        if (parts.length > 1) {
            try {
                direction = Sort.Direction.fromString(parts[1].trim());
            } catch (IllegalArgumentException exception) {
                throw new BadRequestException("Invalid sort direction. Allowed values: asc, desc");
            }
        }

        return Sort.by(direction, field);
    }

    private String normalizeOptionalStatus(String status) {
        String normalizedStatus = cleanBlank(status);
        if (normalizedStatus == null) {
            return null;
        }

        normalizedStatus = normalizedStatus.toLowerCase(Locale.ROOT);
        if (!ALLOWED_STATUSES.contains(normalizedStatus)) {
            throw new BadRequestException("Invalid product status. Allowed values: in_stock, out_of_stock, hidden");
        }

        return normalizedStatus;
    }

    private int normalizeThreshold(Integer threshold) {
        int safeThreshold = threshold == null ? DEFAULT_LOW_STOCK_THRESHOLD : threshold;
        if (safeThreshold < 0) {
            throw new BadRequestException("threshold must be greater than or equal to 0");
        }

        return safeThreshold;
    }

    private void validatePaging(int page, int size) {
        if (page < 0) {
            throw new BadRequestException("page must be greater than or equal to 0");
        }

        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("size must be between 1 and " + MAX_PAGE_SIZE);
        }
    }

    private String toAlertLevel(ProductEntity product, int threshold) {
        int stock = safeStock(product);
        if (HIDDEN_STATUS.equals(product.getStatus())) {
            return "hidden";
        }

        if (OUT_OF_STOCK_STATUS.equals(product.getStatus()) || stock <= 0) {
            return "out_of_stock";
        }

        int criticalThreshold = Math.max(1, threshold / 2);
        if (stock <= criticalThreshold) {
            return "critical";
        }

        if (stock <= threshold) {
            return "low";
        }

        return "ok";
    }

    private boolean isRestockRecommended(ProductEntity product, int threshold) {
        String alertLevel = toAlertLevel(product, threshold);
        return Set.of("out_of_stock", "critical", "low").contains(alertLevel);
    }

    private int safeStock(ProductEntity product) {
        return product.getStock() == null ? 0 : product.getStock();
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }
}
