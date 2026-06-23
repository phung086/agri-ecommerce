package com.agri.ecommerce.dto.response.upload;

public record UploadedImageResponse(
        String path,
        String url,
        String fileName
) {
}
