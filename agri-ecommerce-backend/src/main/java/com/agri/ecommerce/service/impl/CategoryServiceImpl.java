package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.category.UpsertCategoryRequest;
import com.agri.ecommerce.dto.response.category.CategoryResponse;
import com.agri.ecommerce.entity.CategoryEntity;
import com.agri.ecommerce.exception.BadRequestException;
import com.agri.ecommerce.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.CategoryMapper;
import com.agri.ecommerce.repository.CategoryRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;

    private final ProductRepository productRepository;

    private final CategoryMapper categoryMapper;

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAllByOrderByIdAsc()
                .stream()
                .map(categoryMapper::toCategoryResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(Long id) {
        CategoryEntity category = findCategoryById(id);
        return categoryMapper.toCategoryResponse(category);
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse getCategoryBySlug(String slug) {
        CategoryEntity category = categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với slug: " + slug));

        return categoryMapper.toCategoryResponse(category);
    }

    @Override
    @Transactional
    public CategoryResponse createCategory(UpsertCategoryRequest request) {
        String name = cleanRequired(request.getName());
        String slug = cleanRequired(request.getSlug());

        validateUniqueName(name, null);
        validateUniqueSlug(slug, null);

        CategoryEntity category = CategoryEntity.builder()
                .name(name)
                .slug(slug)
                .description(cleanBlank(request.getDescription()))
                .image(cleanBlank(request.getImage()))
                .build();

        CategoryEntity savedCategory = categoryRepository.save(category);

        return categoryMapper.toCategoryResponse(savedCategory);
    }

    @Override
    @Transactional
    public CategoryResponse updateCategory(Long id, UpsertCategoryRequest request) {
        CategoryEntity category = findCategoryById(id);
        String name = cleanRequired(request.getName());
        String slug = cleanRequired(request.getSlug());

        validateUniqueName(name, id);
        validateUniqueSlug(slug, id);

        category.setName(name);
        category.setSlug(slug);
        category.setDescription(cleanBlank(request.getDescription()));
        category.setImage(cleanBlank(request.getImage()));

        CategoryEntity savedCategory = categoryRepository.save(category);

        return categoryMapper.toCategoryResponse(savedCategory);
    }

    @Override
    @Transactional
    public void deleteCategory(Long id) {
        CategoryEntity category = findCategoryById(id);

        if (productRepository.existsByCategoryId(id)) {
            throw new BadRequestException("Khong the xoa danh muc dang co san pham");
        }

        categoryRepository.delete(category);
    }

    private CategoryEntity findCategoryById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay danh muc voi id: " + id));
    }

    private void validateUniqueName(String name, Long currentId) {
        boolean exists = currentId == null
                ? categoryRepository.existsByName(name)
                : categoryRepository.existsByNameAndIdNot(name, currentId);

        if (exists) {
            throw new BadRequestException("Ten danh muc da duoc su dung");
        }
    }

    private void validateUniqueSlug(String slug, Long currentId) {
        boolean exists = currentId == null
                ? categoryRepository.existsBySlug(slug)
                : categoryRepository.existsBySlugAndIdNot(slug, currentId);

        if (exists) {
            throw new BadRequestException("Slug danh muc da duoc su dung");
        }
    }

    private String cleanRequired(String value) {
        String cleanValue = cleanBlank(value);
        if (cleanValue == null) {
            throw new BadRequestException("Du lieu bat buoc khong duoc de trong");
        }

        return cleanValue;
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }
}
