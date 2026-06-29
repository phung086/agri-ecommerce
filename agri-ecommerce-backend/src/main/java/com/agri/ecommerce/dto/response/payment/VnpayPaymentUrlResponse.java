package com.agri.ecommerce.dto.response.payment;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class VnpayPaymentUrlResponse {

    private Long orderId;

    private Long paymentId;

    private String txnRef;

    private BigDecimal amount;

    private String paymentUrl;

    private LocalDateTime expiresAt;
}
