package com.agri.ecommerce.controller.customer;

import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.notification.NotificationResponse;
import com.agri.ecommerce.dto.response.notification.UnreadNotificationCountResponse;
import com.agri.ecommerce.security.UserPrincipal;
import com.agri.ecommerce.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Notifications", description = "API quản lý thông báo của người dùng đăng nhập")
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "Lấy danh sách thông báo của người dùng hiện tại")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<NotificationResponse>>> getMyNotifications(
            @AuthenticationPrincipal UserPrincipal principal,

            @Parameter(description = "Loại thông báo", example = "order")
            @RequestParam(required = false) String type,

            @Parameter(description = "Trạng thái đã đọc", example = "false")
            @RequestParam(required = false) Boolean read,

            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "10")
            @RequestParam(defaultValue = "10") int size,

            @Parameter(description = "Sắp xếp theo field,direction", example = "createdAt,desc")
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        PageResponse<NotificationResponse> response = notificationService.getMyNotifications(
                principal.getId(),
                type,
                read,
                page,
                size,
                sort
        );

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách thông báo thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy số lượng thông báo chưa đọc")
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<UnreadNotificationCountResponse>> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UnreadNotificationCountResponse response = notificationService.getUnreadCount(principal.getId());

        return ResponseEntity.ok(
                ApiResponse.success("Lấy số thông báo chưa đọc thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Đánh dấu một thông báo là đã đọc")
    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<ApiResponse<NotificationResponse>> markAsRead(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID thông báo", example = "1")
            @PathVariable Long notificationId
    ) {
        NotificationResponse response = notificationService.markAsRead(principal.getId(), notificationId);

        return ResponseEntity.ok(
                ApiResponse.success("Đánh dấu thông báo đã đọc thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Đánh dấu tất cả thông báo là đã đọc")
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<UnreadNotificationCountResponse>> markAllAsRead(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UnreadNotificationCountResponse response = notificationService.markAllAsRead(principal.getId());

        return ResponseEntity.ok(
                ApiResponse.success("Đánh dấu tất cả thông báo đã đọc thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Xóa một thông báo")
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID thông báo", example = "1")
            @PathVariable Long notificationId
    ) {
        notificationService.deleteNotification(principal.getId(), notificationId);

        return ResponseEntity.ok(
                ApiResponse.success("Xóa thông báo thành công", null, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Xóa toàn bộ thông báo của người dùng hiện tại")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> clearNotifications(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        notificationService.clearNotifications(principal.getId());

        return ResponseEntity.ok(
                ApiResponse.success("Xóa toàn bộ thông báo thành công", null, HttpStatus.OK.value())
        );
    }
}
