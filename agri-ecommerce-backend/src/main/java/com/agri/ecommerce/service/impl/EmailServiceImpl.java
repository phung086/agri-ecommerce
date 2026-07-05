package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.OrderItemEntity;
import com.agri.ecommerce.repository.OrderItemRepository;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.service.EmailService;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.Duration;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private static final Duration EMAIL_API_CONNECT_TIMEOUT = Duration.ofSeconds(10);
    private static final Duration EMAIL_API_REQUEST_TIMEOUT = Duration.ofSeconds(15);
    private static final int LOG_BODY_MAX_LENGTH = 500;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    private final OrderItemRepository orderItemRepository;
    private final OrderRepository orderRepository;
    private final HttpClient emailApiHttpClient = HttpClient.newBuilder()
            .connectTimeout(EMAIL_API_CONNECT_TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    @Value("${spring.mail.username:}")
    private String senderEmail;

    @Value("${app.email.provider:smtp}")
    private String emailProvider;

    @Value("${app.email.from:${spring.mail.username:}}")
    private String configuredFromEmail;

    @Value("${app.email.from-name:AgriMarket}")
    private String configuredFromName;

    @Value("${app.email.reply-to:}")
    private String replyToEmail;

    @Value("${app.email.resend.api-key:}")
    private String resendApiKey;

    @Value("${app.email.resend.api-url:https://api.resend.com/emails}")
    private String resendApiUrl;

    @Value("${app.email.google-script.url:}")
    private String googleScriptUrl;

    @Value("${app.email.google-script.secret:}")
    private String googleScriptSecret;

    @Async
    @Override
    @Transactional(readOnly = true)
    public void sendOrderInvoice(OrderEntity order) {
        if (order == null || order.getId() == null) {
            log.warn("[Email Service] Order is null, cannot send email invoice.");
            return;
        }

        OrderEntity invoiceOrder = orderRepository.findById(order.getId()).orElse(order);
        if (invoiceOrder.getUser() == null) {
            log.warn("[Email Service] Order #{} has no user, cannot send email invoice.", invoiceOrder.getId());
            return;
        }

        String recipientEmail = invoiceOrder.getUser().getEmail();
        if (recipientEmail == null || recipientEmail.trim().isBlank()) {
            log.warn("[Email Service] Recipient email is blank, skipping invoice send for Order #{}", invoiceOrder.getId());
            return;
        }

        List<OrderItemEntity> items = orderItemRepository.findByOrder_IdOrderByIdAsc(invoiceOrder.getId());
        String fromEmail = resolveFromEmail();
        String orderReference = invoiceOrder.getTrackingNumber() != null ? invoiceOrder.getTrackingNumber() : "#" + invoiceOrder.getId();
        String subject = "[AgriMarket] Hóa đơn xác nhận đơn đặt hàng " + orderReference;
        String htmlBody = buildInvoiceHtml(invoiceOrder, items);

        if (isResendProvider()) {
            sendWithResend(invoiceOrder, recipientEmail, fromEmail, subject, htmlBody);
            return;
        }

        if (isGoogleScriptProvider()) {
            String textBody = buildInvoiceText(invoiceOrder);
            sendWithGoogleScript(invoiceOrder, recipientEmail, subject, htmlBody, textBody);
            return;
        }

        if (mailSender == null || !hasText(fromEmail)) {
            log.info("[Email Service MOCK] 'spring.mail.username' or JavaMailSender is not configured. Logging order invoice instead.");
            log.info("[Email Service MOCK] Order ID: #{}", invoiceOrder.getId());
            log.info("[Email Service MOCK] Customer: {} ({})", invoiceOrder.getUser().getName(), recipientEmail);
            log.info("[Email Service MOCK] Subtotal: {}, Discount: {}, Shipping: {}, Total Price: {}", 
                    invoiceOrder.getSubtotal(), invoiceOrder.getDiscountAmount(), invoiceOrder.getShippingFee(), invoiceOrder.getTotalPrice());
            log.info("[Email Service MOCK] Items list:");
            items.forEach(item -> log.info("  - {} x {}: {}đ", 
                    item.getProduct() == null ? "Sản phẩm" : item.getProduct().getName(), item.getQuantity(), item.getPrice()));
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(recipientEmail);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("[Email Service] Invoice email sent successfully to {} for Order #{}", recipientEmail, invoiceOrder.getId());
        } catch (Exception e) {
            log.error("[Email Service] Failed to send email invoice for Order #{}: {}", invoiceOrder.getId(), e.getMessage(), e);
        }
    }

    private void sendWithResend(OrderEntity order, String recipientEmail, String fromEmail, String subject, String htmlBody) {
        if (!hasText(resendApiKey)) {
            log.error("[Email Service] EMAIL_PROVIDER=resend but RESEND_API_KEY is not configured. Skipping invoice email for Order #{}.", order.getId());
            return;
        }

        if (!hasText(fromEmail)) {
            log.error("[Email Service] EMAIL_PROVIDER=resend but MAIL_FROM/app.email.from is not configured. Skipping invoice email for Order #{}.", order.getId());
            return;
        }

        try {
            String payload = buildResendPayload(fromEmail, recipientEmail, subject, htmlBody, order.getId());
            HttpRequest request = HttpRequest.newBuilder(URI.create(resendApiUrl.trim()))
                    .timeout(EMAIL_API_REQUEST_TIMEOUT)
                    .header("Authorization", "Bearer " + resendApiKey.trim())
                    .header("Content-Type", "application/json")
                    .header("Idempotency-Key", "agri-order-invoice-" + order.getId())
                    .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = emailApiHttpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("[Email Service] Invoice email sent via Resend to {} for Order #{}", recipientEmail, order.getId());
                return;
            }

            log.error("[Email Service] Resend failed for Order #{} with HTTP {}: {}",
                    order.getId(), response.statusCode(), truncateForLog(response.body()));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("[Email Service] Resend email send interrupted for Order #{}: {}", order.getId(), e.getMessage(), e);
        } catch (Exception e) {
            log.error("[Email Service] Failed to send email invoice via Resend for Order #{}: {}", order.getId(), e.getMessage(), e);
        }
    }

    private void sendWithGoogleScript(OrderEntity order, String recipientEmail, String subject, String htmlBody, String textBody) {
        if (!hasText(googleScriptUrl)) {
            log.error("[Email Service] EMAIL_PROVIDER=google-script but GOOGLE_SCRIPT_MAIL_URL is not configured. Skipping invoice email for Order #{}.", order.getId());
            return;
        }

        if (!hasText(googleScriptSecret)) {
            log.error("[Email Service] EMAIL_PROVIDER=google-script but GOOGLE_SCRIPT_MAIL_SECRET is not configured. Skipping invoice email for Order #{}.", order.getId());
            return;
        }

        try {
            String payload = buildGoogleScriptPayload(order, recipientEmail, subject, htmlBody, textBody);
            HttpRequest request = HttpRequest.newBuilder(URI.create(googleScriptUrl.trim()))
                    .timeout(EMAIL_API_REQUEST_TIMEOUT)
                    .header("Content-Type", "application/json")
                    .header("Idempotency-Key", "agri-order-invoice-" + order.getId())
                    .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = emailApiHttpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            String responseBody = response.body();
            if (response.statusCode() >= 200 && response.statusCode() < 300 && responseBody != null && responseBody.contains("\"ok\":true")) {
                log.info("[Email Service] Invoice email sent via Google Apps Script to {} for Order #{}", recipientEmail, order.getId());
                return;
            }

            log.error("[Email Service] Google Apps Script mail relay failed for Order #{} with HTTP {}: {}",
                    order.getId(), response.statusCode(), truncateForLog(responseBody));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("[Email Service] Google Apps Script email send interrupted for Order #{}: {}", order.getId(), e.getMessage(), e);
        } catch (Exception e) {
            log.error("[Email Service] Failed to send email invoice via Google Apps Script for Order #{}: {}", order.getId(), e.getMessage(), e);
        }
    }

    private String buildResendPayload(String fromEmail, String recipientEmail, String subject, String htmlBody, Long orderId) {
        return "{"
                + "\"from\":" + toJsonString(fromEmail) + ","
                + "\"to\":[" + toJsonString(recipientEmail) + "],"
                + "\"subject\":" + toJsonString(subject) + ","
                + "\"html\":" + toJsonString(htmlBody) + ","
                + "\"tags\":[{\"name\":\"order_id\",\"value\":" + toJsonString(String.valueOf(orderId)) + "}]"
                + "}";
    }

    private String buildGoogleScriptPayload(OrderEntity order, String recipientEmail, String subject, String htmlBody, String textBody) {
        return "{"
                + "\"secret\":" + toJsonString(googleScriptSecret.trim()) + ","
                + "\"to\":" + toJsonString(recipientEmail) + ","
                + "\"subject\":" + toJsonString(subject) + ","
                + "\"htmlBody\":" + toJsonString(htmlBody) + ","
                + "\"textBody\":" + toJsonString(textBody) + ","
                + "\"name\":" + toJsonString(resolveFromName()) + ","
                + "\"replyTo\":" + toJsonString(resolveReplyTo()) + ","
                + "\"orderId\":" + toJsonString(String.valueOf(order.getId())) + ","
                + "\"trackingNumber\":" + toJsonString(order.getTrackingNumber()) + ","
                + "\"source\":" + toJsonString("agri-ecommerce-backend")
                + "}";
    }

    private String resolveFromEmail() {
        if (hasText(configuredFromEmail)) {
            return configuredFromEmail.trim();
        }

        return hasText(senderEmail) ? senderEmail.trim() : "";
    }

    private String resolveFromName() {
        return hasText(configuredFromName) ? configuredFromName.trim() : "AgriMarket";
    }

    private String resolveReplyTo() {
        if (hasText(replyToEmail)) {
            return replyToEmail.trim();
        }

        return hasText(senderEmail) ? senderEmail.trim() : "";
    }

    private boolean isResendProvider() {
        return "resend".equalsIgnoreCase(emailProvider == null ? "" : emailProvider.trim());
    }

    private boolean isGoogleScriptProvider() {
        return "google-script".equalsIgnoreCase(emailProvider == null ? "" : emailProvider.trim());
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isBlank();
    }

    private String toJsonString(String value) {
        if (value == null) {
            return "null";
        }

        StringBuilder escaped = new StringBuilder(value.length() + 2);
        escaped.append('"');
        for (int i = 0; i < value.length(); i++) {
            char current = value.charAt(i);
            switch (current) {
                case '"' -> escaped.append("\\\"");
                case '\\' -> escaped.append("\\\\");
                case '\b' -> escaped.append("\\b");
                case '\f' -> escaped.append("\\f");
                case '\n' -> escaped.append("\\n");
                case '\r' -> escaped.append("\\r");
                case '\t' -> escaped.append("\\t");
                default -> {
                    if (current < 0x20) {
                        escaped.append(String.format("\\u%04x", (int) current));
                    } else {
                        escaped.append(current);
                    }
                }
            }
        }
        escaped.append('"');
        return escaped.toString();
    }

    private String truncateForLog(String value) {
        if (value == null || value.length() <= LOG_BODY_MAX_LENGTH) {
            return value;
        }

        return value.substring(0, LOG_BODY_MAX_LENGTH) + "...";
    }

    private String buildInvoiceText(OrderEntity order) {
        NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));
        String orderReference = order.getTrackingNumber() != null ? order.getTrackingNumber() : "#" + order.getId();
        String recipientName = order.getShippingName() != null ? order.getShippingName() : order.getUser().getName();

        return "Cam on ban da dat hang tai AgriMarket.\n"
                + "Ma don hang: " + orderReference + "\n"
                + "Nguoi nhan: " + recipientName + "\n"
                + "Tong cong: " + currencyFormat.format(order.getTotalPrice()) + "\n"
                + "Don hang cua ban dang cho xu ly va se duoc cap nhat khi giao hang.";
    }

    private String buildInvoiceHtml(OrderEntity order, List<OrderItemEntity> items) {
        NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));
        
        StringBuilder itemsHtml = new StringBuilder();
        for (OrderItemEntity item : items) {
            BigDecimal price = item.getPrice() == null ? BigDecimal.ZERO : item.getPrice();
            int quantity = item.getQuantity() == null ? 0 : item.getQuantity();
            String productName = item.getProduct() == null ? "Sản phẩm" : item.getProduct().getName();
            BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(quantity));
            itemsHtml.append("<tr>")
                    .append("<td style='padding: 10px; border-bottom: 1px solid #ddd;'>").append(escapeHtml(productName)).append("</td>")
                    .append("<td style='padding: 10px; border-bottom: 1px solid #ddd; text-align: center;'>").append(quantity).append("</td>")
                    .append("<td style='padding: 10px; border-bottom: 1px solid #ddd; text-align: right;'>").append(currencyFormat.format(price)).append("</td>")
                    .append("<td style='padding: 10px; border-bottom: 1px solid #ddd; text-align: right;'>").append(currencyFormat.format(lineTotal)).append("</td>")
                    .append("</tr>");
        }

        String recipientName = order.getShippingName() != null ? order.getShippingName() : order.getUser().getName();
        String recipientPhone = order.getShippingPhone() != null ? order.getShippingPhone() : (order.getUser().getPhoneNumber() != null ? order.getUser().getPhoneNumber() : "N/A");
        String fullAddress = order.getShippingAddressDetail() != null ? order.getShippingAddressDetail() + ", " + order.getShippingCity() : (order.getShippingAddress() != null ? order.getShippingAddress().getAddress() + ", " + order.getShippingAddress().getCity() : "N/A");

        return "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);'>"
                + "  <div style='text-align: center; margin-bottom: 20px;'>"
                + "    <h2 style='color: #2e7d32; margin: 0;'>AgriMarket - Thực phẩm sạch & hữu cơ</h2>"
                + "    <p style='color: #666; font-size: 14px;'>Cảm ơn bạn đã tin dùng sản phẩm nông sản sạch của chúng tôi!</p>"
                + "  </div>"
                + "  <hr style='border: 0; border-top: 1px solid #eee; margin: 20px 0;'>"
                + "  <h3 style='color: #333;'>Thông tin hóa đơn đặt hàng " + (order.getTrackingNumber() != null ? order.getTrackingNumber() : "#" + order.getId()) + "</h3>"
                + "  <p style='font-size: 14px;'><strong>Ngày đặt hàng:</strong> " + escapeHtml(order.getCreatedAt()) + "</p>"
                + "  <div style='background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; font-size: 14px;'>"
                + "    <h4 style='margin-top: 0; color: #2e7d32;'>Thông tin nhận hàng:</h4>"
                + "    <p style='margin: 5px 0;'><strong>Người nhận:</strong> " + escapeHtml(recipientName) + "</p>"
                + "    <p style='margin: 5px 0;'><strong>Số điện thoại:</strong> " + escapeHtml(recipientPhone) + "</p>"
                + "    <p style='margin: 5px 0;'><strong>Địa chỉ giao hàng:</strong> " + escapeHtml(fullAddress) + "</p>"
                + "  </div>"
                + "  <table style='width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;'>"
                + "    <thead>"
                + "      <tr style='background-color: #f2f2f2;'>"
                + "        <th style='padding: 10px; text-align: left;'>Sản phẩm</th>"
                + "        <th style='padding: 10px; text-align: center;'>SL</th>"
                + "        <th style='padding: 10px; text-align: right;'>Đơn giá</th>"
                + "        <th style='padding: 10px; text-align: right;'>Thành tiền</th>"
                + "      </tr>"
                + "    </thead>"
                + "    <tbody>"
                + itemsHtml.toString()
                + "    </tbody>"
                + "  </table>"
                + "  <div style='text-align: right; font-size: 14px; line-height: 1.6;'>"
                + "    <p style='margin: 5px 0;'><strong>Tạm tính:</strong> " + currencyFormat.format(order.getSubtotal()) + "</p>"
                + "    <p style='margin: 5px 0; color: #d32f2f;'><strong>Khuyến mãi:</strong> -" + currencyFormat.format(order.getDiscountAmount()) + "</p>"
                + "    <p style='margin: 5px 0;'><strong>Phí giao hàng:</strong> " + currencyFormat.format(order.getShippingFee()) + "</p>"
                + "    <hr style='border: 0; border-top: 1px solid #eee; margin: 10px 0;'>"
                + "    <p style='margin: 5px 0; font-size: 16px; color: #2e7d32;'><strong>Tổng cộng:</strong> " + currencyFormat.format(order.getTotalPrice()) + "</p>"
                + "  </div>"
                + "  <div style='text-align: center; margin-top: 30px; font-size: 12px; color: #888;'>"
                + "    <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với bộ phận CSKH AgriMarket.</p>"
                + "    <p>© 2026 AgriMarket. All rights reserved.</p>"
                + "  </div>"
                + "</div>";
    }

    private String escapeHtml(Object value) {
        if (value == null) {
            return "";
        }

        return String.valueOf(value)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
