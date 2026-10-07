package com.yisus.store_backend.product.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductVariantCreateDTO {
    @NotNull(message = "Product ID is required")
    private Long productId;
    
    private Long colorId;
    
    private Long sizeId;
    
    @Min(value = 0, message = "Stock cannot be negative")
    private Integer stock;

    @Min(value = 0, message = "El stock mínimo no puede ser negativo")
    private Integer minStock;

    private String sku;

    /**
     * Precio de venta específico de esta variante. Opcional: si se omite ({@code null}),
     * se hereda el precio del producto padre.
     */
    @DecimalMin(value = "0.0", inclusive = true, message = "El precio de venta no puede ser negativo")
    @Digits(integer = 8, fraction = 2, message = "Precio de venta inválido")
    private BigDecimal salePrice;

    /**
     * Precio de compra específico de esta variante. Opcional: si se omite ({@code null}),
     * se hereda el precio de compra del producto padre.
     */
    @DecimalMin(value = "0.0", inclusive = true, message = "El precio de compra no puede ser negativo")
    @Digits(integer = 8, fraction = 2, message = "Precio de compra inválido")
    private BigDecimal purchasePrice;
}
