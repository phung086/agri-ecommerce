package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.dto.request.chat.AdminChatReplyRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.chat.ChatConversationResponse;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Admin - Support Chat Management", description = "API quản trị hội thoại chat hỗ trợ")
@RestController
@RequestMapping("/api/admin/chat")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminChatManagementController {

    private final ChatService chatService;

    @Operation(summary = "Lấy danh sách hội thoại chat")
    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<PageResponse<ChatConversationResponse>>> getConversations(
            @Parameter(description = "Từ khóa tìm trong nội dung tin nhắn", example = "rau")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Người gửi tin nhắn cuối cùng", example = "user")
            @RequestParam(required = false) String lastSender,

            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "10")
            @RequestParam(defaultValue = "10") int size
    ) {
        PageResponse<ChatConversationResponse> response = chatService.getAdminConversations(
                keyword,
                lastSender,
                page,
                size
        );

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách hội thoại chat thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy tin nhắn trong một hội thoại chat")
    @GetMapping("/messages")
    public ResponseEntity<ApiResponse<PageResponse<ChatMessageResponse>>> getMessages(
            @Parameter(description = "ID khách hàng đăng nhập", example = "8")
            @RequestParam(required = false) Long userId,

            @Parameter(description = "Token khách vãng lai", example = "guest_abc123")
            @RequestParam(required = false) String guestToken,

            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "20")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sắp xếp theo field,direction", example = "createdAt,asc")
            @RequestParam(defaultValue = "createdAt,asc") String sort
    ) {
        PageResponse<ChatMessageResponse> response = chatService.getAdminMessages(
                userId,
                guestToken,
                page,
                size,
                sort
        );

        return ResponseEntity.ok(
                ApiResponse.success("Lấy tin nhắn hội thoại thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Admin phản hồi một hội thoại chat")
    @PostMapping("/messages/reply")
    public ResponseEntity<ApiResponse<ChatMessageResponse>> reply(
            @Valid @RequestBody AdminChatReplyRequest request
    ) {
        ChatMessageResponse response = chatService.replyAsAdmin(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Phản hồi chat thành công", response, HttpStatus.CREATED.value()));
    }
}
