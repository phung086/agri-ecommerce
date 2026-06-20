package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.PaymentEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<PaymentEntity, Long> {

    @EntityGraph(attributePaths = "order")
    Optional<PaymentEntity> findFirstByOrder_IdOrderByCreatedAtDesc(Long orderId);

    @EntityGraph(attributePaths = "order")
    List<PaymentEntity> findByOrder_IdInOrderByCreatedAtDesc(Collection<Long> orderIds);

    long countByStatus(String status);

    @Query("select coalesce(sum(payment.amount), 0) from PaymentEntity payment where payment.status = :status")
    BigDecimal sumAmountByStatus(@Param("status") String status);

    @Query("select coalesce(sum(payment.amount), 0) from PaymentEntity payment where payment.status = :status and payment.paidAt >= :fromDate and payment.paidAt < :toDate")
    BigDecimal sumAmountByStatusAndPaidAtRange(
            @Param("status") String status,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate
    );

    @Query(value = """
            select date_format(paid_at, '%Y-%m-%d') as period,
                   coalesce(sum(amount), 0) as revenue,
                   count(id) as order_count
            from payments
            where status = :status
              and paid_at is not null
              and paid_at >= :fromDate
              and paid_at <= :toDate
            group by date_format(paid_at, '%Y-%m-%d')
            order by period
            """, nativeQuery = true)
    List<Object[]> sumCompletedRevenueByDay(
            @Param("status") String status,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate
    );

    @Query(value = """
            select date_format(paid_at, '%Y-%m') as period,
                   coalesce(sum(amount), 0) as revenue,
                   count(id) as order_count
            from payments
            where status = :status
              and paid_at is not null
              and paid_at >= :fromDate
              and paid_at <= :toDate
            group by date_format(paid_at, '%Y-%m')
            order by period
            """, nativeQuery = true)
    List<Object[]> sumCompletedRevenueByMonth(
            @Param("status") String status,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate
    );
}
