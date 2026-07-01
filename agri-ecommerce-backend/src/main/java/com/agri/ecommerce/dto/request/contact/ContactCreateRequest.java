package com.agri.ecommerce.dto.request.contact;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ContactCreateRequest {

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 255, message = "Họ tên không được vượt quá 255 ký tự")
    private String fullName;

    @Size(max = 255, message = "Số điện thoại không được vượt quá 255 ký tự")
    @Pattern(
            regexp = "^$|^(0[2-9][0-9]{8}|\\+84[2-9][0-9]{8})$",
            message = "Số điện thoại phải đúng định dạng Việt Nam, ví dụ 0987654321 hoặc +84987654321"
    )
    private String phoneNumber;

    @Email(message = "Email không hợp lệ")
    @Size(max = 255, message = "Email không được vượt quá 255 ký tự")
    private String email;

    @NotBlank(message = "Nội dung liên hệ không được để trống")
    @Size(max = 255, message = "Nội dung liên hệ không được vượt quá 255 ký tự")
    private String message;
}
