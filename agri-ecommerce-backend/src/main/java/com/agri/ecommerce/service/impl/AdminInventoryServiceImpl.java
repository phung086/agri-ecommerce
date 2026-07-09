package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.dto.request.inventory.InventoryBatchCreateRequest;
import com.agri.ecommerce.dto.request.inventory.InventoryStockAdjustmentRequest;
import com.agri.ecommerce.dto.request.inventory.InventoryStockSetRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.inventory.InventoryBatchResponse;
import com.agri.ecommerce.dto.response.inventory.InventoryProductResponse;
import com.agri.ecommerce.dto.response.inventory.InventoryStockMutationResponse;
import com.agri.ecommerce.dto.response.inventory.InventorySummaryResponse;
import com.agri.ecommerce.dto.response.inventory.InventoryTransactionResponse;
import com.agri.ecommerce.entity.CategoryEntity;
import com.agri.ecommerce.entity.InventoryBatchEntity;
import com.agri.ecommerce.entity.InventoryTransactionEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.repository.InventoryBatchRepository;
import com.agri.ecommerce.repository.InventoryTransactionRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.service.AdminInventoryService;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminInventoryServiceImpl implements AdminInventoryService {

    private static final String IN_STOCK_STATUS = "in_stock";
    private static final String OUT_OF_STOCK_STATUS = "out_of_stock";
    private static final String HIDDEN_STATUS = "hidden";
    private static final String BATCH_ACTIVE = "ACTIVE";
    private static final String BATCH_NEAR_EXPIRY = "NEAR_EXPIRY";
    private static final String BATCH_EXPIRED = "EXPIRED";
    private static final String BATCH_DEPLETED = "DEPLETED";
    private static final String BATCH_NEED_DATE_UPDATE = "NEED_DATE_UPDATE";
    private static final int DEFAULT_LOW_STOCK_THRESHOLD = 10;
    private static final int DEFAULT_NEAR_EXPIRY_DAYS = 3;
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> ALLOWED_STATUSES = Set.of(IN_STOCK_STATUS, OUT_OF_STOCK_STATUS, HIDDEN_STATUS);
    private static final Set<String> ALLOWED_BATCH_STATUSES = Set.of(
            BATCH_ACTIVE, BATCH_NEAR_EXPIRY, BATCH_EXPIRED, BATCH_DEPLETED, BATCH_NEED_DATE_UPDATE
    );
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "name", "slug", "price", "stock", "status", "unit", "createdAt", "updatedAt"
    );

    private final ProductRepository productRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;

    @Override
    @Transactional(readOnly = true)
    public InventorySummaryResponse getSummary(Integer threshold) {
        int safeThreshold = normalizeThreshold(threshold);
        List<InventoryBatchEntity> batches = inventoryBatchRepository.findAll();
        long batchTrackedStock = batches.stream()
                .filter(this::countsAsTrackedStock)
                .map(InventoryBatchEntity::getRemainingQuantity)
                .filter(Objects::nonNull)
                .mapToLong(Integer::longValue)
                .sum();
        long totalProductStock = safeLong(productRepository.sumStockByStatusNot(HIDDEN_STATUS));

        return InventorySummaryResponse.builder()
                .lowStockThreshold(safeThreshold)
                .totalProducts(productRepository.countByStatusNot(HIDDEN_STATUS))
                .inStockProducts(productRepository.countByStatus(IN_STOCK_STATUS))
                .outOfStockProducts(productRepository.countByStatus(OUT_OF_STOCK_STATUS))
                .hiddenProducts(productRepository.countByStatus(HIDDEN_STATUS))
                .lowStockProducts(productRepository.countByStockLessThanEqualAndStatusNot(safeThreshold, HIDDEN_STATUS))
                .totalStockUnits(totalProductStock)
                .totalBatches((long) batches.size())
                .activeBatches(countBatchesByComputedStatus(batches, BATCH_ACTIVE))
                .nearExpiryBatches(countBatchesByComputedStatus(batches, BATCH_NEAR_EXPIRY))
                .expiredBatches(countBatchesByComputedStatus(batches, BATCH_EXPIRED))
                .needDateUpdateBatches(countBatchesByComputedStatus(batches, BATCH_NEED_DATE_UPDATE))
                .depletedBatches(countBatchesByComputedStatus(batches, BATCH_DEPLETED))
                .batchTrackedStockUnits(batchTrackedStock)
                .untrackedStockUnits(Math.max(totalProductStock - batchTrackedStock, 0L))
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
        recordTransaction(savedProduct, null, newStock - previousStock, "STOCK_SET", previousStock, newStock, cleanBlank(request.getNote()), null, null);

        return toMutationResponse(savedProduct, previousStock, newStock, previousStatus, cleanBlank(request.getNote()), DEFAULT_LOW_STOCK_THRESHOLD);
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
        recordTransaction(savedProduct, null, quantityDelta, quantityDelta > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT", previousStock, newStock, cleanBlank(request.getNote()), null, null);

        return toMutationResponse(savedProduct, previousStock, newStock, previousStatus, cleanBlank(request.getNote()), DEFAULT_LOW_STOCK_THRESHOLD);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryBatchResponse> getBatches(String status, Long productId, Boolean includeDepleted) {
        String normalizedStatus = normalizeOptionalBatchStatus(status);
        boolean showDepleted = Boolean.TRUE.equals(includeDepleted);
        List<InventoryBatchEntity> batches = productId == null
                ? inventoryBatchRepository.findAll(Sort.by(Sort.Direction.ASC, "expiryDate").and(Sort.by(Sort.Direction.DESC, "createdAt")))
                : inventoryBatchRepository.findByProduct_Id(productId, Sort.by(Sort.Direction.ASC, "expiryDate").and(Sort.by(Sort.Direction.DESC, "createdAt")));

        return batches.stream()
                .filter(batch -> normalizedStatus == null || normalizedStatus.equals(computeBatchStatus(batch)))
                .filter(batch -> showDepleted || !BATCH_DEPLETED.equals(computeBatchStatus(batch)))
                .map(this::mapToBatchResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryBatchResponse> getProductBatches(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + productId);
        }
        return inventoryBatchRepository.findByProduct_Id(productId, Sort.by(Sort.Direction.ASC, "expiryDate").and(Sort.by(Sort.Direction.DESC, "createdAt")))
                .stream()
                .map(this::mapToBatchResponse)
                .toList();
    }

    @Override
    @Transactional
    public InventoryBatchResponse createBatch(InventoryBatchCreateRequest request) {
        ProductEntity product = productRepository.findByIdForUpdate(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm"));
        String batchNumber = cleanRequired(request.getBatchNumber(), "Mã lô hàng không được để trống");
        if (inventoryBatchRepository.existsByBatchNumberIgnoreCase(batchNumber)) {
            throw new BadRequestException("Mã lô hàng đã tồn tại: " + batchNumber);
        }
        validateBatchDates(request.getManufactureDate(), request.getExpiryDate());

        int previousStock = safeStock(product);
        InventoryBatchEntity batch = InventoryBatchEntity.builder()
                .product(product)
                .batchNumber(batchNumber)
                .importPrice(request.getImportPrice())
                .originalQuantity(request.getOriginalQuantity())
                .remainingQuantity(request.getOriginalQuantity())
                .receivedAt(request.getReceivedAt() == null ? LocalDateTime.now() : request.getReceivedAt())
                .manufactureDate(request.getManufactureDate())
                .expiryDate(request.getExpiryDate())
                .supplierName(cleanBlank(request.getSupplierName()))
                .storageLocation(cleanBlank(request.getStorageLocation()))
                .status(computeBatchStatus(request.getOriginalQuantity(), request.getExpiryDate()))
                .note(cleanBlank(request.getNote()))
                .build();
        batch = inventoryBatchRepository.save(batch);

        syncProductStockAndFreshness(product);
        productRepository.save(product);
        recordTransaction(product, batch, request.getOriginalQuantity(), "IMPORT", previousStock, safeStock(product), "Nhập kho lô hàng mới #" + batchNumber, "BATCH", batch.getId());

        return mapToBatchResponse(batch);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryBatchResponse> getExpiryAlerts(Integer days) {
        int thresholdDays = days == null ? DEFAULT_NEAR_EXPIRY_DAYS : Math.max(days, 0);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime threshold = now.plusDays(thresholdDays);
        return inventoryBatchRepository.findAll(Sort.by(Sort.Direction.ASC, "expiryDate"))
                .stream()
                .filter(batch -> safeRemaining(batch) > 0)
                .filter(batch -> batch.getExpiryDate() == null || !batch.getExpiryDate().isAfter(threshold))
                .map(this::mapToBatchResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryTransactionResponse> getTransactions(Long productId, Long batchId) {
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        List<InventoryTransactionEntity> transactions;
        if (batchId != null) {
            transactions = inventoryTransactionRepository.findByBatch_Id(batchId, sort);
        } else if (productId != null) {
            transactions = inventoryTransactionRepository.findByProduct_Id(productId, sort);
        } else {
            transactions = inventoryTransactionRepository.findAll(sort);
        }
        return transactions.stream().map(this::mapToTransactionResponse).toList();
    }

    @Override
    @Transactional
    public InventorySummaryResponse backfillLegacyBatches() {
        productRepository.findAll().forEach(product -> {
            if (HIDDEN_STATUS.equals(product.getStatus()) || inventoryBatchRepository.existsByProduct_Id(product.getId()) || safeStock(product) <= 0) {
                return;
            }
            InventoryBatchEntity batch = InventoryBatchEntity.builder()
                    .product(product)
                    .batchNumber("LEGACY-" + product.getId())
                    .importPrice(product.getPrice() == null ? BigDecimal.ONE : product.getPrice())
                    .originalQuantity(safeStock(product))
                    .remainingQuantity(safeStock(product))
                    .receivedAt(product.getCreatedAt() == null ? LocalDateTime.now() : product.getCreatedAt())
                    .manufactureDate(null)
                    .expiryDate(null)
                    .status(BATCH_NEED_DATE_UPDATE)
                    .note("Lô tồn kho được đồng bộ từ products.stock. Cần cập nhật ngày sản xuất/hạn sử dụng.")
                    .build();
            InventoryBatchEntity savedBatch = inventoryBatchRepository.save(batch);
            recordTransaction(product, savedBatch, safeStock(product), "BACKFILL", 0, safeStock(product), "Backfill tồn kho sản phẩm cũ vào lô legacy", "PRODUCT", product.getId());
            syncProductStockAndFreshness(product);
            productRepository.save(product);
        });
        return getSummary(DEFAULT_LOW_STOCK_THRESHOLD);
    }

    @Override
    @Transactional
    public InventorySummaryResponse recalculateProductStockFromBatches() {
        productRepository.findAll().forEach(product -> {
            syncProductStockAndFreshness(product);
            applyStatusForStock(product, safeStock(product));
            productRepository.save(product);
        });
        return getSummary(DEFAULT_LOW_STOCK_THRESHOLD);
    }

    private InventoryProductResponse toInventoryProductResponse(ProductEntity product, int threshold) {
        CategoryEntity category = product.getCategory();
        List<InventoryBatchEntity> batches = inventoryBatchRepository.findByProduct_Id(product.getId(), Sort.by(Sort.Direction.ASC, "expiryDate"));
        int trackedStock = batches.stream().filter(this::countsAsTrackedStock).mapToInt(this::safeRemaining).sum();
        int activeBatchCount = (int) batches.stream().filter(batch -> Set.of(BATCH_ACTIVE, BATCH_NEAR_EXPIRY).contains(computeBatchStatus(batch))).count();
        int needDateCount = (int) batches.stream().filter(batch -> BATCH_NEED_DATE_UPDATE.equals(computeBatchStatus(batch))).count();
        LocalDateTime earliestExpiry = earliestExpiry(batches);

        return InventoryProductResponse.builder()
                .productId(product.getId())
                .productName(product.getName())
                .productSlug(product.getSlug())
                .categoryId(category == null ? null : category.getId())
                .categoryName(category == null ? null : category.getName())
                .categorySlug(category == null ? null : category.getSlug())
                .stock(safeStock(product))
                .batchTrackedStock(trackedStock)
                .untrackedStock(Math.max(safeStock(product) - trackedStock, 0))
                .activeBatchCount(activeBatchCount)
                .needDateUpdateBatchCount(needDateCount)
                .latestImportDate(latestDate(batches.stream().map(InventoryBatchEntity::getReceivedAt).toList()))
                .latestManufactureDate(latestDate(batches.stream().map(InventoryBatchEntity::getManufactureDate).toList()))
                .earliestExpiryDate(earliestExpiry)
                .freshnessStatus(resolveProductFreshnessStatus(batches))
                .daysUntilExpiry(daysUntil(earliestExpiry))
                .unit(product.getUnit())
                .status(product.getStatus())
                .price(product.getPrice())
                .alertLevel(toAlertLevel(product, threshold))
                .restockRecommended(isRestockRecommended(product, threshold) || needDateCount > 0)
                .updatedAt(product.getUpdatedAt())
                .build();
    }

    private InventoryStockMutationResponse toMutationResponse(ProductEntity product, int previousStock, int newStock, String previousStatus, String note, int threshold) {
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

    private InventoryBatchResponse mapToBatchResponse(InventoryBatchEntity batch) {
        ProductEntity product = batch.getProduct();
        CategoryEntity category = product == null ? null : product.getCategory();
        String status = computeBatchStatus(batch);
        LocalDateTime expiryDate = batch.getExpiryDate();
        return InventoryBatchResponse.builder()
                .id(batch.getId())
                .productId(product == null ? null : product.getId())
                .productName(product == null ? null : product.getName())
                .productSlug(product == null ? null : product.getSlug())
                .categoryId(category == null ? null : category.getId())
                .categoryName(category == null ? null : category.getName())
                .batchNumber(batch.getBatchNumber())
                .importPrice(batch.getImportPrice())
                .originalQuantity(batch.getOriginalQuantity())
                .remainingQuantity(batch.getRemainingQuantity())
                .receivedAt(batch.getReceivedAt())
                .manufactureDate(batch.getManufactureDate())
                .expiryDate(expiryDate)
                .supplierName(batch.getSupplierName())
                .storageLocation(batch.getStorageLocation())
                .status(status)
                .freshnessStatus(status.toLowerCase(Locale.ROOT))
                .daysUntilExpiry(daysUntil(expiryDate))
                .usableForSale(Set.of(BATCH_ACTIVE, BATCH_NEAR_EXPIRY, BATCH_NEED_DATE_UPDATE).contains(status) && safeRemaining(batch) > 0)
                .legacyBatch(batch.getBatchNumber() != null && batch.getBatchNumber().startsWith("LEGACY-"))
                .note(batch.getNote())
                .createdAt(batch.getCreatedAt())
                .updatedAt(batch.getUpdatedAt())
                .build();
    }

    private InventoryTransactionResponse mapToTransactionResponse(InventoryTransactionEntity tx) {
        return InventoryTransactionResponse.builder()
                .id(tx.getId())
                .productId(tx.getProduct() == null ? null : tx.getProduct().getId())
                .productName(tx.getProduct() == null ? null : tx.getProduct().getName())
                .batchId(tx.getBatch() != null ? tx.getBatch().getId() : null)
                .batchNumber(tx.getBatch() != null ? tx.getBatch().getBatchNumber() : null)
                .quantity(tx.getQuantity())
                .type(tx.getType())
                .previousStock(tx.getPreviousStock())
                .newStock(tx.getNewStock())
                .referenceType(tx.getReferenceType())
                .referenceId(tx.getReferenceId())
                .note(tx.getNote())
                .createdAt(tx.getCreatedAt())
                .build();
    }

    private void syncProductStockAndFreshness(ProductEntity product) {
        List<InventoryBatchEntity> batches = inventoryBatchRepository.findByProduct_Id(product.getId(), Sort.by(Sort.Direction.ASC, "expiryDate"));
        int trackedStock = batches.stream().filter(this::countsAsTrackedStock).mapToInt(this::safeRemaining).sum();
        product.setStock(trackedStock);
        product.setLatestImportDate(latestDate(batches.stream().map(InventoryBatchEntity::getReceivedAt).toList()));
        product.setLatestManufactureDate(latestDate(batches.stream().map(InventoryBatchEntity::getManufactureDate).toList()));
        product.setEarliestExpiryDate(earliestExpiry(batches));
        product.setFreshnessStatus(resolveProductFreshnessStatus(batches));
        applyStatusForStock(product, trackedStock);
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
        product.setStatus(newStock <= 0 ? OUT_OF_STOCK_STATUS : IN_STOCK_STATUS);
    }

    private boolean countsAsTrackedStock(InventoryBatchEntity batch) {
        String status = computeBatchStatus(batch);
        return safeRemaining(batch) > 0 && !Set.of(BATCH_EXPIRED, BATCH_DEPLETED).contains(status);
    }

    private long countBatchesByComputedStatus(List<InventoryBatchEntity> batches, String status) {
        return batches.stream().filter(batch -> status.equals(computeBatchStatus(batch))).count();
    }

    private String computeBatchStatus(InventoryBatchEntity batch) {
        if (safeRemaining(batch) <= 0) {
            return BATCH_DEPLETED;
        }
        return computeBatchStatus(safeRemaining(batch), batch.getExpiryDate());
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

    private String resolveProductFreshnessStatus(List<InventoryBatchEntity> batches) {
        if (batches == null || batches.isEmpty()) {
            return "untracked";
        }
        if (batches.stream().anyMatch(batch -> BATCH_NEED_DATE_UPDATE.equals(computeBatchStatus(batch)))) {
            return "need_date_update";
        }
        if (batches.stream().anyMatch(batch -> BATCH_EXPIRED.equals(computeBatchStatus(batch)))) {
            return "expired_stock";
        }
        if (batches.stream().anyMatch(batch -> BATCH_NEAR_EXPIRY.equals(computeBatchStatus(batch)))) {
            return "near_expiry";
        }
        return "fresh";
    }

    private LocalDateTime earliestExpiry(List<InventoryBatchEntity> batches) {
        return batches.stream()
                .filter(this::countsAsTrackedStock)
                .map(InventoryBatchEntity::getExpiryDate)
                .filter(Objects::nonNull)
                .min(Comparator.naturalOrder())
                .orElse(null);
    }

    private LocalDateTime latestDate(List<LocalDateTime> dates) {
        return dates.stream().filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
    }

    private Integer daysUntil(LocalDateTime expiryDate) {
        if (expiryDate == null) {
            return null;
        }
        return (int) Math.ceil(Duration.between(LocalDateTime.now(), expiryDate).toHours() / 24.0d);
    }

    private int safeRemaining(InventoryBatchEntity batch) {
        return batch.getRemainingQuantity() == null ? 0 : batch.getRemainingQuantity();
    }

    private int safeStock(ProductEntity product) {
        return product.getStock() == null ? 0 : product.getStock();
    }

    private long safeLong(Long value) {
        return value == null ? 0L : value;
    }

    private void validateBatchDates(LocalDateTime manufactureDate, LocalDateTime expiryDate) {
        if (expiryDate == null) {
            throw new BadRequestException("Hạn sử dụng không được để trống khi nhập lô mới");
        }
        if (manufactureDate != null && !expiryDate.isAfter(manufactureDate)) {
            throw new BadRequestException("Hạn sử dụng phải sau ngày sản xuất");
        }
        if (!expiryDate.isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Không thể nhập lô hàng đã hết hạn sử dụng");
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
        return (root, query, criteriaBuilder) -> categorySlug == null
                ? criteriaBuilder.conjunction()
                : criteriaBuilder.equal(root.join("category", JoinType.INNER).get("slug"), categorySlug);
    }

    private Specification<ProductEntity> hasInventoryStatus(String status) {
        return (root, query, criteriaBuilder) -> status == null
                ? criteriaBuilder.notEqual(root.get("status"), HIDDEN_STATUS)
                : criteriaBuilder.equal(root.get("status"), status);
    }

    private Specification<ProductEntity> hasStockAlert(int threshold, boolean includeOk) {
        return (root, query, criteriaBuilder) -> includeOk
                ? criteriaBuilder.conjunction()
                : criteriaBuilder.or(
                criteriaBuilder.lessThanOrEqualTo(root.get("stock"), threshold),
                criteriaBuilder.equal(root.get("status"), OUT_OF_STOCK_STATUS)
        );
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

    private String normalizeOptionalBatchStatus(String status) {
        String normalizedStatus = cleanBlank(status);
        if (normalizedStatus == null) {
            return null;
        }
        normalizedStatus = normalizedStatus.toUpperCase(Locale.ROOT);
        if (!ALLOWED_BATCH_STATUSES.contains(normalizedStatus)) {
            throw new BadRequestException("Invalid batch status. Allowed values: ACTIVE, NEAR_EXPIRY, EXPIRED, DEPLETED, NEED_DATE_UPDATE");
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

    private String cleanRequired(String value, String message) {
        String clean = cleanBlank(value);
        if (clean == null) {
            throw new BadRequestException(message);
        }
        return clean;
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }
        return value.trim();
    }
}
