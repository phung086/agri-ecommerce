package com.agri.ecommerce.scheduler;

import com.agri.ecommerce.entity.CouponEntity;
import com.agri.ecommerce.entity.InventoryBatchEntity;
import com.agri.ecommerce.entity.InventoryTransactionEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.repository.CouponRepository;
import com.agri.ecommerce.repository.InventoryBatchRepository;
import com.agri.ecommerce.repository.InventoryTransactionRepository;
import com.agri.ecommerce.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Slf4j
@Component
@RequiredArgsConstructor
public class InventoryScheduler {

    private static final int NEAR_EXPIRY_THRESHOLD_DAYS = 3;
    private static final int MIN_NEAR_EXPIRY_STOCK_FOR_COUPON = 5;
    private static final String COUPON_TYPE_PRODUCT_DISCOUNT = "PRODUCT_DISCOUNT";
    private static final String DISCOUNT_TYPE_PERCENTAGE = "PERCENTAGE";
    private static final String DISCOUNT_TYPE_FIXED_AMOUNT = "FIXED_AMOUNT";
    private static final DateTimeFormatter COUPON_CODE_DATE_FORMAT = DateTimeFormatter.ofPattern("ddMM");

    private final InventoryBatchRepository inventoryBatchRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final ProductRepository productRepository;
    private final CouponRepository couponRepository;

    @Scheduled(cron = "0 0 1 * * ?") // Runs every day at 1 AM
    @Transactional
    public void runDailyInventoryScan() {
        log.info("[Inventory Scheduler] Starting daily inventory scan at {}", LocalDateTime.now());
        scanExpiredBatches();
        scanNearExpiryBatchesAndCreateCoupons();
        log.info("[Inventory Scheduler] Daily inventory scan completed successfully.");
    }

    @Transactional
    public void scanExpiredBatches() {
        LocalDateTime now = LocalDateTime.now();
        List<InventoryBatchEntity> expiredBatches = inventoryBatchRepository.findExpiredBatchesWithStock(now);
        
        log.info("[Inventory Scheduler] Found {} expired batches with positive remaining quantity.", expiredBatches.size());
        
        for (InventoryBatchEntity batch : expiredBatches) {
            ProductEntity product = batch.getProduct();
            int expiredQty = batch.getRemainingQuantity();
            
            // 1. Zero out batch stock
            batch.setRemainingQuantity(0);
            inventoryBatchRepository.save(batch);
            
            // 2. Log expired transaction
            inventoryTransactionRepository.save(InventoryTransactionEntity.builder()
                    .product(product)
                    .batch(batch)
                    .quantity(-expiredQty)
                    .type("EXPORT_EXPIRED")
                    .note("Hủy hàng quá hạn sử dụng (Batch #" + batch.getBatchNumber() + ")")
                    .build());
            
            // 3. Deduct total product stock
            int currentStock = product.getStock() == null ? 0 : product.getStock();
            int updatedStock = Math.max(0, currentStock - expiredQty);
            product.setStock(updatedStock);
            if (updatedStock == 0) {
                product.setStatus("out_of_stock");
            }
            productRepository.save(product);
            
            log.info("[Inventory Scheduler] Cleared {} expired units of product '{}' (Batch #{})", 
                    expiredQty, product.getName(), batch.getBatchNumber());
        }
    }

    @Transactional
    public void scanNearExpiryBatchesAndCreateCoupons() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime threshold = now.plusDays(NEAR_EXPIRY_THRESHOLD_DAYS);
        
        List<ProductEntity> products = productRepository.findAll();
        for (ProductEntity product : products) {
            List<InventoryBatchEntity> nearExpiryBatches = inventoryBatchRepository.findNearExpiryBatches(product.getId(), now, threshold);
            List<CouponEntity> existingAutoCoupons = couponRepository.findInventoryAutoCouponsByProductId(product.getId());
            if (nearExpiryBatches.isEmpty()) {
                deactivateAutoCoupons(existingAutoCoupons, product, "no near-expiry stock");
                continue;
            }
            
            int totalNearExpiryStock = nearExpiryBatches.stream()
                    .mapToInt(InventoryBatchEntity::getRemainingQuantity)
                    .sum();

            if (totalNearExpiryStock < MIN_NEAR_EXPIRY_STOCK_FOR_COUPON) {
                deactivateAutoCoupons(existingAutoCoupons, product, "near-expiry stock below threshold");
                continue;
            }
            
            InventoryBatchEntity earliestBatch = nearExpiryBatches.get(0);
            CouponDiscountRule discountRule = resolveDiscountRule(product, earliestBatch);
            String couponCode = resolveUniqueCouponCode(buildFriendlyCouponCode(product, earliestBatch), product.getId(), existingAutoCoupons);
            CouponEntity coupon = findReusableAutoCoupon(existingAutoCoupons, couponCode);

            if (coupon == null && couponRepository.existsByCodeIgnoreCase(couponCode)) {
                log.warn("[Inventory Scheduler] Skipping auto coupon for product '{}' because code '{}' already exists.",
                        product.getName(), couponCode);
                continue;
            }

            boolean created = coupon == null;
            if (created) {
                coupon = CouponEntity.builder()
                        .timesUsed(0)
                        .build();
            }

            coupon.setCode(couponCode);
            coupon.setCouponType(COUPON_TYPE_PRODUCT_DISCOUNT);
            coupon.setDiscountType(discountRule.discountType());
            coupon.setDiscountPercentage(discountRule.discountPercentage());
            coupon.setDiscountAmount(discountRule.discountAmount());
            coupon.setProductId(product.getId());
            coupon.setMinOrderValue(BigDecimal.ZERO);
            coupon.setStartsAt(now);
            coupon.setExpiresAt(earliestBatch.getExpiryDate());
            coupon.setUsageLimit(totalNearExpiryStock);
            coupon.setActive(true);
            if (coupon.getTimesUsed() == null) {
                coupon.setTimesUsed(0);
            }

            CouponEntity savedCoupon = couponRepository.save(coupon);
            deactivateDuplicateAutoCoupons(existingAutoCoupons, savedCoupon);

            log.info("[Inventory Scheduler] Auto-{} product freshness coupon '{}' ({}) for product '{}' (near-expiry stock: {})",
                    created ? "created" : "updated",
                    couponCode,
                    discountRule.label(),
                    product.getName(),
                    totalNearExpiryStock);
        }
    }

    private CouponEntity findReusableAutoCoupon(List<CouponEntity> existingAutoCoupons, String couponCode) {
        return existingAutoCoupons.stream()
                .filter(coupon -> coupon.getCode() != null && coupon.getCode().equalsIgnoreCase(couponCode))
                .findFirst()
                .orElseGet(() -> existingAutoCoupons.stream().findFirst().orElse(null));
    }

    private void deactivateAutoCoupons(List<CouponEntity> coupons, ProductEntity product, String reason) {
        List<CouponEntity> activeCoupons = coupons.stream()
                .filter(coupon -> Boolean.TRUE.equals(coupon.getActive()))
                .toList();
        if (activeCoupons.isEmpty()) {
            return;
        }

        activeCoupons.forEach(coupon -> coupon.setActive(false));
        couponRepository.saveAll(activeCoupons);
        log.info("[Inventory Scheduler] Deactivated {} auto coupon(s) for product '{}' because {}.",
                activeCoupons.size(), product.getName(), reason);
    }

    private void deactivateDuplicateAutoCoupons(List<CouponEntity> existingAutoCoupons, CouponEntity savedCoupon) {
        if (savedCoupon.getId() == null) {
            return;
        }

        List<CouponEntity> duplicateCoupons = existingAutoCoupons.stream()
                .filter(coupon -> coupon.getId() != null)
                .filter(coupon -> !coupon.getId().equals(savedCoupon.getId()))
                .filter(coupon -> Boolean.TRUE.equals(coupon.getActive()))
                .toList();
        if (duplicateCoupons.isEmpty()) {
            return;
        }

        duplicateCoupons.forEach(coupon -> coupon.setActive(false));
        couponRepository.saveAll(duplicateCoupons);
    }

    private String resolveUniqueCouponCode(String preferredCode, Long productId, List<CouponEntity> existingAutoCoupons) {
        Long reusableCouponId = existingAutoCoupons.stream()
                .filter(coupon -> coupon.getCode() != null && coupon.getCode().equalsIgnoreCase(preferredCode))
                .map(CouponEntity::getId)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);

        if (reusableCouponId == null) {
            reusableCouponId = existingAutoCoupons.stream()
                    .map(CouponEntity::getId)
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse(null);
        }

        boolean duplicated = reusableCouponId == null
                ? couponRepository.existsByCodeIgnoreCase(preferredCode)
                : couponRepository.existsByCodeIgnoreCaseAndIdNot(preferredCode, reusableCouponId);
        if (!duplicated) {
            return preferredCode;
        }

        String fallbackCode = preferredCode + "_P" + (productId == null ? "SP" : productId);
        boolean fallbackDuplicated = reusableCouponId == null
                ? couponRepository.existsByCodeIgnoreCase(fallbackCode)
                : couponRepository.existsByCodeIgnoreCaseAndIdNot(fallbackCode, reusableCouponId);
        return fallbackDuplicated ? preferredCode : fallbackCode;
    }

    private CouponDiscountRule resolveDiscountRule(ProductEntity product, InventoryBatchEntity earliestBatch) {
        long daysLeft = Math.max(
                0,
                ChronoUnit.DAYS.between(LocalDateTime.now().toLocalDate(), earliestBatch.getExpiryDate().toLocalDate())
        );
        ProductGroup group = classifyProduct(product);
        BigDecimal price = product.getPrice() == null ? BigDecimal.ZERO : product.getPrice();

        if ((group == ProductGroup.VEGETABLE || group == ProductGroup.FRUIT)
                && price.compareTo(new BigDecimal("60000")) <= 0) {
            BigDecimal amount = daysLeft <= 1
                    ? new BigDecimal("12000.00")
                    : daysLeft <= 2 ? new BigDecimal("10000.00") : new BigDecimal("8000.00");
            return CouponDiscountRule.fixedAmount(capFixedDiscount(amount, price));
        }

        if (price.compareTo(new BigDecimal("40000")) <= 0) {
            BigDecimal amount = daysLeft <= 1
                    ? new BigDecimal("10000.00")
                    : daysLeft <= 2 ? new BigDecimal("8000.00") : new BigDecimal("5000.00");
            return CouponDiscountRule.fixedAmount(capFixedDiscount(amount, price));
        }

        int percentage = switch (group) {
            case SEAFOOD, MEAT -> daysLeft <= 1 ? 35 : daysLeft <= 2 ? 30 : 25;
            case VEGETABLE, FRUIT -> daysLeft <= 1 ? 30 : daysLeft <= 2 ? 25 : 20;
            case OTHER -> daysLeft <= 1 ? 25 : daysLeft <= 2 ? 20 : 15;
        };
        return CouponDiscountRule.percentage(percentage);
    }

    private BigDecimal capFixedDiscount(BigDecimal preferredAmount, BigDecimal productPrice) {
        if (productPrice == null || productPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return preferredAmount;
        }

        BigDecimal maxReasonableDiscount = productPrice
                .multiply(new BigDecimal("0.40"))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal cappedAmount = preferredAmount.min(maxReasonableDiscount);
        return cappedAmount.setScale(2, RoundingMode.HALF_UP);
    }

    private String buildFriendlyCouponCode(ProductEntity product, InventoryBatchEntity earliestBatch) {
        return campaignPrefix(product)
                + "_"
                + productCodeToken(product)
                + "_"
                + earliestBatch.getExpiryDate().format(COUPON_CODE_DATE_FORMAT);
    }

    private String campaignPrefix(ProductEntity product) {
        ProductGroup group = classifyProduct(product);
        return switch (group) {
            case SEAFOOD, MEAT -> "BEP_NHA";
            case VEGETABLE, FRUIT -> "TUOI_NGON";
            case OTHER -> "MON_NGON";
        };
    }

    private ProductGroup classifyProduct(ProductEntity product) {
        String text = normalizeText(String.join(" ",
                nullToBlank(product.getName()),
                nullToBlank(product.getSlug()),
                product.getCategory() == null ? "" : nullToBlank(product.getCategory().getName()),
                product.getCategory() == null ? "" : nullToBlank(product.getCategory().getSlug())
        )).replaceAll("[^a-z0-9]+", " ").replaceAll("\\s+", " ").trim();

        if (containsAny(text, "ca ngu", "ca loc", "ca dieu hong", "ca basa", "ca chim", "ca hoi",
                "fish", "hai san", "seafood", "tom", "muc", "cua", "ghe")) {
            return ProductGroup.SEAFOOD;
        }
        if (containsAny(text, "thit", "meat", "bo", "ga", "heo", "lon")) {
            return ProductGroup.MEAT;
        }
        if (containsAny(text, "rau", "cu", "vegetable", "salad", "bap cai", "cai", "xa lach")) {
            return ProductGroup.VEGETABLE;
        }
        if (containsAny(text, "trai cay", "qua", "fruit", "chuoi", "cam", "tao", "dua")) {
            return ProductGroup.FRUIT;
        }
        return ProductGroup.OTHER;
    }

    private boolean containsAny(String text, String... keywords) {
        String paddedText = " " + text + " ";
        for (String keyword : keywords) {
            if (paddedText.contains(" " + keyword + " ")) {
                return true;
            }
        }
        return false;
    }

    private String productCodeToken(ProductEntity product) {
        String rawValue = firstNonBlank(product.getSlug(), product.getName(), "SAN_PHAM");
        String normalized = normalizeText(rawValue)
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
        if (normalized.isBlank()) {
            normalized = "SAN_PHAM";
        }

        if (normalized.length() > 24) {
            normalized = normalized.substring(0, 24).replaceAll("_+$", "");
        }
        return normalized;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private String normalizeText(String value) {
        String safeValue = nullToBlank(value)
                .replace('\u0111', 'd')
                .replace('\u0110', 'D');
        return Normalizer.normalize(safeValue, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    private enum ProductGroup {
        SEAFOOD,
        MEAT,
        VEGETABLE,
        FRUIT,
        OTHER
    }

    private record CouponDiscountRule(
            String discountType,
            Integer discountPercentage,
            BigDecimal discountAmount
    ) {
        static CouponDiscountRule percentage(int percentage) {
            return new CouponDiscountRule(DISCOUNT_TYPE_PERCENTAGE, percentage, null);
        }

        static CouponDiscountRule fixedAmount(BigDecimal amount) {
            return new CouponDiscountRule(DISCOUNT_TYPE_FIXED_AMOUNT, 0, amount);
        }

        String label() {
            if (DISCOUNT_TYPE_FIXED_AMOUNT.equals(discountType)) {
                return "fixed " + discountAmount.toPlainString() + " VND";
            }
            return discountPercentage + "% off";
        }
    }
}
