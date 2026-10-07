package com.yisus.store_backend.product.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductVariantDTO {
    private Long id;
    private Long productId;
    private String productName;
    private Long colorId;
    private String colorName;
    private String colorHexCode;
    private Long sizeId;
    private String sizeName;
    private Integer stock;
    private Integer minStock;
    private String sku;
    /** Precio de venta específico de la variante. {@code null} = hereda del producto. */
    private BigDecimal salePrice;
    /** Precio de compra específico de la variante. {@code null} = hereda del producto. */
    private BigDecimal purchasePrice;
    private Boolean isActive;
    private List<ProductImageDTO> images;  // ← AÑADIDO
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
