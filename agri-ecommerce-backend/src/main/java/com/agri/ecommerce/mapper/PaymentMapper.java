package com.agri.ecommerce.mapper;

import com.agri.ecommerce.dto.response.payment.PaymentDetailResponse;
import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.PaymentEntity;
import com.agri.ecommerce.entity.UserEntity;
import org.springframework.stereotype.Component;

@Component
public class PaymentMapper {

    public PaymentDetailResponse toPaymentDetailResponse(PaymentEntity payment) {
        if (payment == null) {
            return null;
        }

        OrderEntity order = payment.getOrder();
        UserEntity customer = order == null ? null : order.getUser();

        return PaymentDetailResponse.builder()
                .id(payment.getId())
                .orderId(order == null ? null : order.getId())
                .orderStatus(order == null ? null : order.getStatus())
                .customerId(customer == null ? null : customer.getId())
                .customerName(customer == null ? null : customer.getName())
                .customerEmail(customer == null ? null : customer.getEmail())
                .customerPhoneNumber(customer == null ? null : customer.getPhoneNumber())
                .paymentMethod(payment.getPaymentMethod())
                .transactionId(payment.getTransactionId())
                .amount(payment.getAmount())
                .status(payment.getStatus())
                .paidAt(payment.getPaidAt())
                .orderCreatedAt(order == null ? null : order.getCreatedAt())
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }
}
