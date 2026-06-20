package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.notification.NotificationResponse;
import com.agri.ecommerce.dto.response.notification.UnreadNotificationCountResponse;

public interface NotificationService {

    PageResponse<NotificationResponse> getMyNotifications(
            Long userId,
            String type,
            Boolean read,
            int page,
            int size,
            String sort
    );

    UnreadNotificationCountResponse getUnreadCount(Long userId);

    NotificationResponse markAsRead(Long userId, Long notificationId);

    UnreadNotificationCountResponse markAllAsRead(Long userId);

    void deleteNotification(Long userId, Long notificationId);

    void clearNotifications(Long userId);

    NotificationResponse createNotification(Long userId, String type, String message, String link);
}
