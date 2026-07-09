package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.OrderItemEntity;
import com.agri.ecommerce.entity.PaymentEntity;
import com.agri.ecommerce.repository.OrderItemRepository;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.repository.PaymentRepository;
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

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.Duration;
import java.time.LocalDateTime;
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
    private final PaymentRepository paymentRepository;
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
        String recipientEmail = resolveRecipientEmail(invoiceOrder);
        if (!hasText(recipientEmail)) {
            log.warn("[Email Service] Recipient email is blank, skipping invoice send for Order #{}", invoiceOrder.getId());
            return;
        }

        List<OrderItemEntity> items = orderItemRepository.findByOrder_IdOrderByIdAsc(invoiceOrder.getId());
        PaymentEntity payment = paymentRepository.findFirstByOrder_IdOrderByCreatedAtDesc(invoiceOrder.getId()).orElse(null);
        String fromEmail = resolveFromEmail();
        String orderReference = invoiceOrder.getTrackingNumber() != null ? invoiceOrder.getTrackingNumber() : "#" + invoiceOrder.getId();
        String subject = "[AgriMarket] Hóa đơn thanh toán đơn hàng " + orderReference;
        String htmlBody = buildInvoiceHtml(invoiceOrder, items, payment);
        String textBody = buildInvoiceText(invoiceOrder, payment);

        if (isGoogleScriptProvider()) {
            sendWithGoogleScript(invoiceOrder, recipientEmail, subject, htmlBody, textBody);
            return;
        }

        if (mailSender == null || !hasText(fromEmail)) {
            log.info("[Email Service MOCK] Mail is not configured. Order #{}, customer {}, payment {} / {}, total {}",
                    invoiceOrder.getId(), recipientEmail, paymentMethodLabel(payment), paymentStatusLabel(payment), invoiceOrder.getTotalPrice());
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(recipientEmail.trim());
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("[Email Service] Invoice email sent successfully to {} for Order #{}", recipientEmail, invoiceOrder.getId());
        } catch (Exception e) {
            log.error("[Email Service] Failed to send email invoice for Order #{}: {}", invoiceOrder.getId(), e.getMessage(), e);
        }
    }

    @Async
    @Override
    @Transactional(readOnly = true)
    public void sendOrderStatusUpdate(OrderEntity order, String statusTitle, String statusDescription) {
        if (order == null || order.getId() == null) {
            log.warn("[Email Service] Order is null, cannot send status email update.");
            return;
        }

        OrderEntity targetOrder = orderRepository.findById(order.getId()).orElse(order);
        String recipientEmail = resolveRecipientEmail(targetOrder);
        if (!hasText(recipientEmail)) {
            log.warn("[Email Service] Recipient email is blank, skipping status update for Order #{}", targetOrder.getId());
            return;
        }

        String fromEmail = resolveFromEmail();
        String orderReference = targetOrder.getTrackingNumber() != null ? targetOrder.getTrackingNumber() : "#" + targetOrder.getId();
        String subject = "[AgriMarket] Cập nhật trạng thái đơn hàng " + orderReference + ": " + statusTitle;
        String htmlBody = buildStatusUpdateHtml(targetOrder, statusTitle, statusDescription);

        if (isGoogleScriptProvider()) {
            String textBody = "Đơn hàng " + orderReference + " của bạn đã cập nhật: " + statusTitle + ". " + statusDescription;
            sendWithGoogleScript(targetOrder, recipientEmail, subject, htmlBody, textBody);
            return;
        }

        if (mailSender == null || !hasText(fromEmail)) {
            log.info("[Email Service MOCK] Status update for Order #{}: {} - {}", targetOrder.getId(), statusTitle, statusDescription);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(recipientEmail.trim());
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("[Email Service] Status update email sent successfully to {} for Order #{}", recipientEmail, targetOrder.getId());
        } catch (Exception e) {
            log.error("[Email Service] Failed to send status update email for Order #{}: {}", targetOrder.getId(), e.getMessage(), e);
        }
    }

    private String buildInvoiceText(OrderEntity order, PaymentEntity payment) {
        NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));
        String orderReference = order.getTrackingNumber() != null ? order.getTrackingNumber() : "#" + order.getId();
        String couponLine = hasText(order.getCouponCode()) ? "Mã giảm giá: " + order.getCouponCode().trim() + "\n" : "";
        return "Cảm ơn bạn đã đặt hàng tại AgriMarket.\n"
                + "Mã đơn hàng: " + orderReference + "\n"
                + "Trạng thái đơn hàng: " + orderStatusLabel(order.getStatus()) + "\n"
                + "Phương thức thanh toán: " + paymentMethodLabel(payment) + "\n"
                + "Trạng thái thanh toán: " + paymentStatusLabel(payment) + "\n"
                + "Mã giao dịch: " + valueOrDash(payment == null ? null : payment.getTransactionId()) + "\n"
                + couponLine
                + "Tạm tính: " + currencyFormat.format(nullToZero(order.getSubtotal())) + "\n"
                + "Giảm giá: -" + currencyFormat.format(nullToZero(order.getDiscountAmount())) + "\n"
                + "Phí giao hàng: " + currencyFormat.format(nullToZero(order.getShippingFee())) + "\n"
                + "Tổng thanh toán: " + currencyFormat.format(nullToZero(order.getTotalPrice())) + "\n";
    }

    private String buildInvoiceHtml(OrderEntity order, List<OrderItemEntity> items, PaymentEntity payment) {
        NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));
        StringBuilder itemsHtml = new StringBuilder();
        for (OrderItemEntity item : items) {
            BigDecimal price = nullToZero(item.getPrice());
            int quantity = item.getQuantity() == null ? 0 : item.getQuantity();
            String productName = item.getProduct() == null ? "Sản phẩm" : item.getProduct().getName();
            BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(quantity));
            itemsHtml.append("<tr>")
                    .append("<td style='padding:10px;border-bottom:1px solid #ddd;'>").append(escapeHtml(productName)).append("</td>")
                    .append("<td style='padding:10px;border-bottom:1px solid #ddd;text-align:center;'>").append(quantity).append("</td>")
                    .append("<td style='padding:10px;border-bottom:1px solid #ddd;text-align:right;'>").append(currencyFormat.format(price)).append("</td>")
                    .append("<td style='padding:10px;border-bottom:1px solid #ddd;text-align:right;'>").append(currencyFormat.format(lineTotal)).append("</td>")
                    .append("</tr>");
        }

        String fullAddress = order.getShippingAddressDetail() != null
                ? order.getShippingAddressDetail() + ", " + valueOrDash(order.getShippingCity())
                : order.getShippingAddress() != null
                ? order.getShippingAddress().getAddress() + ", " + order.getShippingAddress().getCity()
                : "N/A";
        String orderReference = order.getTrackingNumber() != null ? order.getTrackingNumber() : "#" + order.getId();
        String couponCode = hasText(order.getCouponCode()) ? order.getCouponCode().trim() : "Không áp dụng";
        String formattedCreatedAt = formatVietnamTime(order.getCreatedAt());
        String formattedPaidAt = payment == null ? "Chưa ghi nhận" : formatVietnamTime(payment.getPaidAt());

        return "<div style='font-family:Arial,sans-serif;max-width:680px;margin:auto;padding:22px;border:1px solid #e5e7eb;border-radius:10px;'>"
                + "<div style='text-align:center;margin-bottom:18px;'>"
                + "<h2 style='color:#047857;margin:0;'>AgriMarket - Hóa đơn thanh toán</h2>"
                + "<p style='color:#64748b;font-size:14px;'>Cảm ơn bạn đã tin dùng nông sản sạch của chúng tôi.</p>"
                + "</div>"
                + "<h3 style='color:#111827;'>Thông tin đơn hàng " + escapeHtml(orderReference) + "</h3>"
                + "<p><strong>Ngày đặt hàng:</strong> " + escapeHtml(formattedCreatedAt) + "</p>"
                + "<div style='background:#ecfdf5;border:1px solid #a7f3d0;padding:14px;border-radius:8px;margin:14px 0;'>"
                + "<p style='margin:4px 0;'><strong>Trạng thái đơn hàng:</strong> " + escapeHtml(orderStatusLabel(order.getStatus())) + "</p>"
                + "<p style='margin:4px 0;'><strong>Phương thức thanh toán:</strong> " + escapeHtml(paymentMethodLabel(payment)) + "</p>"
                + "<p style='margin:4px 0;'><strong>Trạng thái thanh toán:</strong> " + escapeHtml(paymentStatusLabel(payment)) + "</p>"
                + "<p style='margin:4px 0;'><strong>Mã giao dịch:</strong> " + escapeHtml(valueOrDash(payment == null ? null : payment.getTransactionId())) + "</p>"
                + "<p style='margin:4px 0;'><strong>Thời gian thanh toán:</strong> " + escapeHtml(formattedPaidAt) + "</p>"
                + "</div>"
                + "<div style='background:#f8fafc;padding:14px;border-radius:8px;margin-bottom:18px;'>"
                + "<h4 style='margin-top:0;color:#047857;'>Thông tin nhận hàng</h4>"
                + "<p><strong>Người nhận:</strong> " + escapeHtml(resolveRecipientName(order)) + "</p>"
                + "<p><strong>Số điện thoại:</strong> " + escapeHtml(resolveRecipientPhone(order)) + "</p>"
                + "<p><strong>Địa chỉ giao hàng:</strong> " + escapeHtml(fullAddress) + "</p>"
                + "</div>"
                + "<table style='width:100%;border-collapse:collapse;font-size:14px;margin-bottom:18px;'>"
                + "<thead><tr style='background:#f1f5f9;'><th style='padding:10px;text-align:left;'>Sản phẩm</th><th style='padding:10px;text-align:center;'>SL</th><th style='padding:10px;text-align:right;'>Đơn giá</th><th style='padding:10px;text-align:right;'>Thành tiền</th></tr></thead>"
                + "<tbody>" + itemsHtml + "</tbody></table>"
                + "<div style='text-align:right;font-size:14px;line-height:1.7;'>"
                + "<p><strong>Tạm tính:</strong> " + currencyFormat.format(nullToZero(order.getSubtotal())) + "</p>"
                + "<p><strong>Mã giảm giá:</strong> " + escapeHtml(couponCode) + "</p>"
                + "<p style='color:#dc2626;'><strong>Giảm giá:</strong> -" + currencyFormat.format(nullToZero(order.getDiscountAmount())) + "</p>"
                + "<p><strong>Phí giao hàng:</strong> " + currencyFormat.format(nullToZero(order.getShippingFee())) + "</p>"
                + "<hr style='border:0;border-top:1px solid #e5e7eb;margin:10px 0;'>"
                + "<p style='font-size:17px;color:#047857;'><strong>Tổng thanh toán:</strong> " + currencyFormat.format(nullToZero(order.getTotalPrice())) + "</p>"
                + "</div>"
                + "<p style='text-align:center;margin-top:28px;font-size:12px;color:#64748b;'>Nếu bạn có câu hỏi, vui lòng liên hệ CSKH AgriMarket.</p>"
                + "</div>";
    }

    private String buildStatusUpdateHtml(OrderEntity order, String statusTitle, String statusDescription) {
        String recipientName = resolveRecipientName(order);
        String orderReference = order.getTrackingNumber() != null ? order.getTrackingNumber() : "#" + order.getId();
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eee;'>"
                + "<h2 style='color:#2e7d32;'>AgriMarket - Cập nhật đơn hàng</h2>"
                + "<h3>Đơn hàng " + escapeHtml(orderReference) + "</h3>"
                + "<p><strong>Xin chào:</strong> " + escapeHtml(recipientName) + "</p>"
                + "<p style='font-size:16px;color:#2e7d32;'><strong>Trạng thái mới:</strong> " + escapeHtml(statusTitle) + "</p>"
                + "<p>" + escapeHtml(statusDescription) + "</p>"
                + "<p style='font-size:12px;color:#888;'>© 2026 AgriMarket.</p>"
                + "</div>";
    }

    private void sendWithGoogleScript(OrderEntity order, String recipientEmail, String subject, String htmlBody, String textBody) {
        if (!hasText(googleScriptUrl) || !hasText(googleScriptSecret)) {
            log.error("[Email Service] Google Script email provider is missing URL/secret. Skipping email for Order #{}.", order.getId());
            return;
        }

        try {
            String payload = buildGoogleScriptPayload(order, recipientEmail, subject, htmlBody, textBody);
            HttpRequest request = HttpRequest.newBuilder(URI.create(googleScriptUrl.trim()))
                    .timeout(EMAIL_API_REQUEST_TIMEOUT)
                    .header("Content-Type", "application/json")
                    .header("Idempotency-Key", "agri-order-invoice-" + order.getId() + "-" + System.currentTimeMillis())
                    .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = emailApiHttpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            String responseBody = response.body();
            if (response.statusCode() >= 200 && response.statusCode() < 300 && responseBody != null && responseBody.contains("\"ok\":true")) {
                log.info("[Email Service] Email sent via Google Apps Script to {} for Order #{}", recipientEmail, order.getId());
                return;
            }
            log.error("[Email Service] Google Apps Script mail relay failed for Order #{} with HTTP {}: {}", order.getId(), response.statusCode(), truncateForLog(responseBody));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("[Email Service] Google Apps Script email send interrupted for Order #{}: {}", order.getId(), e.getMessage(), e);
        } catch (Exception e) {
            log.error("[Email Service] Failed to send email via Google Apps Script for Order #{}: {}", order.getId(), e.getMessage(), e);
        }
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

    private String paymentMethodLabel(PaymentEntity payment) {
        String method = payment == null ? "cash" : payment.getPaymentMethod();
        if (method == null) return "Không xác định";
        return switch (method.trim().toLowerCase(Locale.ROOT)) {
            case "vnpay" -> "VNPay Sandbox";
            case "cash", "cod" -> "Thanh toán khi nhận hàng (COD)";
            case "paypal" -> "PayPal";
            default -> method;
        };
    }

    private String paymentStatusLabel(PaymentEntity payment) {
        String status = payment == null ? "pending" : payment.getStatus();
        if (status == null) return "Chờ thanh toán";
        return switch (status.trim().toLowerCase(Locale.ROOT)) {
            case "completed", "paid" -> "Đã thanh toán";
            case "failed" -> "Thanh toán thất bại";
            case "refunded" -> "Đã hoàn tiền";
            default -> "Chờ thanh toán";
        };
    }

    private String orderStatusLabel(String status) {
        if (status == null) return "Chờ xử lý";
        return switch (status.trim().toLowerCase(Locale.ROOT)) {
            case "processing" -> "Đang xử lý";
            case "out_for_delivery" -> "Đang giao hàng";
            case "delivered" -> "Đã giao hàng";
            case "completed" -> "Hoàn tất";
            case "canceled" -> "Đã hủy";
            default -> "Chờ xử lý";
        };
    }

    private String formatVietnamTime(LocalDateTime value) {
        if (value == null) return "Chưa ghi nhận";
        try {
            return value.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
        } catch (Exception ex) {
            return String.valueOf(value);
        }
    }

    private BigDecimal nullToZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String valueOrDash(String value) {
        return hasText(value) ? value.trim() : "-";
    }

    private String resolveRecipientEmail(OrderEntity order) {
        if (order == null) return "";
        if (order.getUser() != null && hasText(order.getUser().getEmail())) return order.getUser().getEmail().trim();
        return hasText(order.getGuestEmail()) ? order.getGuestEmail().trim() : "";
    }

    private String resolveRecipientName(OrderEntity order) {
        if (order == null) return "Quý khách";
        if (hasText(order.getShippingName())) return order.getShippingName().trim();
        if (order.getUser() != null && hasText(order.getUser().getName())) return order.getUser().getName().trim();
        return "Quý khách";
    }

    private String resolveRecipientPhone(OrderEntity order) {
        if (order == null) return "N/A";
        if (hasText(order.getShippingPhone())) return order.getShippingPhone().trim();
        if (order.getUser() != null && hasText(order.getUser().getPhoneNumber())) return order.getUser().getPhoneNumber().trim();
        return "N/A";
    }

    private String resolveFromEmail() {
        if (hasText(configuredFromEmail)) return configuredFromEmail.trim();
        return hasText(senderEmail) ? senderEmail.trim() : "";
    }

    private String resolveFromName() {
        return hasText(configuredFromName) ? configuredFromName.trim() : "AgriMarket";
    }

    private String resolveReplyTo() {
        if (hasText(replyToEmail)) return replyToEmail.trim();
        return hasText(senderEmail) ? senderEmail.trim() : "";
    }

    private boolean isGoogleScriptProvider() {
        return "google-script".equalsIgnoreCase(emailProvider == null ? "" : emailProvider.trim());
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isBlank();
    }

    private String toJsonString(String value) {
        if (value == null) return "null";
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
                    if (current < 0x20) escaped.append(String.format("\\u%04x", (int) current));
                    else escaped.append(current);
                }
            }
        }
        escaped.append('"');
        return escaped.toString();
    }

    private String truncateForLog(String value) {
        if (value == null || value.length() <= LOG_BODY_MAX_LENGTH) return value;
        return value.substring(0, LOG_BODY_MAX_LENGTH) + "...";
    }

    private String escapeHtml(Object value) {
        if (value == null) return "";
        return String.valueOf(value)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
