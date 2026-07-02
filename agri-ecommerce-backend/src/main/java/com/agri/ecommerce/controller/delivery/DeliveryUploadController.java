package com.agri.ecommerce.controller.delivery;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.upload.UploadedImageResponse;
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

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Tag(name = "Delivery - Upload", description = "API upload file cho nhân viên giao hàng")
@RestController
@RequestMapping("/api/delivery/uploads")
@PreAuthorize("hasRole('DELIVERY_STAFF')")
public class DeliveryUploadController {

    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    @Operation(summary = "Upload ảnh minh chứng giao hàng (Proof of Delivery)")
    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UploadedImageResponse>> uploadProofImage(
            @RequestParam("file") MultipartFile file
    ) {
        validateImage(file);

        String folder = "delivery_proof";
        String extension = getExtension(file.getOriginalFilename());
        String fileName = Instant.now().toEpochMilli() + "_" + UUID.randomUUID() + "." + extension;
        Path targetDirectory = Path.of("uploads", folder).toAbsolutePath().normalize();
        Path targetFile = targetDirectory.resolve(fileName).normalize();

        if (!targetFile.startsWith(targetDirectory)) {
            throw new BadRequestException("Tên file không hợp lệ");
        }

        try {
            Files.createDirectories(targetDirectory);
            Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new BadRequestException("Không thể lưu ảnh minh chứng giao hàng");
        }

        String relativePath = "uploads/" + folder + "/" + fileName;
        UploadedImageResponse response = new UploadedImageResponse(
                relativePath,
                "/" + relativePath,
                fileName
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Upload ảnh minh chứng thành công", response, HttpStatus.CREATED.value()));
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
            throw new BadRequestException("Chỉ hỗ trợ file ảnh jpg, png hoặc webp");
        }

        String extension = getExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Định dạng ảnh không hợp lệ");
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
