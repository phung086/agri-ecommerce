package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.OrderEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<OrderEntity, Long>, JpaSpecificationExecutor<OrderEntity> {

    @EntityGraph(attributePaths = {"shippingAddress", "coupon"})
    Page<OrderEntity> findByUser_Id(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"shippingAddress", "coupon"})
    Optional<OrderEntity> findByIdAndUser_Id(Long id, Long userId);

    boolean existsByShippingAddress_Id(Long shippingAddressId);

    @Override
    @EntityGraph(attributePaths = {"user", "user.role", "deliveryStaff", "deliveryStaff.role", "shippingAddress", "coupon"})
    Page<OrderEntity> findAll(org.springframework.data.jpa.domain.Specification<OrderEntity> specification, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"user", "user.role", "deliveryStaff", "deliveryStaff.role", "shippingAddress", "coupon"})
    Optional<OrderEntity> findById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select orderEntity from OrderEntity orderEntity where orderEntity.id = :id")
    Optional<OrderEntity> findByIdForUpdate(@Param("id") Long id);

    long countByStatus(String status);

    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(LocalDateTime fromDate, LocalDateTime toDate);

    @Query("select orderEntity.status, count(orderEntity.id) from OrderEntity orderEntity group by orderEntity.status")
    List<Object[]> countOrdersByStatus();
}
