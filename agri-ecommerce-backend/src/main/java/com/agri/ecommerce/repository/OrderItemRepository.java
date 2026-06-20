package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.OrderItemEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItemEntity, Long> {

    @EntityGraph(attributePaths = "product")
    List<OrderItemEntity> findByOrder_IdOrderByIdAsc(Long orderId);

    @EntityGraph(attributePaths = "product")
    List<OrderItemEntity> findByOrder_IdInOrderByIdAsc(Collection<Long> orderIds);

    @Query("""
            select count(orderItem) > 0
            from OrderItemEntity orderItem
            where orderItem.order.user.id = :userId
              and orderItem.product.id = :productId
              and orderItem.order.status in ('delivered', 'completed')
            """)
    boolean existsDeliveredOrCompletedPurchase(
            @Param("userId") Long userId,
            @Param("productId") Long productId
    );
}
