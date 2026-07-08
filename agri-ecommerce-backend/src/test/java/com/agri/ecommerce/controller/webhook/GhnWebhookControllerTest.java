package com.agri.ecommerce.controller.webhook;

import com.agri.ecommerce.common.exception.GlobalExceptionHandler;
import com.agri.ecommerce.dto.request.webhook.GhnOrderStatusWebhookRequest;
import com.agri.ecommerce.dto.response.webhook.GhnWebhookResponse;
import com.agri.ecommerce.service.GhnWebhookService;
import com.agri.ecommerce.testsupport.ControllerTestSecurityConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GhnWebhookController.class)
@Import({ControllerTestSecurityConfig.class, GlobalExceptionHandler.class})
@TestPropertySource(properties = "app.shipping.ghn.webhook-secret=test-secret")
class GhnWebhookControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private GhnWebhookService ghnWebhookService;

    @Test
    void handleOrderStatus_withQuerySecret_shouldAcceptGhnPayload() throws Exception {
        when(ghnWebhookService.handleOrderStatus(any(GhnOrderStatusWebhookRequest.class)))
                .thenReturn(GhnWebhookResponse.builder()
                        .processed(true)
                        .orderId(99L)
                        .orderCode("LAUC3Y")
                        .ghnStatus("delivered")
                        .internalStatus("delivered")
                        .message("GHN status synchronized")
                        .build());

        mockMvc.perform(post("/api/webhooks/ghn")
                        .queryParam("secret", "test-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "OrderCode": "LAUC3Y",
                                  "Status": "delivered",
                                  "Type": "Switch_status",
                                  "Time": "2026-07-06T11:34:00Z"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderId").value(99))
                .andExpect(jsonPath("$.data.ghnStatus").value("delivered"))
                .andExpect(jsonPath("$.data.internalStatus").value("delivered"));
    }

    @Test
    void handleOrderStatus_withInvalidSecret_shouldRejectRequest() throws Exception {
        mockMvc.perform(post("/api/webhooks/ghn")
                        .queryParam("secret", "wrong-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));

        verify(ghnWebhookService, never()).handleOrderStatus(any(GhnOrderStatusWebhookRequest.class));
    }

    private GhnOrderStatusWebhookRequest request() {
        GhnOrderStatusWebhookRequest request = new GhnOrderStatusWebhookRequest();
        request.setOrderCode("LAUC3Y");
        request.setStatus("delivered");
        return request;
    }
}
