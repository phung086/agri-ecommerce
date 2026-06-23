package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.CartItemEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItemEntity, Long> {

    @EntityGraph(attributePaths = "product")
    List<CartItemEntity> findByUser_IdOrderByCreatedAtDesc(Long userId);

    @EntityGraph(attributePaths = "product")
    Optional<CartItemEntity> findByUser_IdAndProduct_Id(Long userId, Long productId);

    @EntityGraph(attributePaths = "product")
    Optional<CartItemEntity> findByIdAndUser_Id(Long id, Long userId);

    void deleteByUser_Id(Long userId);
}
