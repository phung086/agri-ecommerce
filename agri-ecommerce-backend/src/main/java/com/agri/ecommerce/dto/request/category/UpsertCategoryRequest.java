package com.agri.ecommerce.dto.request.category;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpsertCategoryRequest {

    @NotBlank(message = "Ten danh muc khong duoc de trong")
    @Size(max = 255, message = "Ten danh muc khong duoc vuot qua 255 ky tu")
    private String name;

    @NotBlank(message = "Slug khong duoc de trong")
    @Size(max = 255, message = "Slug khong duoc vuot qua 255 ky tu")
    private String slug;

    private String description;

    @Size(max = 255, message = "Duong dan anh khong duoc vuot qua 255 ky tu")
    private String image;
}
