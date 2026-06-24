package com.agri.ecommerce.controller.admin;

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

@Tag(name = "Admin - Upload", description = "API upload file cho admin")
@RestController
@RequestMapping("/api/admin/uploads")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUploadController {

    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );

    @Operation(summary = "Upload anh danh muc hoac san pham")
    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UploadedImageResponse>> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") String type
    ) {
        validateImage(file);

        String folder = resolveFolder(type);
        String extension = getExtension(file.getOriginalFilename());
        String fileName = Instant.now().toEpochMilli() + "_" + UUID.randomUUID() + "." + extension;
        Path targetDirectory = Path.of("uploads", folder).toAbsolutePath().normalize();
        Path targetFile = targetDirectory.resolve(fileName).normalize();

        if (!targetFile.startsWith(targetDirectory)) {
            throw new BadRequestException("Ten file khong hop le");
        }

        try {
            Files.createDirectories(targetDirectory);
            Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new BadRequestException("Khong the luu file anh");
        }

        String relativePath = "uploads/" + folder + "/" + fileName;
        UploadedImageResponse response = new UploadedImageResponse(
                relativePath,
                "/" + relativePath,
                fileName
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Upload anh thanh cong", response, HttpStatus.CREATED.value()));
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
            throw new BadRequestException("Chi ho tro file anh jpg, png, webp hoac gif");
        }

        String extension = getExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Dinh dang anh khong hop le");
        }
    }

    private String resolveFolder(String type) {
        String cleanType = type == null ? "" : type.trim().toLowerCase(Locale.ROOT);

        return switch (cleanType) {
            case "category", "categories" -> "categories";
            case "product", "products" -> "products";
            default -> throw new BadRequestException("Loai upload khong hop le");
        };
    }

    private String getExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            throw new BadRequestException("File anh can co phan mo rong");
        }

        return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }
}
