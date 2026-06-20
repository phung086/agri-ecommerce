package com.agri.ecommerce.controller.customer;

import com.agri.ecommerce.dto.request.chat.AiAssistantRequest;
import com.agri.ecommerce.dto.request.chat.ChatMessageRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.chat.AiAssistantResponse;
import com.agri.ecommerce.dto.response.chat.ChatMessageResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.security.UserPrincipal;
import com.agri.ecommerce.service.AiAssistantService;
import com.agri.ecommerce.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Customer - Support Chat", description = "API chat hỗ trợ của khách hàng đăng nhập")
@RestController
@RequestMapping("/api/customer/chat")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerChatController {

    private final ChatService chatService;

    private final AiAssistantService aiAssistantService;

    @Operation(summary = "Ask AI Assistant as current customer")
    @PostMapping("/assistant")
    public ResponseEntity<ApiResponse<AiAssistantResponse>> askAssistant(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AiAssistantRequest request
    ) {
        AiAssistantResponse response = aiAssistantService.askCustomer(principal.getId(), request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("AI assistant replied successfully", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Gửi tin nhắn chat từ khách hàng")
    @PostMapping("/messages")
    public ResponseEntity<ApiResponse<ChatMessageResponse>> sendMessage(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChatMessageRequest request
    ) {
        ChatMessageResponse response = chatService.sendCustomerMessage(principal.getId(), request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Gửi tin nhắn chat thành công", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Lấy lịch sử chat của khách hàng hiện tại")
    @GetMapping("/messages")
    public ResponseEntity<ApiResponse<PageResponse<ChatMessageResponse>>> getMessages(
            @AuthenticationPrincipal UserPrincipal principal,

            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "20")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sắp xếp theo field,direction", example = "createdAt,asc")
            @RequestParam(defaultValue = "createdAt,asc") String sort
    ) {
        PageResponse<ChatMessageResponse> response = chatService.getCustomerMessages(
                principal.getId(),
                page,
                size,
                sort
        );

        return ResponseEntity.ok(
                ApiResponse.success("Lấy lịch sử chat thành công", response, HttpStatus.OK.value())
        );
    }
}
