package com.agri.ecommerce.controller.customer;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.dto.request.user.ChangePasswordRequest;
import com.agri.ecommerce.dto.request.user.UpdateProfileRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.upload.UploadedImageResponse;
import com.agri.ecommerce.dto.response.user.UserResponse;
import com.agri.ecommerce.security.UserPrincipal;
import com.agri.ecommerce.service.CloudinaryUploadService;
import com.agri.ecommerce.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;

@Tag(name = "Customer Profile", description = "API quản lý hồ sơ cá nhân của người dùng đăng nhập")
@RestController
@RequestMapping("/api/customer/profile")
@RequiredArgsConstructor
public class ProfileController {

    private static final long MAX_AVATAR_SIZE = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");
    private static final Set<String> ALLOWED_IMAGE_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );

    private final UserService userService;

    private final CloudinaryUploadService cloudinaryUploadService;

    @Operation(summary = "Đổi mật khẩu tài khoản đang đăng nhập")
    @PatchMapping("/change-password")
    public ResponseEntity<ApiResponse<Object>> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        userService.changePassword(principal.getId(), request);

        return ResponseEntity.ok(
                ApiResponse.success("Đổi mật khẩu thành công", null, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy hồ sơ cá nhân")
    @GetMapping
    public ResponseEntity<ApiResponse<UserResponse>> getProfile(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserResponse response = userService.getCurrentProfile(principal.getId());

        return ResponseEntity.ok(
                ApiResponse.success("Lấy hồ sơ cá nhân thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Cập nhật hồ sơ cá nhân")
    @PutMapping
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        UserResponse response = userService.updateCurrentProfile(principal.getId(), request);

        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật hồ sơ cá nhân thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Upload anh dai dien ca nhan")
    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserResponse>> uploadAvatar(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file
    ) {
        validateAvatar(file);

        UserResponse currentProfile = userService.getCurrentProfile(principal.getId());
        UploadedImageResponse uploadedImage = cloudinaryUploadService.uploadImage(file, "avatars");
        UserResponse response = userService.updateCurrentProfileAvatar(principal.getId(), uploadedImage.path());
        cloudinaryUploadService.deleteImageByUrl(currentProfile.getAvatar());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Upload anh dai dien thanh cong", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Xóa ảnh đại diện cá nhân")
    @DeleteMapping("/avatar")
    public ResponseEntity<ApiResponse<UserResponse>> deleteAvatar(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        // Lấy avatar hiện tại để xóa file vật lý nếu có
        UserResponse currentProfile = userService.getCurrentProfile(principal.getId());
        String currentAvatar = currentProfile.getAvatar();

        // Xóa record avatar trong DB trước
        UserResponse response = userService.updateCurrentProfileAvatar(principal.getId(), null);
        cloudinaryUploadService.deleteImageByUrl(currentAvatar);

        // Xóa file vật lý nếu là file local (không xóa URL bên ngoài)
        if (currentAvatar != null && !currentAvatar.isBlank()
                && currentAvatar.startsWith("uploads/")) {
            try {
                Path filePath = Path.of(currentAvatar).toAbsolutePath().normalize();
                Path uploadsRoot = Path.of("uploads").toAbsolutePath().normalize();
                if (filePath.startsWith(uploadsRoot)) {
                    Files.deleteIfExists(filePath);
                }
            } catch (IOException ex) {
                // Không thất bại nếu file đã bị xóa rồi
            }
        }

        return ResponseEntity.ok(
                ApiResponse.success("Đã xóa ảnh đại diện thành công", response, HttpStatus.OK.value())
        );
    }

    private void validateAvatar(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui long chon file anh");
        }

        if (file.getSize() > MAX_AVATAR_SIZE) {
            throw new BadRequestException("Anh khong duoc vuot qua 5MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new BadRequestException("Chi ho tro file anh jpg, png, webp hoac gif");
        }

        String extension = getExtension(file.getOriginalFilename());
        if (!ALLOWED_IMAGE_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Dinh dang anh khong hop le");
        }
    }

    private String getExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            throw new BadRequestException("File anh can co phan mo rong");
        }

        return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }
}
