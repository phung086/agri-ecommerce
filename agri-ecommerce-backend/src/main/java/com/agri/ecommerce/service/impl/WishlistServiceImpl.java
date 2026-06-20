package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.wishlist.AddWishlistItemRequest;
import com.agri.ecommerce.dto.response.wishlist.WishlistItemResponse;
import com.agri.ecommerce.dto.response.wishlist.WishlistResponse;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.entity.WishlistEntity;
import com.agri.ecommerce.exception.BadRequestException;
import com.agri.ecommerce.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.WishlistMapper;
import com.agri.ecommerce.repository.ProductImageRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.repository.WishlistRepository;
import com.agri.ecommerce.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class WishlistServiceImpl implements WishlistService {

    private static final String HIDDEN_STATUS = "hidden";

    private final WishlistRepository wishlistRepository;

    private final ProductRepository productRepository;

    private final ProductImageRepository productImageRepository;

    private final UserRepository userRepository;

    private final WishlistMapper wishlistMapper;

    @Override
    @Transactional(readOnly = true)
    public WishlistResponse getWishlist(Long userId) {
        return buildWishlistResponse(userId);
    }

    @Override
    @Transactional
    public WishlistResponse addItem(Long userId, AddWishlistItemRequest request) {
        UserEntity user = findUserById(userId);
        ProductEntity product = findPublicProductById(request.getProductId());

        if (!wishlistRepository.existsByUser_IdAndProduct_Id(userId, product.getId())) {
            WishlistEntity wishlist = WishlistEntity.builder()
                    .user(user)
                    .product(product)
                    .build();
            wishlistRepository.save(wishlist);
        }

        return buildWishlistResponse(userId);
    }

    @Override
    @Transactional
    public WishlistResponse removeItem(Long userId, Long productId) {
        if (!wishlistRepository.existsByUser_IdAndProduct_Id(userId, productId)) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm trong danh sách yêu thích với id: " + productId);
        }

        wishlistRepository.deleteByUser_IdAndProduct_Id(userId, productId);
        return buildWishlistResponse(userId);
    }

    @Override
    @Transactional
    public WishlistResponse clearWishlist(Long userId) {
        findUserById(userId);
        wishlistRepository.deleteByUser_Id(userId);

        return buildWishlistResponse(userId);
    }

    private WishlistResponse buildWishlistResponse(Long userId) {
        List<WishlistEntity> wishlistItems = wishlistRepository.findByUser_IdOrderByCreatedAtDesc(userId)
                .stream()
                .filter(wishlist -> !HIDDEN_STATUS.equals(wishlist.getProduct().getStatus()))
                .toList();
        Map<Long, String> thumbnailsByProductId = getThumbnailsByProductId(wishlistItems);
        List<WishlistItemResponse> items = wishlistItems.stream()
                .map(wishlist -> wishlistMapper.toWishlistItemResponse(
                        wishlist,
                        thumbnailsByProductId.get(wishlist.getProduct().getId())
                ))
                .toList();

        return WishlistResponse.builder()
                .items(items)
                .totalItems(items.size())
                .build();
    }

    private Map<Long, String> getThumbnailsByProductId(List<WishlistEntity> wishlistItems) {
        if (wishlistItems.isEmpty()) {
            return Map.of();
        }

        List<Long> productIds = wishlistItems.stream()
                .map(wishlist -> wishlist.getProduct().getId())
                .distinct()
                .toList();

        Map<Long, String> thumbnails = new LinkedHashMap<>();
        productImageRepository.findAllByProductIds(productIds)
                .forEach(image -> {
                    Long productId = image.getProduct().getId();
                    String imagePath = image.getImage();

                    if (imagePath != null && !thumbnails.containsKey(productId)) {
                        thumbnails.put(productId, imagePath);
                    }
                });

        return thumbnails;
    }

    private ProductEntity findPublicProductById(Long productId) {
        ProductEntity product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + productId));

        if (HIDDEN_STATUS.equals(product.getStatus())) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + productId);
        }

        return product;
    }

    private UserEntity findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với id: " + userId));
    }
}
