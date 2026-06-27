package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.dto.request.user.UpdateUserStatusRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.customer.AdminCustomerDetailResponse;
import com.agri.ecommerce.dto.response.customer.AdminCustomerSummaryResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.dto.response.user.UserResponse;
import com.agri.ecommerce.entity.*;
import com.agri.ecommerce.mapper.OrderMapper;
import com.agri.ecommerce.mapper.UserMapper;
import com.agri.ecommerce.repository.*;
import com.agri.ecommerce.service.AdminCustomerService;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminCustomerServiceImpl implements AdminCustomerService {

    private static final String ROLE_CUSTOMER = "customer";
    private static final String PAYMENT_COMPLETED = "completed";
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_PROCESSING = "processing";
    private static final String STATUS_READY_FOR_DELIVERY = "ready_for_delivery";
    private static final String STATUS_OUT_FOR_DELIVERY = "out_for_delivery";
    private static final String STATUS_DELIVERED = "delivered";
    private static final String STATUS_COMPLETED = "completed";
    private static final String STATUS_CANCELED = "canceled";
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> FULFILLED_ORDER_STATUSES = Set.of(STATUS_DELIVERED, STATUS_COMPLETED);
    private static final Set<String> CANCELED_ORDER_STATUSES = Set.of(STATUS_CANCELED);
    private static final Set<String> ALLOWED_ORDER_STATUSES = Set.of(
            STATUS_PENDING,
            STATUS_PROCESSING,
            STATUS_READY_FOR_DELIVERY,
            STATUS_OUT_FOR_DELIVERY,
            STATUS_DELIVERED,
            STATUS_COMPLETED,
            STATUS_CANCELED
    );
    private static final Set<String> ALLOWED_USER_SORT_FIELDS = Set.of(
            "id", "name", "email", "status", "createdAt", "updatedAt"
    );
    private static final Set<String> ALLOWED_ORDER_SORT_FIELDS = Set.of(
            "id", "subtotal", "discountAmount", "shippingFee", "totalPrice", "status", "createdAt", "updatedAt"
    );

    private final UserRepository userRepository;

    private final OrderRepository orderRepository;

    private final OrderItemRepository orderItemRepository;

    private final PaymentRepository paymentRepository;

    private final ReviewRepository reviewRepository;

    private final WishlistRepository wishlistRepository;

    private final UserMapper userMapper;

    private final OrderMapper orderMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AdminCustomerSummaryResponse> getCustomers(
            String keyword,
            String status,
            int page,
            int size,
            String sort
    ) {
        validatePaging(page, size);

        Pageable pageable = PageRequest.of(page, size, parseSort(sort, ALLOWED_USER_SORT_FIELDS, "createdAt"));
        Specification<UserEntity> specification = Specification.where(hasCustomerRole())
                .and(hasKeyword(cleanBlank(keyword)))
                .and(hasUserStatus(normalizeOptionalUserStatus(status)));
        Page<UserEntity> customerPage = userRepository.findAll(specification, pageable);
        CustomerMetrics metrics = loadMetrics(customerPage.getContent().stream().map(UserEntity::getId).toList());

        return PageResponse.<AdminCustomerSummaryResponse>builder()
                .content(customerPage.getContent().stream()
                        .map(customer -> toCustomerSummary(customer, metrics))
                        .toList())
                .page(customerPage.getNumber())
                .size(customerPage.getSize())
                .totalElements(customerPage.getTotalElements())
                .totalPages(customerPage.getTotalPages())
                .last(customerPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminCustomerDetailResponse getCustomer(Long customerId) {
        UserEntity customer = findCustomerById(customerId);
        CustomerMetrics metrics = loadMetrics(List.of(customerId));

        return AdminCustomerDetailResponse.builder()
                .customer(userMapper.toUserResponse(customer))
                .totalOrders(metrics.totalOrders(customerId))
                .fulfilledOrders(metrics.fulfilledOrders(customerId))
                .canceledOrders(metrics.canceledOrders(customerId))
                .totalSpent(metrics.totalSpent(customerId))
                .lastOrderAt(metrics.lastOrderAt(customerId))
                .reviewCount(metrics.reviewCount(customerId))
                .wishlistCount(metrics.wishlistCount(customerId))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> getCustomerOrders(
            Long customerId,
            String status,
            int page,
            int size,
            String sort
    ) {
        validatePaging(page, size);
        findCustomerById(customerId);

        Pageable pageable = PageRequest.of(page, size, parseSort(sort, ALLOWED_ORDER_SORT_FIELDS, "createdAt"));
        Specification<OrderEntity> specification = Specification.where(hasCustomerId(customerId))
                .and(hasOrderStatus(normalizeOptionalOrderStatus(status)));
        Page<OrderEntity> orderPage = orderRepository.findAll(specification, pageable);

        return PageResponse.<OrderResponse>builder()
                .content(toOrderResponses(orderPage.getContent()))
                .page(orderPage.getNumber())
                .size(orderPage.getSize())
                .totalElements(orderPage.getTotalElements())
                .totalPages(orderPage.getTotalPages())
                .last(orderPage.isLast())
                .build();
    }

    @Override
    @Transactional
    public UserResponse updateCustomerStatus(Long customerId, UpdateUserStatusRequest request) {
        UserEntity customer = findCustomerById(customerId);
        UserStatus status = normalizeRequiredUserStatus(request.getStatus());

        customer.setStatus(status);
        return userMapper.toUserResponse(userRepository.save(customer));
    }

    private AdminCustomerSummaryResponse toCustomerSummary(UserEntity customer, CustomerMetrics metrics) {
        Long customerId = customer.getId();

        return AdminCustomerSummaryResponse.builder()
                .id(customerId)
                .name(customer.getName())
                .email(customer.getEmail())
                .status(customer.getStatus() == null ? null : customer.getStatus().name())
                .phoneNumber(customer.getPhoneNumber())
                .avatar(customer.getAvatar())
                .address(customer.getAddress())
                .createdAt(customer.getCreatedAt())
                .updatedAt(customer.getUpdatedAt())
                .totalOrders(metrics.totalOrders(customerId))
                .fulfilledOrders(metrics.fulfilledOrders(customerId))
                .canceledOrders(metrics.canceledOrders(customerId))
                .totalSpent(metrics.totalSpent(customerId))
                .lastOrderAt(metrics.lastOrderAt(customerId))
                .reviewCount(metrics.reviewCount(customerId))
                .wishlistCount(metrics.wishlistCount(customerId))
                .build();
    }

    private CustomerMetrics loadMetrics(List<Long> customerIds) {
        if (customerIds.isEmpty()) {
            return CustomerMetrics.empty();
        }

        return new CustomerMetrics(
                toLongMap(orderRepository.countOrdersByCustomerIds(customerIds)),
                toLongMap(orderRepository.countOrdersByCustomerIdsAndStatuses(customerIds, FULFILLED_ORDER_STATUSES)),
                toLongMap(orderRepository.countOrdersByCustomerIdsAndStatuses(customerIds, CANCELED_ORDER_STATUSES)),
                toBigDecimalMap(paymentRepository.sumAmountByStatusGroupByCustomerIds(PAYMENT_COMPLETED, customerIds)),
                toDateTimeMap(orderRepository.findLatestOrderCreatedAtByCustomerIds(customerIds)),
                toLongMap(reviewRepository.countReviewsByUserIds(customerIds)),
                toLongMap(wishlistRepository.countWishlistsByUserIds(customerIds))
        );
    }

    private List<OrderResponse> toOrderResponses(List<OrderEntity> orders) {
        if (orders.isEmpty()) {
            return List.of();
        }

        List<Long> orderIds = orders.stream().map(OrderEntity::getId).toList();
        Map<Long, List<OrderItemEntity>> itemsByOrderId = orderItemRepository.findByOrder_IdInOrderByIdAsc(orderIds)
                .stream()
                .collect(Collectors.groupingBy(
                        orderItem -> orderItem.getOrder().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
        Map<Long, PaymentEntity> paymentsByOrderId = paymentRepository.findByOrder_IdInOrderByCreatedAtDesc(orderIds)
                .stream()
                .collect(Collectors.toMap(
                        payment -> payment.getOrder().getId(),
                        Function.identity(),
                        (latest, ignored) -> latest,
                        LinkedHashMap::new
                ));

        return orders.stream()
                .map(order -> orderMapper.toOrderResponse(
                        order,
                        itemsByOrderId.getOrDefault(order.getId(), List.of()),
                        paymentsByOrderId.get(order.getId()),
                        List.of()
                ))
                .toList();
    }

    private Specification<UserEntity> hasCustomerRole() {
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.join("role", JoinType.INNER).get("name"), ROLE_CUSTOMER);
    }

    private Specification<UserEntity> hasKeyword(String keyword) {
        return (root, query, criteriaBuilder) -> {
            if (keyword == null) {
                return criteriaBuilder.conjunction();
            }

            String pattern = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
            return criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("email")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("phoneNumber")), pattern)
            );
        };
    }

    private Specification<UserEntity> hasUserStatus(UserStatus status) {
        return (root, query, criteriaBuilder) ->
                status == null ? criteriaBuilder.conjunction() : criteriaBuilder.equal(root.get("status"), status);
    }

    private Specification<OrderEntity> hasCustomerId(Long customerId) {
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.join("user", JoinType.INNER).get("id"), customerId);
    }

    private Specification<OrderEntity> hasOrderStatus(String status) {
        return (root, query, criteriaBuilder) ->
                status == null ? criteriaBuilder.conjunction() : criteriaBuilder.equal(root.get("status"), status);
    }

    private UserEntity findCustomerById(Long customerId) {
        UserEntity customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + customerId));
        RoleEntity role = customer.getRole();

        if (role == null || !ROLE_CUSTOMER.equals(role.getName())) {
            throw new ResourceNotFoundException("Customer not found with id: " + customerId);
        }

        return customer;
    }

    private UserStatus normalizeOptionalUserStatus(String status) {
        String normalizedStatus = cleanBlank(status);
        if (normalizedStatus == null) {
            return null;
        }

        return normalizeUserStatus(normalizedStatus);
    }

    private UserStatus normalizeRequiredUserStatus(String status) {
        String normalizedStatus = cleanBlank(status);
        if (normalizedStatus == null) {
            throw new BadRequestException("Customer status is required");
        }

        return normalizeUserStatus(normalizedStatus);
    }

    private UserStatus normalizeUserStatus(String status) {
        try {
            return UserStatus.valueOf(status.toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid customer status. Allowed values: pending, active, banned, deleted");
        }
    }

    private String normalizeOptionalOrderStatus(String status) {
        String normalizedStatus = cleanBlank(status);
        if (normalizedStatus == null) {
            return null;
        }

        String loweredStatus = normalizedStatus.toLowerCase(Locale.ROOT);
        if (!ALLOWED_ORDER_STATUSES.contains(loweredStatus)) {
            throw new BadRequestException("Invalid order status. Allowed values: pending, processing, ready_for_delivery, out_for_delivery, delivered, completed, canceled");
        }

        return loweredStatus;
    }

    private Sort parseSort(String sort, Set<String> allowedFields, String defaultField) {
        String cleanSort = cleanBlank(sort);
        if (cleanSort == null) {
            return Sort.by(Sort.Direction.DESC, defaultField);
        }

        String[] parts = cleanSort.split(",");
        String field = parts[0].trim();
        if (!allowedFields.contains(field)) {
            throw new BadRequestException("Invalid sort field: " + field);
        }

        Sort.Direction direction = Sort.Direction.DESC;
        if (parts.length > 1) {
            try {
                direction = Sort.Direction.fromString(parts[1].trim());
            } catch (IllegalArgumentException exception) {
                throw new BadRequestException("Invalid sort direction. Allowed values: asc, desc");
            }
        }

        return Sort.by(direction, field);
    }

    private void validatePaging(int page, int size) {
        if (page < 0) {
            throw new BadRequestException("page must be greater than or equal to 0");
        }

        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("size must be between 1 and " + MAX_PAGE_SIZE);
        }
    }

    private Map<Long, Long> toLongMap(List<Object[]> rows) {
        return rows.stream()
                .collect(Collectors.toMap(
                        row -> toLong(row[0]),
                        row -> toLong(row[1]),
                        (left, right) -> right,
                        LinkedHashMap::new
                ));
    }

    private Map<Long, BigDecimal> toBigDecimalMap(List<Object[]> rows) {
        return rows.stream()
                .collect(Collectors.toMap(
                        row -> toLong(row[0]),
                        row -> toBigDecimal(row[1]),
                        (left, right) -> right,
                        LinkedHashMap::new
                ));
    }

    private Map<Long, LocalDateTime> toDateTimeMap(List<Object[]> rows) {
        return rows.stream()
                .collect(Collectors.toMap(
                        row -> toLong(row[0]),
                        row -> toLocalDateTime(row[1]),
                        (left, right) -> right,
                        LinkedHashMap::new
                ));
    }

    private Long toLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }

        return Long.parseLong(value.toString());
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }

        if (value instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }

        return new BigDecimal(value.toString());
    }

    private LocalDateTime toLocalDateTime(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime;
        }

        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }

        throw new BadRequestException("Unsupported date value: " + value);
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }

    private static class CustomerMetrics {

        private final Map<Long, Long> totalOrders;

        private final Map<Long, Long> fulfilledOrders;

        private final Map<Long, Long> canceledOrders;

        private final Map<Long, BigDecimal> totalSpent;

        private final Map<Long, LocalDateTime> lastOrderAt;

        private final Map<Long, Long> reviewCounts;

        private final Map<Long, Long> wishlistCounts;

        private CustomerMetrics(
                Map<Long, Long> totalOrders,
                Map<Long, Long> fulfilledOrders,
                Map<Long, Long> canceledOrders,
                Map<Long, BigDecimal> totalSpent,
                Map<Long, LocalDateTime> lastOrderAt,
                Map<Long, Long> reviewCounts,
                Map<Long, Long> wishlistCounts
        ) {
            this.totalOrders = totalOrders;
            this.fulfilledOrders = fulfilledOrders;
            this.canceledOrders = canceledOrders;
            this.totalSpent = totalSpent;
            this.lastOrderAt = lastOrderAt;
            this.reviewCounts = reviewCounts;
            this.wishlistCounts = wishlistCounts;
        }

        private static CustomerMetrics empty() {
            return new CustomerMetrics(Map.of(), Map.of(), Map.of(), Map.of(), Map.of(), Map.of(), Map.of());
        }

        private long totalOrders(Long customerId) {
            return totalOrders.getOrDefault(customerId, 0L);
        }

        private long fulfilledOrders(Long customerId) {
            return fulfilledOrders.getOrDefault(customerId, 0L);
        }

        private long canceledOrders(Long customerId) {
            return canceledOrders.getOrDefault(customerId, 0L);
        }

        private BigDecimal totalSpent(Long customerId) {
            return totalSpent.getOrDefault(customerId, BigDecimal.ZERO);
        }

        private LocalDateTime lastOrderAt(Long customerId) {
            return lastOrderAt.get(customerId);
        }

        private long reviewCount(Long customerId) {
            return reviewCounts.getOrDefault(customerId, 0L);
        }

        private long wishlistCount(Long customerId) {
            return wishlistCounts.getOrDefault(customerId, 0L);
        }
    }
}
