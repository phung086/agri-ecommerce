package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.order.ShippingAddressRequest;
import com.agri.ecommerce.dto.response.order.ShippingAddressResponse;

import java.util.List;

public interface ShippingAddressService {

    List<ShippingAddressResponse> getShippingAddresses(Long userId);

    ShippingAddressResponse createShippingAddress(Long userId, ShippingAddressRequest request);

    ShippingAddressResponse updateShippingAddress(Long userId, Long addressId, ShippingAddressRequest request);

    ShippingAddressResponse setDefaultShippingAddress(Long userId, Long addressId);

    void deleteShippingAddress(Long userId, Long addressId);
}
