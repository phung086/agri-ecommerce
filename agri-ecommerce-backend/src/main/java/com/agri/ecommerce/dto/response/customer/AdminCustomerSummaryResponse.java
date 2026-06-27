package com.agri.ecommerce.dto.response.customer;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class AdminCustomerSummaryResponse {

    private Long id;

    private String name;

    private String email;

    private String status;

    private String phoneNumber;

    private String avatar;

    private String address;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private long totalOrders;

    private long fulfilledOrders;

    private long canceledOrders;

    private BigDecimal totalSpent;

    private LocalDateTime lastOrderAt;

    private long reviewCount;

    private long wishlistCount;
}
