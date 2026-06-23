package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.dto.request.contact.ContactRepliedUpdateRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.contact.ContactResponse;
import com.agri.ecommerce.service.ContactService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Admin - Contact Management", description = "API quản trị liên hệ hỗ trợ")
@RestController
@RequestMapping("/api/admin/contacts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminContactManagementController {

    private final ContactService contactService;

    @Operation(summary = "Lấy danh sách liên hệ hỗ trợ")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ContactResponse>>> getContacts(
            @Parameter(description = "Trạng thái đã phản hồi", example = "false")
            @RequestParam(required = false) Boolean replied,

            @Parameter(description = "Từ khóa tìm theo tên, email, số điện thoại hoặc nội dung", example = "rau sạch")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "10")
            @RequestParam(defaultValue = "10") int size,

            @Parameter(description = "Sắp xếp theo field,direction", example = "createdAt,desc")
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        PageResponse<ContactResponse> response = contactService.getContacts(
                replied,
                keyword,
                page,
                size,
                sort
        );

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách liên hệ hỗ trợ thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy chi tiết liên hệ hỗ trợ")
    @GetMapping("/{contactId}")
    public ResponseEntity<ApiResponse<ContactResponse>> getContact(
            @Parameter(description = "ID liên hệ", example = "1")
            @PathVariable Long contactId
    ) {
        ContactResponse response = contactService.getContact(contactId);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy chi tiết liên hệ hỗ trợ thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Cập nhật trạng thái phản hồi liên hệ")
    @PatchMapping("/{contactId}/replied")
    public ResponseEntity<ApiResponse<ContactResponse>> updateReplied(
            @Parameter(description = "ID liên hệ", example = "1")
            @PathVariable Long contactId,
            @Valid @RequestBody ContactRepliedUpdateRequest request
    ) {
        ContactResponse response = contactService.updateReplied(contactId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật trạng thái phản hồi liên hệ thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Xóa liên hệ hỗ trợ")
    @DeleteMapping("/{contactId}")
    public ResponseEntity<ApiResponse<Void>> deleteContact(
            @Parameter(description = "ID liên hệ", example = "1")
            @PathVariable Long contactId
    ) {
        contactService.deleteContact(contactId);

        return ResponseEntity.ok(
                ApiResponse.success("Xóa liên hệ hỗ trợ thành công", null, HttpStatus.OK.value())
        );
    }
}
