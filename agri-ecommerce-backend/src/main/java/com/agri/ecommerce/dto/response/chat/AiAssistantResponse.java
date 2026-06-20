package com.agri.ecommerce.dto.response.chat;

import com.agri.ecommerce.dto.response.product.ProductResponse;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class AiAssistantResponse {

    private String guestToken;

    private String intent;

    private String answer;

    private List<ProductResponse> recommendedProducts;

    private ChatMessageResponse userMessage;

    private ChatMessageResponse assistantMessage;

    private List<String> nextActions;
}
