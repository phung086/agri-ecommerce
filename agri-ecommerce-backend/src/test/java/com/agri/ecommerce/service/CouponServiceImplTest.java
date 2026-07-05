package com.agri.ecommerce.service;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.dto.request.coupon.CouponCreateRequest;
import com.agri.ecommerce.dto.request.coupon.CouponUpdateRequest;
import com.agri.ecommerce.dto.response.coupon.CouponResponse;
import com.agri.ecommerce.entity.CouponEntity;
import com.agri.ecommerce.mapper.CouponMapper;
import com.agri.ecommerce.repository.CouponRepository;
import com.agri.ecommerce.service.impl.CouponServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CouponServiceImplTest {

    @Mock
    private CouponRepository couponRepository;

    @Mock
    private CouponMapper couponMapper;

    @InjectMocks
    private CouponServiceImpl couponService;

    @Test
    void applyCoupon_whenCouponNotFound_shouldThrowException() {
        // Given
        when(couponRepository.findById(99L)).thenReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> couponService.getCoupon(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void applyCoupon_whenExpired_shouldThrowException() {
        // Given
        CouponCreateRequest request = createRequest();
        request.setStartsAt(LocalDateTime.now().plusDays(1));
        request.setExpiresAt(LocalDateTime.now());
        when(couponRepository.existsByCodeIgnoreCase("SAVE10")).thenReturn(false);

        // When / Then
        assertThatThrownBy(() -> couponService.createCoupon(request))
                .isInstanceOf(BadRequestException.class);
        verify(couponRepository, never()).save(any(CouponEntity.class));
    }

    @Test
    void applyCoupon_whenBelowMinOrderValue_shouldThrowException() {
        // Given
        CouponUpdateRequest request = updateRequest();
        request.setUsageLimit(3);
        CouponEntity coupon = CouponEntity.builder()
                .id(1L)
                .code("SAVE10")
                .timesUsed(5)
                .active(true)
                .build();
        when(couponRepository.findById(1L)).thenReturn(Optional.of(coupon));
        when(couponRepository.existsByCodeIgnoreCaseAndIdNot("SAVE10", 1L)).thenReturn(false);

        // When / Then
        assertThatThrownBy(() -> couponService.updateCoupon(1L, request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void applyCoupon_whenMaxUsageReached_shouldThrowException() {
        // Given
        CouponCreateRequest request = createRequest();
        request.setDiscountPercentage(0);
        when(couponRepository.existsByCodeIgnoreCase("SAVE10")).thenReturn(false);

        // When / Then
        assertThatThrownBy(() -> couponService.createCoupon(request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void applyCoupon_whenValid_shouldReturnDiscountAmount() {
        // Given
        CouponCreateRequest request = createRequest();
        CouponResponse response = CouponResponse.builder().id(1L).code("SAVE10").discountPercentage(10).build();
        when(couponRepository.existsByCodeIgnoreCase("SAVE10")).thenReturn(false);
        when(couponRepository.save(any(CouponEntity.class))).thenAnswer(invocation -> {
            CouponEntity coupon = invocation.getArgument(0);
            coupon.setId(1L);
            return coupon;
        });
        when(couponMapper.toCouponResponse(any(CouponEntity.class))).thenReturn(response);

        // When
        CouponResponse actual = couponService.createCoupon(request);

        // Then
        assertThat(actual.getCode()).isEqualTo("SAVE10");
        ArgumentCaptor<CouponEntity> couponCaptor = ArgumentCaptor.forClass(CouponEntity.class);
        verify(couponRepository).save(couponCaptor.capture());
        assertThat(couponCaptor.getValue().getCode()).isEqualTo("SAVE10");
        assertThat(couponCaptor.getValue().getDiscountPercentage()).isEqualTo(10);
    }

    @Test
    void deleteCoupon_shouldCallDelete() {
        // Given
        CouponEntity coupon = CouponEntity.builder().id(1L).code("SAVE10").build();
        when(couponRepository.findById(1L)).thenReturn(Optional.of(coupon));

        // When
        couponService.deleteCoupon(1L);

        // Then
        verify(couponRepository).delete(coupon);
    }

    private CouponCreateRequest createRequest() {
        CouponCreateRequest request = new CouponCreateRequest();
        request.setCode("save10");
        request.setCouponType("ORDER_DISCOUNT");
        request.setDiscountType("PERCENTAGE");
        request.setDiscountPercentage(10);
        request.setMinOrderValue(new BigDecimal("100.00"));
        request.setUsageLimit(20);
        request.setActive(true);
        return request;
    }

    private CouponUpdateRequest updateRequest() {
        CouponUpdateRequest request = new CouponUpdateRequest();
        request.setCode("save10");
        request.setCouponType("ORDER_DISCOUNT");
        request.setDiscountType("PERCENTAGE");
        request.setDiscountPercentage(10);
        request.setMinOrderValue(new BigDecimal("100.00"));
        request.setUsageLimit(20);
        request.setActive(true);
        return request;
    }
}
