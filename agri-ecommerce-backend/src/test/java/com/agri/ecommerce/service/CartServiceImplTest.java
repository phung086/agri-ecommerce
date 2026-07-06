package com.agri.ecommerce.service;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.dto.request.cart.AddCartItemRequest;
import com.agri.ecommerce.dto.response.cart.CartItemResponse;
import com.agri.ecommerce.dto.response.cart.CartResponse;
import com.agri.ecommerce.entity.CartItemEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.mapper.CartMapper;
import com.agri.ecommerce.repository.CartItemRepository;
import com.agri.ecommerce.repository.ProductImageRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.service.impl.CartServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartServiceImplTest {

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductImageRepository productImageRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CartMapper cartMapper;

    @InjectMocks
    private CartServiceImpl cartService;

    @Test
    void addItem_whenProductNotFound_shouldThrowException() {
        // Given
        AddCartItemRequest request = addRequest(99L, 1);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user()));
        when(productRepository.findById(99L)).thenReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> cartService.addItem(1L, request))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(cartItemRepository, never()).save(any(CartItemEntity.class));
    }

    @Test
    void addItem_whenProductInactive_shouldThrowException() {
        // Given
        AddCartItemRequest request = addRequest(10L, 1);
        ProductEntity product = product("hidden", 10);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user()));
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(cartItemRepository.findByUser_IdAndProduct_Id(1L, 10L)).thenReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> cartService.addItem(1L, request))
                .isInstanceOf(BadRequestException.class);
        verify(cartItemRepository, never()).save(any(CartItemEntity.class));
    }

    @Test
    void addItem_whenExistingItem_shouldUpdateQuantity() {
        // Given
        AddCartItemRequest request = addRequest(10L, 3);
        ProductEntity product = product("in_stock", 10);
        CartItemEntity existingItem = CartItemEntity.builder()
                .id(5L)
                .user(user())
                .product(product)
                .quantity(2)
                .build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user()));
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(cartItemRepository.findByUser_IdAndProduct_Id(1L, 10L)).thenReturn(Optional.of(existingItem));
        when(cartItemRepository.findByUser_IdOrderByCreatedAtDesc(1L)).thenReturn(List.of());

        // When
        CartResponse response = cartService.addItem(1L, request);

        // Then
        assertThat(existingItem.getQuantity()).isEqualTo(5);
        assertThat(response.getTotalQuantity()).isZero();
        verify(cartItemRepository).save(existingItem);
    }

    @Test
    void addItem_newItem_shouldSaveToRepo() {
        // Given
        AddCartItemRequest request = addRequest(10L, 2);
        ProductEntity product = product("in_stock", 10);
        UserEntity user = user();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(cartItemRepository.findByUser_IdAndProduct_Id(1L, 10L)).thenReturn(Optional.empty());
        when(cartItemRepository.findByUser_IdOrderByCreatedAtDesc(1L)).thenReturn(List.of());

        // When
        CartResponse response = cartService.addItem(1L, request);

        // Then
        assertThat(response.getItems()).isEmpty();
        verify(cartItemRepository).save(any(CartItemEntity.class));
    }

    @Test
    void removeItem_whenNotOwner_shouldThrowException() {
        // Given
        when(cartItemRepository.findByIdAndUser_Id(5L, 1L)).thenReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> cartService.removeItem(1L, 5L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getCart_shouldReturnCartItems() {
        // Given
        ProductEntity product = product("in_stock", 10);
        CartItemEntity item = CartItemEntity.builder()
                .id(5L)
                .user(user())
                .product(product)
                .quantity(2)
                .build();
        CartItemResponse itemResponse = CartItemResponse.builder()
                .id(5L)
                .productId(10L)
                .quantity(2)
                .lineTotal(new BigDecimal("20.00"))
                .build();
        when(cartItemRepository.findByUser_IdOrderByCreatedAtDesc(1L)).thenReturn(List.of(item));
        when(productImageRepository.findAllByProductIds(anyList())).thenReturn(List.of());
        when(cartMapper.toCartItemResponse(item, null)).thenReturn(itemResponse);

        // When
        CartResponse response = cartService.getCart(1L);

        // Then
        assertThat(response.getItems()).containsExactly(itemResponse);
        assertThat(response.getTotalQuantity()).isEqualTo(2);
        assertThat(response.getTotalAmount()).isEqualByComparingTo("20.00");
    }

    @Test
    void clearCart_shouldDeleteAllItems() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(user()));
        when(cartItemRepository.findByUser_IdOrderByCreatedAtDesc(1L)).thenReturn(List.of());

        // When
        CartResponse response = cartService.clearCart(1L);

        // Then
        assertThat(response.getItems()).isEmpty();
        verify(cartItemRepository).deleteByUser_Id(1L);
    }

    private AddCartItemRequest addRequest(Long productId, int quantity) {
        AddCartItemRequest request = new AddCartItemRequest();
        request.setProductId(productId);
        request.setQuantity(quantity);
        return request;
    }

    private UserEntity user() {
        return UserEntity.builder()
                .id(1L)
                .name("Test User")
                .email("user@test.com")
                .build();
    }

    private ProductEntity product(String status, int stock) {
        return ProductEntity.builder()
                .id(10L)
                .name("Tomato")
                .slug("tomato")
                .price(new BigDecimal("10.00"))
                .stock(stock)
                .status(status)
                .unit("kg")
                .build();
    }
}
