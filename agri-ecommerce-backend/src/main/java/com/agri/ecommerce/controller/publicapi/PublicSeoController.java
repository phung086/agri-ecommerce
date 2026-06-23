package com.agri.ecommerce.controller.publicapi;

import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.seo.SeoMetadataResponse;
import com.agri.ecommerce.service.SeoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Public - SEO", description = "SEO metadata APIs for public storefront pages")
@RestController
@RequestMapping("/api/public/seo")
@RequiredArgsConstructor
public class PublicSeoController {

    private final SeoService seoService;

    @Operation(summary = "Get home page SEO metadata")
    @GetMapping("/home")
    public ResponseEntity<ApiResponse<SeoMetadataResponse>> getHomeMetadata() {
        SeoMetadataResponse response = seoService.getHomeMetadata();

        return ResponseEntity.ok(
                ApiResponse.success("SEO metadata loaded successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Get product detail SEO metadata")
    @GetMapping("/products/{slug}")
    public ResponseEntity<ApiResponse<SeoMetadataResponse>> getProductMetadata(
            @Parameter(description = "Product slug", example = "cai-ngot-1762274283")
            @PathVariable String slug
    ) {
        SeoMetadataResponse response = seoService.getProductMetadata(slug);

        return ResponseEntity.ok(
                ApiResponse.success("SEO metadata loaded successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Get category page SEO metadata")
    @GetMapping("/categories/{slug}")
    public ResponseEntity<ApiResponse<SeoMetadataResponse>> getCategoryMetadata(
            @Parameter(description = "Category slug", example = "rau-cu")
            @PathVariable String slug
    ) {
        SeoMetadataResponse response = seoService.getCategoryMetadata(slug);

        return ResponseEntity.ok(
                ApiResponse.success("SEO metadata loaded successfully", response, HttpStatus.OK.value())
        );
    }
}
