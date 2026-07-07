package com.agri.ecommerce.controller.customer;

import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.loyalty.LoyaltyTransactionResponse;
import com.agri.ecommerce.entity.LoyaltyTransactionEntity;
import com.agri.ecommerce.repository.LoyaltyTransactionRepository;
import com.agri.ecommerce.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Customer Loyalty", description = "Customer loyalty point APIs")
@RestController
@RequestMapping("/api/customer/loyalty")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class LoyaltyController {

    private final LoyaltyTransactionRepository loyaltyTransactionRepository;

    @Operation(summary = "Get loyalty transaction history")
    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<List<LoyaltyTransactionResponse>>> getTransactionHistory(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<LoyaltyTransactionResponse> transactions = loyaltyTransactionRepository
                .findByUser_IdOrderByCreatedAtDesc(principal.getId())
                .stream()
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(
                ApiResponse.success("Lay lich su diem thanh cong", transactions, HttpStatus.OK.value())
        );
    }

    private LoyaltyTransactionResponse toResponse(LoyaltyTransactionEntity transaction) {
        return LoyaltyTransactionResponse.builder()
                .id(transaction.getId())
                .amount(transaction.getAmount())
                .type(transaction.getType())
                .note(transaction.getNote())
                .createdAt(transaction.getCreatedAt())
                .build();
    }
}
