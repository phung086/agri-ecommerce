package com.agri.ecommerce.dto.response.dashboard;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class OrderStatusCountResponse {

    private String status;

    private Long totalOrders;
}
