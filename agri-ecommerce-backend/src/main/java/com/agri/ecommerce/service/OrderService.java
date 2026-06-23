package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.order.CheckoutRequest;
import com.agri.ecommerce.dto.request.order.OrderStatusNoteRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.order.CheckoutPreviewResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;

public interface OrderService {

    PageResponse<OrderResponse> getOrders(Long userId, int page, int size, String sort);

    OrderResponse getOrder(Long userId, Long orderId);

    CheckoutPreviewResponse previewCheckout(Long userId, CheckoutRequest request);

    OrderResponse checkout(Long userId, CheckoutRequest request);

    OrderResponse cancelOrder(Long userId, Long orderId, OrderStatusNoteRequest request);

    OrderResponse completeOrder(Long userId, Long orderId, OrderStatusNoteRequest request);
}
