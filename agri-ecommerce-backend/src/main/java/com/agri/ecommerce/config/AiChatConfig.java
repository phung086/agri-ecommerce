package com.agri.ecommerce.config;

import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.type.AnnotatedTypeMetadata;

import java.time.Duration;

/**
 * Configuration cho AI ChatLanguageModel.
 * Tạo bean ChatLanguageModel dựa theo provider được cấu hình.
 *
 * Nếu AI_CHATBOT_ENABLED=false hoặc thiếu API key,
 * bean sẽ là null và AiChatServiceImpl sẽ dùng fallback response.
 * Backend KHÔNG crash khi thiếu cấu hình AI.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class AiChatConfig {

    private final AiChatProperties aiChatProperties;

    /**
     * Tạo ChatLanguageModel bean dựa theo provider.
     * Trả về null nếu AI chưa được bật hoặc thiếu API key.
     * Service layer sẽ kiểm tra null và dùng fallback.
     */
    @Bean(name = "aiChatLanguageModel")
    @Conditional(AiChatReadyCondition.class)
    public ChatLanguageModel aiChatLanguageModel() {
        String provider = aiChatProperties.getProvider();

        if ("gemini".equalsIgnoreCase(provider)) {
            return buildGeminiModel();
        } else if ("openai".equalsIgnoreCase(provider)) {
            return buildOpenAiModel();
        } else {
            throw new IllegalStateException("Unsupported AI provider: " + provider);
        }
    }

    private ChatLanguageModel buildGeminiModel() {
        if (!aiChatProperties.isGeminiReady()) {
            log.warn("[AI Chatbot] GEMINI_API_KEY chưa cấu hình — chatbot dùng fallback response");
            return null;
        }

        try {
            log.info("[AI Chatbot] Khởi tạo Gemini model: {}", aiChatProperties.getModel());
            return GoogleAiGeminiChatModel.builder()
                    .apiKey(aiChatProperties.getGeminiApiKey())
                    .modelName(aiChatProperties.getModel())
                    .timeout(Duration.ofSeconds(aiChatProperties.getTimeoutSeconds()))
                    .build();
        } catch (Exception ex) {
            // Log error nhưng không log API key
            log.error("[AI Chatbot] Lỗi khởi tạo Gemini model: {} — dùng fallback", ex.getMessage());
            throw ex;
        }
    }

    private ChatLanguageModel buildOpenAiModel() {
        if (!aiChatProperties.isOpenAiReady()) {
            log.warn("[AI Chatbot] OPENAI_API_KEY chưa cấu hình — chatbot dùng fallback response");
            return null;
        }

        try {
            log.info("[AI Chatbot] Khởi tạo OpenAI model: {}", aiChatProperties.getModel());
            return OpenAiChatModel.builder()
                    .apiKey(aiChatProperties.getOpenaiApiKey())
                    .modelName(aiChatProperties.getModel())
                    .timeout(Duration.ofSeconds(aiChatProperties.getTimeoutSeconds()))
                    .build();
        } catch (Exception ex) {
            // Log error nhưng không log API key
            log.error("[AI Chatbot] Lỗi khởi tạo OpenAI model: {} — dùng fallback", ex.getMessage());
            throw ex;
        }
    }

    static class AiChatReadyCondition implements Condition {

        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            boolean enabled = context.getEnvironment().getProperty("app.ai.enabled", Boolean.class, false);
            if (!enabled) {
                return false;
            }

            String provider = context.getEnvironment().getProperty("app.ai.provider", "gemini");
            if ("gemini".equalsIgnoreCase(provider)) {
                return hasText(context.getEnvironment().getProperty("app.ai.gemini-api-key", ""));
            }
            if ("openai".equalsIgnoreCase(provider)) {
                return hasText(context.getEnvironment().getProperty("app.ai.openai-api-key", ""));
            }

            return false;
        }

        private boolean hasText(String value) {
            return value != null && !value.isBlank();
        }
    }
}
