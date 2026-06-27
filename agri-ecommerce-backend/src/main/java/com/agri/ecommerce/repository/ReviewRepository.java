package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.ReviewEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<ReviewEntity, Long>, JpaSpecificationExecutor<ReviewEntity> {

    @Override
    @EntityGraph(attributePaths = {"user", "product"})
    Page<ReviewEntity> findAll(org.springframework.data.jpa.domain.Specification<ReviewEntity> specification, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"user", "product"})
    Optional<ReviewEntity> findById(Long id);

    @EntityGraph(attributePaths = {"user", "product"})
    Page<ReviewEntity> findByProduct_IdOrderByCreatedAtDesc(Long productId, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "product"})
    Page<ReviewEntity> findByUser_IdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "product"})
    Optional<ReviewEntity> findByIdAndUser_Id(Long id, Long userId);

    Optional<ReviewEntity> findByUser_IdAndProduct_Id(Long userId, Long productId);

    boolean existsByUser_IdAndProduct_Id(Long userId, Long productId);

    @Query("select coalesce(avg(review.rating), 0) from ReviewEntity review where review.product.id = :productId")
    Double getAverageRatingByProductId(@Param("productId") Long productId);

    @Query("select coalesce(avg(review.rating), 0) from ReviewEntity review")
    Double getAverageRating();

    long countByProduct_Id(Long productId);

    long countByUser_Id(Long userId);

    @Query("""
            select review.user.id, count(review.id)
            from ReviewEntity review
            where review.user.id in :userIds
            group by review.user.id
            """)
    List<Object[]> countReviewsByUserIds(@Param("userIds") Collection<Long> userIds);
}
