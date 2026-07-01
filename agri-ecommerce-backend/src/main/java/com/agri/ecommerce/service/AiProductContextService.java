package com.agri.ecommerce.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.agri.ecommerce.config.AiChatProperties;
import com.agri.ecommerce.dto.response.chat.SuggestedProductResponse;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.ProductImageEntity;
import com.agri.ecommerce.repository.ProductImageRepository;
import com.agri.ecommerce.repository.ProductRepository;
import dev.langchain4j.model.chat.ChatLanguageModel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service tìm sản phẩm liên quan và xây dựng context ngắn gọn cho LLM prompt.
 * Không nhồi toàn bộ products vào prompt — chỉ lọc sản phẩm phù hợp keyword/budget.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiProductContextService {

    private static final String IN_STOCK_STATUS = "in_stock";
    private static final Pattern PRICE_PATTERN =
            Pattern.compile("(\\d[\\d.,]*)\\s*(k|nghin|ngan|vnd|dong)?");
    private static final Set<String> BUDGET_KEYWORDS = Set.of(
            "duoi", "tam", "khoang", "toi da", "gia", "ngan", "nghin",
            "vnd", "dong", "budget", "under", "100k", "50k", "200k"
    );
    private static final Set<String> STOP_WORDS = Set.of(
            // Đại từ xưng hô, động từ hành vi mua sắm
            "toi", "minh", "ban", "can", "muon", "mua", "tim", "cho", "voi",
            "duoi", "tren", "tam", "khoang", "gia", "san", "pham", "hang",
            "loai", "gi", "la", "co", "khong", "duoc", "nhu", "the", "nao",
            "please", "help", "need", "want", "buy", "product", "price",
            // Từ nghi vấn & Trợ từ tiếng Việt
            "ha", "nhe", "nha", "a", "oi", "di", "chua", "roi", "dau", "sao",
            // Từ chỉ mục đích gợi ý / tư vấn / chất lượng
            "goi", "y", "ngan", "sach", "tu", "van", "tuoi", "ngon", "re", "tot",
            "nhat", "chat", "luong", "tiet", "kiem",
            // Từ chỉ đơn vị tiền tệ & số đếm phổ biến
            "vnd", "dong", "nghin", "trieu", "tram", "chuc", "mot", "hai"
    );

    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final AiChatProperties aiChatProperties;
    private final Optional<ChatLanguageModel> chatLanguageModel;

    @Value("${app.public.base-url:http://localhost:3000}")
    private String publicBaseUrl;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    private static class IntentParameters {
        private String keyword;
        private BigDecimal maxPrice;
        private String categorySlug;
    }

    private IntentParameters extractIntentWithLlm(String message) {
        if (chatLanguageModel.isEmpty()) {
            return null;
        }

        String prompt = """
                You are an AI assistant for an agricultural e-commerce store.
                Analyze the user's shopping request and extract search parameters in JSON format.
                JSON keys:
                - keyword: product name or product type keyword, for example "ca", "rau cai", "ca ngu". Return null if no specific product type is requested. Do not include quality descriptors such as fresh, clean, cheap, good, or budget words.
                - maxPrice: maximum price or budget in VND as a number. If the user says "100k", output 100000. Return null if no budget constraint is mentioned.
                - categorySlug: best matching category slug from: "rau-cu", "trai-cay", "thit", "ca", "thuc-pham-khac". Return null if not specific.

                Only return raw JSON. No markdown code blocks, no explanations.
                User request: "%s"
                """.formatted(message);

        try {
            String response = chatLanguageModel.get().chat(prompt);
            if (response == null || response.isBlank()) {
                return null;
            }

            String json = response.trim();
            if (json.startsWith("```")) {
                json = json.replaceAll("^```json\\s*", "")
                        .replaceAll("^```\\s*", "")
                        .replaceAll("\\s*```$", "");
            }

            return new ObjectMapper().readValue(json.trim(), IntentParameters.class);
        } catch (Exception ex) {
            log.warn("[AI Context] Could not extract intent with LLM: {}. Falling back to keyword parser", ex.getMessage());
            return null;
        }
    }

    /**
     * Tìm sản phẩm liên quan đến message và build danh sách SuggestedProductResponse.
     *
     * @param message   tin nhắn người dùng (raw)
     * @return danh sách sản phẩm gợi ý (max = AI_MAX_PRODUCTS_CONTEXT)
     */
    @Transactional(readOnly = true)
    public List<SuggestedProductResponse> findSuggestedProducts(String message) {
        String keyword = null;
        BigDecimal budget = null;
        String categorySlug = null;

        IntentParameters intent = extractIntentWithLlm(message);
        if (intent != null) {
            keyword = intent.getKeyword();
            budget = intent.getMaxPrice();
            categorySlug = intent.getCategorySlug();
            log.info("[AI Context] LLM intent extracted: keyword='{}', budget={}, categorySlug='{}'",
                    keyword, budget, categorySlug);
        } else {
            String normalized = normalizeText(message);
            budget = extractBudget(normalized);
            keyword = buildSearchKeyword(normalized);
            log.info("[AI Context] Fallback parser extracted: keyword='{}', budget={}", keyword, budget);
        }

        int limit = aiChatProperties.getMaxProductsContext();

        List<ProductEntity> products = productRepository.findPublicSearchSuggestions(
                keyword,
                categorySlug,
                budget,
                IN_STOCK_STATUS,
                PageRequest.of(0, limit)
        );

        if (products.isEmpty()) {
            log.debug("[AI Context] Không tìm thấy sản phẩm với keyword='{}', budget={}", keyword, budget);
            return List.of();
        }

        Map<Long, List<ProductImageEntity>> imageMap = loadImageMap(products);

        return products.stream()
                .map(p -> toSuggestedProduct(p, imageMap))
                .toList();
    }

    /**
     * Xây dựng chuỗi context ngắn gọn để đưa vào LLM prompt.
     * Format: tên | danh mục | giá | đơn vị | tồn kho | trạng thái | mô tả ngắn
     *
     * @param products danh sách sản phẩm cần build context
     * @return chuỗi context hoặc "(không có sản phẩm phù hợp)" nếu rỗng
     */
    public String buildProductContext(List<SuggestedProductResponse> products) {
        if (products.isEmpty()) {
            return "(Không tìm thấy sản phẩm phù hợp trong hệ thống)";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("Danh sách sản phẩm hiện có liên quan:\n");

        for (int i = 0; i < products.size(); i++) {
            SuggestedProductResponse p = products.get(i);
            sb.append(i + 1).append(". ");
            sb.append("**").append(p.getName()).append("**");

            if (p.getCategoryName() != null) {
                sb.append(" (").append(p.getCategoryName()).append(")");
            }

            sb.append(" — Giá: ").append(formatPrice(p.getPrice()));

            if (p.getUnit() != null) {
                sb.append("/").append(p.getUnit());
            }

            sb.append(" — Tồn kho: ").append(p.getStock() != null ? p.getStock() : "N/A");
            sb.append(" — Trạng thái: ").append(translateStatus(p.getStatus()));

            if (p.getProductUrl() != null) {
                sb.append(" — [Xem sản phẩm](").append(p.getProductUrl()).append(")");
            }

            sb.append("\n");
        }

        return sb.toString().trim();
    }

    // === Private helpers ===

    private SuggestedProductResponse toSuggestedProduct(
            ProductEntity product,
            Map<Long, List<ProductImageEntity>> imageMap
    ) {
        String imageUrl = resolveImageUrl(product, imageMap);
        String productUrl = buildProductUrl(product.getSlug());
        String categoryName = product.getCategory() != null
                ? product.getCategory().getName()
                : null;
        String categoryNameEn = product.getCategory() != null
                ? product.getCategory().getNameEn()
                : null;

        return SuggestedProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .nameEn(product.getNameEn())
                .slug(product.getSlug())
                .price(product.getPrice())
                .unit(product.getUnit())
                .unitEn(product.getUnitEn())
                .stock(product.getStock())
                .status(product.getStatus())
                .categoryName(categoryName)
                .categoryNameEn(categoryNameEn)
                .imageUrl(imageUrl)
                .productUrl(productUrl)
                .build();
    }

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

    private String resolveImageUrl(ProductEntity product, Map<Long, List<ProductImageEntity>> imageMap) {
        List<ProductImageEntity> images = imageMap.get(product.getId());
        if (images == null || images.isEmpty()) return null;
        String raw = images.get(0).getImage();
        if (raw == null || raw.isBlank()) return null;
        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
        // relative path → prepend public base URL of backend (uploads)
        return raw.startsWith("/") ? raw : "/" + raw;
    }

    private String buildProductUrl(String slug) {
        if (slug == null || slug.isBlank()) return null;
        String base = publicBaseUrl != null ? publicBaseUrl.stripTrailing() : "http://localhost:3000";
        return base + "/products/" + slug;
    }

    private String buildSearchKeyword(String normalizedMessage) {
        List<String> tokens = Pattern.compile("[a-z0-9]+")
                .matcher(normalizedMessage)
                .results()
                .map(m -> m.group().trim())
                .filter(t -> t.length() >= 2) // Giảm xuống 2 để giữ các từ ngắn tiếng Việt (cá, lê, bơ, hẹ...)
                .filter(t -> !STOP_WORDS.contains(t))
                .filter(t -> !t.matches(".*\\d.*")) // Loại bỏ các từ chứa số (như 100k, 50k, 100, 2...)
                .filter(t -> t.chars().anyMatch(Character::isLetter))
                .distinct()
                .limit(4)
                .toList();

        return tokens.isEmpty() ? null : String.join(" ", tokens);
    }

    BigDecimal extractBudget(String normalizedMessage) {
        boolean hasBudgetContext = BUDGET_KEYWORDS.stream()
                .anyMatch(normalizedMessage::contains);

        if (!hasBudgetContext) return null;

        Matcher matcher = PRICE_PATTERN.matcher(normalizedMessage);
        BigDecimal budget = null;

        while (matcher.find()) {
            String digits = matcher.group(1).replaceAll("[^0-9]", "");
            if (digits.isBlank()) continue;

            BigDecimal value = new BigDecimal(digits);
            String unit = matcher.group(2);

            if (unit != null
                    && Set.of("k", "nghin", "ngan").contains(unit)
                    && value.compareTo(BigDecimal.valueOf(1000)) < 0) {
                value = value.multiply(BigDecimal.valueOf(1000));
            }

            if (value.compareTo(BigDecimal.valueOf(1000)) >= 0) {
                budget = (budget == null) ? value : budget.max(value);
            }
        }

        return budget;
    }

    String normalizeText(String value) {
        if (value == null) return "";
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT);
        return normalized.replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
    }

    private String formatPrice(BigDecimal price) {
        if (price == null) return "Liên hệ";
        long val = price.longValue();
        if (val >= 1000) {
            return String.format("%,.0f đ", price.doubleValue());
        }
        return price.toPlainString() + " đ";
    }

    private String translateStatus(String status) {
        if (status == null) return "Không rõ";
        return switch (status) {
            case "in_stock" -> "Còn hàng";
            case "out_of_stock" -> "Hết hàng";
            case "discontinued" -> "Ngừng kinh doanh";
            default -> status;
        };
    }
}
