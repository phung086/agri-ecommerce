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
@Table(
        name = "inventory_batches",
        indexes = {
                @Index(name = "idx_inventory_batch_product", columnList = "product_id"),
                @Index(name = "idx_inventory_batch_expiry", columnList = "expiry_date"),
                @Index(name = "idx_inventory_batch_status", columnList = "status")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_inventory_batch_number", columnNames = "batch_number")
        }
)
public class InventoryBatchEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private ProductEntity product;

    @Column(name = "batch_number", nullable = false, length = 100)
    private String batchNumber;

    @Column(name = "import_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal importPrice;

    @Column(name = "original_quantity", nullable = false)
    private Integer originalQuantity;

    @Column(name = "remaining_quantity", nullable = false)
    private Integer remainingQuantity;

    @Column(name = "received_at")
    private LocalDateTime receivedAt;

    @Column(name = "manufacture_date")
    private LocalDateTime manufactureDate;

    @Column(name = "expiry_date")
    private LocalDateTime expiryDate;

    @Column(name = "supplier_name", length = 255)
    private String supplierName;

    @Column(name = "storage_location", length = 255)
    private String storageLocation;

    @Column(name = "status", nullable = false, length = 50)
    private String status;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.receivedAt == null) {
            this.receivedAt = now;
        }
        if (this.remainingQuantity == null) {
            this.remainingQuantity = this.originalQuantity;
        }
        if (this.status == null || this.status.isBlank()) {
            this.status = this.expiryDate == null ? "NEED_DATE_UPDATE" : "ACTIVE";
        }
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
