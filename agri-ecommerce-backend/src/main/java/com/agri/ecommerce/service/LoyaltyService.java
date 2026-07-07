package com.agri.ecommerce.service;

import com.agri.ecommerce.entity.UserEntity;

public interface LoyaltyService {
    void awardPointsForPurchase(Long userId, Long orderId, java.math.BigDecimal purchaseAmount);
    void awardPointsForReview(Long userId, String productName);
    int deductPointsForCheckout(Long userId, Integer points);
    void refundPointsForCancellation(Long userId, Integer points);
    void recalculateMembershipTier(Long userId);
    boolean validateTierCoupon(UserEntity user, String couponCode);
}
