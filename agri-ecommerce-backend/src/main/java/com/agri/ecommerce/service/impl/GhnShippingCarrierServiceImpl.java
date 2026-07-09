package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.OrderItemEntity;
import com.agri.ecommerce.entity.PaymentEntity;
import com.agri.ecommerce.repository.OrderItemRepository;
import com.agri.ecommerce.repository.PaymentRepository;
import com.agri.ecommerce.service.ShippingCarrierService;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class GhnShippingCarrierServiceImpl implements ShippingCarrierService {

    private final RestTemplate restTemplate;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;

    @Value("${app.shipping.ghn.api-url:https://dev-online-gateway.ghn.vn/shiip/public-api}")
    private String apiUrl;

    @Value("${app.shipping.ghn.token:}")
    private String apiToken;

    @Value("${app.shipping.ghn.shop-id:}")
    private String shopId;

    @Value("${app.shipping.ghn.from-district-id:1542}")
    private int fallbackFromDistrictId;

    @Value("${app.shipping.ghn.from-ward-code:1B1506}")
    private String fallbackFromWardCode;

    private volatile ResolvedOrigin cachedOrigin;

    public GhnShippingCarrierServiceImpl(OrderItemRepository orderItemRepository, PaymentRepository paymentRepository) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        this.restTemplate = new RestTemplate(requestFactory);
        this.orderItemRepository = orderItemRepository;
        this.paymentRepository = paymentRepository;
    }

    // --- DTOs for GHN Master Data ---

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GhnResponse<T> {
        private int code;
        private String message;
        private T data;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Province {
        @JsonProperty("ProvinceID")
        private int provinceId;
        @JsonProperty("ProvinceName")
        private String provinceName;
        @JsonProperty("NameExtension")
        private List<String> nameExtension;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class District {
        @JsonProperty("DistrictID")
        private int districtId;
        @JsonProperty("DistrictName")
        private String districtName;
        @JsonProperty("NameExtension")
        private List<String> nameExtension;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Ward {
        @JsonProperty("WardCode")
        private String wardCode;
        @JsonProperty("WardName")
        private String wardName;
        @JsonProperty("NameExtension")
        private List<String> nameExtension;
    }

    // --- DTOs for GHN Shipping Fee ---

    @Data
    @Builder
    public static class FeeRequest {
        @JsonProperty("from_district_id")
        private int fromDistrictId;
        @JsonProperty("from_ward_code")
        private String fromWardCode;
        @JsonProperty("to_district_id")
        private int toDistrictId;
        @JsonProperty("to_ward_code")
        private String toWardCode;
        private int weight;
        private int length;
        private int width;
        private int height;
        @JsonProperty("service_type_id")
        private int serviceTypeId;
    }

    @Data
    public static class FeeResponseData {
        private BigDecimal total;
        private int service_fee;
    }

    // --- DTOs for GHN Shipping Order Creation ---

    @Data
    @Builder
    public static class GhnOrderRequest {
        @JsonProperty("payment_type_id")
        private int paymentTypeId;
        @JsonProperty("required_note")
        private String requiredNote;
        @JsonProperty("to_name")
        private String toName;
        @JsonProperty("to_phone")
        private String toPhone;
        @JsonProperty("to_address")
        private String toAddress;
        @JsonProperty("to_district_id")
        private int toDistrictId;
        @JsonProperty("to_ward_code")
        private String toWardCode;
        @JsonProperty("cod_amount")
        private int codAmount;
        private int weight;
        private int length;
        private int width;
        private int height;
        @JsonProperty("service_type_id")
        private int serviceTypeId;
        private List<GhnOrderItem> items;
    }

    @Data
    @Builder
    public static class GhnOrderItem {
        private String name;
        private String code;
        private int quantity;
        private int price;
    }

    @Data
    public static class GhnOrderResponseData {
        @JsonProperty("order_code")
        private String orderCode;
        @JsonProperty("expected_delivery_time")
        private String expectedDeliveryTime;
    }

    // --- Core Logic ---

    @Override
    public BigDecimal calculateShippingFee(String provinceName, String districtName, String wardName, double weightInGrams) {
        log.info("[GHN API] Calculating fee to: province={}, district={}, ward={}", provinceName, districtName, wardName);
        try {
            ResolvedLocation loc = resolveLocation(provinceName, districtName, wardName);
            if (loc == null) {
                log.warn("[GHN API] Could not resolve GHN location codes. Falling back to default fee.");
                return new BigDecimal("30000.00");
            }

            HttpHeaders headers = buildHeaders();
            ResolvedOrigin origin = resolveOrigin();
            FeeRequest feeRequest = FeeRequest.builder()
                    .fromDistrictId(origin.getDistrictId())
                    .fromWardCode(origin.getWardCode())
                    .toDistrictId(loc.getDistrictId())
                    .toWardCode(loc.getWardCode())
                    .weight((int) Math.max(weightInGrams, 500))
                    .length(15)
                    .width(15)
                    .height(10)
                    .serviceTypeId(2) // 2: E-commerce standard delivery
                    .build();

            HttpEntity<FeeRequest> entity = new HttpEntity<>(feeRequest, headers);
            String url = apiUrl + "/v2/shipping-order/fee";

            ResponseEntity<GhnResponse> response = restTemplate.exchange(
                    url, HttpMethod.POST, entity, GhnResponse.class
            );

            if (response.getBody() != null && response.getBody().getCode() == 200) {
                Map<String, Object> data = (Map<String, Object>) response.getBody().getData();
                Number totalFee = (Number) data.get("total");
                BigDecimal actualFee = new BigDecimal(totalFee.toString());
                log.info("[GHN API] Shipping fee calculated successfully: {} VND", actualFee);
                return actualFee;
            }
        } catch (Exception e) {
            log.error("[GHN API] Error requesting GHN fee API: {}", e.getMessage(), e);
        }

        return new BigDecimal("35000.00"); // Fallback
    }

    @Override
    public String createShippingLabel(OrderEntity order) {
        log.info("[GHN API] Creating shipping label for Order ID: #{}", order.getId());
        try {
            // Parse District and Ward from detailed address string
            String detailedAddress = order.getShippingAddressDetail() != null ? order.getShippingAddressDetail() : "";
            String province = order.getShippingCity() != null ? order.getShippingCity() : "";

            String district = "";
            String ward = "";
            String streetAddress = detailedAddress;

            String[] parts = detailedAddress.split(",");
            List<String> trimmedParts = new ArrayList<>();
            for (String part : parts) {
                String p = part.trim();
                if (!p.isEmpty()) {
                    trimmedParts.add(p);
                }
            }

            // If the last part matches/contains the province name, strip it to prevent offset
            if (!trimmedParts.isEmpty() && !province.isEmpty()) {
                String lastPartNormalized = normalizeName(trimmedParts.get(trimmedParts.size() - 1));
                String provinceNormalized = normalizeName(province);
                if (lastPartNormalized.equals(provinceNormalized) ||
                    lastPartNormalized.contains(provinceNormalized) ||
                    provinceNormalized.contains(lastPartNormalized)) {
                    trimmedParts.remove(trimmedParts.size() - 1);
                }
            }

            if (trimmedParts.size() >= 2) {
                district = trimmedParts.get(trimmedParts.size() - 1);
                ward = trimmedParts.get(trimmedParts.size() - 2);
                List<String> streetParts = trimmedParts.subList(0, trimmedParts.size() - 2);
                streetAddress = String.join(", ", streetParts);
            } else if (trimmedParts.size() == 1) {
                district = trimmedParts.get(0);
            }

            log.info("[GHN API] Parsed address → province='{}', district='{}', ward='{}', street='{}'",
                    province, district, ward, streetAddress);

            ResolvedLocation loc = resolveLocation(province, district, ward);
            if (loc == null) {
                log.warn("[GHN API] Location unresolved for shipping order creation. Falling back to Mock Label.");
                return "GHN-MOCK-" + System.currentTimeMillis();
            }

            // Retrieve items to send details to GHN
            List<OrderItemEntity> orderItems = orderItemRepository.findByOrder_IdOrderByIdAsc(order.getId());
            List<GhnOrderItem> ghnItems = orderItems.stream()
                    .map(item -> GhnOrderItem.builder()
                            .name(item.getProduct().getName())
                            .code(item.getProduct().getId().toString())
                            .quantity(item.getQuantity())
                            .price(item.getPrice().intValue())
                            .build())
                    .toList();

            // Determine COD amount (if cash/COD, set cod = total price, else 0 if prepaid)
            PaymentEntity payment = paymentRepository.findFirstByOrder_IdOrderByCreatedAtDesc(order.getId()).orElse(null);
            int codAmount = 0;
            if (payment != null && "cash".equalsIgnoreCase(payment.getPaymentMethod())) {
                codAmount = order.getTotalPrice().intValue();
            }

            HttpHeaders headers = buildHeaders();
            GhnOrderRequest orderRequest = GhnOrderRequest.builder()
                    .paymentTypeId(1) // 1: Shop pays shipping fee (since we collect from customer directly)
                    .requiredNote("CHOXEMHANGKHONGTHU")
                    .toName(resolveRecipientName(order))
                    .toPhone(resolveRecipientPhone(order))
                    .toAddress(streetAddress.isEmpty() ? detailedAddress : streetAddress)
                    .toDistrictId(loc.getDistrictId())
                    .toWardCode(loc.getWardCode())
                    .codAmount(codAmount)
                    .weight(1000) // Default weight
                    .length(20)
                    .width(15)
                    .height(15)
                    .serviceTypeId(2)
                    .items(ghnItems)
                    .build();

            HttpEntity<GhnOrderRequest> entity = new HttpEntity<>(orderRequest, headers);
            String url = apiUrl + "/v2/shipping-order/create";

            ResponseEntity<GhnResponse> response = restTemplate.exchange(
                    url, HttpMethod.POST, entity, GhnResponse.class
            );

            if (response.getBody() != null && response.getBody().getCode() == 200) {
                Map<String, Object> data = (Map<String, Object>) response.getBody().getData();
                String orderCode = (String) data.get("order_code");
                log.info("[GHN API] Created GHN shipping order successfully. Tracking number: {}", orderCode);
                return orderCode;
            } else {
                log.warn("[GHN API] GHN API returned error code: {}, message: {}",
                        response.getBody() != null ? response.getBody().getCode() : "null",
                        response.getBody() != null ? response.getBody().getMessage() : "null");
            }
        } catch (Exception e) {
            log.error("[GHN API] Error calling GHN order creation API: {}", e.getMessage(), e);
        }

        return "GHN-MOCK-" + System.currentTimeMillis();
    }

    private String resolveRecipientName(OrderEntity order) {
        if (order == null) {
            return "Khach AgriMarket";
        }

        if (hasText(order.getShippingName())) {
            return order.getShippingName().trim();
        }

        return order.getUser() == null || !hasText(order.getUser().getName())
                ? "Khach AgriMarket"
                : order.getUser().getName().trim();
    }

    private String resolveRecipientPhone(OrderEntity order) {
        if (order == null) {
            return "0987654321";
        }

        if (hasText(order.getShippingPhone())) {
            return order.getShippingPhone().trim();
        }

        return order.getUser() == null || !hasText(order.getUser().getPhoneNumber())
                ? "0987654321"
                : order.getUser().getPhoneNumber().trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isBlank();
    }

    // --- Helper Location Resolver using matching and official GHN API ---

    @Data
    @AllArgsConstructor
    private static class ResolvedLocation {
        private int provinceId;
        private int districtId;
        private String wardCode;
    }

    @Data
    @AllArgsConstructor
    private static class ResolvedOrigin {
        private int districtId;
        private String wardCode;
    }

    private ResolvedOrigin resolveOrigin() {
        ResolvedOrigin cached = cachedOrigin;
        if (cached != null) {
            return cached;
        }

        ResolvedOrigin shopOrigin = resolveShopOrigin();
        if (shopOrigin != null) {
            cachedOrigin = shopOrigin;
            return shopOrigin;
        }

        String wardCode = fallbackFromWardCode == null ? "" : fallbackFromWardCode.trim();
        if (fallbackFromDistrictId > 0 && !wardCode.isBlank()) {
            return new ResolvedOrigin(fallbackFromDistrictId, wardCode);
        }

        return new ResolvedOrigin(1542, "1B1506");
    }

    private ResolvedOrigin resolveShopOrigin() {
        if (shopId == null || shopId.isBlank()) {
            return null;
        }

        try {
            HttpHeaders headers = buildHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<GhnResponse> response = restTemplate.exchange(
                    apiUrl + "/v2/shop/all",
                    HttpMethod.GET,
                    entity,
                    GhnResponse.class
            );

            if (response.getBody() == null || response.getBody().getCode() != 200 || response.getBody().getData() == null) {
                return null;
            }

            Map<String, Object> data = (Map<String, Object>) response.getBody().getData();
            List<Map<String, Object>> shops = (List<Map<String, Object>>) data.get("shops");
            if (shops == null || shops.isEmpty()) {
                return null;
            }

            Map<String, Object> selectedShop = shops.stream()
                    .filter(shop -> shopId.equals(String.valueOf(shop.get("_id"))))
                    .findFirst()
                    .orElse(shops.get(0));
            Object districtIdValue = selectedShop.get("district_id");
            Object wardCodeValue = selectedShop.get("ward_code");
            if (!(districtIdValue instanceof Number districtId) || wardCodeValue == null) {
                return null;
            }

            String wardCode = String.valueOf(wardCodeValue).trim();
            if (wardCode.isBlank()) {
                return null;
            }

            log.info("[GHN API] Resolved shop origin from GHN shop {}: district={}, ward={}",
                    selectedShop.get("_id"), districtId.intValue(), wardCode);
            return new ResolvedOrigin(districtId.intValue(), wardCode);
        } catch (Exception e) {
            log.warn("[GHN API] Could not resolve shop origin from GHN /v2/shop/all: {}", e.getMessage());
            return null;
        }
    }

    private ResolvedLocation resolveLocation(String pName, String dName, String wName) {
        try {
            HttpHeaders headers = buildHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            // 1. Fetch provinces and match
            String provUrl = apiUrl + "/master-data/province";
            ResponseEntity<GhnResponse> provResp = restTemplate.exchange(
                    provUrl, HttpMethod.GET, entity, GhnResponse.class
            );

            if (provResp.getBody() == null || provResp.getBody().getData() == null) {
                log.warn("[GHN Location] Province API returned null body/data. HTTP status: {}", provResp.getStatusCode());
                return null;
            }

            List<Map<String, Object>> provinces = (List<Map<String, Object>>) provResp.getBody().getData();
            int matchedProvinceId = -1;
            String normalizedPName = normalizeName(pName);

            log.info("[GHN Location] Province lookup: input='{}', normalized='{}', totalProvinces={}. Sample: {}",
                    pName, normalizedPName, provinces.size(),
                    provinces.stream().limit(3)
                            .map(p -> p.get("ProvinceName") + "→" + normalizeName((String) p.get("ProvinceName")))
                            .toList());

            for (Map<String, Object> prov : provinces) {
                String name = (String) prov.get("ProvinceName");
                if (name == null || name.contains("02") || name.toLowerCase().contains("test") || name.toLowerCase().contains("mock")) {
                    continue; // Skip dummy sandbox provinces
                }
                List<String> extensions = (List<String>) prov.get("NameExtension");
                if (normalizeName(name).equals(normalizedPName) || isExtensionMatch(extensions, normalizedPName)) {
                    matchedProvinceId = ((Number) prov.get("ProvinceID")).intValue();
                    break;
                }
            }

            if (matchedProvinceId == -1) {
                // Fuzzy fallback: check if one contains the other
                for (Map<String, Object> prov : provinces) {
                    String name = (String) prov.get("ProvinceName");
                    if (name == null || name.contains("02") || name.toLowerCase().contains("test") || name.toLowerCase().contains("mock")) {
                        continue;
                    }
                    if (normalizeName(name).contains(normalizedPName) || normalizedPName.contains(normalizeName(name))) {
                        matchedProvinceId = ((Number) prov.get("ProvinceID")).intValue();
                        break;
                    }
                }
            }

            if (matchedProvinceId == -1) {
                log.warn("[GHN Location] Province not resolved: '{}' (normalized='{}')", pName, normalizedPName);
                return null;
            }

            log.info("[GHN Location] Resolved Province: '{}' -> ID={}", pName, matchedProvinceId);

            // 2. Fetch districts and match
            String distUrl = apiUrl + "/master-data/district";
            Map<String, Object> distBody = Map.of("province_id", matchedProvinceId);
            HttpEntity<Map<String, Object>> distEntity = new HttpEntity<>(distBody, headers);
            ResponseEntity<GhnResponse> distResp = restTemplate.exchange(
                    distUrl, HttpMethod.POST, distEntity, GhnResponse.class
                );

            if (distResp.getBody() == null || distResp.getBody().getData() == null) {
                log.warn("[GHN Location] District API returned null body/data. HTTP status: {}", distResp.getStatusCode());
                return null;
            }

            List<Map<String, Object>> districts = (List<Map<String, Object>>) distResp.getBody().getData();
            int matchedDistrictId = -1;
            String normalizedDName = normalizeName(dName);
            if (normalizedDName.isBlank()) {
                log.warn("[GHN Location] District is blank for province ID {}", matchedProvinceId);
                return null;
            }

            log.info("[GHN Location] District lookup: input='{}', normalized='{}', totalDistricts={}",
                    dName, normalizedDName, districts.size());

            for (Map<String, Object> dist : districts) {
                String name = (String) dist.get("DistrictName");
                if (name == null || name.contains("02") || name.toLowerCase().contains("test") || name.toLowerCase().contains("mock")) {
                    continue;
                }
                List<String> extensions = (List<String>) dist.get("NameExtension");
                if (normalizeName(name).equals(normalizedDName) || isExtensionMatch(extensions, normalizedDName)) {
                    matchedDistrictId = ((Number) dist.get("DistrictID")).intValue();
                    break;
                }
            }

            if (matchedDistrictId == -1) {
                // Fuzzy fallback
                for (Map<String, Object> dist : districts) {
                    String name = (String) dist.get("DistrictName");
                    if (name == null || name.contains("02") || name.toLowerCase().contains("test") || name.toLowerCase().contains("mock")) {
                        continue;
                    }
                    if (normalizeName(name).contains(normalizedDName) || normalizedDName.contains(normalizeName(name))) {
                        matchedDistrictId = ((Number) dist.get("DistrictID")).intValue();
                        break;
                    }
                }
            }

            if (matchedDistrictId == -1) {
                log.warn("[GHN Location] District not resolved: '{}' (normalized='{}') in province ID {}", dName, normalizedDName, matchedProvinceId);
                return null;
            }

            log.info("[GHN Location] Resolved District: '{}' -> ID={}", dName, matchedDistrictId);

            // 3. Fetch wards and match
            String wardUrl = apiUrl + "/master-data/ward?district_id=" + matchedDistrictId;
            Map<String, Object> wardBody = Map.of("district_id", matchedDistrictId);
            HttpEntity<Map<String, Object>> wardEntity = new HttpEntity<>(wardBody, headers);
            ResponseEntity<GhnResponse> wardResp = restTemplate.exchange(
                    wardUrl, HttpMethod.POST, wardEntity, GhnResponse.class
            );

            if (wardResp.getBody() == null || wardResp.getBody().getData() == null) {
                log.warn("[GHN Location] Ward API returned null body/data. HTTP status: {}", wardResp.getStatusCode());
                return null;
            }

            List<Map<String, Object>> wards = (List<Map<String, Object>>) wardResp.getBody().getData();
            String matchedWardCode = null;
            String normalizedWName = normalizeName(wName);

            for (Map<String, Object> ward : wards) {
                String name = (String) ward.get("WardName");
                List<String> extensions = (List<String>) ward.get("NameExtension");
                if (normalizeName(name).equals(normalizedWName) || isExtensionMatch(extensions, normalizedWName)) {
                    matchedWardCode = (String) ward.get("WardCode");
                    break;
                }
            }

            if (matchedWardCode == null) {
                // Fuzzy fallback
                for (Map<String, Object> ward : wards) {
                    String name = (String) ward.get("WardName");
                    if (normalizeName(name).contains(normalizedWName) || normalizedWName.contains(normalizeName(name))) {
                        matchedWardCode = (String) ward.get("WardCode");
                        break;
                    }
                }
            }

            if (matchedWardCode == null) {
                log.warn("[GHN Location] Ward not resolved: {} in district ID {}", wName, matchedDistrictId);
                // Fallback to first ward in district so it doesn't fail calculating fee
                if (!wards.isEmpty()) {
                    matchedWardCode = (String) wards.get(0).get("WardCode");
                    log.info("[GHN Location] Fallback to first ward in district: {}", matchedWardCode);
                } else {
                    return null;
                }
            }

            return new ResolvedLocation(matchedProvinceId, matchedDistrictId, matchedWardCode);
        } catch (Exception e) {
            log.error("[GHN Location] Error resolving location for province='{}', district='{}', ward='{}': {} - {}",
                    pName, dName, wName, e.getClass().getSimpleName(), e.getMessage(), e);
        }
        return null;
    }

    private boolean isExtensionMatch(List<String> extensions, String normalizedTarget) {
        if (extensions == null || extensions.isEmpty()) {
            return false;
        }
        for (String ext : extensions) {
            if (normalizeName(ext).equals(normalizedTarget)) {
                return true;
            }
        }
        return false;
    }

    private String normalizeName(String name) {
        if (name == null) return "";
        // Normalize to NFC first to ensure consistent Unicode representation
        String nfc = Normalizer.normalize(name, Normalizer.Form.NFC);
        String lower = nfc.toLowerCase();
        // Remove Vietnamese administrative prefix words
        lower = lower.replaceAll("th\u00e0nh ph\u1ed1", "")  // thành phố
                     .replaceAll("t\u1ec9nh", "")             // tỉnh
                     .replaceAll("qu\u1eadn", "")             // quận
                     .replaceAll("huy\u1ec7n", "")            // huyện
                     .replaceAll("th\u1ecb x\u00e3", "")      // thị xã
                     .replaceAll("ph\u01b0\u1eddng", "")      // phường
                     .replaceAll("x\u00e3", "")               // xã
                     .replaceAll("th\u1ecb tr\u1ea5n", "");   // thị trấn
        // Remove all diacritics by decomposing to NFD and stripping combining marks
        String decomposed = Normalizer.normalize(lower, Normalizer.Form.NFD);
        String stripped = decomposed.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        // Handle đ/Đ (not covered by standard decomposition)
        stripped = stripped.replaceAll("[d\u0111]", "d");
        // Remove all whitespace
        return stripped.replaceAll("\\s+", "").trim();
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (apiToken != null && !apiToken.isBlank()) {
            headers.set("Token", apiToken);
        }
        if (shopId != null && !shopId.isBlank()) {
            headers.set("ShopId", shopId);
        }
        return headers;
    }
}
