package com.agri.ecommerce.dto.response.order;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class ShippingAddressResponse {

    private Long id;

    private String fullName;

    private String phone;

    private String address;

    private String city;

    private Boolean defaultAddress;
}
