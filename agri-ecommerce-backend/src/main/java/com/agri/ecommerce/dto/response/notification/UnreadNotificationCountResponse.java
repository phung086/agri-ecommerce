package com.agri.ecommerce.dto.response.notification;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class UnreadNotificationCountResponse {

    private long unreadCount;
}
