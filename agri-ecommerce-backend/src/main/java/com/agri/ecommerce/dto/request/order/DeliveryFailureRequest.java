package com.agri.ecommerce.dto.request.order;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DeliveryFailureRequest {

    @NotBlank(message = "Lý do giao hàng thất bại không được để trống")
    private String reason; // e.g. "cannot_contact", "rescheduled", "canceled"

    @Size(max = 1000, message = "Ghi chú không được vượt quá 1000 ký tự")
    private String note;
}
