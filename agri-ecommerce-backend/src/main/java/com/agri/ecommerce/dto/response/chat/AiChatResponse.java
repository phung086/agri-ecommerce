package com.agri.ecommerce.dto.response.chat;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response từ AI Chatbot tư vấn nông sản.
 */
@Getter
@Setter
@Builder
@Schema(description = "Câu trả lời từ AI Chatbot")
public class AiChatResponse {

    @Schema(description = "Nội dung trả lời của chatbot (markdown)", example = "Chào bạn! Hiện tại cửa hàng có **Rau cải ngọt** giá 25.000đ/kg...")
    private String reply;

    @Schema(description = "Token định danh phiên chat. Trả về để client lưu lại cho lần sau.", example = "guest_abc123xyz")
    private String guestToken;

    @Schema(description = "Danh sách sản phẩm được AI gợi ý (có thể rỗng)")
    private List<SuggestedProductResponse> suggestedProducts;

    @Schema(description = "Thời điểm tạo response")
    private LocalDateTime createdAt;
}
