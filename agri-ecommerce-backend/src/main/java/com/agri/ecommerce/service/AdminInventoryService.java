package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.inventory.InventoryStockAdjustmentRequest;
import com.agri.ecommerce.dto.request.inventory.InventoryStockSetRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.inventory.InventoryProductResponse;
import com.agri.ecommerce.dto.response.inventory.InventoryStockMutationResponse;
import com.agri.ecommerce.dto.response.inventory.InventorySummaryResponse;

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

    java.util.List<com.agri.ecommerce.dto.response.inventory.InventoryBatchResponse> getBatches();

    com.agri.ecommerce.dto.response.inventory.InventoryBatchResponse createBatch(com.agri.ecommerce.dto.request.inventory.InventoryBatchCreateRequest request);

    java.util.List<com.agri.ecommerce.dto.response.inventory.InventoryTransactionResponse> getTransactions();
}
