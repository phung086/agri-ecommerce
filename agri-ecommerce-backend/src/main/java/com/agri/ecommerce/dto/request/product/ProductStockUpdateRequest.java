package com.agri.ecommerce.dto.request.product;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductStockUpdateRequest {

    @NotNull(message = "Tồn kho sản phẩm không được để trống")
    @Min(value = 0, message = "Tồn kho sản phẩm phải lớn hơn hoặc bằng 0")
    private Integer stock;
}
