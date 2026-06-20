package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.WishlistEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WishlistRepository extends JpaRepository<WishlistEntity, Long> {

    @EntityGraph(attributePaths = "product")
    List<WishlistEntity> findByUser_IdOrderByCreatedAtDesc(Long userId);

    @EntityGraph(attributePaths = "product")
    Optional<WishlistEntity> findByUser_IdAndProduct_Id(Long userId, Long productId);

    boolean existsByUser_IdAndProduct_Id(Long userId, Long productId);

    void deleteByUser_IdAndProduct_Id(Long userId, Long productId);

    void deleteByUser_Id(Long userId);
}
