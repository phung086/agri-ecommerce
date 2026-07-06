package com.agri.ecommerce.service;

import com.agri.ecommerce.entity.OrderEntity;
import java.math.BigDecimal;

public interface ShippingCarrierService {
    BigDecimal calculateShippingFee(String province, String district, String ward, double weightInGrams);
    String createShippingLabel(OrderEntity order);
}
