package com.agri.ecommerce.dto.response.notification;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class NotificationResponse {

    private Long id;

    private Long userId;

    private String type;

    private String message;

    private String link;

    private Boolean read;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
