package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.product.ProductCreateRequest;
import com.agri.ecommerce.dto.request.product.ProductStatusUpdateRequest;
import com.agri.ecommerce.dto.request.product.ProductStockUpdateRequest;
import com.agri.ecommerce.dto.request.product.ProductUpdateRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.product.ProductCategoryFacetResponse;
import com.agri.ecommerce.dto.response.product.ProductResponse;
import com.agri.ecommerce.dto.response.product.ProductSearchFacetsResponse;
import com.agri.ecommerce.dto.response.product.ProductSearchSuggestionResponse;
import com.agri.ecommerce.dto.response.product.ProductSortOptionResponse;
import com.agri.ecommerce.dto.response.product.ProductStatusFacetResponse;
import com.agri.ecommerce.entity.CategoryEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.ProductImageEntity;
import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.ProductMapper;
import com.agri.ecommerce.repository.CategoryRepository;
import com.agri.ecommerce.repository.ProductImageRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.repository.ReviewRepository;
import com.agri.ecommerce.service.ProductService;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private static final String IN_STOCK_STATUS = "in_stock";
    private static final String OUT_OF_STOCK_STATUS = "out_of_stock";
    private static final String HIDDEN_STATUS = "hidden";
    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_FEATURED_LIMIT = 50;
    private static final int MAX_SUGGESTION_LIMIT = 10;
    private static final int MAX_RELATED_LIMIT = 20;
    private static final Set<String> ALLOWED_STATUSES = Set.of(IN_STOCK_STATUS, OUT_OF_STOCK_STATUS, HIDDEN_STATUS);
    private static final Set<String> PUBLIC_STATUSES = Set.of(IN_STOCK_STATUS, OUT_OF_STOCK_STATUS);
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "name", "slug", "price", "stock", "status", "unit", "createdAt", "updatedAt"
    );

    private final ProductRepository productRepository;

    private final ProductImageRepository productImageRepository;

    private final CategoryRepository categoryRepository;

    private final ReviewRepository reviewRepository;

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
                normalizePublicStatus(status)
        );

        return toPageResponse(productRepository.findAll(specification, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> getFeaturedProducts(Integer limit) {
        int safeLimit = limit == null ? 8 : limit;
        validateFeaturedLimit(safeLimit);

        Pageable pageable = PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt"));
        List<ProductEntity> products = productRepository.findByStatus(IN_STOCK_STATUS, pageable);
        Map<Long, List<ProductImageEntity>> imagesByProductId = getImagesByProductId(products);
        Map<Long, ProductRatingSummary> ratingsByProductId = getRatingsByProductId(products);

        return products.stream()
                .map(product -> {
                    ProductRatingSummary ratingSummary = ratingsByProductId.getOrDefault(
                            product.getId(),
                            ProductRatingSummary.empty()
                    );

                    return productMapper.toProductResponse(
                            product,
                            imagesByProductId.getOrDefault(product.getId(), List.of()),
                            ratingSummary.averageRating(),
                            ratingSummary.reviewCount()
                    );
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductSearchSuggestionResponse> getSearchSuggestions(
            String keyword,
            String categorySlug,
            BigDecimal maxPrice,
            Integer limit
    ) {
        int safeLimit = limit == null ? 8 : limit;
        validateSuggestionLimit(safeLimit);
        validatePriceRange(null, maxPrice);

        String cleanKeyword = cleanBlank(keyword);
        String cleanCategorySlug = cleanBlank(categorySlug);
        Pageable pageable = PageRequest.of(0, Math.min(safeLimit * 3, 30));
        List<ProductEntity> products = productRepository.findPublicSearchSuggestions(
                cleanKeyword,
                cleanCategorySlug,
                maxPrice,
                IN_STOCK_STATUS,
                pageable
        );
        Map<Long, List<ProductImageEntity>> imagesByProductId = getImagesByProductId(products);

        return products.stream()
                .sorted(Comparator
                        .comparingInt((ProductEntity product) -> scoreSuggestion(product, cleanKeyword)).reversed()
                        .thenComparing(ProductEntity::getName)
                        .thenComparing(ProductEntity::getId))
                .limit(safeLimit)
                .map(product -> toSuggestionResponse(
                        product,
                        imagesByProductId.getOrDefault(product.getId(), List.of())
                ))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ProductSearchFacetsResponse getSearchFacets(
            String keyword,
            String categorySlug,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String status
    ) {
        validatePriceRange(minPrice, maxPrice);

        String cleanKeyword = cleanBlank(keyword);
        String cleanCategorySlug = cleanBlank(categorySlug);
        String cleanStatus = normalizeOptionalPublicStatus(status);
        Object[] priceRange = productRepository.findPublicSearchPriceRange(
                cleanKeyword,
                cleanCategorySlug,
                minPrice,
                maxPrice,
                cleanStatus,
                HIDDEN_STATUS
        );

        return ProductSearchFacetsResponse.builder()
                .totalProducts(longValue(priceRange, 0))
                .minPrice(bigDecimalValue(priceRange, 1))
                .maxPrice(bigDecimalValue(priceRange, 2))
                .categories(productRepository.findPublicCategoryFacets(
                        cleanKeyword,
                        cleanCategorySlug,
                        minPrice,
                        maxPrice,
                        cleanStatus,
                        HIDDEN_STATUS
                ).stream().map(this::toCategoryFacetResponse).toList())
                .statuses(productRepository.findPublicStatusFacets(
                        cleanKeyword,
                        cleanCategorySlug,
                        minPrice,
                        maxPrice,
                        cleanStatus,
                        HIDDEN_STATUS
                ).stream().map(this::toStatusFacetResponse).toList())
                .sortOptions(getPublicSortOptions())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getProductBySlug(String slug) {
        ProductEntity product = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với slug: " + slug));

        if (HIDDEN_STATUS.equals(product.getStatus())) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm với slug: " + slug);
        }

        return toProductResponse(product);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> getRelatedProducts(String slug, Integer limit) {
        int safeLimit = limit == null ? 8 : limit;
        validateRelatedLimit(safeLimit);

        ProductEntity currentProduct = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with slug: " + slug));

        if (HIDDEN_STATUS.equals(currentProduct.getStatus())) {
            throw new ResourceNotFoundException("Product not found with slug: " + slug);
        }

        Pageable candidatePageable = PageRequest.of(0, Math.min(safeLimit * 3, 60));
        LinkedHashMap<Long, ProductEntity> candidatesById = new LinkedHashMap<>();
        Long categoryId = currentProduct.getCategory() == null ? null : currentProduct.getCategory().getId();

        if (categoryId != null) {
            productRepository.findRelatedProductsByCategory(
                    currentProduct.getId(),
                    categoryId,
                    PUBLIC_STATUSES,
                    candidatePageable
            ).forEach(product -> candidatesById.put(product.getId(), product));
        }

        if (candidatesById.size() < safeLimit) {
            productRepository.findPublicRelatedFallbackProducts(
                    currentProduct.getId(),
                    PUBLIC_STATUSES,
                    candidatePageable
            ).forEach(product -> candidatesById.putIfAbsent(product.getId(), product));
        }

        List<ProductEntity> relatedProducts = candidatesById.values()
                .stream()
                .sorted(Comparator
                        .comparingInt((ProductEntity product) -> relatedStatusRank(product.getStatus()))
                        .thenComparing(product -> priceDistance(currentProduct.getPrice(), product.getPrice()))
                        .thenComparing(ProductEntity::getStock, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(ProductEntity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(ProductEntity::getId, Comparator.reverseOrder()))
                .limit(safeLimit)
                .toList();
        Map<Long, List<ProductImageEntity>> imagesByProductId = getImagesByProductId(relatedProducts);
        Map<Long, ProductRatingSummary> ratingsByProductId = getRatingsByProductId(relatedProducts);

        return relatedProducts.stream()
                .map(product -> {
                    ProductRatingSummary ratingSummary = ratingsByProductId.getOrDefault(
                            product.getId(),
                            ProductRatingSummary.empty()
                    );

                    return productMapper.toProductResponse(
                            product,
                            imagesByProductId.getOrDefault(product.getId(), List.of()),
                            ratingSummary.averageRating(),
                            ratingSummary.reviewCount()
                    );
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> getAdminProducts(
            String keyword,
            String categorySlug,
            String status,
            int page,
            int size,
            String sort
    ) {
        validatePaging(page, size);

        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Specification<ProductEntity> specification = buildSpecification(
                cleanBlank(keyword),
                cleanBlank(categorySlug),
                null,
                null,
                normalizeOptionalAdminStatus(status)
        );

        return toPageResponse(productRepository.findAll(specification, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        return toProductResponse(findProductById(id));
    }

    @Override
    @Transactional
    public ProductResponse createProduct(ProductCreateRequest request) {
        String slug = cleanBlank(request.getSlug());
        validateProductSlugUnique(slug, null);

        CategoryEntity category = findCategoryById(request.getCategoryId());
        String status = normalizeAdminStatusOrDefault(request.getStatus());
        status = applyStatusForProductWrite(status, request.getStock());

        ProductEntity product = ProductEntity.builder()
                .name(cleanBlank(request.getName()))
                .slug(slug)
                .category(category)
                .description(cleanBlank(request.getDescription()))
                .price(request.getPrice())
                .stock(request.getStock())
                .status(status)
                .unit(cleanBlank(request.getUnit()))
                .build();

        ProductEntity savedProduct = productRepository.save(product);
        replaceProductImages(savedProduct, normalizeImagePaths(request.getThumbnail(), request.getImages()));

        return toProductResponse(savedProduct);
    }

    @Override
    @Transactional
    public ProductResponse updateProduct(Long id, ProductUpdateRequest request) {
        ProductEntity product = findProductById(id);
        String slug = cleanBlank(request.getSlug());
        validateProductSlugUnique(slug, id);

        CategoryEntity category = findCategoryById(request.getCategoryId());
        String status = normalizeAdminStatusOrDefault(request.getStatus());
        status = applyStatusForProductWrite(status, request.getStock());

        product.setName(cleanBlank(request.getName()));
        product.setSlug(slug);
        product.setCategory(category);
        product.setDescription(cleanBlank(request.getDescription()));
        product.setPrice(request.getPrice());
        product.setStock(request.getStock());
        product.setStatus(status);
        product.setUnit(cleanBlank(request.getUnit()));

        ProductEntity savedProduct = productRepository.save(product);

        if (request.getThumbnail() != null || request.getImages() != null) {
            replaceProductImages(savedProduct, normalizeImagePaths(request.getThumbnail(), request.getImages()));
        }

        return toProductResponse(savedProduct);
    }

    @Override
    @Transactional
    public ProductResponse updateProductStatus(Long id, ProductStatusUpdateRequest request) {
        ProductEntity product = findProductById(id);
        product.setStatus(normalizeAdminStatus(request.getStatus()));

        ProductEntity savedProduct = productRepository.save(product);
        return toProductResponse(savedProduct);
    }

    @Override
    @Transactional
    public ProductResponse updateProductStock(Long id, ProductStockUpdateRequest request) {
        ProductEntity product = findProductById(id);
        product.setStock(request.getStock());

        if (!HIDDEN_STATUS.equals(product.getStatus())) {
            if (request.getStock() == 0) {
                product.setStatus(OUT_OF_STOCK_STATUS);
            } else if (OUT_OF_STOCK_STATUS.equals(product.getStatus())) {
                product.setStatus(IN_STOCK_STATUS);
            }
        }

        ProductEntity savedProduct = productRepository.save(product);
        return toProductResponse(savedProduct);
    }

    @Override
    @Transactional
    public ProductResponse deleteProduct(Long id) {
        ProductEntity product = findProductById(id);
        product.setStatus(HIDDEN_STATUS);

        ProductEntity savedProduct = productRepository.save(product);
        return toProductResponse(savedProduct);
    }

    private PageResponse<ProductResponse> toPageResponse(Page<ProductEntity> productPage) {
        Map<Long, List<ProductImageEntity>> imagesByProductId = getImagesByProductId(productPage.getContent());
        Map<Long, ProductRatingSummary> ratingsByProductId = getRatingsByProductId(productPage.getContent());
        List<ProductResponse> content = productPage.getContent()
                .stream()
                .map(product -> {
                    ProductRatingSummary ratingSummary = ratingsByProductId.getOrDefault(
                            product.getId(),
                            ProductRatingSummary.empty()
                    );

                    return productMapper.toProductResponse(
                            product,
                            imagesByProductId.getOrDefault(product.getId(), List.of()),
                            ratingSummary.averageRating(),
                            ratingSummary.reviewCount()
                    );
                })
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

    private ProductResponse toProductResponse(ProductEntity product) {
        List<ProductImageEntity> images = productImageRepository.findAllByProductId(product.getId());
        ProductRatingSummary ratingSummary = getRatingsByProductId(List.of(product))
                .getOrDefault(product.getId(), ProductRatingSummary.empty());

        return productMapper.toProductResponse(
                product,
                images,
                ratingSummary.averageRating(),
                ratingSummary.reviewCount()
        );
    }

    private ProductSearchSuggestionResponse toSuggestionResponse(ProductEntity product, List<ProductImageEntity> images) {
        CategoryEntity category = product.getCategory();
        String thumbnail = images.stream()
                .map(ProductImageEntity::getImage)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);

        return ProductSearchSuggestionResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .slug(product.getSlug())
                .price(product.getPrice())
                .stock(product.getStock())
                .unit(product.getUnit())
                .status(product.getStatus())
                .categoryId(category == null ? null : category.getId())
                .categoryName(category == null ? null : category.getName())
                .categorySlug(category == null ? null : category.getSlug())
                .thumbnail(thumbnail)
                .build();
    }

    private ProductEntity findProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + id));
    }

    private CategoryEntity findCategoryById(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với id: " + categoryId));
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
        return (root, query, criteriaBuilder) ->
                status == null ? criteriaBuilder.conjunction() : criteriaBuilder.equal(root.get("status"), status);
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

    private Map<Long, ProductRatingSummary> getRatingsByProductId(List<ProductEntity> products) {
        if (products.isEmpty()) {
            return Map.of();
        }

        List<Long> productIds = products.stream()
                .map(ProductEntity::getId)
                .toList();

        return reviewRepository.summarizeByProductIds(productIds)
                .stream()
                .collect(Collectors.toMap(
                        row -> ((Number) row[0]).longValue(),
                        this::toProductRatingSummary,
                        (left, right) -> right,
                        LinkedHashMap::new
                ));
    }

    private ProductRatingSummary toProductRatingSummary(Object[] row) {
        return new ProductRatingSummary(
                roundedAverageRating(row[1]),
                row[2] == null ? 0L : ((Number) row[2]).longValue()
        );
    }

    private ProductCategoryFacetResponse toCategoryFacetResponse(Object[] row) {
        return ProductCategoryFacetResponse.builder()
                .categoryId(row[0] == null ? null : ((Number) row[0]).longValue())
                .categoryName(row[1] == null ? null : row[1].toString())
                .categorySlug(row[2] == null ? null : row[2].toString())
                .productCount(row[3] == null ? 0 : ((Number) row[3]).longValue())
                .build();
    }

    private ProductStatusFacetResponse toStatusFacetResponse(Object[] row) {
        String status = row[0] == null ? null : row[0].toString();

        return ProductStatusFacetResponse.builder()
                .status(status)
                .label(toStatusLabel(status))
                .productCount(row[1] == null ? 0 : ((Number) row[1]).longValue())
                .build();
    }

    private List<ProductSortOptionResponse> getPublicSortOptions() {
        return List.of(
                ProductSortOptionResponse.builder().value("createdAt,desc").label("Newest").build(),
                ProductSortOptionResponse.builder().value("price,asc").label("Price: low to high").build(),
                ProductSortOptionResponse.builder().value("price,desc").label("Price: high to low").build(),
                ProductSortOptionResponse.builder().value("name,asc").label("Name: A to Z").build(),
                ProductSortOptionResponse.builder().value("stock,desc").label("Available stock").build()
        );
    }

    private int scoreSuggestion(ProductEntity product, String keyword) {
        String cleanKeyword = cleanBlank(keyword);
        if (cleanKeyword == null) {
            return 1;
        }

        String normalizedKeyword = cleanKeyword.toLowerCase(Locale.ROOT);
        String productName = product.getName() == null ? "" : product.getName().toLowerCase(Locale.ROOT);
        String productDescription = product.getDescription() == null ? "" : product.getDescription().toLowerCase(Locale.ROOT);
        String categoryName = product.getCategory() == null || product.getCategory().getName() == null
                ? ""
                : product.getCategory().getName().toLowerCase(Locale.ROOT);
        int score = 0;

        if (productName.equals(normalizedKeyword)) {
            score += 30;
        }
        if (productName.startsWith(normalizedKeyword)) {
            score += 20;
        }
        if (productName.contains(normalizedKeyword)) {
            score += 12;
        }
        if (categoryName.contains(normalizedKeyword)) {
            score += 6;
        }
        if (productDescription.contains(normalizedKeyword)) {
            score += 3;
        }
        if (product.getStock() != null && product.getStock() > 0) {
            score += 1;
        }

        return score;
    }

    private int relatedStatusRank(String status) {
        return IN_STOCK_STATUS.equals(status) ? 0 : 1;
    }

    private BigDecimal priceDistance(BigDecimal basePrice, BigDecimal price) {
        if (basePrice == null || price == null) {
            return BigDecimal.valueOf(Long.MAX_VALUE);
        }

        return basePrice.subtract(price).abs();
    }

    private String toStatusLabel(String status) {
        if (IN_STOCK_STATUS.equals(status)) {
            return "In stock";
        }

        if (OUT_OF_STOCK_STATUS.equals(status)) {
            return "Out of stock";
        }

        return status;
    }

    private void replaceProductImages(ProductEntity product, List<String> imagePaths) {
        productImageRepository.deleteByProduct_Id(product.getId());

        if (imagePaths.isEmpty()) {
            return;
        }

        List<ProductImageEntity> images = imagePaths.stream()
                .map(imagePath -> ProductImageEntity.builder()
                        .product(product)
                        .image(imagePath)
                        .build())
                .toList();

        productImageRepository.saveAll(images);
    }

    private List<String> normalizeImagePaths(String thumbnail, List<String> images) {
        LinkedHashSet<String> imagePaths = new LinkedHashSet<>();
        String cleanThumbnail = cleanBlank(thumbnail);

        if (cleanThumbnail != null) {
            imagePaths.add(cleanThumbnail);
        }

        if (images != null) {
            images.stream()
                    .map(this::cleanBlank)
                    .filter(Objects::nonNull)
                    .forEach(imagePaths::add);
        }

        return new ArrayList<>(imagePaths);
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

    private String normalizePublicStatus(String status) {
        String normalizedStatus = cleanBlank(status);

        if (normalizedStatus == null) {
            return IN_STOCK_STATUS;
        }

        normalizedStatus = normalizedStatus.toLowerCase(Locale.ROOT);
        if (!PUBLIC_STATUSES.contains(normalizedStatus)) {
            throw new BadRequestException("Trạng thái public không hợp lệ. Giá trị hợp lệ: in_stock, out_of_stock");
        }

        return normalizedStatus;
    }

    private String normalizeOptionalPublicStatus(String status) {
        String normalizedStatus = cleanBlank(status);
        if (normalizedStatus == null) {
            return null;
        }

        normalizedStatus = normalizedStatus.toLowerCase(Locale.ROOT);
        if (!PUBLIC_STATUSES.contains(normalizedStatus)) {
            throw new BadRequestException("Public product status is invalid. Allowed values: in_stock, out_of_stock");
        }

        return normalizedStatus;
    }

    private String normalizeOptionalAdminStatus(String status) {
        String normalizedStatus = cleanBlank(status);
        if (normalizedStatus == null) {
            return null;
        }

        return normalizeAdminStatus(normalizedStatus);
    }

    private String normalizeAdminStatusOrDefault(String status) {
        String normalizedStatus = cleanBlank(status);
        if (normalizedStatus == null) {
            return IN_STOCK_STATUS;
        }

        return normalizeAdminStatus(normalizedStatus);
    }

    private String normalizeAdminStatus(String status) {
        String normalizedStatus = cleanBlank(status);
        if (normalizedStatus == null) {
            throw new BadRequestException("Trạng thái sản phẩm không được để trống");
        }

        normalizedStatus = normalizedStatus.toLowerCase(Locale.ROOT);
        if (!ALLOWED_STATUSES.contains(normalizedStatus)) {
            throw new BadRequestException("Trạng thái sản phẩm không hợp lệ. Giá trị hợp lệ: in_stock, out_of_stock, hidden");
        }

        return normalizedStatus;
    }

    private String applyStatusForProductWrite(String status, Integer stock) {
        if (stock == 0 && !HIDDEN_STATUS.equals(status)) {
            return OUT_OF_STOCK_STATUS;
        }

        return status;
    }

    private void validateProductSlugUnique(String slug, Long currentId) {
        boolean duplicated = currentId == null
                ? productRepository.existsBySlug(slug)
                : productRepository.existsBySlugAndIdNot(slug, currentId);

        if (duplicated) {
            throw new BadRequestException("Slug sản phẩm đã được sử dụng");
        }
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

    private void validateSuggestionLimit(int limit) {
        if (limit < 1 || limit > MAX_SUGGESTION_LIMIT) {
            throw new BadRequestException("limit must be between 1 and " + MAX_SUGGESTION_LIMIT);
        }
    }

    private void validateRelatedLimit(int limit) {
        if (limit < 1 || limit > MAX_RELATED_LIMIT) {
            throw new BadRequestException("limit must be between 1 and " + MAX_RELATED_LIMIT);
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

    private Long longValue(Object[] row, int index) {
        if (row == null || row.length <= index || row[index] == null) {
            return 0L;
        }

        return ((Number) row[index]).longValue();
    }

    private BigDecimal bigDecimalValue(Object[] row, int index) {
        if (row == null || row.length <= index || row[index] == null) {
            return null;
        }

        if (row[index] instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }

        return new BigDecimal(row[index].toString());
    }

    private Double roundedAverageRating(Object value) {
        if (value == null) {
            return 0D;
        }

        double averageRating = value instanceof Number number
                ? number.doubleValue()
                : Double.parseDouble(value.toString());

        return BigDecimal.valueOf(averageRating)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private static class ProductRatingSummary {

        private final Double averageRating;

        private final Long reviewCount;

        private ProductRatingSummary(Double averageRating, Long reviewCount) {
            this.averageRating = averageRating;
            this.reviewCount = reviewCount;
        }

        private static ProductRatingSummary empty() {
            return new ProductRatingSummary(0D, 0L);
        }

        private Double averageRating() {
            return averageRating;
        }

        private Long reviewCount() {
            return reviewCount;
        }
    }
}
