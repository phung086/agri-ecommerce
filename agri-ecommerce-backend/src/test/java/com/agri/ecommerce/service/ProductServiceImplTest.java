package com.agri.ecommerce.service;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.dto.request.product.ProductCreateRequest;
import com.agri.ecommerce.dto.request.product.ProductUpdateRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.product.ProductResponse;
import com.agri.ecommerce.entity.CategoryEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.mapper.ProductMapper;
import com.agri.ecommerce.repository.CategoryRepository;
import com.agri.ecommerce.repository.ProductImageRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.service.impl.ProductServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServiceImplTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductImageRepository productImageRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductMapper productMapper;

    @Mock
    private AutoTranslationService autoTranslationService;

    @InjectMocks
    private ProductServiceImpl productService;

    @Test
    void getProducts_withCategoryFilter_shouldQueryCorrectly() {
        // Given
        ProductEntity product = product();
        ProductResponse productResponse = productResponse();
        when(productRepository.findAll(anySpecification(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(product)));
        when(productImageRepository.findAllByProductIds(List.of(10L))).thenReturn(List.of());
        when(productMapper.toProductResponse(product, List.of())).thenReturn(productResponse);

        // When
        PageResponse<ProductResponse> response = productService.getProducts(
                null,
                "vegetables",
                null,
                null,
                "in_stock",
                0,
                12,
                "price,asc"
        );

        // Then
        assertThat(response.getContent()).containsExactly(productResponse);
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(productRepository).findAll(anySpecification(), pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageNumber()).isZero();
        assertThat(pageableCaptor.getValue().getSort().getOrderFor("price").isAscending()).isTrue();
    }

    @Test
    void getProducts_withSearchKeyword_shouldQueryCorrectly() {
        // Given
        when(productRepository.findAll(anySpecification(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        // When
        PageResponse<ProductResponse> response = productService.getProducts(
                "tomato",
                null,
                null,
                null,
                null,
                0,
                12,
                "createdAt,desc"
        );

        // Then
        assertThat(response.getContent()).isEmpty();
        verify(productRepository).findAll(anySpecification(), any(Pageable.class));
    }

    @Test
    void getProductBySlug_whenNotFound_shouldThrowNotFoundException() {
        // Given
        when(productRepository.findBySlug("missing")).thenReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> productService.getProductBySlug("missing"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void createProduct_shouldSaveAndReturnResponse() {
        // Given
        ProductCreateRequest request = createRequest();
        CategoryEntity category = category();
        ProductResponse response = productResponse();
        when(productRepository.existsBySlug("tomato")).thenReturn(false);
        when(categoryRepository.findById(3L)).thenReturn(Optional.of(category));
        when(autoTranslationService.translateProduct(
                "Tomato",
                "Fresh tomato",
                "kg",
                null,
                null,
                null
        )).thenReturn(new AutoTranslationService.ProductTranslation("Tomato", "Fresh tomato", "kg"));
        when(productRepository.save(any(ProductEntity.class))).thenAnswer(invocation -> {
            ProductEntity saved = invocation.getArgument(0);
            saved.setId(10L);
            return saved;
        });
        when(productImageRepository.findAllByProductId(10L)).thenReturn(List.of());
        when(productMapper.toProductResponse(any(ProductEntity.class), anyList())).thenReturn(response);

        // When
        ProductResponse actual = productService.createProduct(request);

        // Then
        assertThat(actual).isEqualTo(response);
        verify(productRepository).save(any(ProductEntity.class));
        verify(productImageRepository).saveAll(anyList());
    }

    @Test
    void updateProduct_whenNotFound_shouldThrowException() {
        // Given
        ProductUpdateRequest request = updateRequest();
        when(productRepository.findById(10L)).thenReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> productService.updateProduct(10L, request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void deleteProduct_shouldCallDelete() {
        // Given
        ProductEntity product = product();
        ProductResponse response = ProductResponse.builder().id(10L).status("hidden").build();
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(productRepository.save(product)).thenReturn(product);
        when(productImageRepository.findAllByProductId(10L)).thenReturn(List.of());
        when(productMapper.toProductResponse(product, List.of())).thenReturn(response);

        // When
        ProductResponse actual = productService.deleteProduct(10L);

        // Then
        assertThat(actual.getStatus()).isEqualTo("hidden");
        assertThat(product.getStatus()).isEqualTo("hidden");
        verify(productRepository).save(product);
    }

    @Test
    void getProducts_whenInvalidPriceRange_shouldThrowException() {
        // Given
        BigDecimal minPrice = new BigDecimal("20.00");
        BigDecimal maxPrice = new BigDecimal("10.00");

        // When / Then
        assertThatThrownBy(() -> productService.getProducts(null, null, minPrice, maxPrice, null, 0, 12, null))
                .isInstanceOf(BadRequestException.class);
    }

    @SuppressWarnings("unchecked")
    private Specification<ProductEntity> anySpecification() {
        return any(Specification.class);
    }

    private ProductCreateRequest createRequest() {
        ProductCreateRequest request = new ProductCreateRequest();
        request.setName("Tomato");
        request.setSlug("tomato");
        request.setCategoryId(3L);
        request.setDescription("Fresh tomato");
        request.setPrice(new BigDecimal("10.00"));
        request.setStock(5);
        request.setStatus("in_stock");
        request.setUnit("kg");
        request.setThumbnail("thumb.jpg");
        request.setImages(List.of("extra.jpg"));
        return request;
    }

    private ProductUpdateRequest updateRequest() {
        ProductUpdateRequest request = new ProductUpdateRequest();
        request.setName("Tomato");
        request.setSlug("tomato");
        request.setCategoryId(3L);
        request.setPrice(new BigDecimal("10.00"));
        request.setStock(5);
        return request;
    }

    private ProductEntity product() {
        return ProductEntity.builder()
                .id(10L)
                .name("Tomato")
                .slug("tomato")
                .category(category())
                .price(new BigDecimal("10.00"))
                .stock(5)
                .status("in_stock")
                .build();
    }

    private CategoryEntity category() {
        return CategoryEntity.builder()
                .id(3L)
                .name("Vegetables")
                .slug("vegetables")
                .build();
    }

    private ProductResponse productResponse() {
        return ProductResponse.builder()
                .id(10L)
                .name("Tomato")
                .slug("tomato")
                .status("in_stock")
                .build();
    }
}
