package com.agri.ecommerce.dto.request.payment;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PaymentRefundRequest {

    @Size(max = 1000, message = "Refund note must not exceed 1000 characters")
    private String note;
}
