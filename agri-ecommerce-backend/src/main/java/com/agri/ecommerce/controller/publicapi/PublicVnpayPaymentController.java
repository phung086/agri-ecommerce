package com.agri.ecommerce.controller.publicapi;

import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.payment.VnpayIpnResponse;
import com.agri.ecommerce.dto.response.payment.VnpayReturnResponse;
import com.agri.ecommerce.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "Public - VNPay", description = "Public callbacks for VNPay")
@RestController
@RequestMapping("/api/public/payments/vnpay")
@RequiredArgsConstructor
public class PublicVnpayPaymentController {

    private final PaymentService paymentService;

    @Operation(summary = "Verify VNPay return parameters for result page")
    @GetMapping("/return")
    public ResponseEntity<ApiResponse<VnpayReturnResponse>> verifyReturn(
            @RequestParam Map<String, String> params
    ) {
        VnpayReturnResponse response = paymentService.verifyVnpayReturn(params);

        return ResponseEntity.ok(
                ApiResponse.success("Xác thực kết quả VNPay thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "VNPay IPN endpoint")
    @GetMapping("/ipn")
    public ResponseEntity<VnpayIpnResponse> handleIpn(
            @RequestParam Map<String, String> params
    ) {
        return ResponseEntity.ok(paymentService.handleVnpayIpn(params));
    }
}
