package com.agri.ecommerce.dto.response.order;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
public class OrderResponse {

    private Long id;

    private Long customerId;

    private String customerName;

    private String customerEmail;

    private String customerPhoneNumber;

    private Long deliveryStaffId;

    private String deliveryStaffName;

    private String deliveryStaffEmail;

    private String deliveryStaffPhoneNumber;

    private String status;

    private BigDecimal subtotal;

    private BigDecimal discountAmount;

    private BigDecimal shippingFee;

    private String couponCode;

    private BigDecimal totalPrice;

    private ShippingAddressResponse shippingAddress;

    private PaymentResponse payment;

    private List<OrderItemResponse> items;

    private List<OrderStatusHistoryResponse> statusHistory;

    private LocalDateTime dispatchedAt;

    private LocalDateTime deliveredAt;

    private String deliveryProofImage;

    private String deliverySignature;

    private String deliveryFailureReason;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
