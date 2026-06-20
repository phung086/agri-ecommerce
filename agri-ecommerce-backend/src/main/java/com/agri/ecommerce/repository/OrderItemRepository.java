package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.OrderItemEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItemEntity, Long> {

    @EntityGraph(attributePaths = "product")
    List<OrderItemEntity> findByOrder_IdOrderByIdAsc(Long orderId);

    @EntityGraph(attributePaths = "product")
    List<OrderItemEntity> findByOrder_IdInOrderByIdAsc(Collection<Long> orderIds);
}
