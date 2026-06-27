package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.dto.request.user.UpdateUserStatusRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.customer.AdminCustomerDetailResponse;
import com.agri.ecommerce.dto.response.customer.AdminCustomerSummaryResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.dto.response.user.UserResponse;
import com.agri.ecommerce.service.AdminCustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Admin - Customer CRM", description = "Admin customer management and CRM APIs")
@RestController
@RequestMapping("/api/admin/customers")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCustomerManagementController {

    private final AdminCustomerService adminCustomerService;

    @Operation(summary = "Get paged customers for admin CRM")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AdminCustomerSummaryResponse>>> getCustomers(
            @Parameter(description = "Search by name, email, or phone number", example = "huan")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Customer status", example = "active")
            @RequestParam(required = false) String status,

            @Parameter(description = "Page index from 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size", example = "10")
            @RequestParam(defaultValue = "10") int size,

            @Parameter(description = "Sort by field,direction", example = "createdAt,desc")
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        PageResponse<AdminCustomerSummaryResponse> response = adminCustomerService.getCustomers(
                keyword,
                status,
                page,
                size,
                sort
        );

        return ResponseEntity.ok(
                ApiResponse.success("Get customers successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Get customer CRM detail")
    @GetMapping("/{customerId}")
    public ResponseEntity<ApiResponse<AdminCustomerDetailResponse>> getCustomer(
            @Parameter(description = "Customer ID", example = "8")
            @PathVariable Long customerId
    ) {
        AdminCustomerDetailResponse response = adminCustomerService.getCustomer(customerId);

        return ResponseEntity.ok(
                ApiResponse.success("Get customer detail successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Get customer order history")
    @GetMapping("/{customerId}/orders")
    public ResponseEntity<ApiResponse<PageResponse<OrderResponse>>> getCustomerOrders(
            @Parameter(description = "Customer ID", example = "8")
            @PathVariable Long customerId,

            @Parameter(description = "Order status", example = "completed")
            @RequestParam(required = false) String status,

            @Parameter(description = "Page index from 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size", example = "10")
            @RequestParam(defaultValue = "10") int size,

            @Parameter(description = "Sort by field,direction", example = "createdAt,desc")
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        PageResponse<OrderResponse> response = adminCustomerService.getCustomerOrders(
                customerId,
                status,
                page,
                size,
                sort
        );

        return ResponseEntity.ok(
                ApiResponse.success("Get customer orders successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Update customer status")
    @PatchMapping("/{customerId}/status")
    public ResponseEntity<ApiResponse<UserResponse>> updateCustomerStatus(
            @Parameter(description = "Customer ID", example = "8")
            @PathVariable Long customerId,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        UserResponse response = adminCustomerService.updateCustomerStatus(customerId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Update customer status successfully", response, HttpStatus.OK.value())
        );
    }
}
