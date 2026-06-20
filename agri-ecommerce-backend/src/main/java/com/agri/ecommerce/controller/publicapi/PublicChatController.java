package com.agri.ecommerce.controller.publicapi;

import com.agri.ecommerce.dto.request.chat.GuestChatMessageRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.chat.ChatMessageResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Public - Support Chat", description = "API chat hỗ trợ cho khách vãng lai")
@RestController
@RequestMapping("/api/public/chat")
@RequiredArgsConstructor
public class PublicChatController {

    private final ChatService chatService;

    @Operation(summary = "Gửi tin nhắn chat từ khách vãng lai")
    @PostMapping("/messages")
    public ResponseEntity<ApiResponse<ChatMessageResponse>> sendGuestMessage(
            @Valid @RequestBody GuestChatMessageRequest request
    ) {
        ChatMessageResponse response = chatService.sendGuestMessage(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Gửi tin nhắn chat thành công", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Lấy lịch sử chat của khách vãng lai theo guestToken")
    @GetMapping("/messages")
    public ResponseEntity<ApiResponse<PageResponse<ChatMessageResponse>>> getGuestMessages(
            @Parameter(description = "Token định danh khách vãng lai", example = "guest_abc123")
            @RequestParam String guestToken,

            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "20")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sắp xếp theo field,direction", example = "createdAt,asc")
            @RequestParam(defaultValue = "createdAt,asc") String sort
    ) {
        PageResponse<ChatMessageResponse> response = chatService.getGuestMessages(guestToken, page, size, sort);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy lịch sử chat thành công", response, HttpStatus.OK.value())
        );
    }
}
