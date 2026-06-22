package com.agri.ecommerce.mapper;

import com.agri.ecommerce.dto.response.contact.ContactResponse;
import com.agri.ecommerce.entity.ContactEntity;
import org.springframework.stereotype.Component;

@Component
public class ContactMapper {

    public ContactResponse toContactResponse(ContactEntity contact) {
        return ContactResponse.builder()
                .id(contact.getId())
                .fullName(contact.getFullName())
                .phoneNumber(contact.getPhoneNumber())
                .email(contact.getEmail())
                .message(contact.getMessage())
                .replied(contact.getReplied())
                .createdAt(contact.getCreatedAt())
                .updatedAt(contact.getUpdatedAt())
                .build();
    }
}
