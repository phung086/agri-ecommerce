package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.order.ShippingAddressRequest;
import com.agri.ecommerce.dto.response.order.ShippingAddressResponse;
import com.agri.ecommerce.entity.ShippingAddressEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.ShippingAddressMapper;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.repository.ShippingAddressRepository;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.service.ShippingAddressService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ShippingAddressServiceImpl implements ShippingAddressService {

    private final ShippingAddressRepository shippingAddressRepository;

    private final OrderRepository orderRepository;

    private final UserRepository userRepository;

    private final ShippingAddressMapper shippingAddressMapper;

    @Override
    @Transactional(readOnly = true)
    public List<ShippingAddressResponse> getShippingAddresses(Long userId) {
        return shippingAddressRepository.findByUser_IdOrderByDefaultAddressDescCreatedAtDesc(userId)
                .stream()
                .map(shippingAddressMapper::toShippingAddressResponse)
                .toList();
    }

    @Override
    @Transactional
    public ShippingAddressResponse createShippingAddress(Long userId, ShippingAddressRequest request) {
        UserEntity user = findUserById(userId);
        boolean hasAddress = shippingAddressRepository.existsByUser_Id(userId);
        boolean shouldBeDefault = Boolean.TRUE.equals(request.getDefaultAddress()) || !hasAddress;

        if (shouldBeDefault) {
            shippingAddressRepository.clearDefaultByUserId(userId);
        }

        ShippingAddressEntity shippingAddress = ShippingAddressEntity.builder()
                .user(user)
                .fullName(cleanBlank(request.getFullName()))
                .phone(cleanBlank(request.getPhone()))
                .address(cleanBlank(request.getAddress()))
                .city(cleanBlank(request.getCity()))
                .defaultAddress(shouldBeDefault)
                .build();

        return shippingAddressMapper.toShippingAddressResponse(shippingAddressRepository.save(shippingAddress));
    }

    @Override
    @Transactional
    public ShippingAddressResponse updateShippingAddress(Long userId, Long addressId, ShippingAddressRequest request) {
        ShippingAddressEntity shippingAddress = findAddressByIdAndUserId(addressId, userId);

        if (Boolean.TRUE.equals(request.getDefaultAddress())) {
            shippingAddressRepository.clearDefaultByUserId(userId);
            shippingAddress.setDefaultAddress(true);
        } else if (request.getDefaultAddress() != null) {
            ensureAnotherDefaultExists(userId, addressId);
            shippingAddress.setDefaultAddress(false);
        }

        shippingAddress.setFullName(cleanBlank(request.getFullName()));
        shippingAddress.setPhone(cleanBlank(request.getPhone()));
        shippingAddress.setAddress(cleanBlank(request.getAddress()));
        shippingAddress.setCity(cleanBlank(request.getCity()));

        return shippingAddressMapper.toShippingAddressResponse(shippingAddressRepository.save(shippingAddress));
    }

    @Override
    @Transactional
    public ShippingAddressResponse setDefaultShippingAddress(Long userId, Long addressId) {
        ShippingAddressEntity shippingAddress = findAddressByIdAndUserId(addressId, userId);

        shippingAddressRepository.clearDefaultByUserId(userId);
        shippingAddress.setDefaultAddress(true);

        return shippingAddressMapper.toShippingAddressResponse(shippingAddressRepository.save(shippingAddress));
    }

    @Override
    @Transactional
    public void deleteShippingAddress(Long userId, Long addressId) {
        ShippingAddressEntity shippingAddress = findAddressByIdAndUserId(addressId, userId);

        if (orderRepository.existsByShippingAddress_Id(addressId)) {
            throw new BadRequestException("Địa chỉ đã được dùng trong đơn hàng, không thể xóa để tránh mất lịch sử đơn");
        }

        boolean wasDefault = Boolean.TRUE.equals(shippingAddress.getDefaultAddress());
        shippingAddressRepository.delete(shippingAddress);

        if (wasDefault) {
            shippingAddressRepository.findByUser_IdOrderByDefaultAddressDescCreatedAtDesc(userId)
                    .stream()
                    .findFirst()
                    .ifPresent(nextAddress -> {
                        nextAddress.setDefaultAddress(true);
                        shippingAddressRepository.save(nextAddress);
                    });
        }
    }

    private void ensureAnotherDefaultExists(Long userId, Long currentAddressId) {
        boolean hasAnotherDefault = shippingAddressRepository.findFirstByUser_IdAndDefaultAddressTrue(userId)
                .map(defaultAddress -> !defaultAddress.getId().equals(currentAddressId))
                .orElse(false);

        if (!hasAnotherDefault) {
            throw new BadRequestException("Phải có ít nhất một địa chỉ mặc định");
        }
    }

    private ShippingAddressEntity findAddressByIdAndUserId(Long addressId, Long userId) {
        return shippingAddressRepository.findByIdAndUser_Id(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy địa chỉ giao hàng với id: " + addressId));
    }

    private UserEntity findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với id: " + userId));
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }
}
