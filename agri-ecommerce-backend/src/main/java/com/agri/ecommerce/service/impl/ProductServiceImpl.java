package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.product.ProductCreateRequest;
import com.agri.ecommerce.dto.request.product.ProductStatusUpdateRequest;
import com.agri.ecommerce.dto.request.product.ProductStockUpdateRequest;
import com.agri.ecommerce.dto.request.product.ProductUpdateRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.product.ProductResponse;
import com.agri.ecommerce.entity.CategoryEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.ProductImageEntity;
import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.ProductMapper;
import com.agri.ecommerce.repository.CategoryRepository;
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

    private static final String IN_STOCK_STATUS = "in_stock";
    private static final String OUT_OF_STOCK_STATUS = "out_of_stock";
    private static final String HIDDEN_STATUS = "hidden";
    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_FEATURED_LIMIT = 50;
    private static final Set<String> ALLOWED_STATUSES = Set.of(IN_STOCK_STATUS, OUT_OF_STOCK_STATUS, HIDDEN_STATUS);
    private static final Set<String> PUBLIC_STATUSES = Set.of(IN_STOCK_STATUS, OUT_OF_STOCK_STATUS);
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "name", "slug", "price", "stock", "status", "unit", "createdAt", "updatedAt"
    );

    private final ProductRepository productRepository;

    private final ProductImageRepository productImageRepository;

    private final CategoryRepository categoryRepository;

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

        if (HIDDEN_STATUS.equals(product.getStatus())) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm với slug: " + slug);
        }

        return toProductResponse(product);
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

    private ProductResponse toProductResponse(ProductEntity product) {
        List<ProductImageEntity> images = productImageRepository.findAllByProductId(product.getId());
        return productMapper.toProductResponse(product, images);
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
