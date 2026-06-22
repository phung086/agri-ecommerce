package com.agri.ecommerce.controller.customer;

import com.agri.ecommerce.dto.request.wishlist.AddWishlistItemRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.wishlist.WishlistResponse;
import com.agri.ecommerce.security.UserPrincipal;
import com.agri.ecommerce.service.WishlistService;
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

@Tag(name = "Customer - Wishlist", description = "API quản lý danh sách sản phẩm yêu thích của khách hàng")
@RestController
@RequestMapping("/api/customer/wishlist")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class WishlistController {

    private final WishlistService wishlistService;

    @Operation(summary = "Lấy danh sách sản phẩm yêu thích")
    @GetMapping
    public ResponseEntity<ApiResponse<WishlistResponse>> getWishlist(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        WishlistResponse response = wishlistService.getWishlist(principal.getId());

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách yêu thích thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Thêm sản phẩm vào danh sách yêu thích")
    @PostMapping("/items")
    public ResponseEntity<ApiResponse<WishlistResponse>> addItem(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AddWishlistItemRequest request
    ) {
        WishlistResponse response = wishlistService.addItem(principal.getId(), request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Thêm sản phẩm vào danh sách yêu thích thành công", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Xóa sản phẩm khỏi danh sách yêu thích")
    @DeleteMapping("/items/{productId}")
    public ResponseEntity<ApiResponse<WishlistResponse>> removeItem(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID sản phẩm", example = "1")
            @PathVariable Long productId
    ) {
        WishlistResponse response = wishlistService.removeItem(principal.getId(), productId);

        return ResponseEntity.ok(
                ApiResponse.success("Xóa sản phẩm khỏi danh sách yêu thích thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Xóa toàn bộ danh sách yêu thích")
    @DeleteMapping
    public ResponseEntity<ApiResponse<WishlistResponse>> clearWishlist(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        WishlistResponse response = wishlistService.clearWishlist(principal.getId());

        return ResponseEntity.ok(
                ApiResponse.success("Xóa toàn bộ danh sách yêu thích thành công", response, HttpStatus.OK.value())
        );
    }
}
