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
    @Pattern(regexp = "^[A-Za-zÀ-ỹ\\s]{2,50}$", message = "Họ tên chỉ được chứa chữ cái và khoảng trắng.")
    private String fullName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0.")
    private String phoneNumber;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    @Size(max = 255, message = "Email không được vượt quá 255 ký tự")
    private String email;

    @NotBlank(message = "Nội dung liên hệ không được để trống")
    @Size(min = 10, max = 255, message = "Nội dung phải từ 10 đến 255 ký tự.")
    private String message;
}
