package com.agri.ecommerce.service;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.config.VnpayProperties;
import com.agri.ecommerce.dto.request.order.CheckoutRequest;
import com.agri.ecommerce.dto.request.order.OrderStatusNoteRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.entity.CartItemEntity;
import com.agri.ecommerce.entity.CouponEntity;
import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.OrderItemEntity;
import com.agri.ecommerce.entity.OrderStatusHistoryEntity;
import com.agri.ecommerce.entity.PaymentEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.ShippingAddressEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.mapper.OrderMapper;
import com.agri.ecommerce.mapper.ShippingAddressMapper;
import com.agri.ecommerce.repository.CartItemRepository;
import com.agri.ecommerce.repository.CouponRepository;
import com.agri.ecommerce.repository.OrderItemRepository;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.repository.OrderStatusHistoryRepository;
import com.agri.ecommerce.repository.PaymentRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.repository.ShippingAddressRepository;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.repository.InventoryBatchRepository;
import com.agri.ecommerce.repository.InventoryTransactionRepository;
import com.agri.ecommerce.service.impl.OrderServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OrderServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private OrderStatusHistoryRepository orderStatusHistoryRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private ShippingAddressRepository shippingAddressRepository;

    @Mock
    private CouponRepository couponRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private InventoryBatchRepository inventoryBatchRepository;

    @Mock
    private InventoryTransactionRepository inventoryTransactionRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private PaymentService paymentService;

    @Mock
    private OrderMapper orderMapper;

    @Mock
    private ShippingAddressMapper shippingAddressMapper;

    @Mock
    private ShippingCarrierService shippingCarrierService;

    @Mock
    private VnpayProperties vnpayProperties;

    @Mock
    private EmailService emailService;

    @Mock
    private LoyaltyService loyaltyService;

    @InjectMocks
    private OrderServiceImpl orderService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(orderService, "emailService", emailService);
        ReflectionTestUtils.setField(orderService, "loyaltyService", loyaltyService);
        when(loyaltyService.validateTierCoupon(any(UserEntity.class), any())).thenReturn(true);
        when(loyaltyService.deductPointsForCheckout(any(Long.class), any(Integer.class)))
                .thenAnswer(invocation -> invocation.getArgument(1, Integer.class));
    }

    @Test
    void checkout_whenCartEmpty_shouldThrow400() {
        // Given
        CheckoutRequest request = checkoutRequest("cash");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user()));
        when(shippingAddressRepository.findByIdAndUser_Id(20L, 1L)).thenReturn(Optional.of(address()));
        when(cartItemRepository.findByUser_IdOrderByCreatedAtDesc(1L)).thenReturn(List.of());

        // When / Then
        assertThatThrownBy(() -> orderService.checkout(1L, request))
                .isInstanceOf(BadRequestException.class);
        verify(orderRepository, never()).save(any(OrderEntity.class));
    }

    @Test
    void checkout_whenProductOutOfStock_shouldThrowException() {
        // Given
        CheckoutRequest request = checkoutRequest("cash");
        ProductEntity product = product("in_stock", 0);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user()));
        when(shippingAddressRepository.findByIdAndUser_Id(20L, 1L)).thenReturn(Optional.of(address()));
        when(cartItemRepository.findByUser_IdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(cartItem(product, 1)));
        when(productRepository.findAllByIdInForUpdate(anyIdCollection())).thenReturn(List.of(product));

        // When / Then
        assertThatThrownBy(() -> orderService.checkout(1L, request))
                .isInstanceOf(BadRequestException.class);
        verify(orderRepository, never()).save(any(OrderEntity.class));
    }

    @Test
    void checkout_withValidCodOrder_shouldReturnOrderWithTrackingNumber() {
        // Given
        CheckoutRequest request = checkoutRequest("cash");
        ProductEntity product = product("in_stock", 5);
        stubSuccessfulCheckout(product);
        when(shippingCarrierService.createShippingLabel(any(OrderEntity.class))).thenReturn("GHN-123");

        // When
        OrderResponse response = orderService.checkout(1L, request);

        // Then
        assertThat(response.getTrackingNumber()).isEqualTo("GHN-123");
        assertThat(product.getStock()).isEqualTo(3);
        verify(shippingCarrierService).createShippingLabel(any(OrderEntity.class));
        verify(emailService).sendOrderInvoice(any(OrderEntity.class));
        verify(cartItemRepository).deleteByUser_Id(1L);
    }

    @Test
    void checkout_withVnpayOrder_shouldNotCallGhn() {
        // Given
        CheckoutRequest request = checkoutRequest("vnpay");
        ProductEntity product = product("in_stock", 5);
        when(vnpayProperties.getPayUrl()).thenReturn("https://vnpay.test");
        when(vnpayProperties.getTmnCode()).thenReturn("tmn");
        when(vnpayProperties.getHashSecret()).thenReturn("secret");
        when(vnpayProperties.getReturnUrl()).thenReturn("https://return.test");
        stubSuccessfulCheckout(product);

        // When
        OrderResponse response = orderService.checkout(1L, request);

        // Then
        assertThat(response.getId()).isEqualTo(100L);
        verify(shippingCarrierService, never()).createShippingLabel(any(OrderEntity.class));
        verify(emailService, never()).sendOrderInvoice(any(OrderEntity.class));
    }

    @Test
    void cancelOrder_whenStatusIsPending_shouldSucceed() {
        // Given
        OrderStatusNoteRequest request = new OrderStatusNoteRequest();
        request.setNote("Customer changed mind");
        ProductEntity product = product("out_of_stock", 0);
        OrderEntity order = order("pending");
        PaymentEntity payment = payment(order, "pending");
        OrderItemEntity item = orderItem(order, product, 2);
        when(orderRepository.findByIdAndUserIdForUpdate(100L, 1L)).thenReturn(Optional.of(order));
        when(paymentRepository.findFirstByOrder_IdOrderByCreatedAtDesc(100L)).thenReturn(Optional.of(payment));
        when(orderItemRepository.findByOrder_IdOrderByIdAsc(100L)).thenReturn(List.of(item));
        when(productRepository.findAllByIdInForUpdate(anyIdCollection())).thenReturn(List.of(product));
        when(orderRepository.save(order)).thenReturn(order);
        when(paymentRepository.save(payment)).thenReturn(payment);
        when(orderStatusHistoryRepository.save(any(OrderStatusHistoryEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(orderStatusHistoryRepository.findByOrder_IdOrderByChangedAtAsc(100L)).thenReturn(List.of());
        when(orderMapper.toOrderResponse(eq(order), anyList(), eq(payment), anyList()))
                .thenReturn(OrderResponse.builder().id(100L).status("canceled").build());

        // When
        OrderResponse response = orderService.cancelOrder(1L, 100L, request);

        // Then
        assertThat(response.getStatus()).isEqualTo("canceled");
        assertThat(order.getStatus()).isEqualTo("canceled");
        assertThat(payment.getStatus()).isEqualTo("failed");
        assertThat(product.getStock()).isEqualTo(2);
        verify(productRepository).saveAll(anyProductIterable());
        verify(notificationService).createNotification(eq(1L), eq("order"), any(), eq("/orders/100"));
    }

    @Test
    void cancelOrder_whenStatusIsNotPending_shouldThrowException() {
        // Given
        when(orderRepository.findByIdAndUserIdForUpdate(100L, 1L)).thenReturn(Optional.of(order("confirmed")));

        // When / Then
        assertThatThrownBy(() -> orderService.cancelOrder(1L, 100L, null))
                .isInstanceOf(BadRequestException.class);
        verify(paymentRepository, never()).findFirstByOrder_IdOrderByCreatedAtDesc(100L);
    }

    @Test
    void cancelOrder_whenPaymentCompleted_shouldThrowException() {
        // Given
        OrderEntity order = order("pending");
        PaymentEntity payment = payment(order, "completed");
        when(orderRepository.findByIdAndUserIdForUpdate(100L, 1L)).thenReturn(Optional.of(order));
        when(paymentRepository.findFirstByOrder_IdOrderByCreatedAtDesc(100L)).thenReturn(Optional.of(payment));

        // When / Then
        assertThatThrownBy(() -> orderService.cancelOrder(1L, 100L, null))
                .isInstanceOf(BadRequestException.class);
        verify(orderItemRepository, never()).findByOrder_IdOrderByIdAsc(100L);
    }

    @Test
    void getOrders_shouldReturnPaginatedResult() {
        // Given
        OrderEntity order = order("pending");
        OrderResponse mapped = OrderResponse.builder().id(100L).status("pending").build();
        when(orderRepository.findByUser_Id(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(order), PageRequest.of(0, 10), 1));
        when(orderItemRepository.findByOrder_IdInOrderByIdAsc(List.of(100L))).thenReturn(List.of());
        when(paymentRepository.findByOrder_IdInOrderByCreatedAtDesc(List.of(100L))).thenReturn(List.of());
        when(orderMapper.toOrderResponse(order, List.of(), null, List.of())).thenReturn(mapped);

        // When
        PageResponse<OrderResponse> response = orderService.getOrders(1L, 0, 10, "createdAt,desc");

        // Then
        assertThat(response.getContent()).containsExactly(mapped);
        assertThat(response.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getOrder_whenNotOwner_shouldThrowNotFoundException() {
        // Given
        when(orderRepository.findByIdAndUser_Id(100L, 1L)).thenReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> orderService.getOrder(1L, 100L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void previewCheckout_withProductDiscountCoupon_shouldOnlyDiscountSpecificProduct() {
        ProductEntity p1 = ProductEntity.builder().id(1L).name("Rau muong").price(new BigDecimal("10000.00")).stock(10).status("in_stock").build();
        ProductEntity p2 = ProductEntity.builder().id(2L).name("Thit heo").price(new BigDecimal("100000.00")).stock(5).status("in_stock").build();
        
        CheckoutRequest request = new CheckoutRequest();
        request.setShippingAddressId(20L);
        request.setPaymentMethod("cash");
        request.setCouponCode("SALE_RAU");
                
        CouponEntity coupon = CouponEntity.builder()
                .code("SALE_RAU")
                .couponType("PRODUCT_DISCOUNT")
                .discountType("PERCENTAGE")
                .discountPercentage(20)
                .productId(1L)
                .active(true)
                .startsAt(java.time.LocalDateTime.now().minusDays(1))
                .expiresAt(java.time.LocalDateTime.now().plusDays(2))
                .build();
                
        when(userRepository.findById(1L)).thenReturn(Optional.of(user()));
        when(shippingAddressRepository.findByIdAndUser_Id(20L, 1L)).thenReturn(Optional.of(address()));
        
        CartItemEntity item1 = CartItemEntity.builder().product(p1).quantity(2).build(); 
        CartItemEntity item2 = CartItemEntity.builder().product(p2).quantity(1).build(); 
        
        when(cartItemRepository.findByUser_IdOrderByCreatedAtDesc(1L)).thenReturn(List.of(item1, item2));
        when(couponRepository.findByCodeIgnoreCase("SALE_RAU")).thenReturn(Optional.of(coupon));
        when(shippingCarrierService.calculateShippingFee(any(), any(), any(), any(Double.class))).thenReturn(BigDecimal.ZERO);
        
        var response = orderService.previewCheckout(1L, request);
        
        assertThat(response.isCouponValid()).isTrue();
        assertThat(response.getDiscountAmount().setScale(0)).isEqualTo(new BigDecimal("4000"));
        assertThat(response.getTotalPrice().setScale(0)).isEqualTo(new BigDecimal("116000"));
    }

    @Test
    void checkout_withProductOrderFreeshipAndPoints_shouldStackControlledDiscounts() {
        CheckoutRequest request = checkoutRequest("cash");
        request.setCouponCode("MEAT10K,SILVER10,FREESHIP");
        request.setUsePoints(true);

        UserEntity user = user();
        user.setLoyaltyPoints(40000);
        ProductEntity meat = ProductEntity.builder()
                .id(1L)
                .name("Thit heo")
                .price(new BigDecimal("100000.00"))
                .stock(5)
                .status("in_stock")
                .build();
        ProductEntity fish = ProductEntity.builder()
                .id(2L)
                .name("Ca basa")
                .price(new BigDecimal("50000.00"))
                .stock(5)
                .status("in_stock")
                .build();

        CouponEntity productCoupon = CouponEntity.builder()
                .code("MEAT10K")
                .couponType("PRODUCT_DISCOUNT")
                .discountType("FIXED_AMOUNT")
                .discountAmount(new BigDecimal("10000.00"))
                .discountPercentage(0)
                .productId(1L)
                .active(true)
                .timesUsed(0)
                .usageLimit(100)
                .startsAt(java.time.LocalDateTime.now().minusDays(1))
                .expiresAt(java.time.LocalDateTime.now().plusDays(7))
                .build();
        CouponEntity tierCoupon = CouponEntity.builder()
                .code("SILVER10")
                .couponType("ORDER_DISCOUNT")
                .discountType("PERCENTAGE")
                .discountPercentage(10)
                .minOrderValue(new BigDecimal("100000.00"))
                .active(true)
                .timesUsed(0)
                .usageLimit(100)
                .startsAt(java.time.LocalDateTime.now().minusDays(1))
                .expiresAt(java.time.LocalDateTime.now().plusDays(7))
                .build();
        CouponEntity freeshipCoupon = CouponEntity.builder()
                .code("FREESHIP")
                .couponType("FREESHIP")
                .discountType("FIXED_AMOUNT")
                .discountPercentage(0)
                .discountAmount(BigDecimal.ZERO)
                .active(true)
                .timesUsed(0)
                .usageLimit(100)
                .startsAt(java.time.LocalDateTime.now().minusDays(1))
                .expiresAt(java.time.LocalDateTime.now().plusDays(7))
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(shippingAddressRepository.findByIdAndUser_Id(20L, 1L)).thenReturn(Optional.of(address()));
        when(cartItemRepository.findByUser_IdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(cartItem(meat, 1), cartItem(fish, 1)));
        when(productRepository.findAllByIdInForUpdate(anyIdCollection())).thenReturn(List.of(meat, fish));
        when(shippingCarrierService.calculateShippingFee(any(), any(), any(), any(Double.class)))
                .thenReturn(new BigDecimal("30000.00"));
        when(couponRepository.findByCodeIgnoreCaseForUpdate("MEAT10K")).thenReturn(Optional.of(productCoupon));
        when(couponRepository.findByCodeIgnoreCaseForUpdate("SILVER10")).thenReturn(Optional.of(tierCoupon));
        when(couponRepository.findByCodeIgnoreCaseForUpdate("FREESHIP")).thenReturn(Optional.of(freeshipCoupon));
        when(shippingCarrierService.createShippingLabel(any(OrderEntity.class))).thenReturn("GHN-STACK");
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> {
            OrderEntity order = invocation.getArgument(0);
            if (order.getId() == null) {
                order.setId(100L);
            }
            return order;
        });
        when(orderItemRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentRepository.save(any(PaymentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderStatusHistoryRepository.save(any(OrderStatusHistoryEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(orderMapper.toOrderResponse(any(OrderEntity.class), anyList(), any(PaymentEntity.class), anyList()))
                .thenAnswer(invocation -> {
                    OrderEntity order = invocation.getArgument(0);
                    return OrderResponse.builder()
                            .id(order.getId())
                            .couponCode(order.getCouponCode())
                            .discountAmount(order.getDiscountAmount())
                            .shippingFee(order.getShippingFee())
                            .pointsUsed(order.getPointsUsed())
                            .totalPrice(order.getTotalPrice())
                            .trackingNumber(order.getTrackingNumber())
                            .build();
                });

        OrderResponse response = orderService.checkout(1L, request);

        assertThat(response.getCouponCode()).isEqualTo("MEAT10K,SILVER10,FREESHIP");
        assertThat(response.getDiscountAmount()).isEqualByComparingTo("55000.00");
        assertThat(response.getShippingFee()).isEqualByComparingTo("0.00");
        assertThat(response.getPointsUsed()).isEqualTo(30000);
        assertThat(response.getTotalPrice()).isEqualByComparingTo("95000.00");
        assertThat(response.getTrackingNumber()).isEqualTo("GHN-STACK");
        assertThat(productCoupon.getTimesUsed()).isEqualTo(1);
        assertThat(tierCoupon.getTimesUsed()).isEqualTo(1);
        assertThat(freeshipCoupon.getTimesUsed()).isEqualTo(1);
    }

    @SuppressWarnings("unchecked")
    private Collection<Long> anyIdCollection() {
        return any(Collection.class);
    }

    @SuppressWarnings("unchecked")
    private Iterable<ProductEntity> anyProductIterable() {
        return any(Iterable.class);
    }

    private void stubSuccessfulCheckout(ProductEntity product) {
        UserEntity user = user();
        ShippingAddressEntity address = address();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(shippingAddressRepository.findByIdAndUser_Id(20L, 1L)).thenReturn(Optional.of(address));
        when(cartItemRepository.findByUser_IdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(cartItem(product, 2)));
        when(productRepository.findAllByIdInForUpdate(anyIdCollection())).thenReturn(List.of(product));
        when(shippingCarrierService.calculateShippingFee("Hanoi", "Ha Dong", "Duong Noi", 1000.0d))
                .thenReturn(new BigDecimal("30000.00"));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> {
            OrderEntity order = invocation.getArgument(0);
            if (order.getId() == null) {
                order.setId(100L);
            }
            return order;
        });
        when(orderItemRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentRepository.save(any(PaymentEntity.class))).thenAnswer(invocation -> {
            PaymentEntity payment = invocation.getArgument(0);
            payment.setId(7L);
            return payment;
        });
        when(orderStatusHistoryRepository.save(any(OrderStatusHistoryEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(orderMapper.toOrderResponse(any(OrderEntity.class), anyList(), any(PaymentEntity.class), anyList()))
                .thenAnswer(invocation -> {
                    OrderEntity order = invocation.getArgument(0);
                    return OrderResponse.builder()
                            .id(order.getId())
                            .status(order.getStatus())
                            .trackingNumber(order.getTrackingNumber())
                            .build();
                });
    }

    private CheckoutRequest checkoutRequest(String paymentMethod) {
        CheckoutRequest request = new CheckoutRequest();
        request.setShippingAddressId(20L);
        request.setPaymentMethod(paymentMethod);
        return request;
    }

    private UserEntity user() {
        return UserEntity.builder()
                .id(1L)
                .name("Test User")
                .email("user@test.com")
                .phoneNumber("0987654321")
                .build();
    }

    private ShippingAddressEntity address() {
        return ShippingAddressEntity.builder()
                .id(20L)
                .user(user())
                .fullName("Test User")
                .phone("0987654321")
                .address("123 Farm Road, Duong Noi, Ha Dong")
                .city("Hanoi")
                .defaultAddress(true)
                .build();
    }

    private ProductEntity product(String status, int stock) {
        return ProductEntity.builder()
                .id(10L)
                .name("Tomato")
                .slug("tomato")
                .price(new BigDecimal("50000.00"))
                .stock(stock)
                .status(status)
                .build();
    }

    private CartItemEntity cartItem(ProductEntity product, int quantity) {
        return CartItemEntity.builder()
                .id(1L)
                .user(user())
                .product(product)
                .quantity(quantity)
                .build();
    }

    private OrderEntity order(String status) {
        return OrderEntity.builder()
                .id(100L)
                .user(user())
                .shippingAddress(address())
                .subtotal(new BigDecimal("100000.00"))
                .discountAmount(BigDecimal.ZERO)
                .shippingFee(new BigDecimal("30000.00"))
                .totalPrice(new BigDecimal("130000.00"))
                .status(status)
                .build();
    }

    private PaymentEntity payment(OrderEntity order, String status) {
        return PaymentEntity.builder()
                .id(7L)
                .order(order)
                .paymentMethod("cash")
                .amount(order.getTotalPrice())
                .status(status)
                .build();
    }

    private OrderItemEntity orderItem(OrderEntity order, ProductEntity product, int quantity) {
        return OrderItemEntity.builder()
                .id(8L)
                .order(order)
                .product(product)
                .quantity(quantity)
                .price(product.getPrice())
                .build();
    }

    @Test
    void checkout_withUsePoints_shouldDeductPointsAndReduceTotalPrice() {
        CheckoutRequest request = checkoutRequest("cash");
        request.setUsePoints(true);

        UserEntity user = user();
        user.setLoyaltyPoints(5000); // 5000 points available

        ProductEntity product = product("in_stock", 20);
        CartItemEntity item = cartItem(product, 1); // 1 * 50,000 = 50,000 subtotal (below 100k, shipping fee applies)

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(shippingAddressRepository.findByIdAndUser_Id(any(), eq(1L))).thenReturn(Optional.of(address()));
        when(cartItemRepository.findByUser_IdOrderByCreatedAtDesc(1L)).thenReturn(List.of(item));
        when(productRepository.findAllByIdInForUpdate(any())).thenReturn(List.of(product));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentRepository.save(any(PaymentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderStatusHistoryRepository.save(any(OrderStatusHistoryEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderMapper.toOrderResponse(any(OrderEntity.class), anyList(), any(PaymentEntity.class), anyList()))
                .thenAnswer(invocation -> {
                    OrderEntity order = invocation.getArgument(0);
                    return OrderResponse.builder()
                            .pointsUsed(order.getPointsUsed())
                            .discountAmount(order.getDiscountAmount())
                            .totalPrice(order.getTotalPrice())
                            .build();
                });

        OrderResponse response = orderService.checkout(1L, request);

        verify(loyaltyService).deductPointsForCheckout(eq(1L), eq(5000));
        assertThat(response.getPointsUsed()).isEqualTo(5000);
        assertThat(response.getDiscountAmount()).isEqualByComparingTo("5000.00");
        assertThat(response.getTotalPrice()).isEqualByComparingTo("70000.00");
    }
}
