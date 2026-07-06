package com.agri.ecommerce.dto.response.webhook;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GhnWebhookResponse {

    private boolean processed;

    private boolean ignored;

    private Long orderId;

    private String orderCode;

    private String ghnStatus;

    private String internalStatus;

    private String message;
}
