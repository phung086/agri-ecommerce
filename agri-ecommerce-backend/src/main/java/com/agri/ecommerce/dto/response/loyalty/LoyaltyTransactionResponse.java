package com.agri.ecommerce.dto.response.loyalty;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class LoyaltyTransactionResponse {

    private Long id;

    private Integer amount;

    private String type;

    private String note;

    private LocalDateTime createdAt;
}
