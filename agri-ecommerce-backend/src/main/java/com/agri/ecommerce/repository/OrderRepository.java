package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.OrderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<OrderEntity, Long> {

    @EntityGraph(attributePaths = {"shippingAddress", "coupon"})
    Page<OrderEntity> findByUser_Id(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"shippingAddress", "coupon"})
    Optional<OrderEntity> findByIdAndUser_Id(Long id, Long userId);

    boolean existsByShippingAddress_Id(Long shippingAddressId);
}
