package com.yisus.store_backend.order.dto;

import jakarta.validation.constraints.DecimalMin;
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
public class OrderItemCreateDTO {
    @NotNull(message = "Product variant ID is required")
    private Long productVariantId;
    
    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;
    
    @DecimalMin(value = "0.0", inclusive = false, message = "Custom unit price must be greater than 0")
    private BigDecimal customUnitPrice;
}
