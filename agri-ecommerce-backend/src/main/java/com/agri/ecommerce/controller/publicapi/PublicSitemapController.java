package com.agri.ecommerce.controller.publicapi;

import com.agri.ecommerce.service.SitemapService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Public - Sitemap", description = "Sitemap and robots endpoints for crawlers")
@RestController
@RequiredArgsConstructor
public class PublicSitemapController {

    private final SitemapService sitemapService;

    @Operation(summary = "Get XML sitemap")
    @GetMapping(value = {"/sitemap.xml", "/api/public/seo/sitemap.xml"}, produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> getSitemapXml() {
        return ResponseEntity.ok(sitemapService.generateSitemapXml());
    }

    @Operation(summary = "Get robots.txt")
    @GetMapping(value = {"/robots.txt", "/api/public/seo/robots.txt"}, produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> getRobotsTxt() {
        return ResponseEntity.ok(sitemapService.generateRobotsTxt());
    }
}
