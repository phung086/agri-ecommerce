package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.webhook.GhnOrderStatusWebhookRequest;
import com.agri.ecommerce.dto.response.webhook.GhnWebhookResponse;

public interface GhnWebhookService {

    GhnWebhookResponse handleOrderStatus(GhnOrderStatusWebhookRequest request);
}
