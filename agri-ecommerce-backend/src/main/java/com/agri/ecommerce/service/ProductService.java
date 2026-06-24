package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.product.ProductCreateRequest;
import com.agri.ecommerce.dto.request.product.ProductStatusUpdateRequest;
import com.agri.ecommerce.dto.request.product.ProductStockUpdateRequest;
import com.agri.ecommerce.dto.request.product.ProductUpdateRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.product.ProductResponse;
import com.agri.ecommerce.dto.response.product.ProductSearchFacetsResponse;
import com.agri.ecommerce.dto.response.product.ProductSearchSuggestionResponse;

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

    List<ProductSearchSuggestionResponse> getSearchSuggestions(
            String keyword,
            String categorySlug,
            BigDecimal maxPrice,
            Integer limit
    );

    ProductSearchFacetsResponse getSearchFacets(
            String keyword,
            String categorySlug,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String status
    );

    ProductResponse getProductBySlug(String slug);

    PageResponse<ProductResponse> getAdminProducts(
            String keyword,
            String categorySlug,
            String status,
            int page,
            int size,
            String sort
    );

    ProductResponse getProductById(Long id);

    ProductResponse createProduct(ProductCreateRequest request);

    ProductResponse updateProduct(Long id, ProductUpdateRequest request);

    ProductResponse updateProductStatus(Long id, ProductStatusUpdateRequest request);

    ProductResponse updateProductStock(Long id, ProductStockUpdateRequest request);

    ProductResponse deleteProduct(Long id);
}
