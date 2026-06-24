package com.agri.ecommerce.dto.response.dashboard;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class RevenueReportPointResponse {

    private String period;

    private BigDecimal revenue;

    private Long completedPayments;
}
