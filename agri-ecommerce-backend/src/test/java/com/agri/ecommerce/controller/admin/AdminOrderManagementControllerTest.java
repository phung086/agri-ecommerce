package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.common.exception.GlobalExceptionHandler;
import com.agri.ecommerce.dto.request.order.AdminOrderStatusUpdateRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.service.AdminOrderService;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminOrderManagementController.class)
@Import({ControllerTestSecurityConfig.class, GlobalExceptionHandler.class})
class AdminOrderManagementControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private AdminOrderService adminOrderService;

    @Test
    void getAllOrders_asAdmin_returns200() throws Exception {
        // Given
        PageResponse<OrderResponse> page = PageResponse.<OrderResponse>builder()
                .content(List.of(orderResponse("pending")))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .last(true)
                .build();
        when(adminOrderService.getOrders(null, null, null, 0, 10, "createdAt,desc")).thenReturn(page);

        // When / Then
        mockMvc.perform(get("/api/admin/orders").with(userWithRole(1L, "ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].status").value("pending"));
    }

    @Test
    void getAllOrders_asCustomer_returns403() throws Exception {
        // Given / When / Then
        mockMvc.perform(get("/api/admin/orders").with(userWithRole(2L, "CUSTOMER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateOrderStatus_asAdmin_returns200() throws Exception {
        // Given
        AdminOrderStatusUpdateRequest request = new AdminOrderStatusUpdateRequest();
        request.setStatus("confirmed");
        when(adminOrderService.updateOrderStatus(eq(100L), any(AdminOrderStatusUpdateRequest.class)))
                .thenReturn(orderResponse("confirmed"));

        // When / Then
        mockMvc.perform(patch("/api/admin/orders/100/status")
                        .with(userWithRole(1L, "ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("confirmed"));
    }

    private OrderResponse orderResponse(String status) {
        return OrderResponse.builder()
                .id(100L)
                .status(status)
                .build();
    }
}
