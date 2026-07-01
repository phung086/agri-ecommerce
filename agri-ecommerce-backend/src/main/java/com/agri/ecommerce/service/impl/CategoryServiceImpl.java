package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.category.CategoryCreateRequest;
import com.agri.ecommerce.dto.request.category.CategoryUpdateRequest;
import com.agri.ecommerce.dto.response.category.CategoryResponse;
import com.agri.ecommerce.entity.CategoryEntity;
import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.CategoryMapper;
import com.agri.ecommerce.repository.CategoryRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.service.AutoTranslationService;
import com.agri.ecommerce.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;

    private final CategoryMapper categoryMapper;

    private final ProductRepository productRepository;

    private final AutoTranslationService autoTranslationService;

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
    public CategoryResponse getCategoryBySlug(String slug) {
        CategoryEntity category = categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với slug: " + slug));

        return categoryMapper.toCategoryResponse(category);
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(Long id) {
        CategoryEntity category = findCategoryById(id);
        return categoryMapper.toCategoryResponse(category);
    }

    @Override
    @Transactional
    public CategoryResponse createCategory(CategoryCreateRequest request) {
        String name = cleanBlank(request.getName());
        String slug = cleanBlank(request.getSlug());

        validateCategoryNameUnique(name, null);
        validateCategorySlugUnique(slug, null);
        AutoTranslationService.CategoryTranslation translation = autoTranslationService.translateCategory(
                name,
                cleanBlank(request.getDescription()),
                cleanBlank(request.getNameEn()),
                cleanBlank(request.getDescriptionEn())
        );

        CategoryEntity category = CategoryEntity.builder()
                .name(name)
                .nameEn(translation.nameEn())
                .slug(slug)
                .description(cleanBlank(request.getDescription()))
                .descriptionEn(translation.descriptionEn())
                .image(cleanBlank(request.getImage()))
                .build();

        CategoryEntity savedCategory = categoryRepository.save(category);
        return categoryMapper.toCategoryResponse(savedCategory);
    }

    @Override
    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryUpdateRequest request) {
        CategoryEntity category = findCategoryById(id);
        String name = cleanBlank(request.getName());
        String slug = cleanBlank(request.getSlug());

        validateCategoryNameUnique(name, id);
        validateCategorySlugUnique(slug, id);
        AutoTranslationService.CategoryTranslation translation = autoTranslationService.translateCategory(
                name,
                cleanBlank(request.getDescription()),
                cleanBlank(request.getNameEn()),
                cleanBlank(request.getDescriptionEn())
        );

        category.setName(name);
        category.setNameEn(translation.nameEn());
        category.setSlug(slug);
        category.setDescription(cleanBlank(request.getDescription()));
        category.setDescriptionEn(translation.descriptionEn());
        category.setImage(cleanBlank(request.getImage()));

        CategoryEntity savedCategory = categoryRepository.save(category);
        return categoryMapper.toCategoryResponse(savedCategory);
    }

    @Override
    @Transactional
    public void deleteCategory(Long id) {
        CategoryEntity category = findCategoryById(id);

        if (productRepository.existsByCategory_Id(id)) {
            throw new BadRequestException("Không thể xóa danh mục đang có sản phẩm");
        }

        categoryRepository.delete(category);
    }

    private CategoryEntity findCategoryById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với id: " + id));
    }

    private void validateCategoryNameUnique(String name, Long currentId) {
        boolean duplicated = currentId == null
                ? categoryRepository.existsByName(name)
                : categoryRepository.existsByNameAndIdNot(name, currentId);

        if (duplicated) {
            throw new BadRequestException("Tên danh mục đã được sử dụng");
        }
    }

    private void validateCategorySlugUnique(String slug, Long currentId) {
        boolean duplicated = currentId == null
                ? categoryRepository.existsBySlug(slug)
                : categoryRepository.existsBySlugAndIdNot(slug, currentId);

        if (duplicated) {
            throw new BadRequestException("Slug danh mục đã được sử dụng");
        }
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }
}
