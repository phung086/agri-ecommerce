package com.agri.ecommerce.dto.request.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminChatReplyRequest {

    private Long userId;

    @Size(max = 100, message = "Guest token không được vượt quá 100 ký tự")
    private String guestToken;

    @NotBlank(message = "Nội dung phản hồi không được để trống")
    @Size(max = 5000, message = "Nội dung phản hồi không được vượt quá 5000 ký tự")
    private String message;
}
