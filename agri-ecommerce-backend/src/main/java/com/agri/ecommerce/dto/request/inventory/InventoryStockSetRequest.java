package com.agri.ecommerce.dto.request.inventory;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class InventoryStockSetRequest {

    @NotNull(message = "Stock must not be null")
    @Min(value = 0, message = "Stock must be greater than or equal to 0")
    private Integer stock;

    @Size(max = 500, message = "Note must not exceed 500 characters")
    private String note;
}
