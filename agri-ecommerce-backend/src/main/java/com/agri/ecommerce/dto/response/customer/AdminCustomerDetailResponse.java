package com.agri.ecommerce.dto.response.customer;

import com.agri.ecommerce.dto.response.user.UserResponse;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class AdminCustomerDetailResponse {

    private UserResponse customer;

    private long totalOrders;

    private long fulfilledOrders;

    private long canceledOrders;

    private BigDecimal totalSpent;

    private LocalDateTime lastOrderAt;

    private long reviewCount;

    private long wishlistCount;
}
