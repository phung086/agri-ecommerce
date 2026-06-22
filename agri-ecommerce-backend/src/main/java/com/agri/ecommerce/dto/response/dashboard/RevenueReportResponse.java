package com.agri.ecommerce.dto.response.dashboard;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
public class RevenueReportResponse {

    private LocalDateTime from;

    private LocalDateTime to;

    private String groupBy;

    private BigDecimal totalRevenue;

    private Long totalCompletedPayments;

    private List<RevenueReportPointResponse> points;
}
