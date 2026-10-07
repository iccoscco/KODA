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
public class ProductDTO {
    private Long id;
    private String name;
    private BigDecimal purchasePrice;
    private BigDecimal salePrice;
    private BigDecimal discountPercentage;
    private LocalDateTime discountStart;
    private LocalDateTime discountEnd;
    private Boolean isFeatured;
    private Long totalSold;
    private Long categoryId;
    private String categoryName;
    private Integer minStock;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ProductVariantDTO> variants;  // ← CAMBIADO: ahora incluye variantes con imágenes
}
