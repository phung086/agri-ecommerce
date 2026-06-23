package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.chat.AdminChatReplyRequest;
import com.agri.ecommerce.dto.request.chat.ChatMessageRequest;
import com.agri.ecommerce.dto.request.chat.GuestChatMessageRequest;
import com.agri.ecommerce.dto.response.chat.ChatConversationResponse;
import com.agri.ecommerce.dto.response.chat.ChatMessageResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;

public interface ChatService {

    ChatMessageResponse sendGuestMessage(GuestChatMessageRequest request);

    PageResponse<ChatMessageResponse> getGuestMessages(String guestToken, int page, int size, String sort);

    ChatMessageResponse sendCustomerMessage(Long userId, ChatMessageRequest request);

    PageResponse<ChatMessageResponse> getCustomerMessages(Long userId, int page, int size, String sort);

    PageResponse<ChatConversationResponse> getAdminConversations(String keyword, String lastSender, int page, int size);

    PageResponse<ChatMessageResponse> getAdminMessages(Long userId, String guestToken, int page, int size, String sort);

    ChatMessageResponse replyAsAdmin(AdminChatReplyRequest request);
}
