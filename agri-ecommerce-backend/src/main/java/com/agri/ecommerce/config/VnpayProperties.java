package com.agri.ecommerce.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.payment.vnpay")
public class VnpayProperties {

    private String payUrl;

    private String tmnCode;

    private String hashSecret;

    private String returnUrl;

    private String version = "2.1.0";

    private String command = "pay";

    private String currencyCode = "VND";

    private String orderType = "other";

    private String locale = "vn";

    private int expireMinutes = 15;
}
