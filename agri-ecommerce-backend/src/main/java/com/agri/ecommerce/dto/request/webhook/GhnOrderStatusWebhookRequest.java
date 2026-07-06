package com.agri.ecommerce.dto.request.webhook;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class GhnOrderStatusWebhookRequest {

    @NotBlank
    @JsonAlias({"OrderCode", "order_code"})
    private String orderCode;

    @NotBlank
    @JsonAlias({"Status", "status"})
    private String status;

    @JsonAlias({"Type", "type"})
    private String type;

    @JsonAlias({"Time", "time"})
    private String time;

    @JsonAlias({"Reason", "reason"})
    private String reason;

    @JsonAlias({"ReasonCode", "reason_code"})
    private String reasonCode;

    @JsonAlias({"Description", "description"})
    private String description;
}
