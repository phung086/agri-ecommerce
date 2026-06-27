package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.PaymentEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<PaymentEntity, Long>, JpaSpecificationExecutor<PaymentEntity> {

    @Override
    @EntityGraph(attributePaths = {"order", "order.user"})
    Page<PaymentEntity> findAll(Specification<PaymentEntity> specification, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"order", "order.user"})
    Optional<PaymentEntity> findById(Long id);

    @EntityGraph(attributePaths = {"order", "order.user"})
    Optional<PaymentEntity> findFirstByOrder_IdOrderByCreatedAtDesc(Long orderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select payment
            from PaymentEntity payment
            join fetch payment.order orderEntity
            join fetch orderEntity.user
            where orderEntity.id = :orderId
            order by payment.createdAt desc
            """)
    List<PaymentEntity> findByOrderIdForUpdateOrderByCreatedAtDesc(@Param("orderId") Long orderId);

    @EntityGraph(attributePaths = {"order", "order.user"})
    Optional<PaymentEntity> findFirstByOrder_IdAndOrder_User_IdOrderByCreatedAtDesc(Long orderId, Long userId);

    @EntityGraph(attributePaths = {"order", "order.user"})
    List<PaymentEntity> findByOrder_IdInOrderByCreatedAtDesc(Collection<Long> orderIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select payment
            from PaymentEntity payment
            join fetch payment.order orderEntity
            join fetch orderEntity.user
            where payment.id = :id
            """)
    Optional<PaymentEntity> findByIdForUpdate(@Param("id") Long id);

    boolean existsByTransactionIdIgnoreCaseAndIdNot(String transactionId, Long id);

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

    @Query("""
            select orderEntity.user.id, coalesce(sum(payment.amount), 0)
            from PaymentEntity payment
            join payment.order orderEntity
            where payment.status = :status
              and orderEntity.user.id in :customerIds
            group by orderEntity.user.id
            """)
    List<Object[]> sumAmountByStatusGroupByCustomerIds(
            @Param("status") String status,
            @Param("customerIds") Collection<Long> customerIds
    );
}
