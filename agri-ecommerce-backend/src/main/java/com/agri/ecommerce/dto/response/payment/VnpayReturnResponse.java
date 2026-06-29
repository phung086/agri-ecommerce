package com.agri.ecommerce.dto.response.payment;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class VnpayReturnResponse {

    private boolean validSignature;

    private Long orderId;

    private String paymentStatus;

    private String responseCode;

    private String transactionStatus;

    private String transactionNo;

    private String bankCode;

    private BigDecimal amount;

    private String orderInfo;

    private String message;
}
