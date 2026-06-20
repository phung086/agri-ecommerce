package com.agri.ecommerce.mapper;

import com.agri.ecommerce.dto.response.cart.CartItemResponse;
import com.agri.ecommerce.entity.CartItemEntity;
import com.agri.ecommerce.entity.ProductEntity;
import org.springframework.stereotype.Component;

@Component
public class CartMapper {

    public CartItemResponse toCartItemResponse(CartItemEntity cartItem, String thumbnail) {
        ProductEntity product = cartItem.getProduct();

        return CartItemResponse.builder()
                .id(cartItem.getId())
                .productId(product.getId())
                .productName(product.getName())
                .productSlug(product.getSlug())
                .productPrice(product.getPrice())
                .unit(product.getUnit())
                .thumbnail(thumbnail)
                .stock(product.getStock())
                .status(product.getStatus())
                .quantity(cartItem.getQuantity())
                .lineTotal(product.getPrice().multiply(java.math.BigDecimal.valueOf(cartItem.getQuantity())))
                .build();
    }
}
