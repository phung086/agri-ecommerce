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
@Table(name = "inventory_transactions")
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
    private String type; // 'IMPORT', 'EXPORT_SALE', 'EXPORT_EXPIRED', 'EXPORT_DAMAGE'

    @Column(length = 255)
    private String note;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
