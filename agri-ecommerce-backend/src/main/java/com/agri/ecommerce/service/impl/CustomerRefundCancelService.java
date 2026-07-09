package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.dto.request.order.RefundCancelRequest;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.OrderItemEntity;
import com.agri.ecommerce.entity.OrderStatusHistoryEntity;
import com.agri.ecommerce.entity.PaymentEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.mapper.OrderMapper;
import com.agri.ecommerce.repository.OrderItemRepository;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.repository.OrderStatusHistoryRepository;
import com.agri.ecommerce.repository.PaymentRepository;
import com.agri.ecommerce.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerRefundCancelService {

    private static final String ORDER_PENDING = "pending";
    private static final String ORDER_CANCELED = "canceled";
    private static final String PAYMENT_COMPLETED = "completed";
    private static final String PAYMENT_REFUND_REQUESTED = "refund_requested";
    private static final String PAYMENT_METHOD_VNPAY = "vnpay";
    private static final String IN_STOCK_STATUS = "in_stock";
    private static final String HIDDEN_STATUS = "hidden";

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final PaymentRepository paymentRepository;
    private final ProductRepository productRepository;
    private final OrderMapper orderMapper;

    @Transactional
    public OrderResponse requestRefundAndCancel(Long userId, Long orderId, RefundCancelRequest request) {
        OrderEntity order = orderRepository.findByIdAndUserIdForUpdate(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));

        if (!ORDER_PENDING.equalsIgnoreCase(order.getStatus())) {
            throw new BadRequestException("Chỉ có thể hủy đơn hàng đang chờ xử lý");
        }

        PaymentEntity payment = paymentRepository.findByOrderIdForUpdateOrderByCreatedAtDesc(orderId)
                .stream()
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Không tìm thấy thông tin thanh toán của đơn hàng"));

        if (!PAYMENT_METHOD_VNPAY.equalsIgnoreCase(payment.getPaymentMethod())) {
            throw new BadRequestException("Yêu cầu hoàn tiền chỉ áp dụng cho đơn thanh toán qua VNPay");
        }

        if (!PAYMENT_COMPLETED.equalsIgnoreCase(payment.getStatus())) {
            throw new BadRequestException("Đơn VNPay chưa ghi nhận thanh toán thành công nên chưa cần hoàn tiền");
        }

        validateRefundRequest(request);

        List<OrderItemEntity> orderItems = orderItemRepository.findByOrder_IdOrderByIdAsc(orderId);
        restoreProductStock(orderItems);

        order.setStatus(ORDER_CANCELED);
        OrderEntity savedOrder = orderRepository.save(order);

        payment.setStatus(PAYMENT_REFUND_REQUESTED);
        paymentRepository.save(payment);

        OrderStatusHistoryEntity refundHistory = orderStatusHistoryRepository.save(OrderStatusHistoryEntity.builder()
                .order(savedOrder)
                .status(ORDER_CANCELED)
                .changedAt(LocalDateTime.now())
                .note(buildRefundNote(request))
                .build());

        List<OrderStatusHistoryEntity> history = orderStatusHistoryRepository.findByOrder_IdOrderByChangedAtAsc(orderId);
        if (history.stream().noneMatch(item -> item.getId().equals(refundHistory.getId()))) {
            history = new java.util.ArrayList<>(history);
            history.add(refundHistory);
        }

        return orderMapper.toOrderResponse(savedOrder, orderItems, payment, history);
    }

    private void restoreProductStock(List<OrderItemEntity> orderItems) {
        List<ProductEntity> products = orderItems.stream()
                .map(OrderItemEntity::getProduct)
                .filter(product -> product != null && product.getId() != null)
                .toList();

        for (OrderItemEntity item : orderItems) {
            ProductEntity product = item.getProduct();
            if (product == null) {
                continue;
            }
            int currentStock = product.getStock() == null ? 0 : product.getStock();
            int quantity = item.getQuantity() == null ? 0 : item.getQuantity();
            product.setStock(currentStock + quantity);
            if (!HIDDEN_STATUS.equalsIgnoreCase(product.getStatus())) {
                product.setStatus(IN_STOCK_STATUS);
            }
        }

        if (!products.isEmpty()) {
            productRepository.saveAll(products);
        }
    }

    private void validateRefundRequest(RefundCancelRequest request) {
        if (request == null) {
            throw new BadRequestException("Vui lòng nhập thông tin ngân hàng để hoàn tiền");
        }
        if (isBlank(request.getBankName()) || isBlank(request.getBankAccountNumber()) || isBlank(request.getBankAccountHolder())) {
            throw new BadRequestException("Vui lòng nhập đầy đủ ngân hàng, số tài khoản và tên chủ tài khoản");
        }
    }

    private String buildRefundNote(RefundCancelRequest request) {
        String reason = isBlank(request.getReason()) ? "Khách hàng yêu cầu hủy đơn đã thanh toán." : request.getReason().trim();
        return "Yêu cầu hủy đơn VNPay đã thanh toán. Hệ thống đã ghi nhận thông tin hoàn tiền: "
                + request.getBankName().trim()
                + " - STK " + request.getBankAccountNumber().trim()
                + " - Chủ TK " + request.getBankAccountHolder().trim()
                + ". Lý do: " + reason;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }
}
