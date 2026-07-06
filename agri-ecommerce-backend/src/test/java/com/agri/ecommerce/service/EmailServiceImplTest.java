package com.agri.ecommerce.service;

import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.repository.OrderItemRepository;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.service.impl.EmailServiceImpl;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailServiceImplTest {

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private OrderRepository orderRepository;

    private EmailServiceImpl emailService;
    private HttpServer emailRelayServer;
    private final List<RecordedRequest> recordedRequests = new CopyOnWriteArrayList<>();

    @BeforeEach
    void setUp() {
        emailService = new EmailServiceImpl(orderItemRepository, orderRepository);
    }

    @AfterEach
    void tearDown() {
        if (emailRelayServer != null) {
            emailRelayServer.stop(0);
        }
    }

    @Test
    void sendOrderInvoice_whenGoogleScriptConfigured_shouldPostEmailPayloadToRelay() throws Exception {
        int port = startEmailRelayServer("{\"ok\":true,\"quotaRemaining\":99}");
        ReflectionTestUtils.setField(emailService, "emailProvider", "google-script");
        ReflectionTestUtils.setField(emailService, "configuredFromName", "AgriMarket");
        ReflectionTestUtils.setField(emailService, "replyToEmail", "agrimarket.ecommerce@gmail.com");
        ReflectionTestUtils.setField(emailService, "googleScriptSecret", "secret_test");
        ReflectionTestUtils.setField(emailService, "googleScriptUrl", "http://127.0.0.1:" + port + "/emails");

        OrderEntity order = order();
        when(orderRepository.findById(99L)).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrder_IdOrderByIdAsc(99L)).thenReturn(List.of());

        emailService.sendOrderInvoice(OrderEntity.builder().id(99L).build());

        assertThat(recordedRequests).hasSize(1);
        RecordedRequest request = recordedRequests.getFirst();
        assertThat(request.method()).isEqualTo("POST");
        assertThat(request.idempotencyKey()).isEqualTo("agri-order-invoice-99");
        assertThat(request.body()).contains("\"secret\":\"secret_test\"");
        assertThat(request.body()).contains("\"to\":\"customer@example.com\"");
        assertThat(request.body()).contains("\"name\":\"AgriMarket\"");
        assertThat(request.body()).contains("\"replyTo\":\"agrimarket.ecommerce@gmail.com\"");
        assertThat(request.body()).contains("\"trackingNumber\":\"LAU789\"");
        assertThat(request.body()).contains("\"source\":\"agri-ecommerce-backend\"");
    }

    private int startEmailRelayServer(String responseJson) throws IOException {
        emailRelayServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        emailRelayServer.createContext("/emails", exchange -> recordEmailRequest(exchange, responseJson));
        emailRelayServer.start();
        return emailRelayServer.getAddress().getPort();
    }

    private void recordEmailRequest(HttpExchange exchange, String responseJson) throws IOException {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        recordedRequests.add(new RecordedRequest(
                exchange.getRequestMethod(),
                exchange.getRequestHeaders().getFirst("Idempotency-Key"),
                body
        ));

        byte[] responseBody = responseJson.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, responseBody.length);
        exchange.getResponseBody().write(responseBody);
        exchange.close();
    }

    private OrderEntity order() {
        UserEntity user = UserEntity.builder()
                .id(7L)
                .name("Hung")
                .email("customer@example.com")
                .build();

        return OrderEntity.builder()
                .id(99L)
                .user(user)
                .subtotal(BigDecimal.valueOf(50000))
                .discountAmount(BigDecimal.ZERO)
                .shippingFee(BigDecimal.valueOf(75900))
                .totalPrice(BigDecimal.valueOf(125900))
                .status("pending")
                .shippingName("Hung")
                .shippingPhone("0799190183")
                .shippingAddressDetail("Do Nghia, Yen Nghia, Ha Dong")
                .shippingCity("Ha Noi")
                .trackingNumber("LAU789")
                .createdAt(LocalDateTime.of(2026, 7, 5, 15, 39))
                .build();
    }

    private record RecordedRequest(String method, String idempotencyKey, String body) {
    }
}
