package com.agri.ecommerce.dto.request.review;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ReviewUpdateRequest {

    @NotNull(message = "Điểm đánh giá không được để trống")
    @Min(value = 1, message = "Điểm đánh giá phải từ 1 đến 5")
    @Max(value = 5, message = "Điểm đánh giá phải từ 1 đến 5")
    private Integer rating;

    @Size(max = 255, message = "Nội dung đánh giá không được vượt quá 255 ký tự")
    private String comment;

    @Size(max = 3, message = "Chi duoc tai len toi da 3 anh danh gia")
    private List<@Size(max = 512, message = "Duong dan anh khong duoc vuot qua 512 ky tu") String> images;
}
