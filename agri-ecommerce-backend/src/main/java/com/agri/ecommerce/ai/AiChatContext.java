package com.agri.ecommerce.ai;

import com.agri.ecommerce.dto.response.chat.SuggestedProductResponse;

import java.util.List;

public record AiChatContext(
        String businessContext,
        List<SuggestedProductResponse> suggestedProducts
) {
}
