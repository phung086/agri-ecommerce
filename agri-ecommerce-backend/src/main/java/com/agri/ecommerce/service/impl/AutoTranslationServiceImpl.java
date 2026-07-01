package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.config.AiChatProperties;
import com.agri.ecommerce.service.AutoTranslationService;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.chat.response.ChatResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Comparator;
import java.util.regex.Pattern;

@Slf4j
@Service
public class AutoTranslationServiceImpl implements AutoTranslationService {

    private static final Pattern DIACRITICS_PATTERN = Pattern.compile("\\p{M}+");
    private static final Pattern VIETNAMESE_CHARACTER_PATTERN =
            Pattern.compile("[\\u00C0-\\u024F\\u1E00-\\u1EFF]");
    private static final Pattern TRANSLATED_LINE_PATTERN = Pattern.compile("^([A-Z_]+)\\s*[:=]\\s*(.+)$");

    private static final String SYSTEM_PROMPT = """
            You translate AgriMarket agricultural e-commerce data from Vietnamese to English.
            Return concise, natural English only.
            Preserve numbers, product codes, brand names, and technical terms.
            Do not add explanations, markdown, quotes, or extra fields.
            """;

    private static final Map<String, String> FALLBACK_SEGMENTS = Map.ofEntries(
            Map.entry("ca ngu lam sach", "cleaned tuna"),
            Map.entry("ca mo lam sach", "cleaned fish"),
            Map.entry("ca dieu hong", "red tilapia"),
            Map.entry("ca basa cat khuc", "basa fish steaks"),
            Map.entry("ca chim", "pomfret"),
            Map.entry("ca chua bi vietgap", "VietGAP cherry tomatoes"),
            Map.entry("ca rot baby", "baby carrots"),
            Map.entry("rau huu co da lat", "Da Lat organic greens"),
            Map.entry("rau muong", "water spinach"),
            Map.entry("rau mong toi", "malabar spinach"),
            Map.entry("rau khoai lang", "sweet potato greens"),
            Map.entry("rau tia to", "perilla leaves"),
            Map.entry("hanh la", "spring onions"),
            Map.entry("cai ngot", "choy sum"),
            Map.entry("mam gia do", "bean sprouts"),
            Map.entry("buoi da xanh", "green-skin pomelo"),
            Map.entry("chuoi", "banana"),
            Map.entry("dua hau", "watermelon"),
            Map.entry("dua xiem", "siamese coconut"),
            Map.entry("mit thai", "Thai jackfruit"),
            Map.entry("xoai cat hoa loc", "Hoa Loc mango"),
            Map.entry("gao st25 tui vai", "ST25 rice cloth bag"),
            Map.entry("combo bua xanh", "green meal combo"),
            Map.entry("hat dieu rang moc", "plain roasted cashews"),
            Map.entry("trai cay", "fruit"),
            Map.entry("rau cu", "vegetables"),
            Map.entry("thuc pham khac", "other foods"),
            Map.entry("thit", "meat"),
            Map.entry("gao", "rice"),
            Map.entry("hat", "nuts"),
            Map.entry("ca", "fish"),
            Map.entry("rau", "vegetables"),
            Map.entry("ngon", "fresh"),
            Map.entry("sach", "clean"),
            Map.entry("gia ngon re", "good value"),
            Map.entry("dam bao chat luong", "quality assured"),
            Map.entry("tuoi ngon", "fresh"),
            Map.entry("tuoi song", "fresh"),
            Map.entry("bo sung", "supplemental"),
            Map.entry("nong san", "produce")
    );

    private static final Map<String, String> UNIT_FALLBACKS = Map.ofEntries(
            Map.entry("kg", "kg"),
            Map.entry("g", "g"),
            Map.entry("500g", "500g"),
            Map.entry("250g", "250g"),
            Map.entry("1kg", "1kg"),
            Map.entry("5kg", "5kg"),
            Map.entry("tui", "bag"),
            Map.entry("hop", "box"),
            Map.entry("qua", "piece"),
            Map.entry("bo", "bundle"),
            Map.entry("bo rau", "bundle"),
            Map.entry("bunch", "bunch"),
            Map.entry("mon", "items"),
            Map.entry("san pham", "item")
    );

    private final ChatLanguageModel chatLanguageModel;
    private final AiChatProperties aiChatProperties;

    public AutoTranslationServiceImpl(
            @Qualifier("aiChatLanguageModel") Optional<ChatLanguageModel> chatLanguageModel,
            AiChatProperties aiChatProperties
    ) {
        this.chatLanguageModel = chatLanguageModel.orElse(null);
        this.aiChatProperties = aiChatProperties;
    }

    @Override
    public ProductTranslation translateProduct(
            String name,
            String description,
            String unit,
            String nameEn,
            String descriptionEn,
            String unitEn
    ) {
        Map<String, String> sources = new LinkedHashMap<>();
        putMissing(sources, "NAME", name, nameEn);
        putMissing(sources, "DESCRIPTION", description, descriptionEn);
        putMissing(sources, "UNIT", unit, unitEn);

        Map<String, String> translated = translateFields(sources);

        return new ProductTranslation(
                firstText(nameEn, translated.get("NAME"), fallbackText(name)),
                firstText(descriptionEn, translated.get("DESCRIPTION"), fallbackText(description)),
                firstText(unitEn, translated.get("UNIT"), fallbackUnit(unit))
        );
    }

    @Override
    public CategoryTranslation translateCategory(
            String name,
            String description,
            String nameEn,
            String descriptionEn
    ) {
        Map<String, String> sources = new LinkedHashMap<>();
        putMissing(sources, "NAME", name, nameEn);
        putMissing(sources, "DESCRIPTION", description, descriptionEn);

        Map<String, String> translated = translateFields(sources);

        return new CategoryTranslation(
                firstText(nameEn, translated.get("NAME"), fallbackText(name)),
                firstText(descriptionEn, translated.get("DESCRIPTION"), fallbackText(description))
        );
    }

    private Map<String, String> translateFields(Map<String, String> sources) {
        if (sources.isEmpty()) {
            return Map.of();
        }

        if (!aiChatProperties.isAutoTranslateOnSave() || !aiChatProperties.isFullyReady() || chatLanguageModel == null) {
            return fallbackFields(sources);
        }

        try {
            List<ChatMessage> messages = List.of(
                    SystemMessage.from(SYSTEM_PROMPT),
                    UserMessage.from(buildPrompt(sources))
            );
            ChatResponse response = chatLanguageModel.chat(messages);
            if (response == null || response.aiMessage() == null || response.aiMessage().text() == null) {
                return fallbackFields(sources);
            }

            Map<String, String> parsed = parseResponse(response.aiMessage().text());
            if (parsed.isEmpty()) {
                return fallbackFields(sources);
            }

            return mergeWithFallbacks(sources, parsed);
        } catch (Exception exception) {
            log.warn("[Auto Translation] AI translation failed: {} - {}", exception.getClass().getSimpleName(), exception.getMessage());
            return fallbackFields(sources);
        }
    }

    private String buildPrompt(Map<String, String> sources) {
        StringBuilder builder = new StringBuilder("""
                Translate these fields from Vietnamese to English.
                Return exactly one line per field in this format:
                FIELD=translation

                Fields:
                """);

        sources.forEach((key, value) -> builder
                .append(key)
                .append('=')
                .append(value.replace("\n", " ").trim())
                .append('\n'));

        return builder.toString();
    }

    private Map<String, String> parseResponse(String response) {
        Map<String, String> result = new LinkedHashMap<>();
        for (String line : response.split("\\R")) {
            java.util.regex.Matcher matcher = TRANSLATED_LINE_PATTERN.matcher(line.trim());
            if (matcher.matches()) {
                result.put(matcher.group(1).trim().toUpperCase(Locale.ROOT), cleanBlank(matcher.group(2)));
            }
        }
        return result;
    }

    private Map<String, String> mergeWithFallbacks(Map<String, String> sources, Map<String, String> translated) {
        Map<String, String> result = new LinkedHashMap<>();
        sources.forEach((key, value) -> {
            String candidate = cleanBlank(translated.get(key));
            if (candidate == null || containsVietnamese(candidate)) {
                candidate = "UNIT".equals(key) ? fallbackUnit(value) : fallbackText(value);
            }
            result.put(key, candidate);
        });
        return result;
    }

    private Map<String, String> fallbackFields(Map<String, String> sources) {
        Map<String, String> result = new LinkedHashMap<>();
        sources.forEach((key, value) ->
                result.put(key, "UNIT".equals(key) ? fallbackUnit(value) : fallbackText(value))
        );
        return result;
    }

    private void putMissing(Map<String, String> target, String key, String source, String existingEnglish) {
        if (cleanBlank(source) != null && cleanBlank(existingEnglish) == null) {
            target.put(key, source.trim());
        }
    }

    private String firstText(String... values) {
        for (String value : values) {
            String cleaned = cleanBlank(value);
            if (cleaned != null) {
                return cleaned;
            }
        }
        return null;
    }

    private String fallbackText(String value) {
        String cleaned = cleanBlank(value);
        if (cleaned == null) {
            return null;
        }

        if (!containsVietnamese(cleaned)) {
            return cleaned;
        }

        String normalized = stripVietnameseAccents(cleaned).toLowerCase(Locale.ROOT);
        String translated = normalized;
        for (Map.Entry<String, String> entry : FALLBACK_SEGMENTS.entrySet()
                .stream()
                .sorted(Comparator.comparingInt((Map.Entry<String, String> entry) -> entry.getKey().length()).reversed())
                .toList()) {
            translated = translated.replace(entry.getKey(), entry.getValue());
        }

        translated = translated
                .replaceAll("\\s+", " ")
                .replaceAll("\\s+([.,;:!?])", "$1")
                .trim();

        if (translated.isBlank() || looksVietnameseAscii(translated)) {
            return cleaned.length() > 80 ? "Localized content" : "Localized item";
        }

        return sentenceCase(translated);
    }

    private String fallbackUnit(String value) {
        String cleaned = cleanBlank(value);
        if (cleaned == null) {
            return null;
        }

        String normalized = stripVietnameseAccents(cleaned).toLowerCase(Locale.ROOT);
        return UNIT_FALLBACKS.getOrDefault(normalized, fallbackText(cleaned));
    }

    private boolean containsVietnamese(String value) {
        return value != null && VIETNAMESE_CHARACTER_PATTERN.matcher(value).find();
    }

    private boolean looksVietnameseAscii(String value) {
        if (value == null) {
            return false;
        }
        String lower = value.toLowerCase(Locale.ROOT);
        return lower.matches(".*\\b(cua|cho|chua|co|gia|giao|hang|khach|ngon|nong|rau|san|sach|thuc|tuoi)\\b.*");
    }

    private String stripVietnameseAccents(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD);
        return DIACRITICS_PATTERN.matcher(normalized)
                .replaceAll("")
                .replace('đ', 'd')
                .replace('Đ', 'D');
    }

    private String sentenceCase(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        return value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1);
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }
        return value.trim();
    }
}
