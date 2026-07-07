package com.agri.ecommerce.controller.customer;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.upload.UploadedImageResponse;
import com.agri.ecommerce.service.CloudinaryUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;
import java.util.Set;

@Tag(name = "Customer - Upload", description = "API upload file cho khach hang")
@RestController
@RequestMapping("/api/customer/uploads")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerUploadController {

    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final CloudinaryUploadService cloudinaryUploadService;

    @Operation(summary = "Upload anh dinh kem danh gia san pham")
    @PostMapping(value = "/review-images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UploadedImageResponse>> uploadReviewImage(
            @RequestParam("file") MultipartFile file
    ) {
        validateImage(file);
        UploadedImageResponse response = cloudinaryUploadService.uploadImage(file, "reviews");

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Upload ảnh đánh giá thành công", response, HttpStatus.CREATED.value()));
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn file ảnh");
        }

        if (file.getSize() > MAX_IMAGE_SIZE) {
            throw new BadRequestException("Ảnh không được vượt quá 5MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new BadRequestException("Chỉ hỗ trợ file ảnh JPG, PNG hoặc WEBP");
        }

        String extension = getExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Định dạng ảnh không hợp lệ");
        }
    }

    private String getExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            throw new BadRequestException("File ảnh cần có phần mở rộng");
        }

        return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }
}
