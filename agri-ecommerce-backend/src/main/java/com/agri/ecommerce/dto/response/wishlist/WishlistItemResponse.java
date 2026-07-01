package com.agri.ecommerce.dto.response.wishlist;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class WishlistItemResponse {

    private Long id;

    private Long productId;

    private String productName;

    private String productNameEn;

    private String productSlug;

    private BigDecimal productPrice;

    private String unit;

    private String unitEn;

    private String thumbnail;

    private Integer stock;

    private String status;

    private LocalDateTime addedAt;
}
