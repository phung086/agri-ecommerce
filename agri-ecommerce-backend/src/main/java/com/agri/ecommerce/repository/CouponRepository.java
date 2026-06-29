package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.CouponEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CouponRepository extends JpaRepository<CouponEntity, Long>, JpaSpecificationExecutor<CouponEntity> {

    Optional<CouponEntity> findByCodeIgnoreCase(String code);

    @Query("""
            select coupon
            from CouponEntity coupon
            where lower(coupon.code) like lower(concat('%', :keyword, '%'))
               or lower(coupon.couponType) like lower(concat('%', :keyword, '%'))
               or lower(coupon.discountType) like lower(concat('%', :keyword, '%'))
            order by coupon.createdAt desc, coupon.id desc
            """)
    List<CouponEntity> searchAdminCoupons(@Param("keyword") String keyword, Pageable pageable);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select coupon from CouponEntity coupon where lower(coupon.code) = lower(:code)")
    Optional<CouponEntity> findByCodeIgnoreCaseForUpdate(@Param("code") String code);

    long countByActiveTrue();

    @Query("""
            select count(coupon.id)
            from CouponEntity coupon
            where coupon.active = true
              and (coupon.startsAt is null or coupon.startsAt <= :now)
              and (coupon.expiresAt is null or coupon.expiresAt >= :now)
              and (coupon.usageLimit is null or coupon.timesUsed < coupon.usageLimit)
            """)
    long countAvailableCoupons(@Param("now") LocalDateTime now);
}
