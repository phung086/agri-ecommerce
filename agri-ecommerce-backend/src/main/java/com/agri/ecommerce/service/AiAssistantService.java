package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.chat.AiAssistantRequest;
import com.agri.ecommerce.dto.response.chat.AiAssistantResponse;

public interface AiAssistantService {

    AiAssistantResponse askGuest(AiAssistantRequest request);

    AiAssistantResponse askCustomer(Long userId, AiAssistantRequest request);
}
