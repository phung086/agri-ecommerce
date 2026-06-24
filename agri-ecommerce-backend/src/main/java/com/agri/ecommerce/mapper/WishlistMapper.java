package com.agri.ecommerce.mapper;

import com.agri.ecommerce.dto.response.wishlist.WishlistItemResponse;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.WishlistEntity;
import org.springframework.stereotype.Component;

@Component
public class WishlistMapper {

    public WishlistItemResponse toWishlistItemResponse(WishlistEntity wishlist, String thumbnail) {
        ProductEntity product = wishlist.getProduct();

        return WishlistItemResponse.builder()
                .id(wishlist.getId())
                .productId(product.getId())
                .productName(product.getName())
                .productSlug(product.getSlug())
                .productPrice(product.getPrice())
                .unit(product.getUnit())
                .thumbnail(thumbnail)
                .stock(product.getStock())
                .status(product.getStatus())
                .addedAt(wishlist.getCreatedAt())
                .build();
    }
}
