package com.agri.ecommerce.dto.request.category;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CategoryCreateRequest {

    @NotBlank(message = "Tên danh mục không được để trống")
    @Size(max = 255, message = "Tên danh mục không được vượt quá 255 ký tự")
    private String name;

    @NotBlank(message = "Slug danh mục không được để trống")
    @Size(max = 255, message = "Slug danh mục không được vượt quá 255 ký tự")
    private String slug;

    private String description;

    @Size(max = 255, message = "Đường dẫn ảnh danh mục không được vượt quá 255 ký tự")
    private String image;
}
