package com.agri.ecommerce.dto.response.wishlist;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class WishlistResponse {

    private List<WishlistItemResponse> items;

    private int totalItems;
}
