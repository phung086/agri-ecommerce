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

@Tag(name = "Admin - Order Management", description = "Admin order operation APIs")
@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminOrderManagementController {

    private final AdminOrderService adminOrderService;

    @Operation(summary = "Get orders for admin")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<OrderResponse>>> getOrders(
            @Parameter(description = "Order status", example = "pending")
            @RequestParam(required = false) String status,

            @Parameter(description = "Customer ID", example = "8")
            @RequestParam(required = false) Long customerId,

            @Parameter(description = "Delivery staff ID", example = "6")
            @RequestParam(required = false) Long deliveryStaffId,

            @Parameter(description = "Page index from 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size", example = "10")
            @RequestParam(defaultValue = "10") int size,

            @Parameter(description = "Sort by field,direction", example = "createdAt,desc")
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
                ApiResponse.success("Get orders successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Get active delivery staff")
    @GetMapping("/delivery-staff")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getActiveDeliveryStaff() {
        List<UserResponse> response = adminOrderService.getActiveDeliveryStaff();

        return ResponseEntity.ok(
                ApiResponse.success("Get active delivery staff successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Get order detail for admin")
    @GetMapping("/{orderId}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrder(
            @Parameter(description = "Order ID", example = "1")
            @PathVariable Long orderId
    ) {
        OrderResponse response = adminOrderService.getOrder(orderId);

        return ResponseEntity.ok(
                ApiResponse.success("Get order detail successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Confirm a pending order")
    @PatchMapping("/{orderId}/confirm")
    public ResponseEntity<ApiResponse<OrderResponse>> confirmOrder(
            @Parameter(description = "Order ID", example = "1")
            @PathVariable Long orderId,
            @Valid @RequestBody(required = false) OrderStatusNoteRequest request
    ) {
        OrderResponse response = adminOrderService.confirmOrder(orderId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Confirm order successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Cancel an order and sync stock, coupon, and payment")
    @PatchMapping("/{orderId}/cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @Parameter(description = "Order ID", example = "1")
            @PathVariable Long orderId,
            @Valid @RequestBody(required = false) OrderStatusNoteRequest request
    ) {
        OrderResponse response = adminOrderService.cancelOrder(orderId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cancel order successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Assign delivery staff to an order")
    @PatchMapping("/{orderId}/delivery-staff")
    public ResponseEntity<ApiResponse<OrderResponse>> assignDeliveryStaff(
            @Parameter(description = "Order ID", example = "1")
            @PathVariable Long orderId,
            @Valid @RequestBody AssignDeliveryStaffRequest request
    ) {
        OrderResponse response = adminOrderService.assignDeliveryStaff(orderId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Assign delivery staff successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Refund latest completed payment for an order")
    @PatchMapping("/{orderId}/payment/refund")
    public ResponseEntity<ApiResponse<OrderResponse>> refundOrderPayment(
            @Parameter(description = "Order ID", example = "1")
            @PathVariable Long orderId,
            @Valid @RequestBody(required = false) OrderStatusNoteRequest request
    ) {
        OrderResponse response = adminOrderService.refundOrderPayment(orderId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Refund order payment successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Update order status by operation flow")
    @PatchMapping("/{orderId}/status")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(
            @Parameter(description = "Order ID", example = "1")
            @PathVariable Long orderId,
            @Valid @RequestBody AdminOrderStatusUpdateRequest request
    ) {
        OrderResponse response = adminOrderService.updateOrderStatus(orderId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Update order status successfully", response, HttpStatus.OK.value())
        );
    }
}
