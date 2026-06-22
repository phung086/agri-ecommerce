package com.agri.ecommerce.dto.response.dashboard;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class DashboardSummaryResponse {

    private Long totalOrders;

    private Long todayOrders;

    private Long pendingOrders;

    private Long processingOrders;

    private Long readyForDeliveryOrders;

    private Long outForDeliveryOrders;

    private Long deliveredOrders;

    private Long completedOrders;

    private Long canceledOrders;

    private Long completedPayments;

    private BigDecimal totalRevenue;

    private BigDecimal todayRevenue;

    private Long totalCustomers;

    private Long activeCustomers;

    private Long totalProducts;

    private Long activeProducts;

    private Long outOfStockProducts;

    private Long lowStockProducts;

    private Long pendingContacts;

    private Long activeCoupons;

    private Long availableCoupons;

    private Long totalReviews;

    private Double averageRating;

    private LocalDateTime generatedAt;
}
