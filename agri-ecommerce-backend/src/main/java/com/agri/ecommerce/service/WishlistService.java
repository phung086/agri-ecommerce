package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.wishlist.AddWishlistItemRequest;
import com.agri.ecommerce.dto.response.wishlist.WishlistResponse;

public interface WishlistService {

    WishlistResponse getWishlist(Long userId);

    WishlistResponse addItem(Long userId, AddWishlistItemRequest request);

    WishlistResponse removeItem(Long userId, Long productId);

    WishlistResponse clearWishlist(Long userId);
}
