package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.dto.request.order.CheckoutRequest;
import com.agri.ecommerce.dto.response.order.CheckoutPreviewItemResponse;
import com.agri.ecommerce.dto.response.order.CheckoutPreviewResponse;
import com.agri.ecommerce.entity.CouponEntity;
import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.OrderItemEntity;
import com.agri.ecommerce.entity.PaymentEntity;
import com.agri.ecommerce.repository.CouponRepository;
import com.agri.ecommerce.repository.OrderItemRepository;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.repository.PaymentRepository;
import com.agri.ecommerce.service.GuestCheckoutAdjustmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class GuestCheckoutAdjustmentServiceImpl implements GuestCheckoutAdjustmentService {

    private static final String PAYMENT_METHOD_CASH = "cash";
    private static final String PAYMENT_METHOD_VNPAY = "vnpay";
    private static final String PAYMENT_PENDING = "pending";
    private static final String COUPON_TYPE_ORDER_DISCOUNT = "ORDER_DISCOUNT";
    private static final String COUPON_TYPE_FREESHIP = "FREESHIP";
    private static final String COUPON_TYPE_PRODUCT_DISCOUNT = "PRODUCT_DISCOUNT";
    private static final String DISCOUNT_TYPE_FIXED_AMOUNT = "FIXED_AMOUNT";

    private final CouponRepository couponRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;

    @Override
    @Transactional(readOnly = true)
    public CheckoutPreviewResponse applyPreviewAdjustments(CheckoutPreviewResponse preview, CheckoutRequest request) {
        if (preview == null || request == null) {
            return preview;
        }

        preview.setPaymentMethod(normalizeGuestPaymentMethod(request.getPaymentMethod()));
        String couponCode = cleanBlank(request.getCouponCode());
        if (couponCode == null) {
            return preview;
        }

        CouponPreviewAdjustment adjustment = calculatePreviewAdjustment(
                couponCode,
                normalizeMoney(preview.getSubtotal()),
                normalizeMoney(preview.getShippingFee()),
                preview.getItems() == null ? List.of() : preview.getItems()
        );

        preview.setCouponCode(adjustment.couponCode());
        preview.setCouponValid(adjustment.valid());
        preview.setCouponMessage(adjustment.message());

        if (!adjustment.valid()) {
            preview.setDiscountAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            preview.setCouponDiscountAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            preview.setTotalPrice(normalizeMoney(preview.getSubtotal()).add(normalizeMoney(preview.getShippingFee())));
            preview.setCanCheckout(false);
            return preview;
        }

        BigDecimal subtotal = normalizeMoney(preview.getSubtotal());
        BigDecimal totalPrice = subtotal
                .subtract(adjustment.discountAmount())
                .add(adjustment.shippingFee())
                .setScale(2, RoundingMode.HALF_UP);
        if (totalPrice.compareTo(BigDecimal.ZERO) < 0) {
            totalPrice = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        preview.setDiscountAmount(adjustment.discountAmount());
        preview.setCouponDiscountAmount(adjustment.discountAmount());
        preview.setShippingFee(adjustment.shippingFee());
        preview.setTotalPrice(totalPrice);
        preview.setCanCheckout(preview.isCanCheckout());
        return preview;
    }

    @Override
    @Transactional
    public void applyOrderAdjustments(Long orderId, CheckoutRequest request) {
        if (orderId == null || request == null) {
            return;
        }

        OrderEntity order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));
        List<OrderItemEntity> items = orderItemRepository.findByOrder_IdOrderByIdAsc(orderId);

        String paymentMethod = normalizeGuestPaymentMethod(request.getPaymentMethod());
        CouponOrderAdjustment adjustment = calculateOrderAdjustment(
                cleanBlank(request.getCouponCode()),
                normalizeMoney(order.getSubtotal()),
                normalizeMoney(order.getShippingFee()),
                items
        );

        order.setCoupon(adjustment.coupon());
        order.setCouponCode(adjustment.couponCode());
        order.setDiscountAmount(adjustment.discountAmount());
        order.setShippingFee(adjustment.shippingFee());
        BigDecimal totalPrice = normalizeMoney(order.getSubtotal())
                .subtract(adjustment.discountAmount())
                .add(adjustment.shippingFee())
                .setScale(2, RoundingMode.HALF_UP);
        if (totalPrice.compareTo(BigDecimal.ZERO) < 0) {
            totalPrice = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        order.setTotalPrice(totalPrice);
        orderRepository.save(order);

        PaymentEntity payment = paymentRepository.findFirstByOrder_IdOrderByCreatedAtDesc(orderId).orElse(null);
        if (payment != null) {
            payment.setPaymentMethod(paymentMethod);
            payment.setStatus(PAYMENT_PENDING);
            payment.setAmount(totalPrice);
            paymentRepository.save(payment);
        }
    }

    private CouponPreviewAdjustment calculatePreviewAdjustment(
            String couponCode,
            BigDecimal subtotal,
            BigDecimal baseShippingFee,
            List<CheckoutPreviewItemResponse> items
    ) {
        List<String> codes = parseCouponCodes(couponCode);
        if (codes.isEmpty()) {
            return CouponPreviewAdjustment.valid(null, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), baseShippingFee, "No coupon applied");
        }

        BigDecimal totalDiscount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal shippingFee = baseShippingFee;
        List<String> validCodes = new ArrayList<>();
        boolean hasOrderDiscount = false;
        boolean hasFreeship = false;
        Set<Long> productDiscounts = new HashSet<>();

        for (String code : codes) {
            CouponEntity coupon = couponRepository.findByCodeIgnoreCase(code).orElse(null);
            if (coupon == null) {
                return CouponPreviewAdjustment.invalid(code, "Mã giảm giá '" + code + "' không tồn tại", baseShippingFee);
            }

            String guardMessage = validateGuestCoupon(coupon, subtotal);
            if (guardMessage != null) {
                return CouponPreviewAdjustment.invalid(coupon.getCode(), guardMessage, baseShippingFee);
            }

            String type = normalizeCouponType(coupon);
            if (COUPON_TYPE_FREESHIP.equals(type)) {
                if (hasFreeship) {
                    return CouponPreviewAdjustment.invalid(coupon.getCode(), "Chỉ được áp dụng tối đa 1 mã miễn phí vận chuyển", baseShippingFee);
                }
                hasFreeship = true;
                shippingFee = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            } else if (COUPON_TYPE_PRODUCT_DISCOUNT.equals(type)) {
                if (coupon.getProductId() == null || items.stream().noneMatch(item -> coupon.getProductId().equals(item.getProductId()))) {
                    return CouponPreviewAdjustment.invalid(coupon.getCode(), "Đơn hàng không chứa sản phẩm áp dụng mã này", baseShippingFee);
                }
                if (!productDiscounts.add(coupon.getProductId())) {
                    return CouponPreviewAdjustment.invalid(coupon.getCode(), "Sản phẩm này đã được áp dụng mã giảm giá", baseShippingFee);
                }
                totalDiscount = totalDiscount.add(calculatePreviewDiscount(coupon, subtotal, items));
            } else {
                if (hasOrderDiscount) {
                    return CouponPreviewAdjustment.invalid(coupon.getCode(), "Chỉ được áp dụng tối đa 1 mã giảm giá đơn hàng", baseShippingFee);
                }
                hasOrderDiscount = true;
                totalDiscount = totalDiscount.add(calculatePreviewDiscount(coupon, subtotal, items));
            }
            validCodes.add(coupon.getCode());
        }

        return CouponPreviewAdjustment.valid(String.join(",", validCodes), totalDiscount.setScale(2, RoundingMode.HALF_UP), shippingFee, "Áp dụng thành công mã giảm giá");
    }

    private CouponOrderAdjustment calculateOrderAdjustment(
            String couponCode,
            BigDecimal subtotal,
            BigDecimal baseShippingFee,
            List<OrderItemEntity> items
    ) {
        if (couponCode == null) {
            return new CouponOrderAdjustment(null, null, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), baseShippingFee);
        }

        List<String> codes = parseCouponCodes(couponCode);
        BigDecimal totalDiscount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal shippingFee = baseShippingFee;
        List<String> validCodes = new ArrayList<>();
        CouponEntity primaryCoupon = null;
        boolean hasOrderDiscount = false;
        boolean hasFreeship = false;
        Set<Long> productDiscounts = new HashSet<>();

        for (String code : codes) {
            CouponEntity coupon = couponRepository.findByCodeIgnoreCaseForUpdate(code)
                    .orElseThrow(() -> new BadRequestException("Mã giảm giá '" + code + "' không tồn tại"));
            String guardMessage = validateGuestCoupon(coupon, subtotal);
            if (guardMessage != null) {
                throw new BadRequestException(guardMessage);
            }

            String type = normalizeCouponType(coupon);
            if (COUPON_TYPE_FREESHIP.equals(type)) {
                if (hasFreeship) {
                    throw new BadRequestException("Chỉ được áp dụng tối đa 1 mã miễn phí vận chuyển");
                }
                hasFreeship = true;
                shippingFee = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            } else if (COUPON_TYPE_PRODUCT_DISCOUNT.equals(type)) {
                if (coupon.getProductId() == null || items.stream().noneMatch(item -> item.getProduct() != null && coupon.getProductId().equals(item.getProduct().getId()))) {
                    throw new BadRequestException("Đơn hàng không chứa sản phẩm áp dụng mã này");
                }
                if (!productDiscounts.add(coupon.getProductId())) {
                    throw new BadRequestException("Sản phẩm này đã được áp dụng mã giảm giá");
                }
                totalDiscount = totalDiscount.add(calculateOrderDiscount(coupon, subtotal, items));
            } else {
                if (hasOrderDiscount) {
                    throw new BadRequestException("Chỉ được áp dụng tối đa 1 mã giảm giá đơn hàng");
                }
                hasOrderDiscount = true;
                totalDiscount = totalDiscount.add(calculateOrderDiscount(coupon, subtotal, items));
            }

            coupon.setTimesUsed((coupon.getTimesUsed() == null ? 0 : coupon.getTimesUsed()) + 1);
            couponRepository.save(coupon);
            validCodes.add(coupon.getCode());
            if (primaryCoupon == null || COUPON_TYPE_ORDER_DISCOUNT.equals(type)) {
                primaryCoupon = coupon;
            }
        }

        return new CouponOrderAdjustment(primaryCoupon, String.join(",", validCodes), totalDiscount.setScale(2, RoundingMode.HALF_UP), shippingFee);
    }

    private String validateGuestCoupon(CouponEntity coupon, BigDecimal subtotal) {
        if (!Boolean.TRUE.equals(coupon.getActive())) {
            return "Mã giảm giá đã bị vô hiệu hóa";
        }
        if (Boolean.FALSE.equals(coupon.getGuestAllowed()) || coupon.getRequiredMembershipTier() != null) {
            return "Bạn cần đăng nhập để sử dụng mã này";
        }

        LocalDateTime now = java.time.ZonedDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDateTime();
        if (coupon.getStartsAt() != null && coupon.getStartsAt().isAfter(now)) {
            return "Mã giảm giá chưa bắt đầu";
        }
        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(now)) {
            return "Mã giảm giá đã hết hạn";
        }
        if (coupon.getUsageLimit() != null && coupon.getTimesUsed() != null && coupon.getTimesUsed() >= coupon.getUsageLimit()) {
            return "Mã giảm giá đã hết lượt sử dụng";
        }
        if (coupon.getMinOrderValue() != null && subtotal.compareTo(coupon.getMinOrderValue()) < 0) {
            return "Đơn hàng tối thiểu phải từ " + coupon.getMinOrderValue().longValue() + "đ";
        }
        return null;
    }

    private BigDecimal calculatePreviewDiscount(CouponEntity coupon, BigDecimal subtotal, List<CheckoutPreviewItemResponse> items) {
        BigDecimal eligibleAmount = subtotal;
        if (COUPON_TYPE_PRODUCT_DISCOUNT.equals(normalizeCouponType(coupon)) && coupon.getProductId() != null) {
            eligibleAmount = items.stream()
                    .filter(item -> coupon.getProductId().equals(item.getProductId()))
                    .map(item -> normalizeMoney(item.getLineTotal()))
                    .reduce(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), BigDecimal::add);
        }
        return calculateDiscount(coupon, eligibleAmount);
    }

    private BigDecimal calculateOrderDiscount(CouponEntity coupon, BigDecimal subtotal, List<OrderItemEntity> items) {
        BigDecimal eligibleAmount = subtotal;
        if (COUPON_TYPE_PRODUCT_DISCOUNT.equals(normalizeCouponType(coupon)) && coupon.getProductId() != null) {
            eligibleAmount = items.stream()
                    .filter(item -> item.getProduct() != null && coupon.getProductId().equals(item.getProduct().getId()))
                    .map(item -> normalizeMoney(item.getPrice()).multiply(BigDecimal.valueOf(Math.max(item.getQuantity() == null ? 0 : item.getQuantity(), 0))))
                    .reduce(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), BigDecimal::add);
        }
        return calculateDiscount(coupon, eligibleAmount);
    }

    private BigDecimal calculateDiscount(CouponEntity coupon, BigDecimal eligibleAmount) {
        if (COUPON_TYPE_FREESHIP.equals(normalizeCouponType(coupon))) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal discount;
        if (DISCOUNT_TYPE_FIXED_AMOUNT.equals(normalizeDiscountType(coupon))) {
            discount = coupon.getDiscountAmount() == null ? BigDecimal.ZERO : coupon.getDiscountAmount();
        } else {
            discount = eligibleAmount
                    .multiply(BigDecimal.valueOf(coupon.getDiscountPercentage() == null ? 0 : coupon.getDiscountPercentage()))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }
        if (discount.compareTo(eligibleAmount) > 0) {
            discount = eligibleAmount;
        }
        return discount.setScale(2, RoundingMode.HALF_UP);
    }

    private List<String> parseCouponCodes(String couponCode) {
        String clean = cleanBlank(couponCode);
        if (clean == null) {
            return List.of();
        }
        return java.util.Arrays.stream(clean.split(","))
                .map(String::trim)
                .filter(code -> !code.isBlank())
                .distinct()
                .toList();
    }

    private String normalizeGuestPaymentMethod(String paymentMethod) {
        String method = cleanBlank(paymentMethod);
        if (method == null) {
            return PAYMENT_METHOD_CASH;
        }
        method = method.toLowerCase(Locale.ROOT);
        if (PAYMENT_METHOD_CASH.equals(method) || PAYMENT_METHOD_VNPAY.equals(method)) {
            return method;
        }
        throw new BadRequestException("Khách vãng lai chỉ hỗ trợ COD hoặc VNPay Sandbox");
    }

    private String normalizeCouponType(CouponEntity coupon) {
        String type = cleanBlank(coupon.getCouponType());
        return type == null ? COUPON_TYPE_ORDER_DISCOUNT : type.toUpperCase(Locale.ROOT);
    }

    private String normalizeDiscountType(CouponEntity coupon) {
        String type = cleanBlank(coupon.getDiscountType());
        return type == null ? "PERCENTAGE" : type.toUpperCase(Locale.ROOT);
    }

    private BigDecimal normalizeMoney(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }
        return value.trim();
    }

    private record CouponPreviewAdjustment(String couponCode, BigDecimal discountAmount, BigDecimal shippingFee, boolean valid, String message) {
        static CouponPreviewAdjustment valid(String couponCode, BigDecimal discountAmount, BigDecimal shippingFee, String message) {
            return new CouponPreviewAdjustment(couponCode, discountAmount, shippingFee, true, message);
        }

        static CouponPreviewAdjustment invalid(String couponCode, String message, BigDecimal shippingFee) {
            return new CouponPreviewAdjustment(couponCode, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), shippingFee, false, message);
        }
    }

    private record CouponOrderAdjustment(CouponEntity coupon, String couponCode, BigDecimal discountAmount, BigDecimal shippingFee) {
    }
}
