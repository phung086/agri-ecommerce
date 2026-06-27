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
import java.math.BigDecimal;
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

    @EntityGraph(attributePaths = "category")
    @Query("""
            select product
            from ProductEntity product
            join product.category category
            where product.id <> :productId
              and category.id = :categoryId
              and product.status in :statuses
            order by product.status asc, product.stock desc, product.createdAt desc, product.id desc
            """)
    List<ProductEntity> findRelatedProductsByCategory(
            @Param("productId") Long productId,
            @Param("categoryId") Long categoryId,
            @Param("statuses") Collection<String> statuses,
            Pageable pageable
    );

    @EntityGraph(attributePaths = "category")
    @Query("""
            select product
            from ProductEntity product
            where product.id <> :productId
              and product.status in :statuses
            order by product.status asc, product.stock desc, product.createdAt desc, product.id desc
            """)
    List<ProductEntity> findPublicRelatedFallbackProducts(
            @Param("productId") Long productId,
            @Param("statuses") Collection<String> statuses,
            Pageable pageable
    );

    @EntityGraph(attributePaths = "category")
    @Query("""
            select product
            from ProductEntity product
            join product.category category
            where product.status = :status
              and (:keyword is null
                   or lower(product.name) like lower(concat('%', :keyword, '%'))
                   or lower(product.description) like lower(concat('%', :keyword, '%'))
                   or lower(category.name) like lower(concat('%', :keyword, '%')))
              and (:categorySlug is null or category.slug = :categorySlug)
              and (:maxPrice is null or product.price <= :maxPrice)
            order by product.stock desc, product.createdAt desc, product.id desc
            """)
    List<ProductEntity> findPublicSearchSuggestions(
            @Param("keyword") String keyword,
            @Param("categorySlug") String categorySlug,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("status") String status,
            Pageable pageable
    );

    @Query("""
            select category.id, category.name, category.slug, count(product.id)
            from ProductEntity product
            join product.category category
            where product.status <> :hiddenStatus
              and (:keyword is null
                   or lower(product.name) like lower(concat('%', :keyword, '%'))
                   or lower(product.description) like lower(concat('%', :keyword, '%'))
                   or lower(category.name) like lower(concat('%', :keyword, '%')))
              and (:categorySlug is null or category.slug = :categorySlug)
              and (:minPrice is null or product.price >= :minPrice)
              and (:maxPrice is null or product.price <= :maxPrice)
              and (:status is null or product.status = :status)
            group by category.id, category.name, category.slug
            order by count(product.id) desc, category.name asc
            """)
    List<Object[]> findPublicCategoryFacets(
            @Param("keyword") String keyword,
            @Param("categorySlug") String categorySlug,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("status") String status,
            @Param("hiddenStatus") String hiddenStatus
    );

    @Query("""
            select product.status, count(product.id)
            from ProductEntity product
            join product.category category
            where product.status <> :hiddenStatus
              and (:keyword is null
                   or lower(product.name) like lower(concat('%', :keyword, '%'))
                   or lower(product.description) like lower(concat('%', :keyword, '%'))
                   or lower(category.name) like lower(concat('%', :keyword, '%')))
              and (:categorySlug is null or category.slug = :categorySlug)
              and (:minPrice is null or product.price >= :minPrice)
              and (:maxPrice is null or product.price <= :maxPrice)
              and (:status is null or product.status = :status)
            group by product.status
            order by count(product.id) desc, product.status asc
            """)
    List<Object[]> findPublicStatusFacets(
            @Param("keyword") String keyword,
            @Param("categorySlug") String categorySlug,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("status") String status,
            @Param("hiddenStatus") String hiddenStatus
    );

    @Query("""
            select count(product.id), min(product.price), max(product.price)
            from ProductEntity product
            join product.category category
            where product.status <> :hiddenStatus
              and (:keyword is null
                   or lower(product.name) like lower(concat('%', :keyword, '%'))
                   or lower(product.description) like lower(concat('%', :keyword, '%'))
                   or lower(category.name) like lower(concat('%', :keyword, '%')))
              and (:categorySlug is null or category.slug = :categorySlug)
              and (:minPrice is null or product.price >= :minPrice)
              and (:maxPrice is null or product.price <= :maxPrice)
              and (:status is null or product.status = :status)
            """)
    Object[] findPublicSearchPriceRange(
            @Param("keyword") String keyword,
            @Param("categorySlug") String categorySlug,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("status") String status,
            @Param("hiddenStatus") String hiddenStatus
    );

    long countByStatus(String status);

    long countByStatusNot(String status);

    long countByStockLessThanEqualAndStatusNot(Integer stock, String status);

    @Query("""
            select coalesce(sum(product.stock), 0)
            from ProductEntity product
            where product.status <> :hiddenStatus
            """)
    Long sumStockByStatusNot(@Param("hiddenStatus") String hiddenStatus);

    @EntityGraph(attributePaths = "category")
    List<ProductEntity> findByStockLessThanEqualAndStatusNotOrderByStockAscCreatedAtDesc(Integer stock, String status, Pageable pageable);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    boolean existsByCategory_Id(Long categoryId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select product from ProductEntity product where product.id in :ids")
    List<ProductEntity> findAllByIdInForUpdate(@Param("ids") Collection<Long> ids);
}
