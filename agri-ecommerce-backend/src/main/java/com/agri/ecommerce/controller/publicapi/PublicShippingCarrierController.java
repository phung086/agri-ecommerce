package com.agri.ecommerce.controller.publicapi;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/public/mock-shipping")
public class PublicShippingCarrierController {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.shipping.ghn.api-url}")
    private String apiUrl;

    @Value("${app.shipping.ghn.token}")
    private String apiToken;

    @Value("${app.shipping.ghn.shop-id}")
    private String shopId;

    @GetMapping("/test-connection")
    public ResponseEntity<?> testConnection() {
        log.info("[Mock Shipping Carrier] Testing connection to GHN API: {}", apiUrl);
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Token", apiToken);
            headers.set("ShopId", shopId);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    apiUrl + "/master-data/province",
                    HttpMethod.GET,
                    entity,
                    String.class
            );
            return ResponseEntity.ok(response.getBody());
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("[Mock Shipping Carrier] Connection test failed with HTTP client error: {}", e.getResponseBodyAsString());
            return ResponseEntity.status(e.getStatusCode()).body(
                    Map.of(
                            "error", "GHN API returned client error. Verify your Token and ShopId in .env.",
                            "ghn_response_code", e.getStatusCode().value(),
                            "ghn_message", e.getResponseBodyAsString()
                    )
            );
        } catch (Exception e) {
            log.error("[Mock Shipping Carrier] Connection test failed: {}", e.getMessage());
            return ResponseEntity.status(500).body(
                    Map.of(
                            "error", "Failed to connect to GHN API. Network might be down or URL is invalid.",
                            "message", e.getMessage()
                    )
            );
        }
    }
}
