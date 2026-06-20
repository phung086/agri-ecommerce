package com.agri.ecommerce.dto.response.order;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class PaymentResponse {

    private Long id;

    private String paymentMethod;

    private String transactionId;

    private BigDecimal amount;

    private String status;

    private LocalDateTime paidAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
