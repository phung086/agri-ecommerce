package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.CouponEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CouponRepository extends JpaRepository<CouponEntity, Long> {

    Optional<CouponEntity> findByCodeIgnoreCase(String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select coupon from CouponEntity coupon where lower(coupon.code) = lower(:code)")
    Optional<CouponEntity> findByCodeIgnoreCaseForUpdate(@Param("code") String code);
}
