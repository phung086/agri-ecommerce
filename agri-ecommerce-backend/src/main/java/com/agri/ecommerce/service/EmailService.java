package com.agri.ecommerce.service;

import com.agri.ecommerce.entity.OrderEntity;

public interface EmailService {
    void sendOrderInvoice(OrderEntity order);
}
