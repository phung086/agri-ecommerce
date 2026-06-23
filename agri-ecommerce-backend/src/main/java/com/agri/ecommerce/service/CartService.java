package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.cart.AddCartItemRequest;
import com.agri.ecommerce.dto.request.cart.UpdateCartItemRequest;
import com.agri.ecommerce.dto.response.cart.CartResponse;

public interface CartService {

    CartResponse getCart(Long userId);

    CartResponse addItem(Long userId, AddCartItemRequest request);

    CartResponse updateItem(Long userId, Long itemId, UpdateCartItemRequest request);

    CartResponse removeItem(Long userId, Long itemId);

    CartResponse clearCart(Long userId);
}
