package com.agri.ecommerce.dto.response.contact;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class ContactResponse {

    private Long id;

    private String fullName;

    private String phoneNumber;

    private String email;

    private String message;

    private Boolean replied;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
