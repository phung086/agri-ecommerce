package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.WishlistEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
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

    long countByUser_Id(Long userId);

    @Query("""
            select wishlist.user.id, count(wishlist.id)
            from WishlistEntity wishlist
            where wishlist.user.id in :userIds
            group by wishlist.user.id
            """)
    List<Object[]> countWishlistsByUserIds(@Param("userIds") Collection<Long> userIds);
}
