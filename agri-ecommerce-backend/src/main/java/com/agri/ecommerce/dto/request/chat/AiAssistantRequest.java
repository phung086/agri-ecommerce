package com.agri.ecommerce.dto.request.chat;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class AiAssistantRequest {

    @Size(max = 100, message = "Guest token must not exceed 100 characters")
    private String guestToken;

    @NotBlank(message = "Message must not be blank")
    @Size(max = 5000, message = "Message must not exceed 5000 characters")
    private String message;

    @Size(max = 255, message = "Category slug must not exceed 255 characters")
    private String categorySlug;

    @DecimalMin(value = "0.00", message = "Max price must be greater than or equal to 0")
    private BigDecimal maxPrice;

    @Min(value = 1, message = "Limit must be at least 1")
    @Max(value = 8, message = "Limit must not exceed 8")
    private Integer limit;
}
