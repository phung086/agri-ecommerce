package com.agri.ecommerce.dto.request.product;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductStatusUpdateRequest {

    @NotBlank(message = "Trạng thái sản phẩm không được để trống")
    private String status;
}
