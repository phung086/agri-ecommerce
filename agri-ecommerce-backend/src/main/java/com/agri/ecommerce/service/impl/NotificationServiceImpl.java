package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.notification.NotificationResponse;
import com.agri.ecommerce.dto.response.notification.UnreadNotificationCountResponse;
import com.agri.ecommerce.entity.NotificationEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.NotificationMapper;
import com.agri.ecommerce.repository.NotificationRepository;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.service.NotificationService;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_TYPE_LENGTH = 50;
    private static final int MAX_LINK_LENGTH = 255;
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("id", "type", "read", "createdAt", "updatedAt");

    private final NotificationRepository notificationRepository;

    private final UserRepository userRepository;

    private final NotificationMapper notificationMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getMyNotifications(
            Long userId,
            String type,
            Boolean read,
            int page,
            int size,
            String sort
    ) {
        validatePaging(page, size);

        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Specification<NotificationEntity> specification = Specification.where(hasUserId(userId))
                .and(hasType(normalizeOptionalType(type)))
                .and(hasRead(read));
        Page<NotificationEntity> notificationPage = notificationRepository.findAll(specification, pageable);

        return PageResponse.<NotificationResponse>builder()
                .content(notificationPage.getContent().stream().map(notificationMapper::toNotificationResponse).toList())
                .page(notificationPage.getNumber())
                .size(notificationPage.getSize())
                .totalElements(notificationPage.getTotalElements())
                .totalPages(notificationPage.getTotalPages())
                .last(notificationPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public UnreadNotificationCountResponse getUnreadCount(Long userId) {
        return UnreadNotificationCountResponse.builder()
                .unreadCount(notificationRepository.countByUser_IdAndReadFalse(userId))
                .build();
    }

    @Override
    @Transactional
    public NotificationResponse markAsRead(Long userId, Long notificationId) {
        NotificationEntity notification = findNotificationByIdAndUserId(notificationId, userId);
        notification.setRead(true);

        return notificationMapper.toNotificationResponse(notificationRepository.save(notification));
    }

    @Override
    @Transactional
    public UnreadNotificationCountResponse markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
        return getUnreadCount(userId);
    }

    @Override
    @Transactional
    public void deleteNotification(Long userId, Long notificationId) {
        NotificationEntity notification = findNotificationByIdAndUserId(notificationId, userId);
        notificationRepository.delete(notification);
    }

    @Override
    @Transactional
    public void clearNotifications(Long userId) {
        notificationRepository.deleteByUser_Id(userId);
    }

    @Override
    @Transactional
    public NotificationResponse createNotification(Long userId, String type, String message, String link) {
        UserEntity user = findUserById(userId);
        String normalizedType = normalizeRequiredType(type);
        String cleanMessage = cleanBlank(message);
        String cleanLink = cleanBlank(link);

        if (cleanMessage == null) {
            throw new BadRequestException("Nội dung thông báo không được để trống");
        }

        if (cleanLink != null && cleanLink.length() > MAX_LINK_LENGTH) {
            throw new BadRequestException("Đường dẫn thông báo không được vượt quá " + MAX_LINK_LENGTH + " ký tự");
        }

        NotificationEntity notification = NotificationEntity.builder()
                .user(user)
                .type(normalizedType)
                .message(cleanMessage)
                .link(cleanLink)
                .read(false)
                .build();

        return notificationMapper.toNotificationResponse(notificationRepository.save(notification));
    }

    private Specification<NotificationEntity> hasUserId(Long userId) {
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.join("user", JoinType.INNER).get("id"), userId);
    }

    private Specification<NotificationEntity> hasType(String type) {
        return (root, query, criteriaBuilder) ->
                type == null ? criteriaBuilder.conjunction() : criteriaBuilder.equal(root.get("type"), type);
    }

    private Specification<NotificationEntity> hasRead(Boolean read) {
        return (root, query, criteriaBuilder) ->
                read == null ? criteriaBuilder.conjunction() : criteriaBuilder.equal(root.get("read"), read);
    }

    private NotificationEntity findNotificationByIdAndUserId(Long notificationId, Long userId) {
        return notificationRepository.findByIdAndUser_Id(notificationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông báo với id: " + notificationId));
    }

    private UserEntity findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với id: " + userId));
    }

    private String normalizeOptionalType(String type) {
        String normalizedType = cleanBlank(type);
        if (normalizedType == null) {
            return null;
        }

        return normalizeRequiredType(normalizedType);
    }

    private String normalizeRequiredType(String type) {
        String normalizedType = cleanBlank(type);
        if (normalizedType == null) {
            throw new BadRequestException("Loại thông báo không được để trống");
        }

        normalizedType = normalizedType.toLowerCase(Locale.ROOT);
        if (normalizedType.length() > MAX_TYPE_LENGTH) {
            throw new BadRequestException("Loại thông báo không được vượt quá " + MAX_TYPE_LENGTH + " ký tự");
        }

        return normalizedType;
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
