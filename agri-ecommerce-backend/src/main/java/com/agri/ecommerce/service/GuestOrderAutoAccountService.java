package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.response.order.OrderResponse;

public interface GuestOrderAutoAccountService {

    OrderResponse createOrLoginDefaultCustomer(Long orderId, String phoneNumber);
}
