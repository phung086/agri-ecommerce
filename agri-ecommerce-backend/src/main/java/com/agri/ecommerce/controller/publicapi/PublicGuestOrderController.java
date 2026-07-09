package com.agri.ecommerce.controller.publicapi;

import com.agri.ecommerce.dto.request.order.CheckoutRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.order.CheckoutPreviewResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.service.GuestOrderAutoAccountService;
import com.agri.ecommerce.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "Public - Guest Orders", description = "Guest checkout without customer account")
@RestController
@RequestMapping("/api/public/orders")
@RequiredArgsConstructor
public class PublicGuestOrderController {

    private final OrderService orderService;

    private final GuestOrderAutoAccountService guestOrderAutoAccountService;

    @Operation(summary = "Preview guest checkout total")
    @PostMapping("/checkout/preview")
    public ResponseEntity<ApiResponse<CheckoutPreviewResponse>> previewCheckout(
            @Valid @RequestBody CheckoutRequest request
    ) {
        CheckoutPreviewResponse response = orderService.previewGuestCheckout(request);
        return ResponseEntity.ok(
                ApiResponse.success("Guest checkout preview calculated successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Create guest checkout order")
    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<OrderResponse>> checkout(
            @Valid @RequestBody CheckoutRequest request
    ) {
        OrderResponse response = orderService.guestCheckout(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Guest order created successfully", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Create/login default customer account for guest order")
    @PostMapping("/guest-auto-login")
    public ResponseEntity<ApiResponse<OrderResponse>> createGuestAutoLogin(
            @RequestBody Map<String, Object> request
    ) {
        Object orderIdValue = request.get("orderId");
        Long orderId = orderIdValue instanceof Number number
                ? number.longValue()
                : Long.valueOf(String.valueOf(orderIdValue));
        String phone = String.valueOf(request.getOrDefault("phone", ""));

        OrderResponse response = guestOrderAutoAccountService.createOrLoginDefaultCustomer(orderId, phone);
        return ResponseEntity.ok(
                ApiResponse.success("Guest customer account prepared successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Track guest or public order")
    @org.springframework.web.bind.annotation.GetMapping("/track")
    public ResponseEntity<ApiResponse<OrderResponse>> trackOrder(
            @org.springframework.web.bind.annotation.RequestParam Long orderId,
            @org.springframework.web.bind.annotation.RequestParam String phone
    ) {
        OrderResponse response = orderService.trackOrder(orderId, phone);
        return ResponseEntity.ok(
                ApiResponse.success("Order retrieved successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Track guest order by GHN tracking number")
    @org.springframework.web.bind.annotation.GetMapping("/track-by-ghn")
    public ResponseEntity<ApiResponse<OrderResponse>> trackOrderByGhn(
            @org.springframework.web.bind.annotation.RequestParam String trackingCode,
            @org.springframework.web.bind.annotation.RequestParam String phone
    ) {
        OrderResponse response = orderService.trackOrderByGhnCode(trackingCode, phone);
        return ResponseEntity.ok(
                ApiResponse.success("Order retrieved successfully", response, HttpStatus.OK.value())
        );
    }
}
