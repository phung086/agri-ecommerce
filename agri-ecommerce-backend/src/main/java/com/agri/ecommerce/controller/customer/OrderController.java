package com.agri.ecommerce.controller.customer;

import com.agri.ecommerce.dto.request.order.CheckoutRequest;
import com.agri.ecommerce.dto.request.order.OrderStatusNoteRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.security.UserPrincipal;
import com.agri.ecommerce.service.OrderService;
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

@Tag(name = "Customer - Orders", description = "API đặt hàng và quản lý đơn hàng của khách hàng")
@RestController
@RequestMapping("/api/customer/orders")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class OrderController {

    private final OrderService orderService;

    @Operation(summary = "Lấy danh sách đơn hàng của khách hàng")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<OrderResponse>>> getOrders(
            @AuthenticationPrincipal UserPrincipal principal,

            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "10")
            @RequestParam(defaultValue = "10") int size,

            @Parameter(description = "Sắp xếp theo field,direction", example = "createdAt,desc")
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        PageResponse<OrderResponse> response = orderService.getOrders(principal.getId(), page, size, sort);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách đơn hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy chi tiết đơn hàng")
    @GetMapping("/{orderId}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrder(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID đơn hàng", example = "1")
            @PathVariable Long orderId
    ) {
        OrderResponse response = orderService.getOrder(principal.getId(), orderId);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy chi tiết đơn hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Đặt hàng từ giỏ hàng hiện tại")
    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<OrderResponse>> checkout(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CheckoutRequest request
    ) {
        OrderResponse response = orderService.checkout(principal.getId(), request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đặt hàng thành công", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Hủy đơn hàng đang chờ xử lý")
    @PatchMapping("/{orderId}/cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID đơn hàng", example = "1")
            @PathVariable Long orderId,
            @Valid @RequestBody(required = false) OrderStatusNoteRequest request
    ) {
        OrderResponse response = orderService.cancelOrder(principal.getId(), orderId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Hủy đơn hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Xác nhận đã nhận hàng và hoàn tất đơn")
    @PatchMapping("/{orderId}/complete")
    public ResponseEntity<ApiResponse<OrderResponse>> completeOrder(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID đơn hàng", example = "1")
            @PathVariable Long orderId,
            @Valid @RequestBody(required = false) OrderStatusNoteRequest request
    ) {
        OrderResponse response = orderService.completeOrder(principal.getId(), orderId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Xác nhận hoàn tất đơn hàng thành công", response, HttpStatus.OK.value())
        );
    }
}
