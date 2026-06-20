package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.order.AdminOrderStatusUpdateRequest;
import com.agri.ecommerce.dto.request.order.AssignDeliveryStaffRequest;
import com.agri.ecommerce.dto.request.order.OrderStatusNoteRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.dto.response.user.UserResponse;

import java.util.List;

public interface AdminOrderService {

    PageResponse<OrderResponse> getOrders(
            String status,
            Long customerId,
            Long deliveryStaffId,
            int page,
            int size,
            String sort
    );

    OrderResponse getOrder(Long orderId);

    OrderResponse confirmOrder(Long orderId, OrderStatusNoteRequest request);

    OrderResponse assignDeliveryStaff(Long orderId, AssignDeliveryStaffRequest request);

    OrderResponse updateOrderStatus(Long orderId, AdminOrderStatusUpdateRequest request);

    List<UserResponse> getActiveDeliveryStaff();
}
