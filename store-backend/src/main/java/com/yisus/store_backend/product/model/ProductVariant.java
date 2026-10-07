package com.yisus.store_backend.product.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_variants")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductVariant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "color_id", nullable = true)
    private Color color;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "size_id", nullable = true)
    private Size size;

    @Column(nullable = false)
    @Builder.Default
    private Integer stock = 0;

    /** Stock mínimo de alerta para esta variante. */
    @Column(name = "min_stock", nullable = false, columnDefinition = "INTEGER DEFAULT 0")
    @Builder.Default
    private Integer minStock = 0;

    @Column(unique = true)
    private String sku;

    /**
     * Precio de venta específico de esta variante. Si es {@code null}, se hereda
     * el precio del producto padre. Permite que tallas/colores distintos tengan
     * precios diferentes (p. ej. XXL cuesta más que S).
     */
    @Column(name = "sale_price", precision = 10, scale = 2)
    private BigDecimal salePrice;

    /**
     * Precio de compra específico de esta variante. Si es {@code null}, se hereda
     * el precio de compra del producto padre.
     */
    @Column(name = "purchase_price", precision = 10, scale = 2)
    private BigDecimal purchasePrice;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version")
    private Long version;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
