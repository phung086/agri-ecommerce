package com.agri.ecommerce.dto.request.inventory;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class InventoryBatchCreateRequest {

    @NotNull(message = "Product ID khong duoc de trong")
    private Long productId;

    @NotBlank(message = "Ma lo hang khong duoc de trong")
    private String batchNumber;

    @NotNull(message = "Gia nhap khong duoc de trong")
    @DecimalMin(value = "0.01", message = "Gia nhap phai lon hon 0")
    private BigDecimal importPrice;

    @NotNull(message = "So luong khong duoc de trong")
    @Min(value = 1, message = "So luong phai lon hon hoac bang 1")
    private Integer originalQuantity;

    private LocalDateTime manufactureDate;

    @NotNull(message = "Han su dung khong duoc de trong")
    private LocalDateTime expiryDate;
}
