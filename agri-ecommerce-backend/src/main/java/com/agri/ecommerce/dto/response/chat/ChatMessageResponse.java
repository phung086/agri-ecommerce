package com.agri.ecommerce.dto.response.chat;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class ChatMessageResponse {

    private Long id;

    private Long userId;

    private String userName;

    private String userEmail;

    private String guestToken;

    private String sender;

    private String message;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
