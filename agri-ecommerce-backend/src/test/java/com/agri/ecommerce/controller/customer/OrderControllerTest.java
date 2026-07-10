package com.agri.ecommerce.controller.customer;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.GlobalExceptionHandler;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.dto.request.order.CheckoutRequest;
import com.agri.ecommerce.dto.request.order.OrderStatusNoteRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.service.OrderService;
import com.agri.ecommerce.service.impl.CustomerRefundCancelService;
import com.agri.ecommerce.testsupport.ControllerTestSecurityConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static com.agri.ecommerce.testsupport.SecurityTestSupport.userWithRole;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrderController.class)
@Import({ControllerTestSecurityConfig.class, GlobalExceptionHandler.class})
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private OrderService orderService;

    @MockitoBean
    private CustomerRefundCancelService customerRefundCancelService;

    @Test
    void getOrders_authenticated_returns200() throws Exception {
        // Given
        PageResponse<OrderResponse> page = PageResponse.<OrderResponse>builder()
                .content(List.of(orderResponse("pending")))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .last(true)
                .build();
        when(orderService.getOrders(1L, 0, 10, "createdAt,desc")).thenReturn(page);

        // When / Then
        mockMvc.perform(get("/api/customer/orders").with(userWithRole(1L, "CUSTOMER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].status").value("pending"));
    }

    @Test
    void getOrders_unauthenticated_returns401() throws Exception {
        // Given / When / Then
        mockMvc.perform(get("/api/customer/orders"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getOrders_wrongRole_returns403() throws Exception {
        // Given / When / Then
        mockMvc.perform(get("/api/customer/orders").with(userWithRole(2L, "ADMIN")))
                .andExpect(status().isForbidden());
    }

    @Test
    void checkout_withValidRequest_returns201() throws Exception {
        // Given
        CheckoutRequest request = checkoutRequest();
        when(orderService.checkout(eq(1L), any(CheckoutRequest.class))).thenReturn(orderResponse("pending"));

        // When / Then
        mockMvc.perform(post("/api/customer/orders/checkout")
                        .with(userWithRole(1L, "CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void checkout_withEmptyCart_returns400() throws Exception {
        // Given
        CheckoutRequest request = checkoutRequest();
        when(orderService.checkout(eq(1L), any(CheckoutRequest.class)))
                .thenThrow(new BadRequestException("Cart is empty"));

        // When / Then
        mockMvc.perform(post("/api/customer/orders/checkout")
                        .with(userWithRole(1L, "CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void cancelOrder_whenPending_returns200() throws Exception {
        // Given
        OrderStatusNoteRequest request = new OrderStatusNoteRequest();
        request.setNote("Changed mind");
        when(orderService.cancelOrder(eq(1L), eq(100L), any(OrderStatusNoteRequest.class)))
                .thenReturn(orderResponse("canceled"));

        // When / Then
        mockMvc.perform(patch("/api/customer/orders/100/cancel")
                        .with(userWithRole(1L, "CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("canceled"));
    }

    @Test
    void cancelOrder_whenNotOwner_returns404() throws Exception {
        // Given
        when(orderService.cancelOrder(eq(1L), eq(100L), any()))
                .thenThrow(new ResourceNotFoundException("Order not found"));

        // When / Then
        mockMvc.perform(patch("/api/customer/orders/100/cancel")
                        .with(userWithRole(1L, "CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    private CheckoutRequest checkoutRequest() {
        CheckoutRequest request = new CheckoutRequest();
        request.setShippingAddressId(20L);
        request.setPaymentMethod("cash");
        return request;
    }

    private OrderResponse orderResponse(String status) {
        return OrderResponse.builder()
                .id(100L)
                .customerId(1L)
                .status(status)
                .build();
    }
}
