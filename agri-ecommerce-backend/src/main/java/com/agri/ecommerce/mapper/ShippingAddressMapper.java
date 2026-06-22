package com.agri.ecommerce.mapper;

import com.agri.ecommerce.dto.response.order.ShippingAddressResponse;
import com.agri.ecommerce.entity.ShippingAddressEntity;
import org.springframework.stereotype.Component;

@Component
public class ShippingAddressMapper {

    public ShippingAddressResponse toShippingAddressResponse(ShippingAddressEntity shippingAddress) {
        if (shippingAddress == null) {
            return null;
        }

        return ShippingAddressResponse.builder()
                .id(shippingAddress.getId())
                .fullName(shippingAddress.getFullName())
                .phone(shippingAddress.getPhone())
                .address(shippingAddress.getAddress())
                .city(shippingAddress.getCity())
                .defaultAddress(Boolean.TRUE.equals(shippingAddress.getDefaultAddress()))
                .build();
    }
}
