package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.inventory.InventoryStockAdjustmentRequest;
import com.agri.ecommerce.dto.request.inventory.InventoryStockSetRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.inventory.InventoryBatchResponse;
import com.agri.ecommerce.dto.response.inventory.InventoryProductResponse;
import com.agri.ecommerce.dto.response.inventory.InventoryStockMutationResponse;
import com.agri.ecommerce.dto.response.inventory.InventorySummaryResponse;
import com.agri.ecommerce.dto.response.inventory.InventoryTransactionResponse;

import java.util.List;

public interface AdminInventoryService {

    InventorySummaryResponse getSummary(Integer threshold);

    PageResponse<InventoryProductResponse> getStockAlerts(
            String keyword,
            String categorySlug,
            String status,
            Integer threshold,
            Boolean includeOk,
            int page,
            int size,
            String sort
    );

    InventoryStockMutationResponse setStock(Long productId, InventoryStockSetRequest request);

    InventoryStockMutationResponse adjustStock(Long productId, InventoryStockAdjustmentRequest request);

    List<InventoryBatchResponse> getBatches(String status, Long productId, Boolean includeDepleted);

    List<InventoryBatchResponse> getProductBatches(Long productId);

    InventoryBatchResponse createBatch(com.agri.ecommerce.dto.request.inventory.InventoryBatchCreateRequest request);

    List<InventoryBatchResponse> getExpiryAlerts(Integer days);

    List<InventoryTransactionResponse> getTransactions(Long productId, Long batchId);

    InventorySummaryResponse backfillLegacyBatches();

    InventorySummaryResponse recalculateProductStockFromBatches();
}
