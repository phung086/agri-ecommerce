package com.agri.ecommerce.controller.publicapi;

import com.agri.ecommerce.dto.request.contact.ContactCreateRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.contact.ContactResponse;
import com.agri.ecommerce.service.ContactService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Public - Contact Support", description = "API gửi liên hệ hỗ trợ từ khách truy cập")
@RestController
@RequestMapping("/api/public/contacts")
@RequiredArgsConstructor
public class PublicContactController {

    private final ContactService contactService;

    @Operation(summary = "Gửi liên hệ hỗ trợ")
    @PostMapping
    public ResponseEntity<ApiResponse<ContactResponse>> createContact(
            @Valid @RequestBody ContactCreateRequest request
    ) {
        ContactResponse response = contactService.createContact(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Gửi liên hệ hỗ trợ thành công", response, HttpStatus.CREATED.value()));
    }
}
