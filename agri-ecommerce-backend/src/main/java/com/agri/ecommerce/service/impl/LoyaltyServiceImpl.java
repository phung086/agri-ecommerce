package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.entity.LoyaltyTransactionEntity;
import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.repository.LoyaltyTransactionRepository;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.service.LoyaltyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoyaltyServiceImpl implements LoyaltyService {

    private static final String DEFAULT_TIER = "BRONZE";
    private static final String TIER_SILVER = "SILVER";
    private static final String TIER_GOLD = "GOLD";
    private static final String TIER_PLATINUM = "PLATINUM";
    private static final BigDecimal PURCHASE_POINT_RATE = new BigDecimal("0.01");
    private static final int REVIEW_REWARD_POINTS = 200;

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final LoyaltyTransactionRepository loyaltyTransactionRepository;

    @Override
    @Transactional
    public void awardPointsForPurchase(Long userId, Long orderId, BigDecimal purchaseAmount) {
        OrderEntity order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay don hang"));

        if (order.getPointsEarned() != null && order.getPointsEarned() > 0) {
            log.info("[Loyalty Service] Order #{} already earned points. Skipping.", orderId);
            return;
        }

        UserEntity user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay nguoi dung"));

        BigDecimal baseAmount = purchaseAmount == null ? order.getTotalPrice() : purchaseAmount;
        int points = calculatePurchasePoints(baseAmount);
        if (points <= 0) {
            return;
        }

        user.setLoyaltyPoints(getCurrentPoints(user) + points);
        userRepository.save(user);

        order.setPointsEarned(points);
        orderRepository.save(order);

        loyaltyTransactionRepository.save(LoyaltyTransactionEntity.builder()
                .user(user)
                .amount(points)
                .type("EARNED_PURCHASE")
                .note("Tich diem mua hang cho don #" + orderId)
                .build());

        log.info("[Loyalty Service] Awarded {} points to user #{} for order #{}", points, userId, orderId);
        recalculateMembershipTier(userId);
    }

    @Override
    @Transactional
    public void awardPointsForReview(Long userId, String productName) {
        UserEntity user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay nguoi dung"));

        user.setLoyaltyPoints(getCurrentPoints(user) + REVIEW_REWARD_POINTS);
        userRepository.save(user);

        loyaltyTransactionRepository.save(LoyaltyTransactionEntity.builder()
                .user(user)
                .amount(REVIEW_REWARD_POINTS)
                .type("EARNED_REVIEW")
                .note("Tang diem danh gia san pham " + cleanNotePart(productName))
                .build());

        log.info("[Loyalty Service] Awarded {} points to user #{} for reviewing '{}'",
                REVIEW_REWARD_POINTS, userId, productName);
    }

    @Override
    @Transactional
    public int deductPointsForCheckout(Long userId, Integer points) {
        if (points == null || points <= 0) {
            return 0;
        }

        UserEntity user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay nguoi dung"));

        int userPoints = getCurrentPoints(user);
        int deducted = Math.min(userPoints, points);
        if (deducted <= 0) {
            return 0;
        }

        user.setLoyaltyPoints(userPoints - deducted);
        userRepository.save(user);

        loyaltyTransactionRepository.save(LoyaltyTransactionEntity.builder()
                .user(user)
                .amount(-deducted)
                .type("REDEEMED_CHECKOUT")
                .note("Dung diem giam gia khi thanh toan")
                .build());

        log.info("[Loyalty Service] Deducted {} points from user #{} at checkout", deducted, userId);
        return deducted;
    }

    @Override
    @Transactional
    public void refundPointsForCancellation(Long userId, Integer points) {
        if (points == null || points <= 0) {
            return;
        }

        UserEntity user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay nguoi dung"));

        user.setLoyaltyPoints(getCurrentPoints(user) + points);
        userRepository.save(user);

        loyaltyTransactionRepository.save(LoyaltyTransactionEntity.builder()
                .user(user)
                .amount(points)
                .type("REFUNDED_CANCELLATION")
                .note("Hoan diem tu don hang huy")
                .build());

        log.info("[Loyalty Service] Refunded {} points to user #{} due to cancellation", points, userId);
    }

    @Override
    @Transactional
    public void recalculateMembershipTier(Long userId) {
        UserEntity user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay nguoi dung"));

        // Tính chi tiêu từ đầu tháng này (UTC+7)
        java.time.ZonedDateTime nowZoned = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDateTime startOfMonth = nowZoned.withDayOfMonth(1)
                .withHour(0).withMinute(0).withSecond(0).withNano(0)
                .toLocalDateTime();

        BigDecimal totalSpent = orderRepository.calculateTotalSpendingSince(userId, startOfMonth);
        if (totalSpent == null) {
            totalSpent = BigDecimal.ZERO;
        }

        String newTier = DEFAULT_TIER;
        if (totalSpent.compareTo(new BigDecimal("4000000.00")) >= 0) {
            newTier = TIER_PLATINUM; // Hạng Kim Cương
        } else if (totalSpent.compareTo(new BigDecimal("2500000.00")) >= 0) {
            newTier = TIER_GOLD; // Hạng Vàng
        } else if (totalSpent.compareTo(new BigDecimal("1000000.00")) >= 0) {
            newTier = TIER_SILVER; // Hạng Bạc
        } else if (totalSpent.compareTo(new BigDecimal("500000.00")) >= 0) {
            newTier = DEFAULT_TIER; // Hạng Đồng (BRONZE)
        } else {
            newTier = "BRONZE";
        }

        String currentTier = normalizeTier(user.getMembershipTier());
        if (!newTier.equals(currentTier)) {
            user.setMembershipTier(newTier);
            userRepository.save(user);
            log.info("[Loyalty Service] User #{} membership tier updated from '{}' to '{}' based on spending {}",
                    userId, currentTier, newTier, totalSpent);
        }
    }

    @Override
    public boolean validateTierCoupon(UserEntity user, String couponCode) {
        if (couponCode == null || user == null) {
            return true;
        }

        String cleanCode = couponCode.trim().toUpperCase();
        String userTier = normalizeTier(user.getMembershipTier());

        if ("PLATINUM10".equals(cleanCode)) {
            return TIER_PLATINUM.equals(userTier);
        }

        if ("GOLD5".equals(cleanCode)) {
            return TIER_GOLD.equals(userTier) || TIER_PLATINUM.equals(userTier);
        }

        return true;
    }

    private int calculatePurchasePoints(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return 0;
        }

        return amount.multiply(PURCHASE_POINT_RATE).intValue();
    }

    private int getCurrentPoints(UserEntity user) {
        return Math.max(user.getLoyaltyPoints() == null ? 0 : user.getLoyaltyPoints(), 0);
    }

    private String normalizeTier(String tier) {
        if (tier == null || tier.isBlank()) {
            return DEFAULT_TIER;
        }

        return tier.trim().toUpperCase();
    }

    private String cleanNotePart(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        return value.trim();
    }
}
