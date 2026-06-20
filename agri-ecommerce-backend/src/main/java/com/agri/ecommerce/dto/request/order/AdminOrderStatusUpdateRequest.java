package com.agri.ecommerce.dto.request.order;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminOrderStatusUpdateRequest {

    @NotBlank(message = "Trạng thái đơn hàng không được để trống")
    @Size(max = 255, message = "Trạng thái đơn hàng không được vượt quá 255 ký tự")
    private String status;

    @Size(max = 1000, message = "Ghi chú không được vượt quá 1000 ký tự")
    private String note;
}
