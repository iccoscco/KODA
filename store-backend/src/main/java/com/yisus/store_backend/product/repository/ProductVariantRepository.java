package com.yisus.store_backend.product.repository;

import com.yisus.store_backend.product.model.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    Optional<ProductVariant> findByProductIdAndColorIdAndSizeId(Long productId, Long colorId, Long sizeId);

    /**
     * Finds an ACTIVE variant with exact product+color+size match.
     * NULL parameters are matched via IS NOT DISTINCT FROM (PostgreSQL).
     */
    @Query(value = """
            SELECT * FROM product_variants pv
            WHERE pv.product_id = :productId
              AND pv.color_id IS NOT DISTINCT FROM :colorId
              AND pv.size_id IS NOT DISTINCT FROM :sizeId
              AND pv.is_active = true
            LIMIT 1
            """, nativeQuery = true)
    Optional<ProductVariant> findActiveByProductIdAndOptionalColorIdAndOptionalSizeId(
            @Param("productId") Long productId,
            @Param("colorId") Long colorId,
            @Param("sizeId") Long sizeId);

    Optional<ProductVariant> findBySku(String sku);

    List<ProductVariant> findByProductId(Long productId);

    @Query("SELECT pv FROM ProductVariant pv WHERE pv.product.id = :productId AND pv.isActive = true")
    List<ProductVariant> findActiveByProductId(@Param("productId") Long productId);

    @Query("SELECT pv FROM ProductVariant pv WHERE pv.stock < :minStock")
    List<ProductVariant> findLowStock(@Param("minStock") Integer minStock);

    boolean existsBySku(String sku);

    Optional<ProductVariant> findFirstByProductIdAndSkuStartingWith(Long productId, String skuPrefix);

    /** Para el módulo de Reportes: variantes activas de múltiples productos en una sola query. */
    @Query("SELECT pv FROM ProductVariant pv WHERE pv.product.id IN :productIds AND pv.isActive = true")
    List<ProductVariant> findActiveByProductIdIn(@Param("productIds") List<Long> productIds);

    /** Para el Dashboard: variantes con stock ≤ su propio minStock, con producto, color y talla cargados. */
    @Query("SELECT pv FROM ProductVariant pv " +
           "LEFT JOIN FETCH pv.product " +
           "LEFT JOIN FETCH pv.color " +
           "LEFT JOIN FETCH pv.size " +
           "WHERE pv.stock <= pv.minStock AND pv.isActive = true " +
           "ORDER BY pv.stock ASC, pv.product.name ASC")
    List<ProductVariant> findLowStockWithDetails();

    /** Cuenta variantes activas cuyo stock está por debajo de su propio minStock. */
    @Query("SELECT COUNT(pv) FROM ProductVariant pv WHERE pv.stock <= pv.minStock AND pv.isActive = true")
    int countLowStock();

    @Query("SELECT COUNT(pv) FROM ProductVariant pv JOIN pv.product p WHERE p.category.id = :categoryId AND pv.isActive = true AND p.isActive = true")
    long countByProductCategoryId(@Param("categoryId") Long categoryId);

    @Query("SELECT COALESCE(SUM(pv.stock), 0) FROM ProductVariant pv JOIN pv.product p WHERE p.category.id = :categoryId AND pv.isActive = true AND p.isActive = true")
    long sumStockByProductCategoryId(@Param("categoryId") Long categoryId);

    /** Por categoría: número de variantes y suma de stock (una sola pasada por lista de categorías). */
    @Query("SELECT p.category.id, COUNT(pv), COALESCE(SUM(pv.stock), 0) FROM ProductVariant pv JOIN pv.product p WHERE p.category.id IN :ids AND pv.isActive = true AND p.isActive = true GROUP BY p.category.id")
    List<Object[]> variantAggregatesGroupedByCategoryIds(@Param("ids") Collection<Long> ids);
}
