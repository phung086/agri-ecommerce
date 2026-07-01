package com.agri.ecommerce.dto.response.chat;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Thông tin sản phẩm gợi ý kèm theo câu trả lời của AI Chatbot.
 */
@Getter
@Setter
@Builder
@Schema(description = "Sản phẩm được AI gợi ý")
public class SuggestedProductResponse {

    @Schema(description = "ID sản phẩm", example = "12")
    private Long id;

    @Schema(description = "Tên sản phẩm", example = "Rau cải ngọt hữu cơ")
    private String name;

    @Schema(description = "Slug sản phẩm (dùng cho URL)", example = "rau-cai-ngot-huu-co")
    private String slug;

    @Schema(description = "Giá bán (VNĐ)", example = "25000")
    private BigDecimal price;

    @Schema(description = "Đơn vị tính", example = "kg")
    private String unit;

    @Schema(description = "Số lượng tồn kho", example = "150")
    private Integer stock;

    @Schema(description = "Trạng thái sản phẩm", example = "in_stock")
    private String status;

    @Schema(description = "Tên danh mục", example = "Rau xanh")
    private String categoryName;

    @Schema(description = "URL ảnh đại diện sản phẩm", example = "https://example.com/uploads/rau-cai-ngot.jpg")
    private String imageUrl;

    @Schema(description = "URL trang sản phẩm trên frontend", example = "http://localhost:3000/products/rau-cai-ngot-huu-co")
    private String productUrl;
}
