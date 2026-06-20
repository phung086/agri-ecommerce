package com.agri.ecommerce.mapper;

import com.agri.ecommerce.dto.response.order.*;
import com.agri.ecommerce.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
@RequiredArgsConstructor
public class OrderMapper {

    private final ShippingAddressMapper shippingAddressMapper;

    public OrderResponse toOrderResponse(
            OrderEntity order,
            List<OrderItemEntity> orderItems,
            PaymentEntity payment,
            List<OrderStatusHistoryEntity> statusHistory
    ) {
        return OrderResponse.builder()
                .id(order.getId())
                .status(order.getStatus())
                .subtotal(order.getSubtotal())
                .discountAmount(order.getDiscountAmount())
                .shippingFee(order.getShippingFee())
                .couponCode(order.getCouponCode())
                .totalPrice(order.getTotalPrice())
                .shippingAddress(shippingAddressMapper.toShippingAddressResponse(order.getShippingAddress()))
                .payment(toPaymentResponse(payment))
                .items(toOrderItemResponses(orderItems))
                .statusHistory(toStatusHistoryResponses(statusHistory))
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }

    public OrderItemResponse toOrderItemResponse(OrderItemEntity orderItem) {
        ProductEntity product = orderItem.getProduct();
        BigDecimal lineTotal = orderItem.getPrice().multiply(BigDecimal.valueOf(orderItem.getQuantity()));

        return OrderItemResponse.builder()
                .id(orderItem.getId())
                .productId(product == null ? null : product.getId())
                .productName(product == null ? null : product.getName())
                .productSlug(product == null ? null : product.getSlug())
                .unit(product == null ? null : product.getUnit())
                .quantity(orderItem.getQuantity())
                .price(orderItem.getPrice())
                .lineTotal(lineTotal)
                .build();
    }

    public PaymentResponse toPaymentResponse(PaymentEntity payment) {
        if (payment == null) {
            return null;
        }

        return PaymentResponse.builder()
                .id(payment.getId())
                .paymentMethod(payment.getPaymentMethod())
                .transactionId(payment.getTransactionId())
                .amount(payment.getAmount())
                .status(payment.getStatus())
                .paidAt(payment.getPaidAt())
                .build();
    }

    public OrderStatusHistoryResponse toStatusHistoryResponse(OrderStatusHistoryEntity history) {
        return OrderStatusHistoryResponse.builder()
                .id(history.getId())
                .status(history.getStatus())
                .changedAt(history.getChangedAt())
                .note(history.getNote())
                .build();
    }

    private List<OrderItemResponse> toOrderItemResponses(List<OrderItemEntity> orderItems) {
        if (orderItems == null) {
            return List.of();
        }

        return orderItems.stream()
                .map(this::toOrderItemResponse)
                .toList();
    }

    private List<OrderStatusHistoryResponse> toStatusHistoryResponses(List<OrderStatusHistoryEntity> statusHistory) {
        if (statusHistory == null) {
            return List.of();
        }

        return statusHistory.stream()
                .map(this::toStatusHistoryResponse)
                .toList();
    }
}
