package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.cart.AddCartItemRequest;
import com.agri.ecommerce.dto.request.cart.UpdateCartItemRequest;
import com.agri.ecommerce.dto.response.cart.CartItemResponse;
import com.agri.ecommerce.dto.response.cart.CartResponse;
import com.agri.ecommerce.entity.CartItemEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.exception.BadRequestException;
import com.agri.ecommerce.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.CartMapper;
import com.agri.ecommerce.repository.CartItemRepository;
import com.agri.ecommerce.repository.ProductImageRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private static final String IN_STOCK_STATUS = "in_stock";

    private final CartItemRepository cartItemRepository;

    private final ProductRepository productRepository;

    private final ProductImageRepository productImageRepository;

    private final UserRepository userRepository;

    private final CartMapper cartMapper;

    @Override
    @Transactional(readOnly = true)
    public CartResponse getCart(Long userId) {
        return buildCartResponse(userId);
    }

    @Override
    @Transactional
    public CartResponse addItem(Long userId, AddCartItemRequest request) {
        UserEntity user = findUserById(userId);
        ProductEntity product = findProductById(request.getProductId());
        CartItemEntity cartItem = cartItemRepository
                .findByUser_IdAndProduct_Id(userId, product.getId())
                .orElse(null);

        int currentQuantity = cartItem == null ? 0 : cartItem.getQuantity();
        int newQuantity = currentQuantity + request.getQuantity();
        validateProductCanBeInCart(product, newQuantity);

        if (cartItem == null) {
            cartItem = CartItemEntity.builder()
                    .user(user)
                    .product(product)
                    .quantity(newQuantity)
                    .build();
        } else {
            cartItem.setQuantity(newQuantity);
        }

        cartItemRepository.save(cartItem);
        return buildCartResponse(userId);
    }

    @Override
    @Transactional
    public CartResponse updateItem(Long userId, Long itemId, UpdateCartItemRequest request) {
        CartItemEntity cartItem = findCartItemByIdAndUserId(itemId, userId);
        validateProductCanBeInCart(cartItem.getProduct(), request.getQuantity());

        cartItem.setQuantity(request.getQuantity());
        cartItemRepository.save(cartItem);

        return buildCartResponse(userId);
    }

    @Override
    @Transactional
    public CartResponse removeItem(Long userId, Long itemId) {
        CartItemEntity cartItem = findCartItemByIdAndUserId(itemId, userId);
        cartItemRepository.delete(cartItem);

        return buildCartResponse(userId);
    }

    @Override
    @Transactional
    public CartResponse clearCart(Long userId) {
        findUserById(userId);
        cartItemRepository.deleteByUser_Id(userId);

        return buildCartResponse(userId);
    }

    private CartResponse buildCartResponse(Long userId) {
        List<CartItemEntity> cartItems = cartItemRepository.findByUser_IdOrderByCreatedAtDesc(userId);
        Map<Long, String> thumbnailsByProductId = getThumbnailsByProductId(cartItems);
        List<CartItemResponse> items = cartItems.stream()
                .map(cartItem -> cartMapper.toCartItemResponse(
                        cartItem,
                        thumbnailsByProductId.get(cartItem.getProduct().getId())
                ))
                .toList();

        int totalQuantity = items.stream()
                .mapToInt(CartItemResponse::getQuantity)
                .sum();
        BigDecimal totalAmount = items.stream()
                .map(CartItemResponse::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CartResponse.builder()
                .items(items)
                .totalQuantity(totalQuantity)
                .totalAmount(totalAmount)
                .build();
    }

    private Map<Long, String> getThumbnailsByProductId(List<CartItemEntity> cartItems) {
        if (cartItems.isEmpty()) {
            return Map.of();
        }

        List<Long> productIds = cartItems.stream()
                .map(cartItem -> cartItem.getProduct().getId())
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

    private void validateProductCanBeInCart(ProductEntity product, int requestedQuantity) {
        if (!IN_STOCK_STATUS.equals(product.getStatus())) {
            throw new BadRequestException("Sản phẩm hiện không còn bán");
        }

        if (product.getStock() == null || product.getStock() <= 0) {
            throw new BadRequestException("Sản phẩm đã hết hàng");
        }

        if (requestedQuantity > product.getStock()) {
            throw new BadRequestException("Số lượng trong giỏ không được vượt quá tồn kho hiện tại: " + product.getStock());
        }
    }

    private UserEntity findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với id: " + userId));
    }

    private ProductEntity findProductById(Long productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + productId));
    }

    private CartItemEntity findCartItemByIdAndUserId(Long itemId, Long userId) {
        return cartItemRepository.findByIdAndUser_Id(itemId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm trong giỏ hàng với id: " + itemId));
    }
}
