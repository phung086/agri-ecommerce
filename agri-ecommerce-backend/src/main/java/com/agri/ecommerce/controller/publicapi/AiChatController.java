package com.agri.ecommerce.controller.publicapi;

import com.agri.ecommerce.dto.request.chat.AiChatRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.chat.AiChatResponse;
import com.agri.ecommerce.service.AiChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import com.agri.ecommerce.security.UserPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller AI Chatbot tư vấn nông sản.
 *
 * Public endpoint — không yêu cầu đăng nhập.
 * Nếu user đã đăng nhập (JWT hợp lệ), sẽ lưu lịch sử theo user_id.
 * Nếu khách vãng lai, dùng guestToken để phân biệt phiên chat.
 */
@Tag(
        name = "Public - AI Chatbot",
        description = "API tư vấn mua sắm nông sản bằng AI. Hỗ trợ tiếng Việt, gợi ý sản phẩm từ database thực."
)
@RestController
@RequestMapping("/api/public/ai-chat")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService aiChatService;

    /**
     * Gửi tin nhắn đến AI Shopping Assistant.
     *
     * Endpoint public — không cần authentication.
     * Nếu có JWT token hợp lệ trong header, user_id sẽ được gắn vào lịch sử chat.
     *
     * @param request       tin nhắn và guestToken
     * @param authentication Spring Security authentication (null nếu chưa đăng nhập)
     * @return ApiResponse chứa AiChatResponse
     */
    @Operation(
            summary = "Send message to AI shopping assistant",
            description = """
                    Gửi tin nhắn đến AI Chatbot tư vấn nông sản.
                    
                    **Chatbot có thể tư vấn:**
                    - Sản phẩm theo tên, danh mục, ngân sách
                    - Giá cả, đơn vị tính, tồn kho
                    - Chính sách thanh toán, giao hàng, đổi trả
                    - Mã giảm giá và khuyến mãi
                    
                    **Lưu ý:**
                    - Chatbot chỉ dùng dữ liệu thật từ database, không bịa sản phẩm
                    - Trả lời bằng tiếng Việt, thân thiện
                    - guestToken sẽ được tạo tự động nếu không gửi
                    """
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Chatbot trả lời thành công",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = ApiResponse.class),
                            examples = @ExampleObject(
                                    name = "Ví dụ response",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Chatbot replied successfully",
                                              "data": {
                                                "reply": "Chào bạn! Hiện tại cửa hàng có **Rau cải ngọt hữu cơ** giá 25.000đ/kg...",
                                                "guestToken": "guest_abc123xyz",
                                                "suggestedProducts": [],
                                                "createdAt": "2026-06-29T16:00:00"
                                              },
                                              "errors": null,
                                              "statusCode": 200,
                                              "timestamp": "2026-06-29T16:00:00"
                                            }
                                            """
                            )
                    )
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Request không hợp lệ (message trống hoặc quá dài)"
            )
    })
    @PostMapping("/messages")
    public ResponseEntity<ApiResponse<AiChatResponse>> chat(
            @Valid @RequestBody AiChatRequest request,
            Authentication authentication
    ) {
        Long userId = extractUserId(authentication);

        AiChatResponse response = aiChatService.chat(request, userId);

        return ResponseEntity.ok(
                ApiResponse.success("Chatbot replied successfully", response, HttpStatus.OK.value())
        );
    }

    /**
     * Lấy userId từ JWT authentication nếu user đã đăng nhập.
     * Trả về null nếu chưa đăng nhập hoặc token không hợp lệ.
     */
    private Long extractUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();

        // UserPrincipal chứa Long id trực tiếp
        if (principal instanceof UserPrincipal userPrincipal) {
            return userPrincipal.getId();
        }

        return null;
    }
}
