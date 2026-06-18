package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.response.category.CategoryResponse;

import java.util.List;

public interface CategoryService {

    List<CategoryResponse> getAllCategories();

    CategoryResponse getCategoryBySlug(String slug);
}
