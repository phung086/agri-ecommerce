package com.agri.ecommerce.dto.response.order;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@Builder
public class CheckoutPreviewResponse {

    private boolean canCheckout;

    private String paymentMethod;

    private String couponCode;

    private boolean couponValid;

    private String couponMessage;

    private ShippingAddressResponse shippingAddress;

    private Integer totalQuantity;

    private BigDecimal subtotal;

    private BigDecimal discountAmount;

    private BigDecimal couponDiscountAmount;

    private BigDecimal pointsDiscount;

    private Integer pointsUsed;

    private BigDecimal shippingFee;

    private BigDecimal totalPrice;

    private List<CheckoutPreviewItemResponse> items;

    private List<String> warnings;
}
