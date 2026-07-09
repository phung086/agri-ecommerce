package com.agri.ecommerce.dto.request.inventory;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class InventoryBatchCreateRequest {

    @NotNull(message = "Product ID không được để trống")
    private Long productId;

    @NotBlank(message = "Mã lô hàng không được để trống")
    @Size(max = 100, message = "Mã lô hàng không được vượt quá 100 ký tự")
    private String batchNumber;

    @NotNull(message = "Giá nhập không được để trống")
    @DecimalMin(value = "0.01", message = "Giá nhập phải lớn hơn 0")
    private BigDecimal importPrice;

    @NotNull(message = "Số lượng không được để trống")
    @Min(value = 1, message = "Số lượng phải lớn hơn hoặc bằng 1")
    private Integer originalQuantity;

    private LocalDateTime receivedAt;

    private LocalDateTime manufactureDate;

    @NotNull(message = "Hạn sử dụng không được để trống")
    private LocalDateTime expiryDate;

    @Size(max = 255, message = "Tên nhà cung cấp không được vượt quá 255 ký tự")
    private String supplierName;

    @Size(max = 255, message = "Vị trí kho không được vượt quá 255 ký tự")
    private String storageLocation;

    @Size(max = 500, message = "Ghi chú không được vượt quá 500 ký tự")
    private String note;
}
