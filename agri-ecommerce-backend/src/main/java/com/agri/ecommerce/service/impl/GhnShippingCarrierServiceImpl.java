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

    public GhnShippingCarrierServiceImpl(OrderItemRepository orderItemRepository, PaymentRepository paymentRepository) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(2));
        requestFactory.setReadTimeout(Duration.ofSeconds(3));
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
            FeeRequest feeRequest = FeeRequest.builder()
                    .fromDistrictId(1454) // Mock Shop District: Quận 12, HCM
                    .fromWardCode("21211") // Mock Shop Ward
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
            if (parts.length >= 2) {
                district = parts[parts.length - 1].trim();
                ward = parts[parts.length - 2].trim();
                // Everything before ward is the street address
                List<String> streetParts = new ArrayList<>();
                for (int i = 0; i < parts.length - 2; i++) {
                    streetParts.add(parts[i].trim());
                }
                streetAddress = String.join(", ", streetParts);
            } else if (parts.length == 1) {
                district = parts[0].trim();
            }

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
                    .requiredNote("CHOXEMHANG")
                    .toName(order.getShippingName() != null ? order.getShippingName() : order.getUser().getName())
                    .toPhone(order.getShippingPhone() != null ? order.getShippingPhone() : order.getUser().getPhoneNumber())
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

    // --- Helper Location Resolver using matching and official GHN API ---

    @Data
    @AllArgsConstructor
    private static class ResolvedLocation {
        private int provinceId;
        private int districtId;
        private String wardCode;
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
                return null;
            }

            List<Map<String, Object>> provinces = (List<Map<String, Object>>) provResp.getBody().getData();
            int matchedProvinceId = -1;
            String normalizedPName = normalizeName(pName);

            for (Map<String, Object> prov : provinces) {
                String name = (String) prov.get("ProvinceName");
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
                    if (normalizeName(name).contains(normalizedPName) || normalizedPName.contains(normalizeName(name))) {
                        matchedProvinceId = ((Number) prov.get("ProvinceID")).intValue();
                        break;
                    }
                }
            }

            if (matchedProvinceId == -1) {
                log.warn("[GHN Location] Province not resolved: {}", pName);
                return null;
            }

            // 2. Fetch districts and match
            String distUrl = apiUrl + "/master-data/district";
            Map<String, Object> distBody = Map.of("province_id", matchedProvinceId);
            HttpEntity<Map<String, Object>> distEntity = new HttpEntity<>(distBody, headers);
            ResponseEntity<GhnResponse> distResp = restTemplate.exchange(
                    distUrl, HttpMethod.POST, distEntity, GhnResponse.class
            );

            if (distResp.getBody() == null || distResp.getBody().getData() == null) {
                return null;
            }

            List<Map<String, Object>> districts = (List<Map<String, Object>>) distResp.getBody().getData();
            int matchedDistrictId = -1;
            String normalizedDName = normalizeName(dName);
            if (normalizedDName.isBlank()) {
                log.warn("[GHN Location] District is blank for province ID {}", matchedProvinceId);
                return null;
            }

            for (Map<String, Object> dist : districts) {
                String name = (String) dist.get("DistrictName");
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
                    if (normalizeName(name).contains(normalizedDName) || normalizedDName.contains(normalizeName(name))) {
                        matchedDistrictId = ((Number) dist.get("DistrictID")).intValue();
                        break;
                    }
                }
            }

            if (matchedDistrictId == -1) {
                log.warn("[GHN Location] District not resolved: {} in province ID {}", dName, matchedProvinceId);
                return null;
            }

            // 3. Fetch wards and match
            String wardUrl = apiUrl + "/master-data/ward?district_id=" + matchedDistrictId;
            // GHN accepts district_id either as query parameter or request body
            Map<String, Object> wardBody = Map.of("district_id", matchedDistrictId);
            HttpEntity<Map<String, Object>> wardEntity = new HttpEntity<>(wardBody, headers);
            ResponseEntity<GhnResponse> wardResp = restTemplate.exchange(
                    wardUrl, HttpMethod.POST, wardEntity, GhnResponse.class
            );

            if (wardResp.getBody() == null || wardResp.getBody().getData() == null) {
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
            log.error("[GHN Location] Error resolving location: {}", e.getMessage());
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
        return name.toLowerCase()
                .replaceAll("thành phố", "")
                .replaceAll("tỉnh", "")
                .replaceAll("quận", "")
                .replaceAll("huyện", "")
                .replaceAll("thị xã", "")
                .replaceAll("phường", "")
                .replaceAll("xã", "")
                .replaceAll("thị trấn", "")
                .replaceAll("[àáạảãâầấậẩẫăằắặẳẵ]", "a")
                .replaceAll("[èéẹẻẽêềếệểễ]", "e")
                .replaceAll("[ìíịỉĩ]", "i")
                .replaceAll("[òóọỏõôồốộổỗơờớợởỡ]", "o")
                .replaceAll("[ùúụủũưừứựửữ]", "u")
                .replaceAll("[ỳýỵỷỹ]", "y")
                .replaceAll("đ", "d")
                .replaceAll("\\s+", "")
                .trim();
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
