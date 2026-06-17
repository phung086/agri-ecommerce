package com.agri.ecommerce.dto.request.user;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserStatusRequest {

    @NotBlank(message = "Trạng thái không được để trống")
    private String status;
}