package com.agri.ecommerce.dto.response.payment;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class PaymentDetailResponse {

    private Long id;

    private Long orderId;

    private String orderStatus;

    private Long customerId;

    private String customerName;

    private String customerEmail;

    private String customerPhoneNumber;

    private String paymentMethod;

    private String transactionId;

    private BigDecimal amount;

    private String status;

    private LocalDateTime paidAt;

    private LocalDateTime orderCreatedAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
