package com.agri.ecommerce.dto.request.order;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DeliveryStatusUpdateRequest {

    @NotBlank(message = "Trạng thái giao hàng không được để trống")
    private String status;

    @Size(max = 1000, message = "Ghi chú không được vượt quá 1000 ký tự")
    private String note;

    @Size(max = 255, message = "Lý do giao hàng thất bại không được vượt quá 255 ký tự")
    private String failureReason;

    @Size(max = 1000, message = "Ghi chú hoàn hàng không được vượt quá 1000 ký tự")
    private String returnReason;

    @Size(max = 1000, message = "Ghi chú hoàn hàng không được vượt quá 1000 ký tự")
    private String returnNote;

    private String proofImageUrl;

    private String proofImage;

    private String signature;

    private String trackingNumber;

    private String ghnOrderCode;
}
