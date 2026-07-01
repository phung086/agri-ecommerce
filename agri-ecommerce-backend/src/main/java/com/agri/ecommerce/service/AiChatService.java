package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.chat.AiChatRequest;
import com.agri.ecommerce.dto.response.chat.AiChatResponse;
import com.agri.ecommerce.security.UserPrincipal;

/**
 * Service xử lý AI Chatbot đa vai trò.
 * Endpoint public giữ nguyên: POST /api/public/ai-chat/messages
 */
public interface AiChatService {

    AiChatResponse chat(AiChatRequest request, UserPrincipal principal);
}
