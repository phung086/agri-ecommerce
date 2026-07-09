package com.agri.ecommerce.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "coupons")
public class CouponEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "required_membership_tier", length = 20)
    private String requiredMembershipTier;

    @Column(name = "guest_allowed", nullable = false)
    private Boolean guestAllowed;

    @Column(nullable = false, unique = true, length = 255)
    private String code;

    @Column(name = "discount_percentage", nullable = false)
    private Integer discountPercentage;

    @Column(name = "discount_amount", precision = 10, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "min_order_value", precision = 10, scale = 2)
    private BigDecimal minOrderValue;

    @Column(name = "coupon_type", nullable = false, length = 50)
    private String couponType;

    @Column(name = "discount_type", nullable = false, length = 50)
    private String discountType;

    @Column(name = "starts_at")
    private LocalDateTime startsAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "usage_limit")
    private Integer usageLimit;

    @Column(name = "times_used", nullable = false)
    private Integer timesUsed;

    @Column(name = "is_active", nullable = false)
    private Boolean active;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;

        if (this.timesUsed == null) {
            this.timesUsed = 0;
        }

        if (this.discountPercentage == null) {
            this.discountPercentage = 0;
        }

        if (this.couponType == null) {
            this.couponType = "ORDER_DISCOUNT";
        }

        if (this.discountType == null) {
            this.discountType = "PERCENTAGE";
        }

        if (this.active == null) {
            this.active = true;
        }

        if (this.guestAllowed == null) {
            this.guestAllowed = true;
        }
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
