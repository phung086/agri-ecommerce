package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.OrderItemEntity;
import com.agri.ecommerce.entity.OrderStatusHistoryEntity;
import com.agri.ecommerce.entity.PaymentEntity;
import com.agri.ecommerce.entity.RoleEntity;
import com.agri.ecommerce.entity.ShippingAddressEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.entity.UserStatus;
import com.agri.ecommerce.mapper.OrderMapper;
import com.agri.ecommerce.mapper.UserMapper;
import com.agri.ecommerce.repository.OrderItemRepository;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.repository.OrderStatusHistoryRepository;
import com.agri.ecommerce.repository.PaymentRepository;
import com.agri.ecommerce.repository.RoleRepository;
import com.agri.ecommerce.repository.ShippingAddressRepository;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.security.JwtTokenProvider;
import com.agri.ecommerce.service.GuestOrderAutoAccountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class GuestOrderAutoAccountServiceImpl implements GuestOrderAutoAccountService {

    private static final String CUSTOMER_ROLE = "customer";
    private static final String DEFAULT_GUEST_PASSWORD = "123456";
    private static final String DEFAULT_GUEST_EMAIL_SUFFIX = "@agrimarket.default";

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final ShippingAddressRepository shippingAddressRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserMapper userMapper;
    private final OrderMapper orderMapper;

    @Override
    @Transactional
    public OrderResponse createOrLoginDefaultCustomer(Long orderId, String phoneNumber) {
        String phone = normalizePhone(phoneNumber);
        if (phone == null) {
            throw new BadRequestException("Số điện thoại không hợp lệ");
        }

        OrderEntity order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));

        String orderPhone = normalizePhone(order.getShippingPhone());
        if (!phone.equals(orderPhone)) {
            throw new BadRequestException("Số điện thoại không khớp với đơn hàng");
        }

        UserEntity customer = resolveDefaultGuestCustomer(order, phone);
        ShippingAddressEntity defaultAddress = createOrUpdateDefaultAddress(customer, order);

        order.setUser(customer);
        order.setShippingAddress(defaultAddress);
        orderRepository.save(order);

        OrderResponse response = buildOrderResponse(order);
        response.setGuestAutoLoginToken(jwtTokenProvider.generateToken(customer.getId(), customer.getEmail()));
        response.setGuestAutoLoginEmail(customer.getEmail());
        response.setGuestAutoLoginExpiresIn(jwtTokenProvider.getExpirationMs());
        response.setGuestAutoLoginUser(userMapper.toUserResponse(customer));
        response.setGuestDefaultPassword(DEFAULT_GUEST_PASSWORD);
        return response;
    }

    private UserEntity resolveDefaultGuestCustomer(OrderEntity order, String phone) {
        Optional<UserEntity> byPhone = userRepository.findByPhoneNumber(phone);
        if (byPhone.isPresent()) {
            UserEntity existing = byPhone.get();
            if (!isDefaultGuestAccount(existing)) {
                throw new BadRequestException("Số điện thoại đã liên kết với tài khoản đã đăng ký. Vui lòng đăng nhập để đặt hàng.");
            }
            updateGuestCustomerSnapshot(existing, order, phone);
            return userRepository.save(existing);
        }

        String generatedEmail = buildDefaultGuestEmail(phone);
        Optional<UserEntity> byGeneratedEmail = userRepository.findByEmail(generatedEmail);
        if (byGeneratedEmail.isPresent()) {
            UserEntity existing = byGeneratedEmail.get();
            updateGuestCustomerSnapshot(existing, order, phone);
            return userRepository.save(existing);
        }

        RoleEntity customerRole = roleRepository.findByName(CUSTOMER_ROLE)
                .orElseThrow(() -> new ResourceNotFoundException("Customer role was not found in database"));

        UserEntity newUser = UserEntity.builder()
                .name(defaultText(order.getShippingName(), phone))
                .email(generatedEmail)
                .password(passwordEncoder.encode(DEFAULT_GUEST_PASSWORD))
                .status(UserStatus.active)
                .phoneNumber(phone)
                .address(buildFullAddress(order))
                .role(customerRole)
                .build();

        return userRepository.save(newUser);
    }

    private void updateGuestCustomerSnapshot(UserEntity user, OrderEntity order, String phone) {
        user.setName(defaultText(order.getShippingName(), user.getName()));
        user.setPhoneNumber(phone);
        user.setAddress(buildFullAddress(order));
        if (user.getStatus() == null) {
            user.setStatus(UserStatus.active);
        }
    }

    private ShippingAddressEntity createOrUpdateDefaultAddress(UserEntity customer, OrderEntity order) {
        ShippingAddressEntity address = shippingAddressRepository.findFirstByUser_IdAndDefaultAddressTrue(customer.getId())
                .orElseGet(() -> ShippingAddressEntity.builder()
                        .user(customer)
                        .defaultAddress(true)
                        .build());

        address.setUser(customer);
        address.setFullName(defaultText(order.getShippingName(), customer.getName()));
        address.setPhone(defaultText(order.getShippingPhone(), customer.getPhoneNumber()));
        address.setCity(defaultText(order.getShippingCity(), "Hà Nội"));
        address.setAddress(defaultText(order.getShippingAddressDetail(), buildFullAddress(order)));
        address.setDefaultAddress(true);
        return shippingAddressRepository.save(address);
    }

    private OrderResponse buildOrderResponse(OrderEntity order) {
        List<OrderItemEntity> items = orderItemRepository.findByOrder_IdOrderByIdAsc(order.getId());
        PaymentEntity payment = paymentRepository.findFirstByOrder_IdOrderByCreatedAtDesc(order.getId()).orElse(null);
        List<OrderStatusHistoryEntity> histories = orderStatusHistoryRepository.findByOrder_IdOrderByChangedAtAsc(order.getId());
        return orderMapper.toOrderResponse(order, items, payment, histories);
    }

    private boolean isDefaultGuestAccount(UserEntity user) {
        return user != null
                && user.getEmail() != null
                && user.getEmail().toLowerCase(Locale.ROOT).endsWith(DEFAULT_GUEST_EMAIL_SUFFIX);
    }

    private String buildDefaultGuestEmail(String phone) {
        return phone + DEFAULT_GUEST_EMAIL_SUFFIX;
    }

    private String normalizePhone(String value) {
        if (value == null) {
            return null;
        }
        String phone = value.replaceAll("\\D", "");
        return phone.matches("^0\\d{9}$") ? phone : null;
    }

    private String buildFullAddress(OrderEntity order) {
        String detail = cleanBlank(order.getShippingAddressDetail());
        String city = cleanBlank(order.getShippingCity());
        if (detail == null) {
            return city == null ? "" : city;
        }
        if (city == null || detail.toLowerCase(Locale.ROOT).contains(city.toLowerCase(Locale.ROOT))) {
            return detail;
        }
        return detail + ", " + city;
    }

    private String defaultText(String value, String fallback) {
        String clean = cleanBlank(value);
        return clean != null ? clean : fallback;
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }
        return value.trim();
    }
}
