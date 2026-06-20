package com.agri.ecommerce.dto.request.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GuestChatMessageRequest {

    @Size(max = 100, message = "Guest token không được vượt quá 100 ký tự")
    private String guestToken;

    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    @Size(max = 5000, message = "Nội dung tin nhắn không được vượt quá 5000 ký tự")
    private String message;
}
