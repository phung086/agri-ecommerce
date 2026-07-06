package com.agri.ecommerce.controller.publicapi;

import com.agri.ecommerce.common.exception.GlobalExceptionHandler;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.product.ProductResponse;
import com.agri.ecommerce.service.ProductService;
import com.agri.ecommerce.testsupport.ControllerTestSecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PublicProductController.class)
@Import({ControllerTestSecurityConfig.class, GlobalExceptionHandler.class})
class PublicProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProductService productService;

    @Test
    void getProducts_returns200WithList() throws Exception {
        // Given
        ProductResponse product = productResponse();
        PageResponse<ProductResponse> page = PageResponse.<ProductResponse>builder()
                .content(List.of(product))
                .page(0)
                .size(12)
                .totalElements(1)
                .totalPages(1)
                .last(true)
                .build();
        when(productService.getProducts(
                eq("tomato"),
                eq("vegetables"),
                any(BigDecimal.class),
                any(BigDecimal.class),
                eq("in_stock"),
                eq(0),
                eq(12),
                eq("createdAt,desc")
        )).thenReturn(page);

        // When / Then
        mockMvc.perform(get("/api/public/products")
                        .param("keyword", "tomato")
                        .param("categorySlug", "vegetables")
                        .param("minPrice", "1")
                        .param("maxPrice", "100")
                        .param("status", "in_stock"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].slug").value("tomato"));
    }

    @Test
    void getProductBySlug_whenFound_returns200() throws Exception {
        // Given
        when(productService.getProductBySlug("tomato")).thenReturn(productResponse());

        // When / Then
        mockMvc.perform(get("/api/public/products/tomato"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.slug").value("tomato"));
    }

    @Test
    void getProductBySlug_whenNotFound_returns404() throws Exception {
        // Given
        when(productService.getProductBySlug("missing"))
                .thenThrow(new ResourceNotFoundException("Product not found"));

        // When / Then
        mockMvc.perform(get("/api/public/products/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    private ProductResponse productResponse() {
        return ProductResponse.builder()
                .id(10L)
                .name("Tomato")
                .slug("tomato")
                .price(new BigDecimal("10.00"))
                .status("in_stock")
                .build();
    }
}
