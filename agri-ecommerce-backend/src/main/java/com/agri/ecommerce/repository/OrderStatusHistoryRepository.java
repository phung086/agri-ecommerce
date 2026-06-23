package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.OrderStatusHistoryEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface OrderStatusHistoryRepository extends JpaRepository<OrderStatusHistoryEntity, Long> {

    @EntityGraph(attributePaths = "order")
    List<OrderStatusHistoryEntity> findByOrder_IdOrderByChangedAtAsc(Long orderId);

    @EntityGraph(attributePaths = "order")
    List<OrderStatusHistoryEntity> findByOrder_IdInOrderByChangedAtAsc(Collection<Long> orderIds);
}
