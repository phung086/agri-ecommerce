package com.agri.ecommerce.dto.request.chat;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "Request gửi tin nhắn đến AI Chatbot đa vai trò")
public class AiChatRequest {

    @NotBlank(message = "Tin nhắn không được để trống")
    @Size(max = 2000, message = "Tin nhắn không được vượt quá 2000 ký tự")
    @Schema(
            description = "Nội dung tin nhắn của người dùng",
            example = "Tư vấn giúp tôi đơn hàng hoặc sản phẩm phù hợp",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private String message;

    @Size(max = 100, message = "Guest token không được vượt quá 100 ký tự")
    @Schema(
            description = "Token định danh khách vãng lai. Nếu không gửi, backend tự tạo.",
            example = "guest_abc123",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    private String guestToken;

    @Size(max = 50, message = "Audience không được vượt quá 50 ký tự")
    @Schema(
            description = "Vai trò frontend đang gọi chatbot: auto, guest, customer, delivery, admin hoặc staff.",
            example = "auto",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    private String audience;

    @Size(max = 50, message = "Context type không được vượt quá 50 ký tự")
    @Schema(
            description = "Ngữ cảnh nghiệp vụ hiện tại: auto, product, order, payment, delivery, admin, account hoặc coupon.",
            example = "auto",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    private String contextType;

    @Size(max = 255, message = "Current path không được vượt quá 255 ký tự")
    @Schema(
            description = "Đường dẫn frontend hiện tại để AI hiểu người dùng đang ở màn hình nào.",
            example = "/checkout",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    private String currentPath;

    @Size(max = 10, message = "Ngôn ngữ không được vượt quá 10 ký tự")
    @Schema(
            description = "Ngôn ngữ phản hồi mong muốn: vi hoặc en.",
            example = "vi",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    private String language;
}
