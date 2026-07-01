package com.agri.ecommerce.controller.publicapi;

import com.agri.ecommerce.dto.request.chat.AiChatRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.chat.AiChatResponse;
import com.agri.ecommerce.security.UserPrincipal;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(
        name = "Public - AI Chatbot",
        description = "API tư vấn AI đa vai trò cho khách, khách hàng, giao hàng và quản trị."
)
@RestController
@RequestMapping("/api/public/ai-chat")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService aiChatService;

    @Operation(
            summary = "Send message to AI assistant",
            description = """
                    Gửi tin nhắn đến AI Chatbot AgriMarket.

                    Chatbot hỗ trợ theo vai trò:
                    - Guest/customer: tư vấn sản phẩm, giỏ hàng, checkout, thanh toán, địa chỉ, đơn hàng.
                    - Delivery: hướng dẫn quy trình giao hàng và đọc các đơn được phân công nếu có JWT hợp lệ.
                    - Admin/staff: hỗ trợ vận hành dashboard, sản phẩm, danh mục, đơn hàng, thanh toán, coupon, review/contact.

                    Quy tắc an toàn:
                    - Endpoint vẫn là public để khách vãng lai chat được.
                    - Nếu gửi JWT hợp lệ, backend tự nhận diện vai trò từ token.
                    - AI chỉ đọc và hướng dẫn, không tự tạo/sửa/hủy dữ liệu nghiệp vụ.
                    - Response shape giữ nguyên để frontend cũ không bị gãy.
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
                                    name = "Example response",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Chatbot replied successfully",
                                              "data": {
                                                "reply": "Mình có thể hỗ trợ bạn kiểm tra luồng đặt hàng và gợi ý sản phẩm phù hợp.",
                                                "guestToken": "guest_abc123xyz",
                                                "suggestedProducts": [],
                                                "createdAt": "2026-06-30T09:00:00"
                                              },
                                              "errors": null,
                                              "statusCode": 200,
                                              "timestamp": "2026-06-30T09:00:00"
                                            }
                                            """
                            )
                    )
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Request không hợp lệ"
            )
    })
    @PostMapping("/messages")
    public ResponseEntity<ApiResponse<AiChatResponse>> chat(
            @Valid @RequestBody AiChatRequest request,
            Authentication authentication
    ) {
        AiChatResponse response = aiChatService.chat(request, extractPrincipal(authentication));

        return ResponseEntity.ok(
                ApiResponse.success("Chatbot replied successfully", response, HttpStatus.OK.value())
        );
    }

    private UserPrincipal extractPrincipal(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            return userPrincipal;
        }

        return null;
    }
}
