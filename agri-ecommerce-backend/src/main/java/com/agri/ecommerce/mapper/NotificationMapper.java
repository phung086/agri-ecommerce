package com.agri.ecommerce.mapper;

import com.agri.ecommerce.dto.response.notification.NotificationResponse;
import com.agri.ecommerce.entity.NotificationEntity;
import com.agri.ecommerce.entity.UserEntity;
import org.springframework.stereotype.Component;

@Component
public class NotificationMapper {

    public NotificationResponse toNotificationResponse(NotificationEntity notification) {
        UserEntity user = notification.getUser();

        return NotificationResponse.builder()
                .id(notification.getId())
                .userId(user == null ? null : user.getId())
                .type(notification.getType())
                .message(notification.getMessage())
                .link(notification.getLink())
                .read(Boolean.TRUE.equals(notification.getRead()))
                .createdAt(notification.getCreatedAt())
                .updatedAt(notification.getUpdatedAt())
                .build();
    }
}
