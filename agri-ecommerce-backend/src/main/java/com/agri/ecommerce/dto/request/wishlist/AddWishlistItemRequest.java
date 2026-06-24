package com.agri.ecommerce.dto.request.wishlist;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AddWishlistItemRequest {

    @NotNull(message = "Sản phẩm không được để trống")
    private Long productId;
}
