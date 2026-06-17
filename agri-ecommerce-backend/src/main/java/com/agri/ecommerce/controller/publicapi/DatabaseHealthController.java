package com.agri.ecommerce.controller.publicapi;

import com.agri.ecommerce.dto.response.ApiResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class DatabaseHealthController {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseHealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/api/health/database")
    public ApiResponse<Object> databaseHealth() {
        Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);

        return ApiResponse.success(
                "Database connection is working",
                Map.of("result", result)
        );
    }
}