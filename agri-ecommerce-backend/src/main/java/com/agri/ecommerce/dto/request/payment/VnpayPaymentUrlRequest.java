package com.agri.ecommerce.dto.request.payment;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VnpayPaymentUrlRequest {

    @Size(max = 20, message = "Mã ngân hàng không được vượt quá 20 ký tự")
    private String bankCode;

    @Size(max = 5, message = "Ngôn ngữ không được vượt quá 5 ký tự")
    private String locale;
}
