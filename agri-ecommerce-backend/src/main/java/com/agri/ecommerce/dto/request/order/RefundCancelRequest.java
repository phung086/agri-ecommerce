package com.agri.ecommerce.dto.request.order;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RefundCancelRequest {

    @NotBlank(message = "Vui lòng nhập tên ngân hàng nhận hoàn tiền")
    @Size(max = 100, message = "Tên ngân hàng không được vượt quá 100 ký tự")
    private String bankName;

    @NotBlank(message = "Vui lòng nhập số tài khoản nhận hoàn tiền")
    @Pattern(regexp = "^[0-9]{6,30}$", message = "Số tài khoản chỉ gồm 6-30 chữ số")
    private String bankAccountNumber;

    @NotBlank(message = "Vui lòng nhập tên chủ tài khoản")
    @Size(max = 100, message = "Tên chủ tài khoản không được vượt quá 100 ký tự")
    private String bankAccountHolder;

    @Size(max = 500, message = "Lý do hủy không được vượt quá 500 ký tự")
    private String reason;
}
