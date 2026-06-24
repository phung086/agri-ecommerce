package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.response.seo.SeoMetadataResponse;

public interface SeoService {

    SeoMetadataResponse getHomeMetadata();

    SeoMetadataResponse getProductMetadata(String slug);

    SeoMetadataResponse getCategoryMetadata(String slug);
}
