package com.agri.ecommerce.service;

import com.agri.ecommerce.entity.LoyaltyTransactionEntity;
import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.repository.LoyaltyTransactionRepository;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.service.impl.LoyaltyServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoyaltyServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private LoyaltyTransactionRepository loyaltyTransactionRepository;

    @InjectMocks
    private LoyaltyServiceImpl loyaltyService;

    @Test
    void deductPointsForCheckout_shouldReturnActualDeductedPoints() {
        UserEntity user = UserEntity.builder()
                .id(1L)
                .loyaltyPoints(3000)
                .membershipTier("BRONZE")
                .build();
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(user));

        int deducted = loyaltyService.deductPointsForCheckout(1L, 5000);

        assertThat(deducted).isEqualTo(3000);
        assertThat(user.getLoyaltyPoints()).isZero();

        ArgumentCaptor<LoyaltyTransactionEntity> transactionCaptor =
                ArgumentCaptor.forClass(LoyaltyTransactionEntity.class);
        verify(loyaltyTransactionRepository).save(transactionCaptor.capture());
        assertThat(transactionCaptor.getValue().getAmount()).isEqualTo(-3000);
        assertThat(transactionCaptor.getValue().getType()).isEqualTo("REDEEMED_CHECKOUT");
    }

    @Test
    void awardPointsForPurchase_shouldAwardOncePerOrder() {
        UserEntity user = UserEntity.builder()
                .id(1L)
                .loyaltyPoints(100)
                .membershipTier("BRONZE")
                .build();
        OrderEntity order = OrderEntity.builder()
                .id(99L)
                .user(user)
                .totalPrice(new BigDecimal("130000.00"))
                .pointsEarned(0)
                .build();
        when(orderRepository.findByIdForUpdate(99L)).thenReturn(Optional.of(order));
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(orderRepository.calculateTotalSpendingSince(any(), any())).thenReturn(BigDecimal.ZERO);

        loyaltyService.awardPointsForPurchase(1L, 99L, order.getTotalPrice());

        assertThat(order.getPointsEarned()).isEqualTo(1300);
        assertThat(user.getLoyaltyPoints()).isEqualTo(1400);

        ArgumentCaptor<LoyaltyTransactionEntity> transactionCaptor =
                ArgumentCaptor.forClass(LoyaltyTransactionEntity.class);
        verify(loyaltyTransactionRepository).save(transactionCaptor.capture());
        assertThat(transactionCaptor.getValue().getAmount()).isEqualTo(1300);
        assertThat(transactionCaptor.getValue().getType()).isEqualTo("EARNED_PURCHASE");
    }

    @Test
    void awardPointsForPurchase_whenOrderAlreadyAwarded_shouldSkip() {
        OrderEntity order = OrderEntity.builder()
                .id(99L)
                .pointsEarned(500)
                .build();
        when(orderRepository.findByIdForUpdate(99L)).thenReturn(Optional.of(order));

        loyaltyService.awardPointsForPurchase(1L, 99L, new BigDecimal("100000.00"));

        verify(userRepository, never()).findByIdForUpdate(1L);
        verify(loyaltyTransactionRepository, never()).save(any());
    }
}
