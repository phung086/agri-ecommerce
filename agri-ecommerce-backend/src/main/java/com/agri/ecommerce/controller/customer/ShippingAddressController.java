package com.agri.ecommerce.controller.customer;

import com.agri.ecommerce.dto.request.order.ShippingAddressRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.order.ShippingAddressResponse;
import com.agri.ecommerce.security.UserPrincipal;
import com.agri.ecommerce.service.ShippingAddressService;
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

import java.util.List;

@Tag(name = "Customer - Shipping Addresses", description = "API quản lý địa chỉ giao hàng của khách hàng")
@RestController
@RequestMapping("/api/customer/shipping-addresses")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class ShippingAddressController {

    private final ShippingAddressService shippingAddressService;

    @Operation(summary = "Lấy danh sách địa chỉ giao hàng")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ShippingAddressResponse>>> getShippingAddresses(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<ShippingAddressResponse> response = shippingAddressService.getShippingAddresses(principal.getId());

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách địa chỉ giao hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Tạo địa chỉ giao hàng mới")
    @PostMapping
    public ResponseEntity<ApiResponse<ShippingAddressResponse>> createShippingAddress(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ShippingAddressRequest request
    ) {
        ShippingAddressResponse response = shippingAddressService.createShippingAddress(principal.getId(), request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo địa chỉ giao hàng thành công", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Cập nhật địa chỉ giao hàng")
    @PutMapping("/{addressId}")
    public ResponseEntity<ApiResponse<ShippingAddressResponse>> updateShippingAddress(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID địa chỉ giao hàng", example = "1")
            @PathVariable Long addressId,
            @Valid @RequestBody ShippingAddressRequest request
    ) {
        ShippingAddressResponse response = shippingAddressService.updateShippingAddress(
                principal.getId(),
                addressId,
                request
        );

        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật địa chỉ giao hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Đặt địa chỉ giao hàng làm mặc định")
    @PatchMapping("/{addressId}/default")
    public ResponseEntity<ApiResponse<ShippingAddressResponse>> setDefaultShippingAddress(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID địa chỉ giao hàng", example = "1")
            @PathVariable Long addressId
    ) {
        ShippingAddressResponse response = shippingAddressService.setDefaultShippingAddress(principal.getId(), addressId);

        return ResponseEntity.ok(
                ApiResponse.success("Đặt địa chỉ mặc định thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Xóa địa chỉ giao hàng chưa dùng trong đơn hàng")
    @DeleteMapping("/{addressId}")
    public ResponseEntity<ApiResponse<Void>> deleteShippingAddress(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID địa chỉ giao hàng", example = "1")
            @PathVariable Long addressId
    ) {
        shippingAddressService.deleteShippingAddress(principal.getId(), addressId);

        return ResponseEntity.ok(
                ApiResponse.success("Xóa địa chỉ giao hàng thành công", null, HttpStatus.OK.value())
        );
    }
}
