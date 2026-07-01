package com.agri.ecommerce.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties cho AI Chatbot module.
 * Đọc từ application.yml prefix "app.ai" và environment variables.
 *
 * Env vars tương ứng:
 *   AI_CHATBOT_ENABLED   - bật/tắt tính năng chatbot (default: false)
 *   AI_PROVIDER          - "gemini" hoặc "openai" (default: gemini)
 *   AI_MODEL             - tên model (default: gemini-1.5-flash)
 *   GEMINI_API_KEY       - API key cho Google Gemini (không hard-code)
 *   OPENAI_API_KEY       - API key cho OpenAI (không hard-code)
 *   AI_MAX_PRODUCTS_CONTEXT - số sản phẩm tối đa đưa vào prompt (default: 10)
 *   AI_TIMEOUT_SECONDS   - timeout gọi LLM tính bằng giây (default: 20)
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.ai")
public class AiChatProperties {

    /** Bật/tắt tính năng AI chatbot. Default false để an toàn khi deploy. */
    private boolean enabled = false;

    /** Provider: "gemini" hoặc "openai". */
    private String provider = "gemini";

    /** Tên model LLM. Ví dụ: gemini-1.5-flash, gpt-4o-mini. */
    private String model = "gemini-1.5-flash";

    /** API key cho Google Gemini (lấy từ env, không lưu code). */
    private String geminiApiKey = "";

    /** API key cho OpenAI (lấy từ env, không lưu code). */
    private String openaiApiKey = "";

    /** Số sản phẩm tối đa đưa vào context prompt. */
    private int maxProductsContext = 10;

    /** Timeout gọi LLM tính bằng giây. */
    private int timeoutSeconds = 20;

    /** Bật/tắt tính năng tự động dịch song ngữ Việt-Anh khi lưu dữ liệu. */
    private boolean autoTranslateOnSave = true;

    /** Kiểm tra xem provider Gemini có đủ cấu hình không. */
    public boolean isGeminiReady() {
        return "gemini".equalsIgnoreCase(provider)
                && geminiApiKey != null
                && !geminiApiKey.isBlank();
    }

    /** Kiểm tra xem provider OpenAI có đủ cấu hình không. */
    public boolean isOpenAiReady() {
        return "openai".equalsIgnoreCase(provider)
                && openaiApiKey != null
                && !openaiApiKey.isBlank();
    }

    /** Kiểm tra toàn bộ điều kiện để chatbot hoạt động. */
    public boolean isFullyReady() {
        return enabled && (isGeminiReady() || isOpenAiReady());
    }
}
