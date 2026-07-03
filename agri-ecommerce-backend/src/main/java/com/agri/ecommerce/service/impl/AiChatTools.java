package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.response.chat.SuggestedProductResponse;
import com.agri.ecommerce.entity.CategoryEntity;
import com.agri.ecommerce.entity.CouponEntity;
import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.ProductImageEntity;
import com.agri.ecommerce.repository.CategoryRepository;
import com.agri.ecommerce.repository.CouponRepository;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.repository.ProductImageRepository;
import dev.langchain4j.agent.tool.Tool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiChatTools {

    public static final ThreadLocal<List<SuggestedProductResponse>> suggestedProductsHolder = 
            ThreadLocal.withInitial(ArrayList::new);

    public static final ThreadLocal<String> localeHolder = 
            ThreadLocal.withInitial(() -> "vi");

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final CouponRepository couponRepository;
    private final OrderRepository orderRepository;
    private final ProductImageRepository productImageRepository;

    @Value("${app.public.base-url:http://localhost:3000}")
    private String publicBaseUrl;

    @Tool("Tìm kiếm sản phẩm nông sản trong cửa hàng theo từ khóa (keyword), danh mục (categorySlug) và giá tiền tối đa (maxPrice)")
    public List<Map<String, Object>> searchProducts(String keyword, String categorySlug, Double maxPrice) {
        log.info("[AI Tool] Gọi searchProducts với keyword={}, categorySlug={}, maxPrice={}", keyword, categorySlug, maxPrice);
        BigDecimal maxPriceBd = maxPrice != null ? BigDecimal.valueOf(maxPrice) : null;
        
        String cleanKeyword = keyword != null && !keyword.trim().isEmpty() ? keyword.trim() : null;
        String cleanCategorySlug = categorySlug != null && !categorySlug.trim().isEmpty() ? categorySlug.trim() : null;

        List<ProductEntity> products = productRepository.findPublicSearchSuggestions(
                cleanKeyword,
                cleanCategorySlug,
                maxPriceBd,
                "in_stock",
                PageRequest.of(0, 10)
        );

        // Nạp và lưu Suggested Products vào ThreadLocal để trả về giao diện frontend
        if (!products.isEmpty()) {
            Map<Long, List<ProductImageEntity>> imageMap = loadImageMap(products);
            String currentLocale = localeHolder.get();
            List<SuggestedProductResponse> list = products.stream()
                    .map(p -> toSuggestedProduct(p, imageMap, currentLocale))
                    .collect(Collectors.toList());
            suggestedProductsHolder.get().addAll(list);
        }

        return products.stream().map(p -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("name", p.getName());
            map.put("nameEn", p.getNameEn());
            map.put("price", p.getPrice());
            map.put("stock", p.getStock());
            map.put("unit", p.getUnit());
            map.put("slug", p.getSlug());
            map.put("categoryName", p.getCategory() != null ? p.getCategory().getName() : "");
            return map;
        }).collect(Collectors.toList());
    }

    @Tool("Lấy chi tiết một sản phẩm dựa trên mã slug (ví dụ: 'rau-ma-1762274494')")
    public Map<String, Object> getProductDetail(String slug) {
        log.info("[AI Tool] Gọi getProductDetail với slug={}", slug);
        if (slug == null || slug.isBlank()) {
            return null;
        }

        return productRepository.findBySlug(slug.trim())
                .map(p -> {
                    // Nạp và lưu vào ThreadLocal
                    Map<Long, List<ProductImageEntity>> imageMap = loadImageMap(List.of(p));
                    String currentLocale = localeHolder.get();
                    suggestedProductsHolder.get().add(toSuggestedProduct(p, imageMap, currentLocale));

                    Map<String, Object> map = new HashMap<>();
                    map.put("id", p.getId());
                    map.put("name", p.getName());
                    map.put("nameEn", p.getNameEn());
                    map.put("price", p.getPrice());
                    map.put("stock", p.getStock());
                    map.put("unit", p.getUnit());
                    map.put("description", p.getDescription());
                    map.put("descriptionEn", p.getDescriptionEn());
                    map.put("status", p.getStatus());
                    map.put("categoryName", p.getCategory() != null ? p.getCategory().getName() : "");
                    return map;
                }).orElse(null);
    }

    @Tool("Lấy danh sách tất cả các danh mục nông sản đang có (ví dụ: rau củ, trái cây, thịt...)")
    public List<Map<String, Object>> listCategories() {
        log.info("[AI Tool] Gọi listCategories");
        List<CategoryEntity> categories = categoryRepository.findAllByOrderByIdAsc();
        return categories.stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("name", c.getName());
            map.put("nameEn", c.getNameEn());
            map.put("slug", c.getSlug());
            return map;
        }).collect(Collectors.toList());
    }

    @Tool("Lấy danh sách các mã giảm giá (coupons) đang hoạt động và điều kiện áp dụng")
    public List<Map<String, Object>> listActiveCoupons() {
        log.info("[AI Tool] Gọi listActiveCoupons");
        List<CouponEntity> coupons = couponRepository.findAll();
        return coupons.stream()
                .filter(c -> Boolean.TRUE.equals(c.getActive()))
                .map(c -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", c.getId());
                    map.put("code", c.getCode());
                    map.put("discountType", c.getDiscountType());
                    map.put("discountPercentage", c.getDiscountPercentage());
                    map.put("discountAmount", c.getDiscountAmount());
                    map.put("minOrderValue", c.getMinOrderValue());
                    map.put("couponType", c.getCouponType());
                    map.put("startsAt", c.getStartsAt());
                    map.put("expiresAt", c.getExpiresAt());
                    return map;
                }).collect(Collectors.toList());
    }

    @Tool("Lấy danh sách đơn hàng đã mua gần đây của người dùng dựa trên ID người dùng")
    public List<Map<String, Object>> getOrderHistory(Long userId) {
        log.info("[AI Tool] Gọi getOrderHistory cho userId={}", userId);
        if (userId == null) {
            return List.of();
        }

        List<OrderEntity> orders = orderRepository.findByUser_Id(userId, PageRequest.of(0, 10)).getContent();
        return orders.stream().map(o -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", o.getId());
            map.put("orderNumber", o.getId()); // Dùng ID làm số đơn hàng
            map.put("status", o.getStatus());
            map.put("totalPrice", o.getTotalPrice());
            map.put("createdAt", o.getCreatedAt());
            return map;
        }).collect(Collectors.toList());
    }

    // === Helpers ===

    private Map<Long, List<ProductImageEntity>> loadImageMap(List<ProductEntity> products) {
        if (products.isEmpty()) return Map.of();
        List<Long> ids = products.stream().map(ProductEntity::getId).toList();
        return productImageRepository.findAllByProductIds(ids)
                .stream()
                .collect(Collectors.groupingBy(
                        img -> img.getProduct().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
    }

    private SuggestedProductResponse toSuggestedProduct(
            ProductEntity product,
            Map<Long, List<ProductImageEntity>> imageMap,
            String locale
    ) {
        String imageUrl = resolveImageUrl(product, imageMap);
        String productUrl = buildProductUrl(product.getSlug());

        boolean isEn = "en".equalsIgnoreCase(locale);
        String name = isEn && product.getNameEn() != null ? product.getNameEn() : product.getName();
        String unit = isEn && product.getUnitEn() != null ? product.getUnitEn() : product.getUnit();

        String categoryName = null;
        if (product.getCategory() != null) {
            categoryName = isEn && product.getCategory().getNameEn() != null
                    ? product.getCategory().getNameEn()
                    : product.getCategory().getName();
        }

        return SuggestedProductResponse.builder()
                .id(product.getId())
                .name(name)
                .slug(product.getSlug())
                .price(product.getPrice())
                .unit(unit)
                .stock(product.getStock())
                .status(product.getStatus())
                .categoryName(categoryName)
                .imageUrl(imageUrl)
                .productUrl(productUrl)
                .build();
    }

    private String resolveImageUrl(ProductEntity product, Map<Long, List<ProductImageEntity>> imageMap) {
        List<ProductImageEntity> images = imageMap.get(product.getId());
        if (images == null || images.isEmpty()) return null;
        String raw = images.get(0).getImage();
        if (raw == null || raw.isBlank()) return null;
        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
        return raw.startsWith("/") ? raw : "/" + raw;
    }

    private String buildProductUrl(String slug) {
        if (slug == null || slug.isBlank()) return null;
        String base = publicBaseUrl != null ? publicBaseUrl.stripTrailing() : "http://localhost:3000";
        return base + "/products/" + slug;
    }
}
