package com.agri.ecommerce.controller.webhook;

import com.agri.ecommerce.dto.request.webhook.GhnOrderStatusWebhookRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.webhook.GhnWebhookResponse;
import com.agri.ecommerce.service.GhnWebhookService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@RestController
@RequestMapping("/api/webhooks/ghn")
@RequiredArgsConstructor
public class GhnWebhookController {

    private final GhnWebhookService ghnWebhookService;

    @Value("${app.shipping.ghn.webhook-secret:}")
    private String webhookSecret;

    @Operation(summary = "Receive GHN order status callback")
    @PostMapping
    public ResponseEntity<ApiResponse<GhnWebhookResponse>> handleOrderStatus(
            @RequestHeader(name = "X-GHN-Webhook-Secret", required = false) String headerSecret,
            @RequestParam(name = "secret", required = false) String querySecret,
            @Valid @RequestBody GhnOrderStatusWebhookRequest request
    ) {
        if (!hasValidSecret(headerSecret, querySecret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid GHN webhook secret", null, HttpStatus.UNAUTHORIZED.value()));
        }

        GhnWebhookResponse response = ghnWebhookService.handleOrderStatus(request);
        return ResponseEntity.ok(ApiResponse.success("GHN webhook received", response, HttpStatus.OK.value()));
    }

    private boolean hasValidSecret(String headerSecret, String querySecret) {
        String configuredSecret = cleanBlank(webhookSecret);
        if (configuredSecret == null) {
            return false;
        }

        String providedSecret = cleanBlank(headerSecret);
        if (providedSecret == null) {
            providedSecret = cleanBlank(querySecret);
        }

        if (providedSecret == null) {
            return false;
        }

        return MessageDigest.isEqual(
                configuredSecret.getBytes(StandardCharsets.UTF_8),
                providedSecret.getBytes(StandardCharsets.UTF_8)
        );
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }
}
