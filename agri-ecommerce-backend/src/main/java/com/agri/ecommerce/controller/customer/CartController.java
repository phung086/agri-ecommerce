package com.agri.ecommerce.controller.customer;

import com.agri.ecommerce.dto.request.cart.AddCartItemRequest;
import com.agri.ecommerce.dto.request.cart.UpdateCartItemRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.cart.CartResponse;
import com.agri.ecommerce.security.UserPrincipal;
import com.agri.ecommerce.service.CartService;
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

@Tag(name = "Customer - Cart", description = "API quản lý giỏ hàng của khách hàng")
@RestController
@RequestMapping("/api/customer/cart")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class CartController {

    private final CartService cartService;

    @Operation(summary = "Lấy giỏ hàng hiện tại")
    @GetMapping
    public ResponseEntity<ApiResponse<CartResponse>> getCart(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        CartResponse response = cartService.getCart(principal.getId());

        return ResponseEntity.ok(
                ApiResponse.success("Lấy giỏ hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Thêm sản phẩm vào giỏ hàng")
    @PostMapping("/items")
    public ResponseEntity<ApiResponse<CartResponse>> addItem(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AddCartItemRequest request
    ) {
        CartResponse response = cartService.addItem(principal.getId(), request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Thêm sản phẩm vào giỏ hàng thành công", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Cập nhật số lượng sản phẩm trong giỏ hàng")
    @PutMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<CartResponse>> updateItem(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID dòng giỏ hàng", example = "1")
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateCartItemRequest request
    ) {
        CartResponse response = cartService.updateItem(principal.getId(), itemId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật giỏ hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Xóa một sản phẩm khỏi giỏ hàng")
    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<CartResponse>> removeItem(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID dòng giỏ hàng", example = "1")
            @PathVariable Long itemId
    ) {
        CartResponse response = cartService.removeItem(principal.getId(), itemId);

        return ResponseEntity.ok(
                ApiResponse.success("Xóa sản phẩm khỏi giỏ hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Xóa toàn bộ giỏ hàng")
    @DeleteMapping
    public ResponseEntity<ApiResponse<CartResponse>> clearCart(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        CartResponse response = cartService.clearCart(principal.getId());

        return ResponseEntity.ok(
                ApiResponse.success("Xóa toàn bộ giỏ hàng thành công", response, HttpStatus.OK.value())
        );
    }
}
