package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.user.UpdateUserStatusRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.customer.AdminCustomerDetailResponse;
import com.agri.ecommerce.dto.response.customer.AdminCustomerSummaryResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.dto.response.user.UserResponse;

public interface AdminCustomerService {

    PageResponse<AdminCustomerSummaryResponse> getCustomers(
            String keyword,
            String status,
            int page,
            int size,
            String sort
    );

    AdminCustomerDetailResponse getCustomer(Long customerId);

    PageResponse<OrderResponse> getCustomerOrders(
            Long customerId,
            String status,
            int page,
            int size,
            String sort
    );

    UserResponse updateCustomerStatus(Long customerId, UpdateUserStatusRequest request);
}
