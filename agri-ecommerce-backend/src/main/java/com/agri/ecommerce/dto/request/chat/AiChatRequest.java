package com.agri.ecommerce.dto.request.chat;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request gửi tin nhắn đến AI Chatbot tư vấn nông sản.
 */
@Getter
@Setter
@Schema(description = "Request gửi tin nhắn đến AI Chatbot tư vấn")
public class AiChatRequest {

    @NotBlank(message = "Tin nhắn không được để trống")
    @Size(max = 1000, message = "Tin nhắn không được vượt quá 1000 ký tự")
    @Schema(
            description = "Nội dung tin nhắn của người dùng",
            example = "Có rau gì ngon không?",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private String message;

    @Size(max = 10, message = "Locale không được vượt quá 10 ký tự")
    @Schema(
            description = "Ngôn ngữ của phiên chat (vi hoặc en). Mặc định là vi.",
            example = "vi",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    private String locale;

    @Size(max = 100, message = "Guest token không được vượt quá 100 ký tự")
    @Schema(
            description = "Token định danh khách vãng lai. Nếu không gửi, backend tự tạo.",
            example = "guest_abc123",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    private String guestToken;
}
