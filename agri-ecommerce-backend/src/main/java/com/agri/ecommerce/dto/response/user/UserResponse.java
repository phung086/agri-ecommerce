package com.agri.ecommerce.dto.response.user;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class UserResponse {

    private Long id;

    private String name;

    private String email;

    private String status;

    private String phoneNumber;

    private String avatar;

    private String address;

    private Long roleId;

    private String roleName;
}