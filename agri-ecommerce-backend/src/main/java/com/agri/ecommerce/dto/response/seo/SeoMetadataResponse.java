package com.agri.ecommerce.dto.response.seo;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
public class SeoMetadataResponse {

    private String title;

    private String description;

    private String canonicalPath;

    private String canonicalUrl;

    private String robots;

    private String image;

    private String type;

    private List<String> keywords;

    private Map<String, String> openGraph;

    private Map<String, String> twitter;

    private Map<String, Object> structuredData;

    private List<SeoBreadcrumbResponse> breadcrumbs;
}
