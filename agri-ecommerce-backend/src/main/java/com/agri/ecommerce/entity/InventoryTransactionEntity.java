package com.agri.ecommerce.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "inventory_transactions",
        indexes = {
                @Index(name = "idx_inventory_tx_product", columnList = "product_id"),
                @Index(name = "idx_inventory_tx_batch", columnList = "batch_id"),
                @Index(name = "idx_inventory_tx_type", columnList = "type")
        }
)
public class InventoryTransactionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private ProductEntity product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id")
    private InventoryBatchEntity batch;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false, length = 50)
    private String type; // IMPORT, EXPORT_SALE, EXPORT_EXPIRED, EXPORT_DAMAGE, ADJUSTMENT_IN, ADJUSTMENT_OUT, BACKFILL

    @Column(name = "previous_stock")
    private Integer previousStock;

    @Column(name = "new_stock")
    private Integer newStock;

    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(length = 500)
    private String note;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
