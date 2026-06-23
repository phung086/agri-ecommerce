package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.response.dashboard.*;
import com.agri.ecommerce.entity.CategoryEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.UserStatus;
import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.repository.*;
import com.agri.ecommerce.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminDashboardServiceImpl implements AdminDashboardService {

    private static final String ROLE_CUSTOMER = "customer";
    private static final String PRODUCT_STATUS_HIDDEN = "hidden";
    private static final String PRODUCT_STATUS_IN_STOCK = "in_stock";
    private static final String PRODUCT_STATUS_OUT_OF_STOCK = "out_of_stock";
    private static final String PAYMENT_STATUS_COMPLETED = "completed";
    private static final String ORDER_STATUS_PENDING = "pending";
    private static final String ORDER_STATUS_PROCESSING = "processing";
    private static final String ORDER_STATUS_READY_FOR_DELIVERY = "ready_for_delivery";
    private static final String ORDER_STATUS_OUT_FOR_DELIVERY = "out_for_delivery";
    private static final String ORDER_STATUS_DELIVERED = "delivered";
    private static final String ORDER_STATUS_COMPLETED = "completed";
    private static final String ORDER_STATUS_CANCELED = "canceled";
    private static final String GROUP_BY_DAY = "day";
    private static final String GROUP_BY_MONTH = "month";
    private static final int DEFAULT_REPORT_DAYS = 30;
    private static final int DEFAULT_LOW_STOCK_THRESHOLD = 10;
    private static final int DEFAULT_LIMIT = 10;
    private static final int MAX_LIMIT = 100;
    private static final Set<String> SELLING_ORDER_STATUSES = Set.of(ORDER_STATUS_DELIVERED, ORDER_STATUS_COMPLETED);
    private static final List<String> ORDER_STATUSES = List.of(
            ORDER_STATUS_PENDING,
            ORDER_STATUS_PROCESSING,
            ORDER_STATUS_READY_FOR_DELIVERY,
            ORDER_STATUS_OUT_FOR_DELIVERY,
            ORDER_STATUS_DELIVERED,
            ORDER_STATUS_COMPLETED,
            ORDER_STATUS_CANCELED
    );

    private final OrderRepository orderRepository;

    private final PaymentRepository paymentRepository;

    private final OrderItemRepository orderItemRepository;

    private final ProductRepository productRepository;

    private final UserRepository userRepository;

    private final ReviewRepository reviewRepository;

    private final ContactRepository contactRepository;

    private final CouponRepository couponRepository;

    @Override
    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime tomorrowStart = todayStart.plusDays(1);
        long totalReviews = reviewRepository.count();
        double averageRating = totalReviews == 0 ? 0 : roundOneDecimal(reviewRepository.getAverageRating());

        return DashboardSummaryResponse.builder()
                .totalOrders(orderRepository.count())
                .todayOrders(orderRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(todayStart, tomorrowStart))
                .pendingOrders(orderRepository.countByStatus(ORDER_STATUS_PENDING))
                .processingOrders(orderRepository.countByStatus(ORDER_STATUS_PROCESSING))
                .readyForDeliveryOrders(orderRepository.countByStatus(ORDER_STATUS_READY_FOR_DELIVERY))
                .outForDeliveryOrders(orderRepository.countByStatus(ORDER_STATUS_OUT_FOR_DELIVERY))
                .deliveredOrders(orderRepository.countByStatus(ORDER_STATUS_DELIVERED))
                .completedOrders(orderRepository.countByStatus(ORDER_STATUS_COMPLETED))
                .canceledOrders(orderRepository.countByStatus(ORDER_STATUS_CANCELED))
                .completedPayments(paymentRepository.countByStatus(PAYMENT_STATUS_COMPLETED))
                .totalRevenue(safeMoney(paymentRepository.sumAmountByStatus(PAYMENT_STATUS_COMPLETED)))
                .todayRevenue(safeMoney(paymentRepository.sumAmountByStatusAndPaidAtRange(PAYMENT_STATUS_COMPLETED, todayStart, tomorrowStart)))
                .totalCustomers(userRepository.countByRole_Name(ROLE_CUSTOMER))
                .activeCustomers(userRepository.countByRole_NameAndStatus(ROLE_CUSTOMER, UserStatus.active))
                .totalProducts(productRepository.countByStatusNot(PRODUCT_STATUS_HIDDEN))
                .activeProducts(productRepository.countByStatus(PRODUCT_STATUS_IN_STOCK))
                .outOfStockProducts(productRepository.countByStatus(PRODUCT_STATUS_OUT_OF_STOCK))
                .lowStockProducts(productRepository.countByStockLessThanEqualAndStatusNot(DEFAULT_LOW_STOCK_THRESHOLD, PRODUCT_STATUS_HIDDEN))
                .pendingContacts(contactRepository.countByRepliedFalse())
                .activeCoupons(couponRepository.countByActiveTrue())
                .availableCoupons(couponRepository.countAvailableCoupons(now))
                .totalReviews(totalReviews)
                .averageRating(averageRating)
                .generatedAt(now)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderStatusCountResponse> getOrderStatusSummary() {
        Map<String, Long> totalByStatus = orderRepository.countOrdersByStatus()
                .stream()
                .collect(Collectors.toMap(
                        row -> stringValue(row[0]),
                        row -> longValue(row[1])
                ));

        return ORDER_STATUSES.stream()
                .map(status -> OrderStatusCountResponse.builder()
                        .status(status)
                        .totalOrders(totalByStatus.getOrDefault(status, 0L))
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public RevenueReportResponse getRevenueReport(LocalDateTime from, LocalDateTime to, String groupBy) {
        DateRange range = normalizeDateRange(from, to);
        String normalizedGroupBy = normalizeGroupBy(groupBy);
        List<Object[]> rows = GROUP_BY_MONTH.equals(normalizedGroupBy)
                ? paymentRepository.sumCompletedRevenueByMonth(PAYMENT_STATUS_COMPLETED, range.from(), range.to())
                : paymentRepository.sumCompletedRevenueByDay(PAYMENT_STATUS_COMPLETED, range.from(), range.to());

        List<RevenueReportPointResponse> points = rows.stream()
                .map(row -> RevenueReportPointResponse.builder()
                        .period(stringValue(row[0]))
                        .revenue(safeMoney(moneyValue(row[1])))
                        .completedPayments(longValue(row[2]))
                        .build())
                .toList();
        BigDecimal totalRevenue = points.stream()
                .map(RevenueReportPointResponse::getRevenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        long totalCompletedPayments = points.stream()
                .mapToLong(RevenueReportPointResponse::getCompletedPayments)
                .sum();

        return RevenueReportResponse.builder()
                .from(range.from())
                .to(range.to())
                .groupBy(normalizedGroupBy)
                .totalRevenue(totalRevenue)
                .totalCompletedPayments(totalCompletedPayments)
                .points(points)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TopProductResponse> getTopProducts(LocalDateTime from, LocalDateTime to, Integer limit) {
        DateRange range = normalizeDateRange(from, to);
        int safeLimit = normalizeLimit(limit);

        return orderItemRepository.findTopSellingProducts(
                        SELLING_ORDER_STATUSES,
                        range.from(),
                        range.to(),
                        PageRequest.of(0, safeLimit)
                )
                .stream()
                .map(row -> TopProductResponse.builder()
                        .productId(longValue(row[0]))
                        .productName(stringValue(row[1]))
                        .productSlug(stringValue(row[2]))
                        .quantitySold(longValue(row[3]))
                        .revenue(safeMoney(moneyValue(row[4])))
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<LowStockProductResponse> getLowStockProducts(Integer threshold, Integer limit) {
        int safeThreshold = threshold == null ? DEFAULT_LOW_STOCK_THRESHOLD : threshold;
        if (safeThreshold < 0) {
            throw new BadRequestException("threshold phải lớn hơn hoặc bằng 0");
        }

        int safeLimit = normalizeLimit(limit);
        return productRepository.findByStockLessThanEqualAndStatusNotOrderByStockAscCreatedAtDesc(
                        safeThreshold,
                        PRODUCT_STATUS_HIDDEN,
                        PageRequest.of(0, safeLimit)
                )
                .stream()
                .map(this::toLowStockProductResponse)
                .toList();
    }

    private LowStockProductResponse toLowStockProductResponse(ProductEntity product) {
        CategoryEntity category = product.getCategory();

        return LowStockProductResponse.builder()
                .productId(product.getId())
                .productName(product.getName())
                .productSlug(product.getSlug())
                .categoryId(category == null ? null : category.getId())
                .categoryName(category == null ? null : category.getName())
                .stock(product.getStock())
                .unit(product.getUnit())
                .status(product.getStatus())
                .price(product.getPrice())
                .build();
    }

    private DateRange normalizeDateRange(LocalDateTime from, LocalDateTime to) {
        LocalDateTime safeTo = to == null ? LocalDateTime.now() : to;
        LocalDateTime safeFrom = from == null ? safeTo.minusDays(DEFAULT_REPORT_DAYS) : from;

        if (safeFrom.isAfter(safeTo)) {
            throw new BadRequestException("from không được sau to");
        }

        return new DateRange(safeFrom, safeTo);
    }

    private String normalizeGroupBy(String groupBy) {
        String normalizedGroupBy = cleanBlank(groupBy);
        if (normalizedGroupBy == null) {
            return GROUP_BY_DAY;
        }

        normalizedGroupBy = normalizedGroupBy.toLowerCase(Locale.ROOT);
        if (!Set.of(GROUP_BY_DAY, GROUP_BY_MONTH).contains(normalizedGroupBy)) {
            throw new BadRequestException("groupBy không hợp lệ. Giá trị hợp lệ: day, month");
        }

        return normalizedGroupBy;
    }

    private int normalizeLimit(Integer limit) {
        int safeLimit = limit == null ? DEFAULT_LIMIT : limit;
        if (safeLimit < 1 || safeLimit > MAX_LIMIT) {
            throw new BadRequestException("limit phải nằm trong khoảng 1 đến " + MAX_LIMIT);
        }

        return safeLimit;
    }

    private BigDecimal safeMoney(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal moneyValue(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }

        if (value instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }

        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }

        return new BigDecimal(value.toString());
    }

    private Long longValue(Object value) {
        if (value == null) {
            return 0L;
        }

        if (value instanceof Number number) {
            return number.longValue();
        }

        return Long.parseLong(value.toString());
    }

    private String stringValue(Object value) {
        return value == null ? null : value.toString();
    }

    private double roundOneDecimal(Double value) {
        return BigDecimal.valueOf(value == null ? 0 : value)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }

    private record DateRange(LocalDateTime from, LocalDateTime to) {
    }
}
