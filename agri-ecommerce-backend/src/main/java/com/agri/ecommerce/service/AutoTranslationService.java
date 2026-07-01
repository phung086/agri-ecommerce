package com.agri.ecommerce.service;

public interface AutoTranslationService {

    ProductTranslation translateProduct(
            String name,
            String description,
            String unit,
            String nameEn,
            String descriptionEn,
            String unitEn
    );

    CategoryTranslation translateCategory(
            String name,
            String description,
            String nameEn,
            String descriptionEn
    );

    record ProductTranslation(String nameEn, String descriptionEn, String unitEn) {
    }

    record CategoryTranslation(String nameEn, String descriptionEn) {
    }
}

