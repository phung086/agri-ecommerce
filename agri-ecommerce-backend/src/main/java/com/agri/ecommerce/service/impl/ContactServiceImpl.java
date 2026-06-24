package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.contact.ContactCreateRequest;
import com.agri.ecommerce.dto.request.contact.ContactRepliedUpdateRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.contact.ContactResponse;
import com.agri.ecommerce.entity.ContactEntity;
import com.agri.ecommerce.entity.UserStatus;
import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.ContactMapper;
import com.agri.ecommerce.repository.ContactRepository;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.service.ContactService;
import com.agri.ecommerce.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ContactServiceImpl implements ContactService {

    private static final String ROLE_ADMIN = "admin";
    private static final String NOTIFICATION_TYPE_CONTACT = "contact";
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "fullName", "phoneNumber", "email", "replied", "createdAt", "updatedAt"
    );

    private final ContactRepository contactRepository;

    private final UserRepository userRepository;

    private final NotificationService notificationService;

    private final ContactMapper contactMapper;

    @Override
    @Transactional
    public ContactResponse createContact(ContactCreateRequest request) {
        ContactEntity contact = ContactEntity.builder()
                .fullName(cleanBlank(request.getFullName()))
                .phoneNumber(cleanBlank(request.getPhoneNumber()))
                .email(cleanBlank(request.getEmail()))
                .message(cleanBlank(request.getMessage()))
                .replied(false)
                .build();

        ContactEntity savedContact = contactRepository.save(contact);
        notifyAdmins(savedContact);

        return contactMapper.toContactResponse(savedContact);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ContactResponse> getContacts(Boolean replied, String keyword, int page, int size, String sort) {
        validatePaging(page, size);

        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<ContactEntity> contactPage = contactRepository.findAll(
                Specification.where(hasReplied(replied)).and(hasKeyword(cleanBlank(keyword))),
                pageable
        );

        return PageResponse.<ContactResponse>builder()
                .content(contactPage.getContent().stream().map(contactMapper::toContactResponse).toList())
                .page(contactPage.getNumber())
                .size(contactPage.getSize())
                .totalElements(contactPage.getTotalElements())
                .totalPages(contactPage.getTotalPages())
                .last(contactPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ContactResponse getContact(Long contactId) {
        return contactMapper.toContactResponse(findContactById(contactId));
    }

    @Override
    @Transactional
    public ContactResponse updateReplied(Long contactId, ContactRepliedUpdateRequest request) {
        ContactEntity contact = findContactById(contactId);
        contact.setReplied(request.getReplied());

        return contactMapper.toContactResponse(contactRepository.save(contact));
    }

    @Override
    @Transactional
    public void deleteContact(Long contactId) {
        ContactEntity contact = findContactById(contactId);
        contactRepository.delete(contact);
    }

    private void notifyAdmins(ContactEntity contact) {
        userRepository.findByRole_NameAndStatus(ROLE_ADMIN, UserStatus.active, Sort.by("id").ascending())
                .forEach(admin -> notificationService.createNotification(
                        admin.getId(),
                        NOTIFICATION_TYPE_CONTACT,
                        "Có liên hệ hỗ trợ mới từ " + contact.getFullName(),
                        "/admin/contacts/" + contact.getId()
                ));
    }

    private Specification<ContactEntity> hasReplied(Boolean replied) {
        return (root, query, criteriaBuilder) ->
                replied == null ? criteriaBuilder.conjunction() : criteriaBuilder.equal(root.get("replied"), replied);
    }

    private Specification<ContactEntity> hasKeyword(String keyword) {
        return (root, query, criteriaBuilder) -> {
            if (keyword == null) {
                return criteriaBuilder.conjunction();
            }

            String pattern = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
            return criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("fullName")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("phoneNumber")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("email")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("message")), pattern)
            );
        };
    }

    private ContactEntity findContactById(Long contactId) {
        return contactRepository.findById(contactId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy liên hệ với id: " + contactId));
    }

    private Sort parseSort(String sort) {
        String cleanSort = cleanBlank(sort);
        if (cleanSort == null) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }

        String[] parts = cleanSort.split(",");
        String field = parts[0].trim();
        if (!ALLOWED_SORT_FIELDS.contains(field)) {
            throw new BadRequestException("Trường sắp xếp không hợp lệ: " + field);
        }

        Sort.Direction direction = Sort.Direction.DESC;
        if (parts.length > 1) {
            try {
                direction = Sort.Direction.fromString(parts[1].trim());
            } catch (IllegalArgumentException exception) {
                throw new BadRequestException("Chiều sắp xếp không hợp lệ. Giá trị hợp lệ: asc, desc");
            }
        }

        return Sort.by(direction, field);
    }

    private void validatePaging(int page, int size) {
        if (page < 0) {
            throw new BadRequestException("page phải lớn hơn hoặc bằng 0");
        }

        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("size phải nằm trong khoảng 1 đến " + MAX_PAGE_SIZE);
        }
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }
}
