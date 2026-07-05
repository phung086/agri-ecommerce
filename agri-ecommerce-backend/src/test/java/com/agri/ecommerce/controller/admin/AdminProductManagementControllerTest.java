package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.common.exception.GlobalExceptionHandler;
import com.agri.ecommerce.dto.request.product.ProductCreateRequest;
import com.agri.ecommerce.dto.request.product.ProductUpdateRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.product.ProductResponse;
import com.agri.ecommerce.service.ProductService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminProductManagementController.class)
@Import({ControllerTestSecurityConfig.class, GlobalExceptionHandler.class})
class AdminProductManagementControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private ProductService productService;

    @Test
    void getProducts_asAdmin_returns200() throws Exception {
        // Given
        PageResponse<ProductResponse> page = PageResponse.<ProductResponse>builder()
                .content(List.of(productResponse("in_stock")))
                .page(0)
                .size(12)
                .totalElements(1)
                .totalPages(1)
                .last(true)
                .build();
        when(productService.getAdminProducts(null, null, null, 0, 12, "createdAt,desc")).thenReturn(page);

        // When / Then
        mockMvc.perform(get("/api/admin/products").with(userWithRole(1L, "ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].slug").value("tomato"));
    }

    @Test
    void createProduct_asAdmin_returns201() throws Exception {
        // Given
        ProductCreateRequest request = createRequest();
        when(productService.createProduct(any(ProductCreateRequest.class))).thenReturn(productResponse("in_stock"));

        // When / Then
        mockMvc.perform(post("/api/admin/products")
                        .with(userWithRole(1L, "ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void updateProduct_asAdmin_returns200() throws Exception {
        // Given
        ProductUpdateRequest request = updateRequest();
        when(productService.updateProduct(eq(10L), any(ProductUpdateRequest.class))).thenReturn(productResponse("in_stock"));

        // When / Then
        mockMvc.perform(put("/api/admin/products/10")
                        .with(userWithRole(1L, "ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(10));
    }

    @Test
    void deleteProduct_asAdmin_returns200() throws Exception {
        // Given
        when(productService.deleteProduct(10L)).thenReturn(productResponse("hidden"));

        // When / Then
        mockMvc.perform(delete("/api/admin/products/10").with(userWithRole(1L, "ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("hidden"));
    }

    @Test
    void getProducts_asCustomer_returns403() throws Exception {
        // Given / When / Then
        mockMvc.perform(get("/api/admin/products").with(userWithRole(2L, "CUSTOMER")))
                .andExpect(status().isForbidden());
    }

    private ProductCreateRequest createRequest() {
        ProductCreateRequest request = new ProductCreateRequest();
        request.setName("Tomato");
        request.setSlug("tomato");
        request.setCategoryId(3L);
        request.setPrice(new BigDecimal("10.00"));
        request.setStock(5);
        request.setStatus("in_stock");
        return request;
    }

    private ProductUpdateRequest updateRequest() {
        ProductUpdateRequest request = new ProductUpdateRequest();
        request.setName("Tomato");
        request.setSlug("tomato");
        request.setCategoryId(3L);
        request.setPrice(new BigDecimal("10.00"));
        request.setStock(5);
        request.setStatus("in_stock");
        return request;
    }

    private ProductResponse productResponse(String status) {
        return ProductResponse.builder()
                .id(10L)
                .name("Tomato")
                .slug("tomato")
                .price(new BigDecimal("10.00"))
                .status(status)
                .build();
    }
}
