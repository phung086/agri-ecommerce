package com.agri.ecommerce.mapper;

import com.agri.ecommerce.dto.response.chat.ChatMessageResponse;
import com.agri.ecommerce.entity.ChatMessageEntity;
import com.agri.ecommerce.entity.UserEntity;
import org.springframework.stereotype.Component;

@Component
public class ChatMessageMapper {

    public ChatMessageResponse toChatMessageResponse(ChatMessageEntity chatMessage) {
        if (chatMessage == null) {
            return null;
        }

        UserEntity user = chatMessage.getUser();

        return ChatMessageResponse.builder()
                .id(chatMessage.getId())
                .userId(user == null ? null : user.getId())
                .userName(user == null ? null : user.getName())
                .userEmail(user == null ? null : user.getEmail())
                .guestToken(chatMessage.getGuestToken())
                .sender(chatMessage.getSender())
                .message(chatMessage.getMessage())
                .createdAt(chatMessage.getCreatedAt())
                .updatedAt(chatMessage.getUpdatedAt())
                .build();
    }
}
