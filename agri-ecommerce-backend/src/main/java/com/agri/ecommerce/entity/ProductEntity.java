package com.agri.ecommerce.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "products")
public class ProductEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "name_en", length = 255)
    private String nameEn;

    @Column(nullable = false, unique = true, length = 255)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private CategoryEntity category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "description_en", columnDefinition = "TEXT")
    private String descriptionEn;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer stock;

    @Column(nullable = false, length = 255)
    private String status;

    @Column(length = 255)
    private String unit;

    @Column(name = "unit_en", length = 255)
    private String unitEn;

    /**
     * Snapshot dữ liệu kho dùng cho product detail/search mà không cần join nặng.
     * Nguồn dữ liệu chuẩn vẫn là inventory_batches.
     */
    @Column(name = "latest_import_date")
    private LocalDateTime latestImportDate;

    @Column(name = "latest_manufacture_date")
    private LocalDateTime latestManufactureDate;

    @Column(name = "earliest_expiry_date")
    private LocalDateTime earliestExpiryDate;

    @Column(name = "freshness_status", length = 50)
    private String freshnessStatus;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
