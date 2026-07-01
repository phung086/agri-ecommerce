package com.agri.ecommerce.dto.request.product;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
public class ProductUpdateRequest {

    @NotBlank(message = "Tên sản phẩm không được để trống")
    @Size(max = 255, message = "Tên sản phẩm không được vượt quá 255 ký tự")
    private String name;

    @NotBlank(message = "Slug sản phẩm không được để trống")
    @Size(max = 255, message = "Slug sản phẩm không được vượt quá 255 ký tự")
    private String slug;

    @NotNull(message = "Danh mục sản phẩm không được để trống")
    private Long categoryId;

    private String description;

    @NotNull(message = "Giá sản phẩm không được để trống")
    @DecimalMin(value = "0.01", message = "Giá sản phẩm phải lớn hơn 0")
    private BigDecimal price;

    @NotNull(message = "Tồn kho sản phẩm không được để trống")
    @Min(value = 0, message = "Tồn kho sản phẩm phải lớn hơn hoặc bằng 0")
    private Integer stock;

    @Size(max = 255, message = "Trạng thái sản phẩm không được vượt quá 255 ký tự")
    private String status;

    @Size(max = 255, message = "Đơn vị tính không được vượt quá 255 ký tự")
    private String unit;

    @Size(max = 255, message = "Ảnh đại diện không được vượt quá 255 ký tự")
    private String thumbnail;

    private List<@Size(max = 255, message = "Đường dẫn ảnh không được vượt quá 255 ký tự") String> images;
}
