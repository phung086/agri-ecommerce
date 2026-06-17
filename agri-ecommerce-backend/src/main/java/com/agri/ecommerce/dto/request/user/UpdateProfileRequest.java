package com.agri.ecommerce.dto.request.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateProfileRequest {

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 255, message = "Họ tên không được vượt quá 255 ký tự")
    private String name;

    @Size(max = 255, message = "Số điện thoại không được vượt quá 255 ký tự")
    private String phoneNumber;

    private String address;

    @Size(max = 255, message = "Avatar không được vượt quá 255 ký tự")
    private String avatar;
}