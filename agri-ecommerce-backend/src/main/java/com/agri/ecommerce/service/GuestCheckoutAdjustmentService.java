package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.order.CheckoutRequest;
import com.agri.ecommerce.dto.response.order.CheckoutPreviewResponse;

public interface GuestCheckoutAdjustmentService {

    CheckoutPreviewResponse applyPreviewAdjustments(CheckoutPreviewResponse preview, CheckoutRequest request);

    void applyOrderAdjustments(Long orderId, CheckoutRequest request);
}
