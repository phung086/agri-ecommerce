package com.agri.ecommerce.service;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.dto.response.upload.UploadedImageResponse;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;

@Service
public class CloudinaryUploadService {

    private final Cloudinary cloudinary;
    private final boolean configured;

    public CloudinaryUploadService(
            @Value("${CLOUDINARY_CLOUD_NAME:}") String cloudName,
            @Value("${CLOUDINARY_API_KEY:}") String apiKey,
            @Value("${CLOUDINARY_API_SECRET:}") String apiSecret
    ) {
        this.configured = hasText(cloudName) && hasText(apiKey) && hasText(apiSecret);
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true
        ));
    }

    public UploadedImageResponse uploadImage(MultipartFile file, String folder) {
        if (!configured) {
            throw new BadRequestException("Cloudinary chua duoc cau hinh");
        }

        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", "agri-ecommerce/" + folder,
                    "resource_type", "image",
                    "use_filename", false,
                    "unique_filename", true,
                    "overwrite", false
            ));

            String secureUrl = String.valueOf(result.get("secure_url"));
            String publicId = String.valueOf(result.get("public_id"));
            String format = String.valueOf(result.get("format"));
            String fileName = buildFileName(publicId, format);

            return new UploadedImageResponse(secureUrl, secureUrl, fileName);
        } catch (IOException ex) {
            throw new BadRequestException("Khong the doc file anh de upload");
        } catch (RuntimeException ex) {
            throw new BadRequestException("Khong the upload anh len Cloudinary");
        }
    }

    public void deleteImageByUrl(String imageUrl) {
        extractManagedPublicId(imageUrl).ifPresent(this::deleteImageByPublicId);
    }

    private void deleteImageByPublicId(String publicId) {
        if (!configured) {
            return;
        }

        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "image"));
        } catch (IOException | RuntimeException ex) {
            // Deleting old media should not block profile updates.
        }
    }

    private Optional<String> extractManagedPublicId(String imageUrl) {
        if (!hasText(imageUrl) || !imageUrl.startsWith("http")) {
            return Optional.empty();
        }

        try {
            String path = URI.create(imageUrl).getPath();
            int uploadIndex = path.indexOf("/upload/");
            if (uploadIndex < 0) {
                return Optional.empty();
            }

            String afterUpload = path.substring(uploadIndex + "/upload/".length());
            String withoutVersion = afterUpload.replaceFirst("^v\\d+/", "");
            int dotIndex = withoutVersion.lastIndexOf('.');
            String publicId = dotIndex > 0 ? withoutVersion.substring(0, dotIndex) : withoutVersion;
            publicId = URLDecoder.decode(publicId, StandardCharsets.UTF_8);

            return publicId.startsWith("agri-ecommerce/")
                    ? Optional.of(publicId)
                    : Optional.empty();
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    private String buildFileName(String publicId, String format) {
        String baseName = hasText(publicId) ? publicId : "image";
        int slashIndex = baseName.lastIndexOf('/');
        if (slashIndex >= 0 && slashIndex + 1 < baseName.length()) {
            baseName = baseName.substring(slashIndex + 1);
        }

        return hasText(format) && !"null".equalsIgnoreCase(format)
                ? baseName + "." + format
                : baseName;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isBlank();
    }
}
