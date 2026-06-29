package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.coupon.CouponCreateRequest;
import com.agri.ecommerce.dto.request.coupon.CouponStatusUpdateRequest;
import com.agri.ecommerce.dto.request.coupon.CouponUpdateRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.coupon.CouponResponse;
import com.agri.ecommerce.entity.CouponEntity;
import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.CouponMapper;
import com.agri.ecommerce.repository.CouponRepository;
import com.agri.ecommerce.service.CouponService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CouponServiceImpl implements CouponService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final String COUPON_TYPE_ORDER_DISCOUNT = "ORDER_DISCOUNT";
    private static final String COUPON_TYPE_FREESHIP = "FREESHIP";
    private static final String DISCOUNT_TYPE_PERCENTAGE = "PERCENTAGE";
    private static final String DISCOUNT_TYPE_FIXED_AMOUNT = "FIXED_AMOUNT";
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id",
            "code",
            "couponType",
            "discountType",
            "discountPercentage",
            "discountAmount",
            "startsAt",
            "expiresAt",
            "usageLimit",
            "timesUsed",
            "active",
            "createdAt",
            "updatedAt"
    );

    private final CouponRepository couponRepository;

    private final CouponMapper couponMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CouponResponse> getCoupons(
            String keyword,
            Boolean active,
            Boolean expired,
            Boolean exhausted,
            int page,
            int size,
            String sort
    ) {
        validatePaging(page, size);

        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<CouponEntity> couponPage = couponRepository.findAll(
                Specification.where(hasKeyword(cleanBlank(keyword)))
                        .and(hasActive(active))
                        .and(hasExpired(expired))
                        .and(hasExhausted(exhausted)),
                pageable
        );

        return PageResponse.<CouponResponse>builder()
                .content(couponPage.getContent().stream().map(couponMapper::toCouponResponse).toList())
                .page(couponPage.getNumber())
                .size(couponPage.getSize())
                .totalElements(couponPage.getTotalElements())
                .totalPages(couponPage.getTotalPages())
                .last(couponPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public CouponResponse getCoupon(Long couponId) {
        return couponMapper.toCouponResponse(findCouponById(couponId));
    }

    @Override
    @Transactional
    public CouponResponse createCoupon(CouponCreateRequest request) {
        String code = normalizeCode(request.getCode());
        validateCodeUnique(code, null);
        String couponType = normalizeCouponType(request.getCouponType());
        String discountType = normalizeDiscountType(request.getDiscountType(), couponType);
        validateCouponRule(couponType, discountType, request.getDiscountPercentage(), request.getDiscountAmount());
        validateDateRange(request.getStartsAt(), request.getExpiresAt());

        CouponEntity coupon = CouponEntity.builder()
                .code(code)
                .couponType(couponType)
                .discountType(discountType)
                .discountPercentage(resolveDiscountPercentage(couponType, discountType, request.getDiscountPercentage()))
                .discountAmount(resolveDiscountAmount(couponType, discountType, request.getDiscountAmount()))
                .startsAt(request.getStartsAt())
                .expiresAt(request.getExpiresAt())
                .usageLimit(request.getUsageLimit())
                .timesUsed(0)
                .active(request.getActive() == null || request.getActive())
                .build();

        return couponMapper.toCouponResponse(couponRepository.save(coupon));
    }

    @Override
    @Transactional
    public CouponResponse updateCoupon(Long couponId, CouponUpdateRequest request) {
        CouponEntity coupon = findCouponById(couponId);
        String code = normalizeCode(request.getCode());
        validateCodeUnique(code, couponId);
        validateUsageLimitCanApply(coupon, request.getUsageLimit());
        String couponType = normalizeCouponType(request.getCouponType());
        String discountType = normalizeDiscountType(request.getDiscountType(), couponType);
        validateCouponRule(couponType, discountType, request.getDiscountPercentage(), request.getDiscountAmount());
        validateDateRange(request.getStartsAt(), request.getExpiresAt());

        coupon.setCode(code);
        coupon.setCouponType(couponType);
        coupon.setDiscountType(discountType);
        coupon.setDiscountPercentage(resolveDiscountPercentage(couponType, discountType, request.getDiscountPercentage()));
        coupon.setDiscountAmount(resolveDiscountAmount(couponType, discountType, request.getDiscountAmount()));
        coupon.setStartsAt(request.getStartsAt());
        coupon.setExpiresAt(request.getExpiresAt());
        coupon.setUsageLimit(request.getUsageLimit());

        if (request.getActive() != null) {
            coupon.setActive(request.getActive());
        }

        return couponMapper.toCouponResponse(couponRepository.save(coupon));
    }

    @Override
    @Transactional
    public CouponResponse updateCouponStatus(Long couponId, CouponStatusUpdateRequest request) {
        CouponEntity coupon = findCouponById(couponId);
        coupon.setActive(request.getActive());

        return couponMapper.toCouponResponse(couponRepository.save(coupon));
    }

    @Override
    @Transactional
    public void deleteCoupon(Long couponId) {
        CouponEntity coupon = findCouponById(couponId);
        couponRepository.delete(coupon);
    }

    private Specification<CouponEntity> hasKeyword(String keyword) {
        return (root, query, criteriaBuilder) -> {
            if (keyword == null) {
                return criteriaBuilder.conjunction();
            }

            String pattern = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
            return criteriaBuilder.like(criteriaBuilder.lower(root.get("code")), pattern);
        };
    }

    private Specification<CouponEntity> hasActive(Boolean active) {
        return (root, query, criteriaBuilder) ->
                active == null ? criteriaBuilder.conjunction() : criteriaBuilder.equal(root.get("active"), active);
    }

    private Specification<CouponEntity> hasExpired(Boolean expired) {
        return (root, query, criteriaBuilder) -> {
            if (expired == null) {
                return criteriaBuilder.conjunction();
            }

            LocalDateTime now = LocalDateTime.now();
            if (expired) {
                return criteriaBuilder.and(
                        criteriaBuilder.isNotNull(root.get("expiresAt")),
                        criteriaBuilder.lessThan(root.get("expiresAt"), now)
                );
            }

            return criteriaBuilder.or(
                    criteriaBuilder.isNull(root.get("expiresAt")),
                    criteriaBuilder.greaterThanOrEqualTo(root.get("expiresAt"), now)
            );
        };
    }

    private Specification<CouponEntity> hasExhausted(Boolean exhausted) {
        return (root, query, criteriaBuilder) -> {
            if (exhausted == null) {
                return criteriaBuilder.conjunction();
            }

            if (exhausted) {
                return criteriaBuilder.and(
                        criteriaBuilder.isNotNull(root.get("usageLimit")),
                        criteriaBuilder.greaterThanOrEqualTo(root.get("timesUsed"), root.get("usageLimit"))
                );
            }

            return criteriaBuilder.or(
                    criteriaBuilder.isNull(root.get("usageLimit")),
                    criteriaBuilder.lessThan(root.get("timesUsed"), root.get("usageLimit"))
            );
        };
    }

    private CouponEntity findCouponById(Long couponId) {
        return couponRepository.findById(couponId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mã giảm giá với id: " + couponId));
    }

    private void validateCodeUnique(String code, Long currentId) {
        boolean duplicated = currentId == null
                ? couponRepository.existsByCodeIgnoreCase(code)
                : couponRepository.existsByCodeIgnoreCaseAndIdNot(code, currentId);

        if (duplicated) {
            throw new BadRequestException("Mã giảm giá đã được sử dụng");
        }
    }

    private void validateUsageLimitCanApply(CouponEntity coupon, Integer usageLimit) {
        if (usageLimit == null) {
            return;
        }

        int timesUsed = coupon.getTimesUsed() == null ? 0 : coupon.getTimesUsed();
        if (usageLimit < timesUsed) {
            throw new BadRequestException("Giới hạn sử dụng không được nhỏ hơn số lượt đã dùng hiện tại: " + timesUsed);
        }
    }

    private void validateCouponRule(String couponType, String discountType, Integer discountPercentage, BigDecimal discountAmount) {
        if (COUPON_TYPE_FREESHIP.equals(couponType)) {
            return;
        }

        if (DISCOUNT_TYPE_PERCENTAGE.equals(discountType)) {
            if (discountPercentage == null || discountPercentage < 1 || discountPercentage > 100) {
                throw new BadRequestException("Phan tram giam gia phai tu 1 den 100");
            }
            return;
        }

        if (discountAmount == null || discountAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("So tien giam gia phai lon hon 0");
        }
    }

    private void validateDateRange(LocalDateTime startsAt, LocalDateTime expiresAt) {
        if (startsAt != null && expiresAt != null && expiresAt.isBefore(startsAt)) {
            throw new BadRequestException("Ngay ket thuc phai sau ngay bat dau");
        }
    }

    private String normalizeCouponType(String couponType) {
        String normalizedType = cleanBlank(couponType);
        if (normalizedType == null) {
            return COUPON_TYPE_ORDER_DISCOUNT;
        }

        normalizedType = normalizedType.trim().toUpperCase(Locale.ROOT);
        if (!Set.of(COUPON_TYPE_ORDER_DISCOUNT, COUPON_TYPE_FREESHIP).contains(normalizedType)) {
            throw new BadRequestException("Loai ma giam gia khong hop le");
        }

        return normalizedType;
    }

    private String normalizeDiscountType(String discountType, String couponType) {
        if (COUPON_TYPE_FREESHIP.equals(couponType)) {
            return DISCOUNT_TYPE_PERCENTAGE;
        }

        String normalizedType = cleanBlank(discountType);
        if (normalizedType == null) {
            return DISCOUNT_TYPE_PERCENTAGE;
        }

        normalizedType = normalizedType.trim().toUpperCase(Locale.ROOT);
        if (!Set.of(DISCOUNT_TYPE_PERCENTAGE, DISCOUNT_TYPE_FIXED_AMOUNT).contains(normalizedType)) {
            throw new BadRequestException("Kieu giam gia khong hop le");
        }

        return normalizedType;
    }

    private Integer resolveDiscountPercentage(String couponType, String discountType, Integer discountPercentage) {
        if (COUPON_TYPE_FREESHIP.equals(couponType) || DISCOUNT_TYPE_FIXED_AMOUNT.equals(discountType)) {
            return 0;
        }

        return discountPercentage;
    }

    private BigDecimal resolveDiscountAmount(String couponType, String discountType, BigDecimal discountAmount) {
        if (COUPON_TYPE_FREESHIP.equals(couponType) || DISCOUNT_TYPE_PERCENTAGE.equals(discountType)) {
            return null;
        }

        return discountAmount.setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizeCode(String code) {
        String normalizedCode = cleanBlank(code);
        if (normalizedCode == null) {
            throw new BadRequestException("Mã giảm giá không được để trống");
        }

        return normalizedCode.toUpperCase(Locale.ROOT);
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

    private void validatePaging(int page, int size) {
        if (page < 0) {
            throw new BadRequestException("page phải lớn hơn hoặc bằng 0");
        }

        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("size phải nằm trong khoảng 1 đến " + MAX_PAGE_SIZE);
        }
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }
}
