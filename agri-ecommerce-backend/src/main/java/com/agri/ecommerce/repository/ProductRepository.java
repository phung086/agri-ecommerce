package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.ProductEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

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

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    boolean existsByCategory_Id(Long categoryId);
}
