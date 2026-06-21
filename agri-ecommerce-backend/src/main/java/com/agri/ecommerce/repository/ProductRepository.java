package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.ProductEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<ProductEntity, Long>, JpaSpecificationExecutor<ProductEntity> {

    @Override
    @EntityGraph(attributePaths = "category")
    Page<ProductEntity> findAll(Specification<ProductEntity> specification, Pageable pageable);

    @EntityGraph(attributePaths = "category")
    Optional<ProductEntity> findBySlug(String slug);

    @Override
    @EntityGraph(attributePaths = "category")
    Optional<ProductEntity> findById(Long id);

    @EntityGraph(attributePaths = "category")
    List<ProductEntity> findByStatus(String status, Pageable pageable);

    List<ProductEntity> findByStatusNot(String status, Pageable pageable);

    long countByStatus(String status);

    long countByStatusNot(String status);

    long countByStockLessThanEqualAndStatusNot(Integer stock, String status);

    @EntityGraph(attributePaths = "category")
    List<ProductEntity> findByStockLessThanEqualAndStatusNotOrderByStockAscCreatedAtDesc(Integer stock, String status, Pageable pageable);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    boolean existsByCategory_Id(Long categoryId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select product from ProductEntity product where product.id in :ids")
    List<ProductEntity> findAllByIdInForUpdate(@Param("ids") Collection<Long> ids);
}
