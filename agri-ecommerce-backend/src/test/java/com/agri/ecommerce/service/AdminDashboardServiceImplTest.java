package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.response.dashboard.DashboardSummaryResponse;
import com.agri.ecommerce.repository.ContactRepository;
import com.agri.ecommerce.repository.CouponRepository;
import com.agri.ecommerce.repository.OrderItemRepository;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.repository.PaymentRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.repository.ReviewRepository;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.service.impl.AdminDashboardServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminDashboardServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private CouponRepository couponRepository;

    @InjectMocks
    private AdminDashboardServiceImpl dashboardService;

    @Test
    void getSummary_shouldCalculateTotalRevenueFromCompletedPayments() {
        when(paymentRepository.sumAmountByStatus("completed"))
                .thenReturn(new BigDecimal("125000.50"));

        DashboardSummaryResponse response = dashboardService.getSummary();

        assertThat(response.getTotalRevenue()).isEqualByComparingTo("125000.50");
        verify(paymentRepository).sumAmountByStatus("completed");
        verify(orderRepository, never()).sumTotalPriceByStatus("completed");
    }
}
