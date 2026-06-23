package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.order.OrderStatusNoteRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;

public interface DeliveryOrderService {

    PageResponse<OrderResponse> getAssignedOrders(Long deliveryStaffId, String status, int page, int size, String sort);

    PageResponse<OrderResponse> getDeliveryHistory(Long deliveryStaffId, int page, int size, String sort);

    OrderResponse getAssignedOrder(Long deliveryStaffId, Long orderId);

    OrderResponse markOutForDelivery(Long deliveryStaffId, Long orderId, OrderStatusNoteRequest request);

    OrderResponse markDelivered(Long deliveryStaffId, Long orderId, OrderStatusNoteRequest request);
}
