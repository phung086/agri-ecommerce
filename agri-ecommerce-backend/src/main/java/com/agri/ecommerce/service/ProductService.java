package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.product.UpsertProductRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.product.ProductResponse;

import java.math.BigDecimal;
import java.util.List;

public interface ProductService {

    PageResponse<ProductResponse> getProducts(
            String keyword,
            String categorySlug,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String status,
            int page,
            int size,
            String sort
    );

    List<ProductResponse> getFeaturedProducts(Integer limit);

    ProductResponse getProductById(Long id);

    ProductResponse getProductBySlug(String slug);

    ProductResponse createProduct(UpsertProductRequest request);

    ProductResponse updateProduct(Long id, UpsertProductRequest request);

    void deleteProduct(Long id);
}
