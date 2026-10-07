package com.yisus.store_backend.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductReportRowDTO {
    private Long id;
    private String name;
    private String categoryName;
    /** Precio de venta del producto (base). Cuando las variantes tienen overrides
     *  distintos, ver {@link #minVariantPrice}/{@link #maxVariantPrice} para el rango real. */
    private BigDecimal salePrice;
    /** Precio mínimo efectivo entre las variantes activas (override de variante → precio del producto). */
    private BigDecimal minVariantPrice;
    /** Precio máximo efectivo entre las variantes activas (override de variante → precio del producto). */
    private BigDecimal maxVariantPrice;
    private int variantCount;
    private int totalStock;
    private Boolean isActive;
}
