package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.ProductImageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ProductImageRepository extends JpaRepository<ProductImageEntity, Long> {

    @Query("""
            select image
            from ProductImageEntity image
            where image.product.id in :productIds
            order by image.product.id asc, image.id asc
            """)
    List<ProductImageEntity> findAllByProductIds(@Param("productIds") Collection<Long> productIds);

    @Query("""
            select image
            from ProductImageEntity image
            where image.product.id = :productId
            order by image.id asc
            """)
    List<ProductImageEntity> findAllByProductId(@Param("productId") Long productId);

    void deleteByProduct_Id(Long productId);
}
