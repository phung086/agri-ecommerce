package com.agri.ecommerce.dto.response.chat;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class ChatConversationResponse {

    private String conversationKey;

    private Long userId;

    private String userName;

    private String userEmail;

    private String guestToken;

    private String lastSender;

    private String lastMessage;

    private LocalDateTime lastMessageAt;

    private Long totalMessages;
}
