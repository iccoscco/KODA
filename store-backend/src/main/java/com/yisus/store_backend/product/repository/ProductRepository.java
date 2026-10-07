package com.yisus.store_backend.product.repository;

import com.yisus.store_backend.product.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findByName(String name);

    List<Product> findAllByIsActiveTrue();

    Page<Product> findAllByIsActiveTrue(Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.isActive = true AND LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<Product> findBySearch(@Param("search") String search);

    @Query("SELECT p FROM Product p WHERE p.isActive = true AND LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Product> findBySearch(@Param("search") String search, Pageable pageable);

    /** Para el módulo de Reportes: productos filtrados sin paginación. */
    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category c WHERE " +
           "(:categoryId IS NULL OR c.id = :categoryId) " +
           "ORDER BY p.name ASC")
    List<Product> findForReport(@Param("categoryId") Long categoryId);

    long countByCategory_IdAndIsActiveTrue(Long categoryId);

    List<Product> findAllByCategoryIdAndIsActiveTrue(Long categoryId);

    @Query("SELECT p.category.id, COUNT(p) FROM Product p WHERE p.category.id IN :ids AND p.isActive = true GROUP BY p.category.id")
    List<Object[]> countProductsGroupedByCategoryIds(@Param("ids") Collection<Long> ids);
}
