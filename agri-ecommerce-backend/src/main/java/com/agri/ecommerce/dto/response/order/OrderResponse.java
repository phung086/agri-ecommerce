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

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
