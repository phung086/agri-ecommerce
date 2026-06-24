package com.agri.ecommerce.dto.request.inventory;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class InventoryStockAdjustmentRequest {

    @NotNull(message = "Stock quantity delta must not be null")
    @Min(value = -100000, message = "Stock quantity delta is too small")
    @Max(value = 100000, message = "Stock quantity delta is too large")
    private Integer quantityDelta;

    @Size(max = 500, message = "Note must not exceed 500 characters")
    private String note;
}
