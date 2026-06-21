package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.entity.CategoryEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.repository.CategoryRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.service.SitemapService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SitemapServiceImpl implements SitemapService {

    private static final String HIDDEN_STATUS = "hidden";
    private static final int DEFAULT_MAX_PRODUCTS = 10_000;

    private final ProductRepository productRepository;

    private final CategoryRepository categoryRepository;

    @Value("${app.public.base-url:http://localhost:3000}")
    private String publicBaseUrl;

    @Value("${app.seo.sitemap.max-products:10000}")
    private int maxProducts;

    @Override
    @Transactional(readOnly = true)
    public String generateSitemapXml() {
        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        appendUrl(xml, "/", LocalDate.now(), "daily", "1.0");
        appendUrl(xml, "/products", LocalDate.now(), "daily", "0.9");
        appendUrl(xml, "/categories", LocalDate.now(), "weekly", "0.8");

        for (CategoryEntity category : categoryRepository.findAllByOrderByIdAsc()) {
            appendUrl(
                    xml,
                    "/categories/" + category.getSlug(),
                    toDate(firstPresent(category.getUpdatedAt(), category.getCreatedAt())),
                    "weekly",
                    "0.7"
            );
        }

        PageRequest pageRequest = PageRequest.of(
                0,
                normalizeMaxProducts(),
                Sort.by(Sort.Direction.DESC, "updatedAt").and(Sort.by(Sort.Direction.DESC, "id"))
        );
        List<ProductEntity> products = productRepository.findByStatusNot(HIDDEN_STATUS, pageRequest);

        for (ProductEntity product : products) {
            appendUrl(
                    xml,
                    "/products/" + product.getSlug(),
                    toDate(firstPresent(product.getUpdatedAt(), product.getCreatedAt())),
                    "weekly",
                    "0.6"
            );
        }

        xml.append("</urlset>\n");
        return xml.toString();
    }

    @Override
    public String generateRobotsTxt() {
        return String.join("\n",
                "User-agent: *",
                "Allow: /",
                "Disallow: /admin",
                "Disallow: /admin/",
                "Disallow: /api/admin/",
                "Disallow: /api/customer/",
                "Disallow: /api/delivery/",
                "Disallow: /api/auth/me",
                "Sitemap: " + absoluteUrl("/sitemap.xml"),
                ""
        );
    }

    private void appendUrl(StringBuilder xml, String path, LocalDate lastModified, String changeFrequency, String priority) {
        xml.append("  <url>\n");
        xml.append("    <loc>").append(escapeXml(absoluteUrl(path))).append("</loc>\n");
        xml.append("    <lastmod>").append(lastModified == null ? LocalDate.now() : lastModified).append("</lastmod>\n");
        xml.append("    <changefreq>").append(changeFrequency).append("</changefreq>\n");
        xml.append("    <priority>").append(priority).append("</priority>\n");
        xml.append("  </url>\n");
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

    private LocalDate toDate(LocalDateTime dateTime) {
        return dateTime == null ? LocalDate.now() : dateTime.toLocalDate();
    }

    private LocalDateTime firstPresent(LocalDateTime preferred, LocalDateTime fallback) {
        return preferred == null ? fallback : preferred;
    }

    private int normalizeMaxProducts() {
        if (maxProducts < 1) {
            return DEFAULT_MAX_PRODUCTS;
        }

        return Math.min(maxProducts, 50_000);
    }

    private String escapeXml(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}
