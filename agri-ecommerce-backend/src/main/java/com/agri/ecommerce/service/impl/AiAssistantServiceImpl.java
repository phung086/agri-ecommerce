package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.dto.request.chat.AiAssistantRequest;
import com.agri.ecommerce.dto.response.chat.AiAssistantResponse;
import com.agri.ecommerce.dto.response.chat.ChatMessageResponse;
import com.agri.ecommerce.dto.response.product.ProductResponse;
import com.agri.ecommerce.entity.ChatMessageEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.ProductImageEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.mapper.ChatMessageMapper;
import com.agri.ecommerce.mapper.ProductMapper;
import com.agri.ecommerce.repository.ChatMessageRepository;
import com.agri.ecommerce.repository.ProductImageRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.service.AiAssistantService;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiAssistantServiceImpl implements AiAssistantService {

    private static final String SENDER_USER = "user";
    private static final String SENDER_BOT = "bot";
    private static final String IN_STOCK_STATUS = "in_stock";
    private static final int DEFAULT_LIMIT = 4;
    private static final int MAX_LIMIT = 8;
    private static final int CANDIDATE_MULTIPLIER = 10;
    private static final Pattern PRICE_PATTERN = Pattern.compile("(\\d[\\d.,]*)\\s*(k|nghin|ngan|vnd|dong)?");
    private static final Set<String> STOP_WORDS = Set.of(
            "toi", "minh", "ban", "can", "muon", "mua", "tim", "cho", "voi", "duoi", "tren", "tam", "khoang",
            "gia", "san", "pham", "hang", "loai", "gi", "la", "co", "khong", "duoc", "nhu", "the",
            "nao", "please", "help", "need", "want", "buy", "product", "price", "under", "about"
    );
    private static final Set<String> HEALTH_TERMS = Set.of(
            "chua benh", "tri benh", "dieu tri", "thuoc", "ung thu", "tieu duong", "huyet ap", "detox",
            "giam can", "than toc", "khoi benh", "doctor", "medicine", "cure"
    );

    private final ChatMessageRepository chatMessageRepository;

    private final ProductRepository productRepository;

    private final ProductImageRepository productImageRepository;

    private final UserRepository userRepository;

    private final ProductMapper productMapper;

    private final ChatMessageMapper chatMessageMapper;

    @Override
    @Transactional
    public AiAssistantResponse askGuest(AiAssistantRequest request) {
        String message = cleanRequiredMessage(request.getMessage());
        String guestToken = normalizeGuestTokenOrGenerate(request.getGuestToken());
        ChatMessageEntity userMessage = saveGuestMessage(guestToken, SENDER_USER, message);
        AssistantDraft draft = buildAssistantDraft(request, message);
        ChatMessageEntity assistantMessage = saveGuestMessage(guestToken, SENDER_BOT, draft.answer());

        return toResponse(guestToken, draft, userMessage, assistantMessage);
    }

    @Override
    @Transactional
    public AiAssistantResponse askCustomer(Long userId, AiAssistantRequest request) {
        UserEntity user = findUserById(userId);
        String message = cleanRequiredMessage(request.getMessage());
        ChatMessageEntity userMessage = saveCustomerMessage(user, SENDER_USER, message);
        AssistantDraft draft = buildAssistantDraft(request, message);
        ChatMessageEntity assistantMessage = saveCustomerMessage(user, SENDER_BOT, draft.answer());

        return toResponse(null, draft, userMessage, assistantMessage);
    }

    private AssistantDraft buildAssistantDraft(AiAssistantRequest request, String message) {
        String normalizedMessage = normalizeText(message);
        String intent = detectIntent(normalizedMessage);
        boolean safetyLimited = containsAny(normalizedMessage, HEALTH_TERMS);
        BigDecimal maxPrice = request.getMaxPrice() == null ? extractBudget(normalizedMessage) : request.getMaxPrice();
        int limit = normalizeLimit(request.getLimit());
        String categorySlug = cleanBlank(request.getCategorySlug());
        List<String> tokens = extractSearchTokens(normalizedMessage);
        List<ProductResponse> recommendedProducts = shouldRecommendProducts(intent, categorySlug, maxPrice)
                ? findRecommendedProducts(tokens, categorySlug, maxPrice, limit)
                : List.of();
        String answer = buildAnswer(intent, recommendedProducts, safetyLimited, maxPrice, categorySlug);

        return new AssistantDraft(intent, answer, recommendedProducts, buildNextActions(intent, recommendedProducts));
    }

    private List<ProductResponse> findRecommendedProducts(
            List<String> tokens,
            String categorySlug,
            BigDecimal maxPrice,
            int limit
    ) {
        Pageable pageable = PageRequest.of(
                0,
                Math.max(limit * CANDIDATE_MULTIPLIER, 24),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        List<ProductEntity> candidates = productRepository.findAll(
                buildProductSpecification(categorySlug, maxPrice),
                pageable
        ).getContent();

        if (candidates.isEmpty()) {
            return List.of();
        }

        List<ProductEntity> rankedProducts = candidates.stream()
                .map(product -> new ProductMatch(product, scoreProduct(product, tokens, maxPrice)))
                .filter(match -> tokens.isEmpty() || match.score() > 0)
                .sorted(Comparator
                        .comparingInt(ProductMatch::score).reversed()
                        .thenComparing(match -> match.product().getPrice())
                        .thenComparing(match -> match.product().getId(), Comparator.reverseOrder()))
                .limit(limit)
                .map(ProductMatch::product)
                .toList();

        List<ProductEntity> products = rankedProducts.isEmpty() ? candidates.stream().limit(limit).toList() : rankedProducts;
        Map<Long, List<ProductImageEntity>> imagesByProductId = getImagesByProductId(products);

        return products.stream()
                .map(product -> productMapper.toProductResponse(
                        product,
                        imagesByProductId.getOrDefault(product.getId(), List.of())
                ))
                .toList();
    }

    private Specification<ProductEntity> buildProductSpecification(String categorySlug, BigDecimal maxPrice) {
        return Specification
                .where(hasInStockStatus())
                .and(hasPositiveStock())
                .and(hasCategorySlug(categorySlug))
                .and(hasMaxPrice(maxPrice));
    }

    private Specification<ProductEntity> hasInStockStatus() {
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("status"), IN_STOCK_STATUS);
    }

    private Specification<ProductEntity> hasPositiveStock() {
        return (root, query, criteriaBuilder) -> criteriaBuilder.greaterThan(root.get("stock"), 0);
    }

    private Specification<ProductEntity> hasCategorySlug(String categorySlug) {
        return (root, query, criteriaBuilder) -> categorySlug == null
                ? criteriaBuilder.conjunction()
                : criteriaBuilder.equal(root.join("category", JoinType.INNER).get("slug"), categorySlug);
    }

    private Specification<ProductEntity> hasMaxPrice(BigDecimal maxPrice) {
        return (root, query, criteriaBuilder) -> maxPrice == null
                ? criteriaBuilder.conjunction()
                : criteriaBuilder.lessThanOrEqualTo(root.get("price"), maxPrice);
    }

    private int scoreProduct(ProductEntity product, List<String> tokens, BigDecimal maxPrice) {
        if (tokens.isEmpty()) {
            return 1;
        }

        String productText = normalizeText(String.join(" ",
                safe(product.getName()),
                safe(product.getDescription()),
                safe(product.getUnit()),
                product.getCategory() == null ? "" : safe(product.getCategory().getName()),
                product.getCategory() == null ? "" : safe(product.getCategory().getSlug())
        ));
        int score = 0;

        for (String token : tokens) {
            if (productText.contains(token)) {
                score += 3;
            }
            if (normalizeText(safe(product.getName())).contains(token)) {
                score += 4;
            }
            if (product.getCategory() != null && normalizeText(safe(product.getCategory().getName())).contains(token)) {
                score += 3;
            }
        }

        if (maxPrice != null && product.getPrice() != null && product.getPrice().compareTo(maxPrice) <= 0) {
            score += 2;
        }

        if (product.getStock() != null && product.getStock() > 0) {
            score += 1;
        }

        return score;
    }

    private String detectIntent(String normalizedMessage) {
        if (containsAny(normalizedMessage, Set.of("thanh toan", "payment", "paypal", "cod", "chuyen khoan", "tra tien"))) {
            return "payment_policy";
        }

        if (containsAny(normalizedMessage, Set.of("giao hang", "van chuyen", "ship", "shipping", "delivery", "nhan hang"))) {
            return "shipping_policy";
        }

        if (containsAny(normalizedMessage, Set.of("doi tra", "hoan tien", "tra hang", "refund", "return"))) {
            return "return_policy";
        }

        if (containsAny(normalizedMessage, Set.of("ma giam", "coupon", "discount", "khuyen mai", "uu dai"))) {
            return "coupon_help";
        }

        if (containsAny(normalizedMessage, Set.of("don hang", "order", "trang thai", "theo doi", "lich su"))) {
            return "order_status_help";
        }

        if (containsAny(normalizedMessage, Set.of("goi y", "tu van", "nen mua", "rau", "cu", "qua", "trai", "hat", "gao", "combo", "budget", "duoi", "gia"))) {
            return "product_recommendation";
        }

        return "general_support";
    }

    private String buildAnswer(
            String intent,
            List<ProductResponse> recommendedProducts,
            boolean safetyLimited,
            BigDecimal maxPrice,
            String categorySlug
    ) {
        String safetyPrefix = safetyLimited
                ? "Minh co the goi y thuc pham tuoi theo nhu cau mua sam, nhung khong khang dinh cong dung chua benh hoac thay the tu van y te. "
                : "";

        return safetyPrefix + switch (intent) {
            case "payment_policy" -> "AgriMarket hien ho tro COD va luong thanh toan online da ghi nhan qua payment API. Neu thanh toan online, don hang chi nen chuyen sang trang thai da thanh toan sau khi co ma giao dich hop le.";
            case "shipping_policy" -> "Sau khi dat hang, admin xac nhan don, phan nhan vien giao hang, roi shipper cap nhat out_for_delivery va delivered. Khach hang nen theo doi trang thai don trong tai khoan.";
            case "return_policy" -> "Voi nong san tuoi, yeu cau doi tra nen gui som kem thong tin don hang va hinh anh tinh trang san pham. Bo phan ho tro se kiem tra va phan hoi theo chinh sach cua shop.";
            case "coupon_help" -> "Ma giam gia duoc nhap o buoc checkout. He thong se kiem tra ma con hieu luc, chua het luot dung va tinh lai tong tien truoc khi tao don.";
            case "order_status_help" -> "Neu da dang nhap, ban co the xem lich su va trang thai don trong khu vuc tai khoan. Assistant khong tu y tra cuu thong tin rieng tu neu khong co ngu canh xac thuc.";
            case "product_recommendation" -> buildRecommendationAnswer(recommendedProducts, maxPrice, categorySlug);
            default -> "Minh co the ho tro tim san pham tuoi, goi y theo ngan sach, giai thich checkout, coupon, thanh toan, giao hang va doi tra. Ban co the hoi ro hon ve nhu cau mua sam.";
        };
    }

    private String buildRecommendationAnswer(
            List<ProductResponse> recommendedProducts,
            BigDecimal maxPrice,
            String categorySlug
    ) {
        if (recommendedProducts.isEmpty()) {
            return "Minh chua tim thay san pham phu hop voi bo loc hien tai. Hay thu mo rong ngan sach, bo category, hoac nhap ten san pham cu the hon.";
        }

        StringBuilder answer = new StringBuilder("Minh goi y ")
                .append(recommendedProducts.size())
                .append(" san pham dang con hang");

        if (categorySlug != null) {
            answer.append(" trong danh muc ").append(categorySlug);
        }

        if (maxPrice != null) {
            answer.append(" voi ngan sach toi da ").append(maxPrice.stripTrailingZeros().toPlainString()).append(" VND");
        }

        answer.append(". Ban co the mo chi tiet san pham, them vao gio hang, roi ap dung coupon o checkout neu co.");
        return answer.toString();
    }

    private List<String> buildNextActions(String intent, List<ProductResponse> recommendedProducts) {
        LinkedHashSet<String> actions = new LinkedHashSet<>();

        if (!recommendedProducts.isEmpty()) {
            actions.add("Open product detail by slug");
            actions.add("Add selected product to cart");
            actions.add("Ask again with a budget or category");
        } else if ("general_support".equals(intent)) {
            actions.add("Ask for product suggestions");
            actions.add("Ask about checkout, coupon, payment, or delivery");
            actions.add("Send a support contact request if the issue needs staff");
        } else {
            actions.add("Review the related policy in the account or checkout page");
            actions.add("Contact support if the case needs manual handling");
        }

        return new ArrayList<>(actions);
    }

    private boolean shouldRecommendProducts(String intent, String categorySlug, BigDecimal maxPrice) {
        return "product_recommendation".equals(intent)
                || categorySlug != null
                || ("general_support".equals(intent) && maxPrice != null);
    }

    private List<String> extractSearchTokens(String normalizedMessage) {
        return Pattern.compile("[a-z0-9]+")
                .matcher(normalizedMessage)
                .results()
                .map(match -> match.group().trim())
                .filter(token -> token.length() > 2)
                .filter(token -> !STOP_WORDS.contains(token))
                .filter(token -> token.chars().anyMatch(Character::isLetter))
                .distinct()
                .limit(8)
                .toList();
    }

    private BigDecimal extractBudget(String normalizedMessage) {
        if (!containsAny(normalizedMessage, Set.of("duoi", "tam", "khoang", "toi da", "gia", "ngan", "nghin", "vnd", "dong", "budget", "under"))) {
            return null;
        }

        Matcher matcher = PRICE_PATTERN.matcher(normalizedMessage);
        BigDecimal budget = null;

        while (matcher.find()) {
            String digits = matcher.group(1).replaceAll("[^0-9]", "");
            if (digits.isBlank()) {
                continue;
            }

            BigDecimal value = new BigDecimal(digits);
            String unit = matcher.group(2);
            if (unit != null && Set.of("k", "nghin", "ngan").contains(unit) && value.compareTo(BigDecimal.valueOf(1000)) < 0) {
                value = value.multiply(BigDecimal.valueOf(1000));
            }

            if (value.compareTo(BigDecimal.valueOf(1000)) >= 0) {
                budget = budget == null ? value : budget.max(value);
            }
        }

        return budget;
    }

    private boolean containsAny(String value, Set<String> terms) {
        return terms.stream().anyMatch(value::contains);
    }

    private AiAssistantResponse toResponse(
            String guestToken,
            AssistantDraft draft,
            ChatMessageEntity userMessage,
            ChatMessageEntity assistantMessage
    ) {
        ChatMessageResponse userMessageResponse = chatMessageMapper.toChatMessageResponse(userMessage);
        ChatMessageResponse assistantMessageResponse = chatMessageMapper.toChatMessageResponse(assistantMessage);

        return AiAssistantResponse.builder()
                .guestToken(guestToken)
                .intent(draft.intent())
                .answer(draft.answer())
                .recommendedProducts(draft.recommendedProducts())
                .userMessage(userMessageResponse)
                .assistantMessage(assistantMessageResponse)
                .nextActions(draft.nextActions())
                .build();
    }

    private ChatMessageEntity saveGuestMessage(String guestToken, String sender, String message) {
        return chatMessageRepository.save(ChatMessageEntity.builder()
                .guestToken(guestToken)
                .sender(sender)
                .message(message)
                .build());
    }

    private ChatMessageEntity saveCustomerMessage(UserEntity user, String sender, String message) {
        return chatMessageRepository.save(ChatMessageEntity.builder()
                .user(user)
                .sender(sender)
                .message(message)
                .build());
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

    private UserEntity findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_LIMIT;
        }

        if (limit < 1 || limit > MAX_LIMIT) {
            throw new BadRequestException("Limit must be between 1 and " + MAX_LIMIT);
        }

        return limit;
    }

    private String normalizeGuestTokenOrGenerate(String guestToken) {
        String normalizedGuestToken = cleanBlank(guestToken);
        if (normalizedGuestToken == null) {
            return "guest_" + UUID.randomUUID().toString().replace("-", "");
        }

        if (normalizedGuestToken.length() > 100) {
            throw new BadRequestException("Guest token must not exceed 100 characters");
        }

        return normalizedGuestToken;
    }

    private String cleanRequiredMessage(String message) {
        String cleanMessage = cleanBlank(message);
        if (cleanMessage == null) {
            throw new BadRequestException("Message must not be blank");
        }

        return cleanMessage;
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }

    private String normalizeText(String value) {
        if (value == null) {
            return "";
        }

        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT);

        return normalized.replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
    }

    private String safe(String value) {
        return Objects.toString(value, "");
    }

    private record AssistantDraft(
            String intent,
            String answer,
            List<ProductResponse> recommendedProducts,
            List<String> nextActions
    ) {
    }

    private record ProductMatch(ProductEntity product, int score) {
    }
}
