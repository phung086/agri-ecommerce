package com.agri.ecommerce.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.ai")
public class AiChatProperties {

    private boolean enabled = false;

    private String provider = "gemini";

    private String model = "gemini-2.5-flash";

    private String geminiApiKey = "";

    private String openaiApiKey = "";

    private boolean autoTranslateOnSave = true;

    private int maxProductsContext = 10;

    private int maxOrderContextRows = 5;

    private int maxAdminContextRows = 5;

    private int maxDeliveryContextRows = 7;

    private int timeoutSeconds = 20;

    public boolean isGeminiReady() {
        return "gemini".equalsIgnoreCase(provider)
                && geminiApiKey != null
                && !geminiApiKey.isBlank();
    }

    public boolean isOpenAiReady() {
        return "openai".equalsIgnoreCase(provider)
                && openaiApiKey != null
                && !openaiApiKey.isBlank();
    }

    public boolean isFullyReady() {
        return enabled && (isGeminiReady() || isOpenAiReady());
    }
}
