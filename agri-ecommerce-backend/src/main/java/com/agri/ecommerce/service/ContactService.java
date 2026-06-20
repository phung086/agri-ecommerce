package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.contact.ContactCreateRequest;
import com.agri.ecommerce.dto.request.contact.ContactRepliedUpdateRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.contact.ContactResponse;

public interface ContactService {

    ContactResponse createContact(ContactCreateRequest request);

    PageResponse<ContactResponse> getContacts(Boolean replied, String keyword, int page, int size, String sort);

    ContactResponse getContact(Long contactId);

    ContactResponse updateReplied(Long contactId, ContactRepliedUpdateRequest request);

    void deleteContact(Long contactId);
}
