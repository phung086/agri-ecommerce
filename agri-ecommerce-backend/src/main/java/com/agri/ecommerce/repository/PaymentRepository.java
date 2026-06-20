package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.PaymentEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<PaymentEntity, Long> {

    @EntityGraph(attributePaths = "order")
    Optional<PaymentEntity> findFirstByOrder_IdOrderByCreatedAtDesc(Long orderId);

    @EntityGraph(attributePaths = "order")
    List<PaymentEntity> findByOrder_IdInOrderByCreatedAtDesc(Collection<Long> orderIds);
}
