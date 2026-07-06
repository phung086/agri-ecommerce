package com.agri.ecommerce.controller.customer;

import com.agri.ecommerce.common.exception.GlobalExceptionHandler;
import com.agri.ecommerce.dto.request.cart.AddCartItemRequest;
import com.agri.ecommerce.dto.response.cart.CartResponse;
import com.agri.ecommerce.service.CartService;
import com.agri.ecommerce.testsupport.ControllerTestSecurityConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static com.agri.ecommerce.testsupport.SecurityTestSupport.userWithRole;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CartController.class)
@Import({ControllerTestSecurityConfig.class, GlobalExceptionHandler.class})
class CartControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private CartService cartService;

    @Test
    void getCart_authenticated_returns200() throws Exception {
        // Given
        when(cartService.getCart(1L)).thenReturn(cartResponse(0));

        // When / Then
        mockMvc.perform(get("/api/customer/cart").with(userWithRole(1L, "CUSTOMER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalQuantity").value(0));
    }

    @Test
    void addToCart_withValidProduct_returns200() throws Exception {
        // Given
        AddCartItemRequest request = addRequest(10L, 2);
        when(cartService.addItem(eq(1L), any(AddCartItemRequest.class))).thenReturn(cartResponse(2));

        // When / Then
        mockMvc.perform(post("/api/customer/cart/items")
                        .with(userWithRole(1L, "CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.totalQuantity").value(2));
    }

    @Test
    void addToCart_withInvalidQty_returns400() throws Exception {
        // Given
        AddCartItemRequest request = addRequest(10L, 0);

        // When / Then
        mockMvc.perform(post("/api/customer/cart/items")
                        .with(userWithRole(1L, "CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void removeFromCart_asOwner_returns200() throws Exception {
        // Given
        when(cartService.removeItem(1L, 5L)).thenReturn(cartResponse(0));

        // When / Then
        mockMvc.perform(delete("/api/customer/cart/items/5").with(userWithRole(1L, "CUSTOMER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    private AddCartItemRequest addRequest(Long productId, int quantity) {
        AddCartItemRequest request = new AddCartItemRequest();
        request.setProductId(productId);
        request.setQuantity(quantity);
        return request;
    }

    private CartResponse cartResponse(int totalQuantity) {
        return CartResponse.builder()
                .items(List.of())
                .totalQuantity(totalQuantity)
                .totalAmount(BigDecimal.ZERO)
                .build();
    }
}
