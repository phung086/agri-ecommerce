package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.chat.AiChatRequest;
import com.agri.ecommerce.dto.response.chat.AiChatResponse;

/**
 * Service xử lý AI Chatbot tư vấn nông sản.
 * Endpoint: POST /api/public/ai-chat/messages
 */
public interface AiChatService {

    /**
     * Xử lý tin nhắn từ khách vãng lai hoặc user đã đăng nhập.
     *
     * @param request   request chứa message và guestToken
     * @param userId    ID user nếu đã đăng nhập (null nếu khách vãng lai)
     * @return AiChatResponse chứa câu trả lời và sản phẩm gợi ý
     */
    AiChatResponse chat(AiChatRequest request, Long userId);
}
