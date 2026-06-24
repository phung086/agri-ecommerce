package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.dto.response.seo.SeoBreadcrumbResponse;
import com.agri.ecommerce.dto.response.seo.SeoMetadataResponse;
import com.agri.ecommerce.entity.CategoryEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.ProductImageEntity;
import com.agri.ecommerce.repository.CategoryRepository;
import com.agri.ecommerce.repository.ProductImageRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.repository.ReviewRepository;
import com.agri.ecommerce.service.SeoService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class SeoServiceImpl implements SeoService {

    private static final String BRAND_NAME = "AgriMarket";
    private static final String HIDDEN_STATUS = "hidden";
    private static final String DEFAULT_ROBOTS = "index,follow";
    private static final int MAX_TITLE_LENGTH = 65;
    private static final int MAX_DESCRIPTION_LENGTH = 155;

    private final ProductRepository productRepository;

    private final CategoryRepository categoryRepository;

    private final ProductImageRepository productImageRepository;

    private final ReviewRepository reviewRepository;

    @Value("${app.public.base-url:http://localhost:3000}")
    private String publicBaseUrl;

    @Override
    @Transactional(readOnly = true)
    public SeoMetadataResponse getHomeMetadata() {
        String canonicalPath = "/";
        String title = "AgriMarket | Fresh agricultural products online";
        String description = "Buy fresh vegetables, fruits, grains, and seasonal agricultural products from AgriMarket.";
        List<String> keywords = List.of("AgriMarket", "fresh produce", "vegetables", "fruits", "online grocery");
        Map<String, Object> structuredData = orderedMap(
                "@context", "https://schema.org",
                "@type", "WebSite",
                "name", BRAND_NAME,
                "url", absoluteUrl(canonicalPath),
                "potentialAction", orderedMap(
                        "@type", "SearchAction",
                        "target", absoluteUrl("/products?keyword={search_term_string}"),
                        "query-input", "required name=search_term_string"
                )
        );

        return buildMetadata(
                title,
                description,
                canonicalPath,
                null,
                "website",
                keywords,
                structuredData,
                List.of(SeoBreadcrumbResponse.builder().name("Home").path("/").build())
        );
    }

    @Override
    @Transactional(readOnly = true)
    public SeoMetadataResponse getProductMetadata(String slug) {
        ProductEntity product = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Product was not found with slug: " + slug));

        if (HIDDEN_STATUS.equals(product.getStatus())) {
            throw new ResourceNotFoundException("Product was not found with slug: " + slug);
        }

        CategoryEntity category = product.getCategory();
        String canonicalPath = "/products/" + product.getSlug();
        String image = firstProductImage(product.getId());
        String title = trimToLength(product.getName() + " | " + BRAND_NAME, MAX_TITLE_LENGTH);
        String description = trimToLength(firstPresent(
                product.getDescription(),
                "Buy " + product.getName() + " at AgriMarket with fresh quality and transparent price."
        ), MAX_DESCRIPTION_LENGTH);
        long reviewCount = reviewRepository.countByProduct_Id(product.getId());
        Double averageRatingValue = reviewRepository.getAverageRatingByProductId(product.getId());
        BigDecimal averageRating = BigDecimal.valueOf(averageRatingValue == null ? 0 : averageRatingValue)
                .setScale(1, RoundingMode.HALF_UP);
        Map<String, Object> structuredData = buildProductStructuredData(
                product,
                category,
                image,
                canonicalPath,
                reviewCount,
                averageRating
        );

        return buildMetadata(
                title,
                description,
                canonicalPath,
                image,
                "product",
                productKeywords(product, category),
                structuredData,
                productBreadcrumbs(product, category)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public SeoMetadataResponse getCategoryMetadata(String slug) {
        CategoryEntity category = categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Category was not found with slug: " + slug));

        String canonicalPath = "/categories/" + category.getSlug();
        String title = trimToLength(category.getName() + " | " + BRAND_NAME, MAX_TITLE_LENGTH);
        String description = trimToLength(firstPresent(
                category.getDescription(),
                "Explore fresh " + category.getName() + " products at AgriMarket."
        ), MAX_DESCRIPTION_LENGTH);
        Map<String, Object> structuredData = orderedMap(
                "@context", "https://schema.org",
                "@type", "CollectionPage",
                "name", category.getName(),
                "description", description,
                "url", absoluteUrl(canonicalPath),
                "image", absoluteImageUrl(category.getImage())
        );

        return buildMetadata(
                title,
                description,
                canonicalPath,
                category.getImage(),
                "website",
                categoryKeywords(category),
                structuredData,
                List.of(
                        SeoBreadcrumbResponse.builder().name("Home").path("/").build(),
                        SeoBreadcrumbResponse.builder().name(category.getName()).path(canonicalPath).build()
                )
        );
    }

    private SeoMetadataResponse buildMetadata(
            String title,
            String description,
            String canonicalPath,
            String image,
            String type,
            List<String> keywords,
            Map<String, Object> structuredData,
            List<SeoBreadcrumbResponse> breadcrumbs
    ) {
        String canonicalUrl = absoluteUrl(canonicalPath);
        String absoluteImage = absoluteImageUrl(image);

        return SeoMetadataResponse.builder()
                .title(title)
                .description(description)
                .canonicalPath(canonicalPath)
                .canonicalUrl(canonicalUrl)
                .robots(DEFAULT_ROBOTS)
                .image(absoluteImage)
                .type(type)
                .keywords(keywords)
                .openGraph(buildOpenGraph(title, description, canonicalUrl, absoluteImage, type))
                .twitter(buildTwitter(title, description, absoluteImage))
                .structuredData(structuredData)
                .breadcrumbs(breadcrumbs)
                .build();
    }

    private Map<String, String> buildOpenGraph(
            String title,
            String description,
            String canonicalUrl,
            String image,
            String type
    ) {
        Map<String, String> openGraph = new LinkedHashMap<>();
        openGraph.put("og:site_name", BRAND_NAME);
        openGraph.put("og:type", type);
        openGraph.put("og:title", title);
        openGraph.put("og:description", description);
        openGraph.put("og:url", canonicalUrl);

        if (image != null) {
            openGraph.put("og:image", image);
        }

        return openGraph;
    }

    private Map<String, String> buildTwitter(String title, String description, String image) {
        Map<String, String> twitter = new LinkedHashMap<>();
        twitter.put("twitter:card", image == null ? "summary" : "summary_large_image");
        twitter.put("twitter:title", title);
        twitter.put("twitter:description", description);

        if (image != null) {
            twitter.put("twitter:image", image);
        }

        return twitter;
    }

    private Map<String, Object> buildProductStructuredData(
            ProductEntity product,
            CategoryEntity category,
            String image,
            String canonicalPath,
            long reviewCount,
            BigDecimal averageRating
    ) {
        Map<String, Object> productSchema = orderedMap(
                "@context", "https://schema.org",
                "@type", "Product",
                "name", product.getName(),
                "description", firstPresent(product.getDescription(), product.getName()),
                "sku", "product-" + product.getId(),
                "category", category == null ? null : category.getName(),
                "url", absoluteUrl(canonicalPath),
                "image", absoluteImageUrl(image),
                "offers", orderedMap(
                        "@type", "Offer",
                        "priceCurrency", "VND",
                        "price", product.getPrice() == null ? null : product.getPrice().stripTrailingZeros().toPlainString(),
                        "availability", product.getStock() != null && product.getStock() > 0
                                ? "https://schema.org/InStock"
                                : "https://schema.org/OutOfStock",
                        "url", absoluteUrl(canonicalPath)
                )
        );

        if (reviewCount > 0) {
            productSchema.put("aggregateRating", orderedMap(
                    "@type", "AggregateRating",
                    "ratingValue", averageRating.stripTrailingZeros().toPlainString(),
                    "reviewCount", reviewCount
            ));
        }

        return productSchema;
    }

    private List<SeoBreadcrumbResponse> productBreadcrumbs(ProductEntity product, CategoryEntity category) {
        List<SeoBreadcrumbResponse> breadcrumbs = new ArrayList<>();
        breadcrumbs.add(SeoBreadcrumbResponse.builder().name("Home").path("/").build());

        if (category != null) {
            breadcrumbs.add(SeoBreadcrumbResponse.builder()
                    .name(category.getName())
                    .path("/categories/" + category.getSlug())
                    .build());
        }

        breadcrumbs.add(SeoBreadcrumbResponse.builder()
                .name(product.getName())
                .path("/products/" + product.getSlug())
                .build());

        return breadcrumbs;
    }

    private List<String> productKeywords(ProductEntity product, CategoryEntity category) {
        LinkedHashSet<String> keywords = new LinkedHashSet<>();
        keywords.add(product.getName());
        keywords.add("fresh produce");
        keywords.add("AgriMarket");

        if (category != null) {
            keywords.add(category.getName());
        }

        if (product.getUnit() != null) {
            keywords.add(product.getUnit());
        }

        return keywords.stream().filter(Objects::nonNull).toList();
    }

    private List<String> categoryKeywords(CategoryEntity category) {
        return List.of(category.getName(), "fresh produce", "online grocery", BRAND_NAME);
    }

    private String firstProductImage(Long productId) {
        return productImageRepository.findAllByProductId(productId)
                .stream()
                .map(ProductImageEntity::getImage)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private String absoluteUrl(String path) {
        String baseUrl = publicBaseUrl == null || publicBaseUrl.isBlank() ? "http://localhost:3000" : publicBaseUrl.trim();
        String normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        String normalizedPath = path == null || path.isBlank() ? "/" : path;

        if (!normalizedPath.startsWith("/")) {
            normalizedPath = "/" + normalizedPath;
        }

        return normalizedBaseUrl + normalizedPath;
    }

    private String absoluteImageUrl(String image) {
        String cleanImage = cleanBlank(image);
        if (cleanImage == null) {
            return null;
        }

        if (cleanImage.startsWith("http://") || cleanImage.startsWith("https://")) {
            return cleanImage;
        }

        return absoluteUrl(cleanImage);
    }

    private String trimToLength(String value, int maxLength) {
        String cleanValue = cleanBlank(value);
        if (cleanValue == null || cleanValue.length() <= maxLength) {
            return cleanValue;
        }

        return cleanValue.substring(0, Math.max(0, maxLength - 3)).trim() + "...";
    }

    private String firstPresent(String preferred, String fallback) {
        String cleanPreferred = cleanBlank(preferred);
        return cleanPreferred == null ? fallback : cleanPreferred;
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }

    private Map<String, Object> orderedMap(Object... values) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int index = 0; index < values.length; index += 2) {
            if (values[index + 1] != null) {
                map.put(values[index].toString(), values[index + 1]);
            }
        }

        return map;
    }
}
