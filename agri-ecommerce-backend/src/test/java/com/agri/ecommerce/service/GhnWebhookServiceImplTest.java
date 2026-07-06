package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.webhook.GhnOrderStatusWebhookRequest;
import com.agri.ecommerce.dto.response.webhook.GhnWebhookResponse;
import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.OrderStatusHistoryEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.repository.OrderStatusHistoryRepository;
import com.agri.ecommerce.service.impl.GhnWebhookServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GhnWebhookServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderStatusHistoryRepository orderStatusHistoryRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private PaymentService paymentService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private GhnWebhookServiceImpl ghnWebhookService;

    @Test
    void handleOrderStatus_whenDelivered_shouldUpdateInternalStatusAndNotifyCustomer() {
        OrderEntity order = order("out_for_delivery", "delivering");
        when(orderRepository.findByTrackingNumberForUpdate("LAUC3Y")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderStatusHistoryRepository.save(any(OrderStatusHistoryEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        GhnWebhookResponse response = ghnWebhookService.handleOrderStatus(request("LAUC3Y", "delivered"));

        assertThat(response.isProcessed()).isTrue();
        assertThat(response.isIgnored()).isFalse();
        assertThat(response.getOrderId()).isEqualTo(99L);
        assertThat(response.getGhnStatus()).isEqualTo("delivered");
        assertThat(response.getInternalStatus()).isEqualTo("delivered");
        assertThat(order.getShippingProvider()).isEqualTo("GHN");
        assertThat(order.getShippingStatus()).isEqualTo("delivered");
        assertThat(order.getShippingStatusUpdatedAt()).isNotNull();
        assertThat(order.getStatus()).isEqualTo("delivered");
        assertThat(order.getDeliveredAt()).isNotNull();

        verify(paymentService).completeCashPaymentIfPending(99L);
        verify(notificationService).createNotification(
                7L,
                "order",
                "Đơn hàng #99 đã được GHN giao thành công.",
                "/orders/99"
        );
        verify(emailService).sendOrderStatusUpdate(
                order,
                "GHN giao hàng thành công",
                "Đơn hàng #99 đã được GHN giao thành công."
        );

        ArgumentCaptor<OrderStatusHistoryEntity> historyCaptor = ArgumentCaptor.forClass(OrderStatusHistoryEntity.class);
        verify(orderStatusHistoryRepository).save(historyCaptor.capture());
        assertThat(historyCaptor.getValue().getStatus()).isEqualTo("delivered");
        assertThat(historyCaptor.getValue().getNote()).contains("GHN webhook");
        assertThat(historyCaptor.getValue().getNote()).contains("delivering");
        assertThat(historyCaptor.getValue().getNote()).contains("out_for_delivery -> delivered");
    }

    @Test
    void handleOrderStatus_whenDuplicateStatus_shouldIgnoreWithoutSavingAgain() {
        OrderEntity order = order("delivered", "delivered");
        when(orderRepository.findByTrackingNumberForUpdate("LAUC3Y")).thenReturn(Optional.of(order));

        GhnWebhookResponse response = ghnWebhookService.handleOrderStatus(request("LAUC3Y", "delivered"));

        assertThat(response.isProcessed()).isFalse();
        assertThat(response.isIgnored()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Duplicate GHN status ignored");
        verify(orderRepository, never()).save(any(OrderEntity.class));
        verify(orderStatusHistoryRepository, never()).save(any(OrderStatusHistoryEntity.class));
        verify(notificationService, never()).createNotification(any(), any(), any(), any());
        verify(emailService, never()).sendOrderStatusUpdate(any(), any(), any());
    }

    @Test
    void handleOrderStatus_whenTrackingNumberMissing_shouldReturnIgnoredResponse() {
        when(orderRepository.findByTrackingNumberForUpdate("LAUC3Y")).thenReturn(Optional.empty());

        GhnWebhookResponse response = ghnWebhookService.handleOrderStatus(request("LAUC3Y", "delivering"));

        assertThat(response.isProcessed()).isFalse();
        assertThat(response.isIgnored()).isTrue();
        assertThat(response.getOrderCode()).isEqualTo("LAUC3Y");
        assertThat(response.getGhnStatus()).isEqualTo("delivering");
        verify(orderRepository, never()).save(any(OrderEntity.class));
    }

    private GhnOrderStatusWebhookRequest request(String orderCode, String status) {
        GhnOrderStatusWebhookRequest request = new GhnOrderStatusWebhookRequest();
        request.setOrderCode(orderCode);
        request.setStatus(status);
        request.setType("Switch_status");
        request.setTime("2026-07-06T11:34:00Z");
        return request;
    }

    private OrderEntity order(String status, String shippingStatus) {
        return OrderEntity.builder()
                .id(99L)
                .user(UserEntity.builder().id(7L).name("Hung").email("hung@example.com").build())
                .trackingNumber("LAUC3Y")
                .status(status)
                .shippingStatus(shippingStatus)
                .build();
    }
}
