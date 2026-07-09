package com.agri.ecommerce.dto.response.inventory;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class InventorySummaryResponse {

    private Integer lowStockThreshold;

    private Long totalProducts;

    private Long inStockProducts;

    private Long outOfStockProducts;

    private Long hiddenProducts;

    private Long lowStockProducts;

    private Long totalStockUnits;

    private Long totalBatches;

    private Long activeBatches;

    private Long nearExpiryBatches;

    private Long expiredBatches;

    private Long needDateUpdateBatches;

    private Long depletedBatches;

    private Long batchTrackedStockUnits;

    private Long untrackedStockUnits;

    private LocalDateTime generatedAt;
}
