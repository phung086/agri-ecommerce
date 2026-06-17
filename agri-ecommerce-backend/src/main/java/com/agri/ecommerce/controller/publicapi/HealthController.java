package com.agri.ecommerce.controller.publicapi;

import com.agri.ecommerce.dto.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    public ApiResponse<Object> health() {
        return ApiResponse.success("Agri Ecommerce Backend is running");
    }
}