package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.CategoryEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<CategoryEntity, Long> {

    List<CategoryEntity> findAllByOrderByIdAsc();

    @Query("""
            select category
            from CategoryEntity category
            where lower(category.name) like lower(concat('%', :keyword, '%'))
               or lower(category.slug) like lower(concat('%', :keyword, '%'))
               or lower(coalesce(category.description, '')) like lower(concat('%', :keyword, '%'))
            order by category.createdAt desc, category.id desc
            """)
    List<CategoryEntity> searchAdminCategories(@Param("keyword") String keyword, Pageable pageable);

    Optional<CategoryEntity> findBySlug(String slug);

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, Long id);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);
}
