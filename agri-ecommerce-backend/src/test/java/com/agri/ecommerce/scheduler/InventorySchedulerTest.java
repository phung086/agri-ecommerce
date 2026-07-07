package com.agri.ecommerce.scheduler;

import com.agri.ecommerce.entity.CategoryEntity;
import com.agri.ecommerce.entity.CouponEntity;
import com.agri.ecommerce.entity.InventoryBatchEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.repository.CouponRepository;
import com.agri.ecommerce.repository.InventoryBatchRepository;
import com.agri.ecommerce.repository.InventoryTransactionRepository;
import com.agri.ecommerce.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InventorySchedulerTest {

    @Mock
    private InventoryBatchRepository inventoryBatchRepository;

    @Mock
    private InventoryTransactionRepository inventoryTransactionRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CouponRepository couponRepository;

    @InjectMocks
    private InventoryScheduler inventoryScheduler;

    @Test
    void scanNearExpiryBatchesAndCreateCoupons_whenEnoughStock_shouldCreateFriendlyProductCoupon() {
        ProductEntity product = seafoodProduct();
        InventoryBatchEntity batch = nearExpiryBatch(product, 6);

        when(productRepository.findAll()).thenReturn(List.of(product));
        when(inventoryBatchRepository.findNearExpiryBatches(eq(product.getId()), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(batch));
        when(couponRepository.findInventoryAutoCouponsByProductId(product.getId())).thenReturn(List.of());
        when(couponRepository.existsByCodeIgnoreCase(anyString())).thenReturn(false);
        when(couponRepository.save(any(CouponEntity.class))).thenAnswer(invocation -> {
            CouponEntity coupon = invocation.getArgument(0);
            coupon.setId(99L);
            return coupon;
        });

        inventoryScheduler.scanNearExpiryBatchesAndCreateCoupons();

        ArgumentCaptor<CouponEntity> couponCaptor = ArgumentCaptor.forClass(CouponEntity.class);
        verify(couponRepository).save(couponCaptor.capture());
        CouponEntity coupon = couponCaptor.getValue();

        assertThat(coupon.getCode()).startsWith("BEP_NHA_CA_NGU_LAM_SACH_");
        assertThat(coupon.getCode()).doesNotContain("XA_HANG");
        assertThat(coupon.getCouponType()).isEqualTo("PRODUCT_DISCOUNT");
        assertThat(coupon.getProductId()).isEqualTo(product.getId());
        assertThat(coupon.getDiscountType()).isEqualTo("FIXED_AMOUNT");
        assertThat(coupon.getDiscountAmount()).isEqualByComparingTo("8000.00");
        assertThat(coupon.getUsageLimit()).isEqualTo(6);
        assertThat(coupon.getActive()).isTrue();
    }

    @Test
    void scanNearExpiryBatchesAndCreateCoupons_whenStockBelowThreshold_shouldDisableLegacyAutoCoupon() {
        ProductEntity product = seafoodProduct();
        InventoryBatchEntity batch = nearExpiryBatch(product, 2);
        CouponEntity legacyCoupon = CouponEntity.builder()
                .id(7L)
                .productId(product.getId())
                .code("XA_HANG_47_67")
                .couponType("PRODUCT_DISCOUNT")
                .discountType("PERCENTAGE")
                .discountPercentage(30)
                .timesUsed(0)
                .active(true)
                .build();

        when(productRepository.findAll()).thenReturn(List.of(product));
        when(inventoryBatchRepository.findNearExpiryBatches(eq(product.getId()), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(batch));
        when(couponRepository.findInventoryAutoCouponsByProductId(product.getId())).thenReturn(List.of(legacyCoupon));

        inventoryScheduler.scanNearExpiryBatchesAndCreateCoupons();

        assertThat(legacyCoupon.getActive()).isFalse();
        verify(couponRepository).saveAll(any());
        verify(couponRepository, never()).save(any(CouponEntity.class));
    }

    private ProductEntity seafoodProduct() {
        return ProductEntity.builder()
                .id(47L)
                .name("Ca Ngu lam sach")
                .slug("ca-ngu-lam-sach")
                .price(new BigDecimal("30000.00"))
                .stock(10)
                .status("in_stock")
                .category(CategoryEntity.builder()
                        .id(1L)
                        .name("Ca")
                        .slug("ca")
                        .build())
                .build();
    }

    private InventoryBatchEntity nearExpiryBatch(ProductEntity product, int remainingQuantity) {
        return InventoryBatchEntity.builder()
                .id(10L)
                .product(product)
                .batchNumber("BATCH-1")
                .importPrice(new BigDecimal("20000.00"))
                .originalQuantity(remainingQuantity)
                .remainingQuantity(remainingQuantity)
                .manufactureDate(LocalDateTime.now().minusDays(1))
                .expiryDate(LocalDateTime.now().plusDays(2))
                .build();
    }
}
