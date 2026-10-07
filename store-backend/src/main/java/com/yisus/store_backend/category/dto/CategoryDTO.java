package com.yisus.store_backend.category.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryDTO {
    private Long id;
    private String name;
    private String description;
    private Boolean isActive;
    /** Número de productos asociados a la categoría. */
    private Long productCount;
    /** Total de variantes de todos los productos de la categoría. */
    private Long variantCount;
    /** Suma del campo stock de todas esas variantes (unidades en inventario). */
    private Long totalStock;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
