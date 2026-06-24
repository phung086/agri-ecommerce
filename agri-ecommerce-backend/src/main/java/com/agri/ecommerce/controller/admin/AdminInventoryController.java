package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.dto.request.inventory.InventoryStockAdjustmentRequest;
import com.agri.ecommerce.dto.request.inventory.InventoryStockSetRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.inventory.InventoryProductResponse;
import com.agri.ecommerce.dto.response.inventory.InventoryStockMutationResponse;
import com.agri.ecommerce.dto.response.inventory.InventorySummaryResponse;
import com.agri.ecommerce.service.AdminInventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Admin - Inventory", description = "Inventory, stock alert, and quick stock management APIs")
@RestController
@RequestMapping("/api/admin/inventory")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminInventoryController {

    private final AdminInventoryService adminInventoryService;

    @Operation(summary = "Get inventory summary")
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<InventorySummaryResponse>> getSummary(
            @Parameter(description = "Low stock threshold", example = "10")
            @RequestParam(defaultValue = "10") Integer threshold
    ) {
        InventorySummaryResponse response = adminInventoryService.getSummary(threshold);

        return ResponseEntity.ok(
                ApiResponse.success("Inventory summary loaded successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Get low-stock and out-of-stock alerts")
    @GetMapping("/alerts")
    public ResponseEntity<ApiResponse<PageResponse<InventoryProductResponse>>> getStockAlerts(
            @Parameter(description = "Search keyword", example = "rau")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Category slug", example = "rau-cu")
            @RequestParam(required = false) String categorySlug,

            @Parameter(description = "Product status", example = "in_stock")
            @RequestParam(required = false) String status,

            @Parameter(description = "Low stock threshold", example = "10")
            @RequestParam(defaultValue = "10") Integer threshold,

            @Parameter(description = "Include products above threshold", example = "false")
            @RequestParam(defaultValue = "false") Boolean includeOk,

            @Parameter(description = "Page index starting from 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size", example = "20")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort by field,direction", example = "stock,asc")
            @RequestParam(defaultValue = "stock,asc") String sort
    ) {
        PageResponse<InventoryProductResponse> response = adminInventoryService.getStockAlerts(
                keyword,
                categorySlug,
                status,
                threshold,
                includeOk,
                page,
                size,
                sort
        );

        return ResponseEntity.ok(
                ApiResponse.success("Inventory alerts loaded successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Set product stock")
    @PatchMapping("/products/{productId}/stock")
    public ResponseEntity<ApiResponse<InventoryStockMutationResponse>> setStock(
            @Parameter(description = "Product ID", example = "1")
            @PathVariable Long productId,
            @Valid @RequestBody InventoryStockSetRequest request
    ) {
        InventoryStockMutationResponse response = adminInventoryService.setStock(productId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Product stock updated successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Increase or decrease product stock")
    @PatchMapping("/products/{productId}/stock/adjust")
    public ResponseEntity<ApiResponse<InventoryStockMutationResponse>> adjustStock(
            @Parameter(description = "Product ID", example = "1")
            @PathVariable Long productId,
            @Valid @RequestBody InventoryStockAdjustmentRequest request
    ) {
        InventoryStockMutationResponse response = adminInventoryService.adjustStock(productId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Product stock adjusted successfully", response, HttpStatus.OK.value())
        );
    }
}
