package com.agri.ecommerce.dto.request.contact;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ContactRepliedUpdateRequest {

    @NotNull(message = "Trạng thái phản hồi không được để trống")
    private Boolean replied;
}
