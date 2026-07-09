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
import com.agri.ecommerce.repository.ProductImageRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.repository.UserRepository;
import dev.langchain4j.agent.tool.Tool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
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

    public static final ThreadLocal<Long> currentUserIdHolder = new ThreadLocal<>();

    public static final ThreadLocal<String> currentRoleHolder =
            ThreadLocal.withInitial(() -> "GUEST");

    public static final ThreadLocal<String> currentPathHolder = new ThreadLocal<>();

    public static final ThreadLocal<String> audienceHolder = new ThreadLocal<>();

    public static final ThreadLocal<String> contextTypeHolder = new ThreadLocal<>();

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final CouponRepository couponRepository;
    private final OrderRepository orderRepository;
    private final ProductImageRepository productImageRepository;
    private final UserRepository userRepository;

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

    @Tool("Lấy danh sách đơn hàng gần đây của người dùng đang đăng nhập. Không nhận userId từ câu hỏi; dữ liệu luôn được giới hạn theo JWT hiện tại.")
    public List<Map<String, Object>> getMyOrderHistory() {
        Long currentUserId = requireCurrentUserId();
        log.info("[AI Tool] Gọi getMyOrderHistory cho currentUserId={}, role={}", currentUserId, currentRole());
        if (currentUserId == null) {
            return List.of(Map.of("error", "Bạn cần đăng nhập để xem đơn hàng của mình."));
        }

        List<OrderEntity> orders = orderRepository.findByUser_Id(currentUserId, PageRequest.of(0, 10)).getContent();
        return orders.stream().map(o -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", o.getId());
            map.put("orderNumber", o.getId());
            map.put("status", o.getStatus());
            map.put("totalPrice", o.getTotalPrice());
            map.put("createdAt", o.getCreatedAt());
            return map;
        }).collect(Collectors.toList());
    }

    @Tool("Lấy thông tin tài khoản thành viên của người dùng đang đăng nhập, gồm điểm tích lũy, hạng thành viên và tổng chi tiêu. Không nhận userId từ câu hỏi; dữ liệu luôn được giới hạn theo JWT hiện tại.")
    public Map<String, Object> getMyUserProfile() {
        Long currentUserId = requireCurrentUserId();
        log.info("[AI Tool] Gọi getMyUserProfile cho currentUserId={}, role={}", currentUserId, currentRole());
        if (currentUserId == null) {
            return Map.of("error", "Bạn cần đăng nhập để xem thông tin tài khoản của mình.");
        }

        return userRepository.findById(currentUserId).map(user -> {
            java.time.LocalDateTime allTimeStart = java.time.LocalDateTime.of(2000, 1, 1, 0, 0);
            java.math.BigDecimal totalSpent = orderRepository.calculateTotalSpendingSince(currentUserId, allTimeStart);
            if (totalSpent == null) {
                totalSpent = java.math.BigDecimal.ZERO;
            }

            Map<String, Object> map = new HashMap<>();
            map.put("id", user.getId());
            map.put("name", user.getName());
            map.put("email", user.getEmail());
            map.put("phone", user.getPhoneNumber());
            map.put("points", user.getLoyaltyPoints() != null ? user.getLoyaltyPoints() : 0);
            map.put("membershipTier", user.getMembershipTier() != null ? user.getMembershipTier() : "BRONZE");
            map.put("totalSpent", totalSpent);

            java.math.BigDecimal silverThreshold = new java.math.BigDecimal("1000000.00");
            java.math.BigDecimal goldThreshold = new java.math.BigDecimal("2500000.00");
            java.math.BigDecimal platinumThreshold = new java.math.BigDecimal("4000000.00");

            map.put("silverThreshold", silverThreshold);
            map.put("goldThreshold", goldThreshold);
            map.put("platinumThreshold", platinumThreshold);

            return map;
        }).orElse(Map.of("error", "Không tìm thấy người dùng."));
    }

    @Tool("Lấy cấu hình các hạng thành viên bao gồm chi tiêu tối thiểu yêu cầu cho hạng Đồng (Bronze), Bạc (Silver), Vàng (Gold), và Kim Cương (Platinum)")
    public Map<String, Object> getLoyaltyConfiguration() {
        log.info("[AI Tool] Gọi getLoyaltyConfiguration");
        Map<String, Object> map = new HashMap<>();
        map.put("bronzeThreshold", new java.math.BigDecimal("500000.00"));
        map.put("silverThreshold", new java.math.BigDecimal("1000000.00"));
        map.put("goldThreshold", new java.math.BigDecimal("2500000.00"));
        map.put("platinumThreshold", new java.math.BigDecimal("4000000.00"));
        return map;
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

    private Long requireCurrentUserId() {
        return currentUserIdHolder.get();
    }

    private boolean isGuest() {
        return requireCurrentUserId() == null || "GUEST".equalsIgnoreCase(currentRole());
    }

    private boolean isAdminOrStaff() {
        String role = currentRole();
        return "ADMIN".equalsIgnoreCase(role) || "STAFF".equalsIgnoreCase(role);
    }

    private String currentRole() {
        String role = currentRoleHolder.get();
        return role == null || role.isBlank() ? "GUEST" : role;
    }
}
