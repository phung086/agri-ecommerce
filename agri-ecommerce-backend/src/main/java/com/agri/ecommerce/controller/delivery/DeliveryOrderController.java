package com.agri.ecommerce.controller.delivery;

import com.agri.ecommerce.dto.request.order.OrderStatusNoteRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.security.UserPrincipal;
import com.agri.ecommerce.service.DeliveryOrderService;
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

@Tag(name = "Delivery - Orders", description = "API quản lý đơn giao hàng của nhân viên giao hàng")
@RestController
@RequestMapping("/api/delivery/orders")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DELIVERY_STAFF')")
public class DeliveryOrderController {

    private final DeliveryOrderService deliveryOrderService;

    @Operation(summary = "Lấy danh sách đơn hàng được phân công")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<OrderResponse>>> getAssignedOrders(
            @AuthenticationPrincipal UserPrincipal principal,

            @Parameter(description = "Trạng thái đơn giao hàng", example = "ready_for_delivery")
            @RequestParam(required = false) String status,

            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "10")
            @RequestParam(defaultValue = "10") int size,

            @Parameter(description = "Sắp xếp theo field,direction", example = "createdAt,desc")
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        PageResponse<OrderResponse> response = deliveryOrderService.getAssignedOrders(
                principal.getId(),
                status,
                page,
                size,
                sort
        );

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách đơn giao hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy lịch sử đơn đã giao")
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<PageResponse<OrderResponse>>> getDeliveryHistory(
            @AuthenticationPrincipal UserPrincipal principal,

            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "10")
            @RequestParam(defaultValue = "10") int size,

            @Parameter(description = "Sắp xếp theo field,direction", example = "deliveredAt,desc")
            @RequestParam(defaultValue = "deliveredAt,desc") String sort
    ) {
        PageResponse<OrderResponse> response = deliveryOrderService.getDeliveryHistory(
                principal.getId(),
                page,
                size,
                sort
        );

        return ResponseEntity.ok(
                ApiResponse.success("Lấy lịch sử giao hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy chi tiết đơn hàng được phân công")
    @GetMapping("/{orderId}")
    public ResponseEntity<ApiResponse<OrderResponse>> getAssignedOrder(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID đơn hàng", example = "1")
            @PathVariable Long orderId
    ) {
        OrderResponse response = deliveryOrderService.getAssignedOrder(principal.getId(), orderId);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy chi tiết đơn giao hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Bắt đầu giao đơn hàng")
    @PatchMapping("/{orderId}/out-for-delivery")
    public ResponseEntity<ApiResponse<OrderResponse>> markOutForDelivery(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID đơn hàng", example = "1")
            @PathVariable Long orderId,
            @Valid @RequestBody(required = false) OrderStatusNoteRequest request
    ) {
        OrderResponse response = deliveryOrderService.markOutForDelivery(principal.getId(), orderId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật đơn hàng sang đang giao thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Xác nhận đã giao đơn hàng")
    @PatchMapping("/{orderId}/delivered")
    public ResponseEntity<ApiResponse<OrderResponse>> markDelivered(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID đơn hàng", example = "1")
            @PathVariable Long orderId,
            @Valid @RequestBody(required = false) OrderStatusNoteRequest request
    ) {
        OrderResponse response = deliveryOrderService.markDelivered(principal.getId(), orderId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Xác nhận đã giao đơn hàng thành công", response, HttpStatus.OK.value())
        );
    }
}
