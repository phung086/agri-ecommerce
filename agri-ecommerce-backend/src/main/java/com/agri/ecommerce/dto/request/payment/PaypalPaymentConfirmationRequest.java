package com.agri.ecommerce.dto.request.payment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PaypalPaymentConfirmationRequest {

    @NotBlank(message = "Mã giao dịch PayPal không được để trống")
    @Size(max = 255, message = "Mã giao dịch PayPal không được vượt quá 255 ký tự")
    private String transactionId;
}
