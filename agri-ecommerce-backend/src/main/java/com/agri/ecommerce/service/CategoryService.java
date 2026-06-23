package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.category.CategoryCreateRequest;
import com.agri.ecommerce.dto.request.category.CategoryUpdateRequest;
import com.agri.ecommerce.dto.response.category.CategoryResponse;

import java.util.List;

public interface CategoryService {

    List<CategoryResponse> getAllCategories();

    CategoryResponse getCategoryBySlug(String slug);

    CategoryResponse getCategoryById(Long id);

    CategoryResponse createCategory(CategoryCreateRequest request);

    CategoryResponse updateCategory(Long id, CategoryUpdateRequest request);

    void deleteCategory(Long id);
}
