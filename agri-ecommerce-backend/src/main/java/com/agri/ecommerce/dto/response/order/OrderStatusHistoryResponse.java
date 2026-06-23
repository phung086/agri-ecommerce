package com.agri.ecommerce.dto.response.order;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class OrderStatusHistoryResponse {

    private Long id;

    private String status;

    private LocalDateTime changedAt;

    private String note;
}
