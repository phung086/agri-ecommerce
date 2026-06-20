package com.agri.ecommerce.dto.request.order;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AssignDeliveryStaffRequest {

    @NotNull(message = "Nhân viên giao hàng không được để trống")
    private Long deliveryStaffId;

    @Size(max = 1000, message = "Ghi chú không được vượt quá 1000 ký tự")
    private String note;
}
