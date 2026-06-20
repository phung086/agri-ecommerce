package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.dto.request.order.AdminOrderStatusUpdateRequest;
import com.agri.ecommerce.dto.request.order.AssignDeliveryStaffRequest;
import com.agri.ecommerce.dto.request.order.OrderStatusNoteRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.dto.response.user.UserResponse;
import com.agri.ecommerce.service.AdminOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Admin - Order Management", description = "API quản trị đơn hàng")
@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminOrderManagementController {

    private final AdminOrderService adminOrderService;

    @Operation(summary = "Lấy danh sách đơn hàng cho admin")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<OrderResponse>>> getOrders(
            @Parameter(description = "Trạng thái đơn hàng", example = "pending")
            @RequestParam(required = false) String status,

            @Parameter(description = "ID khách hàng", example = "8")
            @RequestParam(required = false) Long customerId,

            @Parameter(description = "ID nhân viên giao hàng", example = "6")
            @RequestParam(required = false) Long deliveryStaffId,

            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "10")
            @RequestParam(defaultValue = "10") int size,

            @Parameter(description = "Sắp xếp theo field,direction", example = "createdAt,desc")
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        PageResponse<OrderResponse> response = adminOrderService.getOrders(
                status,
                customerId,
                deliveryStaffId,
                page,
                size,
                sort
        );

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách đơn hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy danh sách nhân viên giao hàng đang hoạt động")
    @GetMapping("/delivery-staff")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getActiveDeliveryStaff() {
        List<UserResponse> response = adminOrderService.getActiveDeliveryStaff();

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách nhân viên giao hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy chi tiết đơn hàng cho admin")
    @GetMapping("/{orderId}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrder(
            @Parameter(description = "ID đơn hàng", example = "1")
            @PathVariable Long orderId
    ) {
        OrderResponse response = adminOrderService.getOrder(orderId);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy chi tiết đơn hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Xác nhận đơn hàng đang chờ xử lý")
    @PatchMapping("/{orderId}/confirm")
    public ResponseEntity<ApiResponse<OrderResponse>> confirmOrder(
            @Parameter(description = "ID đơn hàng", example = "1")
            @PathVariable Long orderId,
            @Valid @RequestBody(required = false) OrderStatusNoteRequest request
    ) {
        OrderResponse response = adminOrderService.confirmOrder(orderId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Xác nhận đơn hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Phân nhân viên giao hàng cho đơn")
    @PatchMapping("/{orderId}/delivery-staff")
    public ResponseEntity<ApiResponse<OrderResponse>> assignDeliveryStaff(
            @Parameter(description = "ID đơn hàng", example = "1")
            @PathVariable Long orderId,
            @Valid @RequestBody AssignDeliveryStaffRequest request
    ) {
        OrderResponse response = adminOrderService.assignDeliveryStaff(orderId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Phân nhân viên giao hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Cập nhật trạng thái đơn hàng theo luồng vận hành")
    @PatchMapping("/{orderId}/status")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(
            @Parameter(description = "ID đơn hàng", example = "1")
            @PathVariable Long orderId,
            @Valid @RequestBody AdminOrderStatusUpdateRequest request
    ) {
        OrderResponse response = adminOrderService.updateOrderStatus(orderId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật trạng thái đơn hàng thành công", response, HttpStatus.OK.value())
        );
    }
}
