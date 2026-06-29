package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.dashboard.*;
import com.agri.ecommerce.service.AdminDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@Tag(name = "Admin - Dashboard", description = "API tổng hợp số liệu vận hành cho dashboard admin")
@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @Operation(summary = "Lấy các chỉ số tổng quan cho dashboard admin")
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getSummary() {
        DashboardSummaryResponse response = adminDashboardService.getSummary();

        return ResponseEntity.ok(
                ApiResponse.success("Lấy số liệu tổng quan dashboard thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy số lượng đơn hàng theo trạng thái")
    @GetMapping("/order-statuses")
    public ResponseEntity<ApiResponse<List<OrderStatusCountResponse>>> getOrderStatusSummary() {
        List<OrderStatusCountResponse> response = adminDashboardService.getOrderStatusSummary();

        return ResponseEntity.ok(
                ApiResponse.success("Lấy thống kê trạng thái đơn hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy báo cáo doanh thu theo ngày hoặc tháng")
    @GetMapping("/revenue")
    public ResponseEntity<ApiResponse<RevenueReportResponse>> getRevenueReport(
            @Parameter(description = "Thời điểm bắt đầu ISO datetime", example = "2026-06-01T00:00:00")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime from,

            @Parameter(description = "Thời điểm kết thúc ISO datetime", example = "2026-06-30T23:59:59")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime to,

            @Parameter(description = "Nhóm dữ liệu theo day hoặc month", example = "day")
            @RequestParam(defaultValue = "day") String groupBy
    ) {
        RevenueReportResponse response = adminDashboardService.getRevenueReport(from, to, groupBy);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy báo cáo doanh thu thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy danh sách sản phẩm bán chạy")
    @GetMapping("/top-products")
    public ResponseEntity<ApiResponse<List<TopProductResponse>>> getTopProducts(
            @Parameter(description = "Thời điểm bắt đầu ISO datetime", example = "2026-06-01T00:00:00")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime from,

            @Parameter(description = "Thời điểm kết thúc ISO datetime", example = "2026-06-30T23:59:59")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime to,

            @Parameter(description = "Số sản phẩm cần lấy", example = "10")
            @RequestParam(defaultValue = "10") Integer limit
    ) {
        List<TopProductResponse> response = adminDashboardService.getTopProducts(from, to, limit);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách sản phẩm bán chạy thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy danh sách sản phẩm sắp hết hàng")
    @GetMapping("/low-stock-products")
    public ResponseEntity<ApiResponse<List<LowStockProductResponse>>> getLowStockProducts(
            @Parameter(description = "Ngưỡng tồn kho thấp", example = "10")
            @RequestParam(defaultValue = "10") Integer threshold,

            @Parameter(description = "Số sản phẩm cần lấy", example = "10")
            @RequestParam(defaultValue = "10") Integer limit
    ) {
        List<LowStockProductResponse> response = adminDashboardService.getLowStockProducts(threshold, limit);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách sản phẩm sắp hết hàng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Tìm kiếm toàn cục dữ liệu quản trị")
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<AdminSearchResponse>>> search(
            @Parameter(description = "Từ khóa tìm kiếm", example = "rau")
            @RequestParam String keyword
    ) {
        List<AdminSearchResponse> response = adminDashboardService.search(keyword);

        return ResponseEntity.ok(
                ApiResponse.success("Tìm kiếm dữ liệu quản trị thành công", response, HttpStatus.OK.value())
        );
    }
}
