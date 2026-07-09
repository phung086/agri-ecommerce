package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.response.inventory.InventorySummaryResponse;
import com.agri.ecommerce.entity.CategoryEntity;
import com.agri.ecommerce.entity.CouponEntity;
import com.agri.ecommerce.entity.InventoryBatchEntity;
import com.agri.ecommerce.entity.InventoryTransactionEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.repository.CouponRepository;
import com.agri.ecommerce.repository.InventoryBatchRepository;
import com.agri.ecommerce.repository.InventoryTransactionRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.service.AdminInventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminInventoryDemoService {

    private static final String BATCH_ACTIVE = "ACTIVE";
    private static final String BATCH_NEAR_EXPIRY = "NEAR_EXPIRY";
    private static final String BATCH_EXPIRED = "EXPIRED";
    private static final String BATCH_DEPLETED = "DEPLETED";
    private static final String BATCH_NEED_DATE_UPDATE = "NEED_DATE_UPDATE";
    private static final int DEFAULT_LOW_STOCK_THRESHOLD = 10;
    private static final int DEFAULT_NEAR_EXPIRY_DAYS = 3;

    private final ProductRepository productRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final CouponRepository couponRepository;
    private final AdminInventoryService adminInventoryService;

    /**
     * Demo helper for graduation/testing environments.
     * It fills missing NSX/HSD/NCC/location for legacy batches without changing product quantities.
     */
    @Transactional
    public InventorySummaryResponse seedDemoInventoryData() {
        LocalDateTime now = LocalDateTime.now();
        List<InventoryBatchEntity> batches = inventoryBatchRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
        int index = 0;

        for (InventoryBatchEntity batch : batches) {
            if (!shouldFillDemoData(batch)) {
                index++;
                continue;
            }

            ProductEntity product = batch.getProduct();
            int daysToExpiry = demoDaysToExpiry(product, index);
            LocalDateTime manufactureDate = now.minusDays(demoManufactureAge(product, index)).withHour(6).withMinute(0).withSecond(0).withNano(0);
            LocalDateTime receivedAt = manufactureDate.plusDays(1).withHour(8 + (index % 5)).withMinute(30).withSecond(0).withNano(0);
            LocalDateTime expiryDate = now.plusDays(daysToExpiry).withHour(23).withMinute(59).withSecond(0).withNano(0);

            batch.setManufactureDate(manufactureDate);
            batch.setReceivedAt(receivedAt);
            batch.setExpiryDate(expiryDate);
            batch.setSupplierName(demoSupplierName(product, index));
            batch.setStorageLocation(demoStorageLocation(product, index));
            batch.setStatus(computeBatchStatus(batch.getRemainingQuantity(), expiryDate));
            batch.setNote("Dữ liệu demo kho: đã bổ sung ngày nhập, ngày sản xuất, hạn sử dụng, NCC và vị trí lưu trữ.");
            InventoryBatchEntity savedBatch = inventoryBatchRepository.save(batch);

            recordTransaction(
                    product,
                    savedBatch,
                    0,
                    "DEMO_DATE_UPDATE",
                    safeStock(product),
                    safeStock(product),
                    "Bổ sung dữ liệu demo NSX/HSD/NCC/vị trí cho lô hàng",
                    "BATCH",
                    savedBatch.getId()
            );

            syncProductSnapshot(product);
            productRepository.save(product);
            index++;
        }

        return adminInventoryService.getSummary(DEFAULT_LOW_STOCK_THRESHOLD);
    }

    /**
     * Creates product-specific coupons for products that have near-expiry batches.
     * This models a real clearance workflow: detect batches close to expiry, then create a campaign to push demand.
     */
    @Transactional
    public Map<String, Object> generateNearExpiryCoupons(Integer days, Integer discountPercentage) {
        int safeDays = days == null ? DEFAULT_NEAR_EXPIRY_DAYS : Math.max(days, 1);
        int safeDiscount = discountPercentage == null ? 20 : Math.min(Math.max(discountPercentage, 5), 70);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime threshold = now.plusDays(safeDays);

        List<InventoryBatchEntity> nearExpiryBatches = inventoryBatchRepository.findAll(Sort.by(Sort.Direction.ASC, "expiryDate"))
                .stream()
                .filter(batch -> safeRemaining(batch) > 0)
                .filter(batch -> batch.getProduct() != null)
                .filter(batch -> batch.getExpiryDate() != null)
                .filter(batch -> batch.getExpiryDate().isAfter(now) && !batch.getExpiryDate().isAfter(threshold))
                .toList();

        Map<Long, List<InventoryBatchEntity>> batchesByProduct = nearExpiryBatches.stream()
                .collect(Collectors.groupingBy(batch -> batch.getProduct().getId(), LinkedHashMap::new, Collectors.toList()));

        List<String> couponCodes = batchesByProduct.entrySet().stream()
                .map(entry -> createOrUpdateClearanceCoupon(entry.getValue(), safeDiscount, safeDays, now))
                .filter(Objects::nonNull)
                .toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("days", safeDays);
        response.put("discountPercentage", safeDiscount);
        response.put("nearExpiryBatchCount", nearExpiryBatches.size());
        response.put("affectedProductCount", batchesByProduct.size());
        response.put("createdOrUpdatedCouponCount", couponCodes.size());
        response.put("couponCodes", couponCodes);
        return response;
    }

    private boolean shouldFillDemoData(InventoryBatchEntity batch) {
        if (batch == null || safeRemaining(batch) <= 0) {
            return false;
        }
        return batch.getExpiryDate() == null
                || batch.getManufactureDate() == null
                || isBlank(batch.getSupplierName())
                || isBlank(batch.getStorageLocation())
                || BATCH_NEED_DATE_UPDATE.equalsIgnoreCase(batch.getStatus());
    }

    private int demoDaysToExpiry(ProductEntity product, int index) {
        String categoryText = categoryText(product);
        if (categoryText.contains("cá") || categoryText.contains("fish") || categoryText.contains("thịt") || categoryText.contains("meat")) {
            int[] pattern = {1, 2, 4, 6, 9};
            return pattern[index % pattern.length];
        }
        if (categoryText.contains("rau") || categoryText.contains("vegetable") || categoryText.contains("quả") || categoryText.contains("fruit")) {
            int[] pattern = {2, 3, 5, 7, 10};
            return pattern[index % pattern.length];
        }
        int[] pattern = {3, 5, 8, 12, 15};
        return pattern[index % pattern.length];
    }

    private int demoManufactureAge(ProductEntity product, int index) {
        String categoryText = categoryText(product);
        if (categoryText.contains("cá") || categoryText.contains("fish") || categoryText.contains("thịt") || categoryText.contains("meat")) {
            return 1 + (index % 2);
        }
        if (categoryText.contains("rau") || categoryText.contains("vegetable") || categoryText.contains("quả") || categoryText.contains("fruit")) {
            return 2 + (index % 3);
        }
        return 3 + (index % 4);
    }

    private String demoSupplierName(ProductEntity product, int index) {
        String categoryText = categoryText(product);
        if (categoryText.contains("cá") || categoryText.contains("fish")) {
            return index % 2 == 0 ? "Trại cá sạch Ba Vì" : "HTX Thủy sản Sông Đà";
        }
        if (categoryText.contains("thịt") || categoryText.contains("meat")) {
            return index % 2 == 0 ? "Trang trại thịt sạch Hòa Bình" : "Nông trại hữu cơ Sóc Sơn";
        }
        if (categoryText.contains("rau") || categoryText.contains("vegetable")) {
            return index % 2 == 0 ? "HTX Rau sạch Hà Đông" : "Vườn rau hữu cơ Mê Linh";
        }
        if (categoryText.contains("quả") || categoryText.contains("fruit")) {
            return index % 2 == 0 ? "Vườn trái cây Sơn La" : "Trang trại nông sản Mộc Châu";
        }
        return "AgriMarket Fresh Farm";
    }

    private String demoStorageLocation(ProductEntity product, int index) {
        String categoryText = categoryText(product);
        String zone;
        if (categoryText.contains("cá") || categoryText.contains("fish")) {
            zone = "Kho lạnh C";
        } else if (categoryText.contains("thịt") || categoryText.contains("meat")) {
            zone = "Kho lạnh B";
        } else if (categoryText.contains("rau") || categoryText.contains("vegetable") || categoryText.contains("quả") || categoryText.contains("fruit")) {
            zone = "Kho mát A";
        } else {
            zone = "Kho khô D";
        }
        return zone + " - Kệ " + String.format(Locale.ROOT, "%02d", (index % 12) + 1);
    }

    private String createOrUpdateClearanceCoupon(List<InventoryBatchEntity> batches, int discountPercentage, int days, LocalDateTime now) {
        if (batches == null || batches.isEmpty() || batches.getFirst().getProduct() == null) {
            return null;
        }
        ProductEntity product = batches.getFirst().getProduct();
        LocalDateTime earliestExpiry = batches.stream()
                .map(InventoryBatchEntity::getExpiryDate)
                .filter(Objects::nonNull)
                .min(LocalDateTime::compareTo)
                .orElse(now.plusDays(days));
        String code = "XA_HANG_" + product.getId() + "_" + now.format(DateTimeFormatter.ofPattern("MMdd"));

        CouponEntity coupon = couponRepository.findByCodeIgnoreCase(code)
                .orElseGet(() -> CouponEntity.builder()
                        .code(code)
                        .timesUsed(0)
                        .build());
        coupon.setProductId(product.getId());
        coupon.setCouponType("PRODUCT_DISCOUNT");
        coupon.setDiscountType("PERCENTAGE");
        coupon.setDiscountPercentage(discountPercentage);
        coupon.setDiscountAmount(null);
        coupon.setMinOrderValue(BigDecimal.ZERO);
        coupon.setStartsAt(now.minusMinutes(5));
        coupon.setExpiresAt(earliestExpiry.isBefore(now.plusDays(days)) ? earliestExpiry : now.plusDays(days));
        coupon.setUsageLimit(Math.max(10, batches.stream().mapToInt(this::safeRemaining).sum()));
        coupon.setActive(true);
        coupon.setGuestAllowed(true);
        coupon.setRequiredMembershipTier(null);
        couponRepository.save(coupon);
        return code;
    }

    private void syncProductSnapshot(ProductEntity product) {
        List<InventoryBatchEntity> batches = inventoryBatchRepository.findByProduct_Id(product.getId(), Sort.by(Sort.Direction.ASC, "expiryDate"));
        int trackedStock = batches.stream().filter(this::countsAsTrackedStock).mapToInt(this::safeRemaining).sum();
        product.setStock(trackedStock);
        product.setLatestImportDate(latestDate(batches.stream().map(InventoryBatchEntity::getReceivedAt).toList()));
        product.setLatestManufactureDate(latestDate(batches.stream().map(InventoryBatchEntity::getManufactureDate).toList()));
        product.setEarliestExpiryDate(earliestExpiry(batches));
        product.setFreshnessStatus(resolveProductFreshnessStatus(batches));
        if (!"hidden".equals(product.getStatus())) {
            product.setStatus(trackedStock <= 0 ? "out_of_stock" : "in_stock");
        }
    }

    private void recordTransaction(ProductEntity product, InventoryBatchEntity batch, int quantity, String type, int previousStock, int newStock, String note, String referenceType, Long referenceId) {
        inventoryTransactionRepository.save(InventoryTransactionEntity.builder()
                .product(product)
                .batch(batch)
                .quantity(quantity)
                .type(type)
                .previousStock(previousStock)
                .newStock(newStock)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .note(note)
                .build());
    }

    private boolean countsAsTrackedStock(InventoryBatchEntity batch) {
        String status = computeBatchStatus(batch.getRemainingQuantity(), batch.getExpiryDate());
        return safeRemaining(batch) > 0 && !Set.of(BATCH_EXPIRED, BATCH_DEPLETED).contains(status);
    }

    private String resolveProductFreshnessStatus(List<InventoryBatchEntity> batches) {
        if (batches == null || batches.isEmpty()) {
            return "untracked";
        }
        if (batches.stream().anyMatch(batch -> BATCH_NEED_DATE_UPDATE.equals(computeBatchStatus(batch.getRemainingQuantity(), batch.getExpiryDate())))) {
            return "need_date_update";
        }
        if (batches.stream().anyMatch(batch -> BATCH_EXPIRED.equals(computeBatchStatus(batch.getRemainingQuantity(), batch.getExpiryDate())))) {
            return "expired_stock";
        }
        if (batches.stream().anyMatch(batch -> BATCH_NEAR_EXPIRY.equals(computeBatchStatus(batch.getRemainingQuantity(), batch.getExpiryDate())))) {
            return "near_expiry";
        }
        return "fresh";
    }

    private LocalDateTime earliestExpiry(List<InventoryBatchEntity> batches) {
        return batches.stream()
                .filter(this::countsAsTrackedStock)
                .map(InventoryBatchEntity::getExpiryDate)
                .filter(Objects::nonNull)
                .min(LocalDateTime::compareTo)
                .orElse(null);
    }

    private LocalDateTime latestDate(List<LocalDateTime> dates) {
        return dates.stream().filter(Objects::nonNull).max(LocalDateTime::compareTo).orElse(null);
    }

    private String computeBatchStatus(Integer quantity, LocalDateTime expiryDate) {
        if (quantity == null || quantity <= 0) {
            return BATCH_DEPLETED;
        }
        if (expiryDate == null) {
            return BATCH_NEED_DATE_UPDATE;
        }
        LocalDateTime now = LocalDateTime.now();
        if (!expiryDate.isAfter(now)) {
            return BATCH_EXPIRED;
        }
        if (!expiryDate.isAfter(now.plusDays(DEFAULT_NEAR_EXPIRY_DAYS))) {
            return BATCH_NEAR_EXPIRY;
        }
        return BATCH_ACTIVE;
    }

    private int safeRemaining(InventoryBatchEntity batch) {
        return batch == null || batch.getRemainingQuantity() == null ? 0 : batch.getRemainingQuantity();
    }

    private int safeStock(ProductEntity product) {
        return product == null || product.getStock() == null ? 0 : product.getStock();
    }

    private String categoryText(ProductEntity product) {
        if (product == null) {
            return "";
        }
        CategoryEntity category = product.getCategory();
        return ((category == null ? "" : nullSafe(category.getName()) + " " + nullSafe(category.getNameEn()))
                + " " + nullSafe(product.getName())
                + " " + nullSafe(product.getNameEn()))
                .toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
