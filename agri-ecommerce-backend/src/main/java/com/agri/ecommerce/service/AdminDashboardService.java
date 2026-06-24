package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.response.dashboard.*;

import java.time.LocalDateTime;
import java.util.List;

public interface AdminDashboardService {

    DashboardSummaryResponse getSummary();

    List<OrderStatusCountResponse> getOrderStatusSummary();

    RevenueReportResponse getRevenueReport(LocalDateTime from, LocalDateTime to, String groupBy);

    List<TopProductResponse> getTopProducts(LocalDateTime from, LocalDateTime to, Integer limit);

    List<LowStockProductResponse> getLowStockProducts(Integer threshold, Integer limit);
}
