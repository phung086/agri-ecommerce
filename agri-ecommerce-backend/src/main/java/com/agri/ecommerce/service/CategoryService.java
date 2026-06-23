package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.category.UpsertCategoryRequest;
import com.agri.ecommerce.dto.response.category.CategoryResponse;

import java.util.List;

public interface CategoryService {

    List<CategoryResponse> getAllCategories();

    CategoryResponse getCategoryById(Long id);

    CategoryResponse getCategoryBySlug(String slug);

    CategoryResponse createCategory(UpsertCategoryRequest request);

    CategoryResponse updateCategory(Long id, UpsertCategoryRequest request);

    void deleteCategory(Long id);
}
