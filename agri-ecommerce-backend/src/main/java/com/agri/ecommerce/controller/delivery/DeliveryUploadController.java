package com.agri.ecommerce.controller.delivery;

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

@Tag(name = "Delivery - Upload", description = "API upload file cho nhan vien giao hang")
@RestController
@RequestMapping("/api/delivery/uploads")
@PreAuthorize("hasRole('DELIVERY_STAFF')")
@RequiredArgsConstructor
public class DeliveryUploadController {

    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final CloudinaryUploadService cloudinaryUploadService;

    @Operation(summary = "Upload anh minh chung giao hang (Proof of Delivery)")
    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UploadedImageResponse>> uploadProofImage(
            @RequestParam("file") MultipartFile file
    ) {
        validateImage(file);

        UploadedImageResponse response = cloudinaryUploadService.uploadImage(file, "delivery-proof");

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Upload anh minh chung thanh cong", response, HttpStatus.CREATED.value()));
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui long chon file anh");
        }

        if (file.getSize() > MAX_IMAGE_SIZE) {
            throw new BadRequestException("Anh khong duoc vuot qua 5MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new BadRequestException("Chi ho tro file anh jpg, png hoac webp");
        }

        String extension = getExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Dinh dang anh khong hop le");
        }
    }

    private String getExtension(String filename) {
        if (filename == null) {
            return "jpg";
        }

        int index = filename.lastIndexOf('.');
        return index == -1 ? "jpg" : filename.substring(index + 1).toLowerCase(Locale.ROOT);
    }
}
