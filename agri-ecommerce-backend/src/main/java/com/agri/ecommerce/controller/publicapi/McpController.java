package com.agri.ecommerce.controller.publicapi;

import com.agri.ecommerce.service.impl.AiChatTools;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Controller triển khai Model Context Protocol (MCP) Server chuẩn qua giao thức HTTP/SSE.
 * Hỗ trợ các client AI tiêu chuẩn (như Cursor, Claude Desktop, các AI Agent) kết nối trực tiếp
 * để truy vấn dữ liệu thời gian thực của cửa hàng nông sản.
 */
@Slf4j
@RestController
@RequestMapping("/api/public/mcp")
@RequiredArgsConstructor
public class McpController {

    private final AiChatTools aiChatTools;
    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    @GetMapping("/sse")
    public SseEmitter handleSse() {
        String sessionId = UUID.randomUUID().toString();
        log.info("[MCP Server] Có kết nối mới. Session ID: {}", sessionId);

        // Timeout 10 phút để giữ kết nối ổn định
        SseEmitter emitter = new SseEmitter(600_000L);
        emitters.put(sessionId, emitter);

        emitter.onCompletion(() -> emitters.remove(sessionId));
        emitter.onTimeout(() -> emitters.remove(sessionId));
        emitter.onError((e) -> emitters.remove(sessionId));

        try {
            // Gửi sự kiện 'endpoint' chứa URI tiếp nhận JSON-RPC của session này
            emitter.send(SseEmitter.event()
                    .name("endpoint")
                    .data("/api/public/mcp/message?session=" + sessionId));
        } catch (IOException e) {
            log.error("[MCP Server] Không thể gửi sự kiện 'endpoint' khởi tạo", e);
            emitter.completeWithError(e);
        }

        return emitter;
    }

    @PostMapping("/message")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> handleMessage(
            @RequestParam("session") String session,
            @RequestBody Map<String, Object> request
    ) {
        log.info("[MCP Server] Nhận message từ session {}: {}", session, request);

        Map<String, Object> response = new HashMap<>();
        response.put("jsonrpc", "2.0");
        if (request.containsKey("id")) {
            response.put("id", request.get("id"));
        }

        String method = (String) request.getOrDefault("method", "");
        Map<String, Object> params = (Map<String, Object>) request.getOrDefault("params", Map.of());

        try {
            switch (method) {
                case "initialize":
                    Map<String, Object> resultInit = new HashMap<>();
                    resultInit.put("protocolVersion", "2024-11-05");

                    Map<String, Object> capabilities = new HashMap<>();
                    capabilities.put("tools", Map.of());
                    resultInit.put("capabilities", capabilities);

                    Map<String, Object> serverInfo = new HashMap<>();
                    serverInfo.put("name", "AgriMarket-MCP-Server");
                    serverInfo.put("version", "1.0.0");
                    resultInit.put("serverInfo", serverInfo);

                    response.put("result", resultInit);
                    break;

                case "tools/list":
                    Map<String, Object> resultList = new HashMap<>();
                    List<Map<String, Object>> toolsList = new ArrayList<>();

                    // Tool 1: searchProducts
                    Map<String, Object> searchTool = new HashMap<>();
                    searchTool.put("name", "searchProducts");
                    searchTool.put("description", "Tìm kiếm sản phẩm nông sản theo từ khóa (keyword), danh mục (categorySlug) và mức giá tối đa (maxPrice)");
                    Map<String, Object> searchSchema = new HashMap<>();
                    searchSchema.put("type", "object");
                    Map<String, Object> searchProps = new HashMap<>();
                    searchProps.put("keyword", createStringProp("Từ khóa tìm kiếm theo tên hoặc mô tả sản phẩm"));
                    searchProps.put("categorySlug", createStringProp("Slug của danh mục sản phẩm (ví dụ: 'rau-cu', 'trai-cay')"));
                    searchProps.put("maxPrice", createNumberProp("Giá bán tối đa của sản phẩm (VND)"));
                    searchSchema.put("properties", searchProps);
                    searchTool.put("inputSchema", searchSchema);
                    toolsList.add(searchTool);

                    // Tool 2: getProductDetail
                    Map<String, Object> detailTool = new HashMap<>();
                    detailTool.put("name", "getProductDetail");
                    detailTool.put("description", "Lấy thông tin chi tiết về giá, kho, đơn vị tính, mô tả của một sản phẩm dựa trên mã slug (ví dụ: 'rau-ma-1762274494')");
                    Map<String, Object> detailSchema = new HashMap<>();
                    detailSchema.put("type", "object");
                    Map<String, Object> detailProps = new HashMap<>();
                    detailProps.put("slug", createStringProp("Slug định danh của sản phẩm cần xem chi tiết"));
                    detailSchema.put("properties", detailProps);
                    detailSchema.put("required", List.of("slug"));
                    detailTool.put("inputSchema", detailSchema);
                    toolsList.add(detailTool);

                    // Tool 3: listCategories
                    Map<String, Object> categoriesTool = new HashMap<>();
                    categoriesTool.put("name", "listCategories");
                    categoriesTool.put("description", "Lấy danh sách tất cả các danh mục nông sản đang kinh doanh");
                    Map<String, Object> categoriesSchema = new HashMap<>();
                    categoriesSchema.put("type", "object");
                    categoriesSchema.put("properties", Map.of());
                    categoriesTool.put("inputSchema", categoriesSchema);
                    toolsList.add(categoriesTool);

                    // Tool 4: listActiveCoupons
                    Map<String, Object> couponsTool = new HashMap<>();
                    couponsTool.put("name", "listActiveCoupons");
                    couponsTool.put("description", "Lấy danh sách các mã giảm giá (coupons) đang hoạt động và điều kiện áp dụng");
                    Map<String, Object> couponsSchema = new HashMap<>();
                    couponsSchema.put("type", "object");
                    couponsSchema.put("properties", Map.of());
                    couponsTool.put("inputSchema", couponsSchema);
                    toolsList.add(couponsTool);

                    resultList.put("tools", toolsList);
                    response.put("result", resultList);
                    break;

                case "tools/call":
                    String toolName = (String) params.getOrDefault("name", "");
                    Map<String, Object> arguments = (Map<String, Object>) params.getOrDefault("arguments", Map.of());

                    Map<String, Object> resultCall = new HashMap<>();
                    List<Map<String, Object>> contentList = new ArrayList<>();
                    Map<String, Object> contentObj = new HashMap<>();
                    contentObj.put("type", "text");

                    String callResultText = executeTool(toolName, arguments);
                    contentObj.put("text", callResultText);
                    contentList.add(contentObj);

                    resultCall.put("content", contentList);
                    response.put("result", resultCall);
                    break;

                default:
                    log.warn("[MCP Server] Yêu cầu phương thức chưa được hỗ trợ: {}", method);
                    Map<String, Object> errorNode = new HashMap<>();
                    errorNode.put("code", -32601);
                    errorNode.put("message", "Method not found: " + method);
                    response.put("error", errorNode);
                    break;
            }
        } catch (Exception ex) {
            log.error("[MCP Server] Gặp lỗi khi xử lý JSON-RPC", ex);
            Map<String, Object> errorNode = new HashMap<>();
            errorNode.put("code", -32603);
            errorNode.put("message", "Internal error: " + ex.getMessage());
            response.put("error", errorNode);
        }

        return ResponseEntity.ok(response);
    }

    private Map<String, Object> createStringProp(String description) {
        Map<String, Object> map = new HashMap<>();
        map.put("type", "string");
        map.put("description", description);
        return map;
    }

    private Map<String, Object> createNumberProp(String description) {
        Map<String, Object> map = new HashMap<>();
        map.put("type", "number");
        map.put("description", description);
        return map;
    }

    private String executeTool(String toolName, Map<String, Object> args) throws Exception {
        switch (toolName) {
            case "searchProducts":
                String keyword = (String) args.get("keyword");
                String categorySlug = (String) args.get("categorySlug");
                Number maxPriceNum = (Number) args.get("maxPrice");
                Double maxPrice = maxPriceNum != null ? maxPriceNum.doubleValue() : null;
                List<Map<String, Object>> products = aiChatTools.searchProducts(keyword, categorySlug, maxPrice);
                return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(products);

            case "getProductDetail":
                String slug = (String) args.getOrDefault("slug", "");
                Map<String, Object> product = aiChatTools.getProductDetail(slug);
                if (product == null) {
                    return "Không tìm thấy sản phẩm có slug: " + slug;
                }
                return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(product);

            case "listCategories":
                List<Map<String, Object>> categories = aiChatTools.listCategories();
                return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(categories);

            case "listActiveCoupons":
                List<Map<String, Object>> coupons = aiChatTools.listActiveCoupons();
                return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(coupons);

            default:
                return "Không tìm thấy tool: " + toolName;
        }
    }
}
