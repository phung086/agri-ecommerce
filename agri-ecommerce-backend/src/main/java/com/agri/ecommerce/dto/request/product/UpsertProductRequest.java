package com.agri.ecommerce.dto.request.product;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
public class UpsertProductRequest {

    @NotBlank(message = "Ten san pham khong duoc de trong")
    @Size(max = 255, message = "Ten san pham khong duoc vuot qua 255 ky tu")
    private String name;

    @NotBlank(message = "Slug khong duoc de trong")
    @Size(max = 255, message = "Slug khong duoc vuot qua 255 ky tu")
    private String slug;

    @NotNull(message = "Danh muc khong duoc de trong")
    private Long categoryId;

    private String description;

    @NotNull(message = "Gia khong duoc de trong")
    @DecimalMin(value = "0.00", message = "Gia phai lon hon hoac bang 0")
    private BigDecimal price;

    @NotNull(message = "Ton kho khong duoc de trong")
    @Min(value = 0, message = "Ton kho phai lon hon hoac bang 0")
    private Integer stock;

    @NotBlank(message = "Trang thai khong duoc de trong")
    @Size(max = 255, message = "Trang thai khong duoc vuot qua 255 ky tu")
    private String status;

    @Size(max = 255, message = "Don vi khong duoc vuot qua 255 ky tu")
    private String unit;

    @Size(max = 255, message = "Anh dai dien khong duoc vuot qua 255 ky tu")
    private String thumbnail;

    @Size(max = 10, message = "Chi ho tro toi da 10 anh")
    private List<@Size(max = 255, message = "Duong dan anh khong duoc vuot qua 255 ky tu") String> images;
}
