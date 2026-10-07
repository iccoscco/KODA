package com.yisus.store_backend.product.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductUpdateDTO {

    @Size(min = 3, max = 255, message = "Name must be between 3 and 255 characters")
    private String name;

    @DecimalMin(value = "0.0", inclusive = false, message = "Purchase price must be greater than 0")
    private BigDecimal purchasePrice;

    @DecimalMin(value = "0.0", inclusive = false, message = "Sale price must be greater than 0")
    private BigDecimal salePrice;

    @DecimalMin(value = "0.0", inclusive = true, message = "Discount percentage cannot be negative")
    @DecimalMax(value = "100.0", inclusive = true, message = "Discount percentage cannot exceed 100")
    private BigDecimal discountPercentage;
    private LocalDateTime discountStart;
    private LocalDateTime discountEnd;
    private Boolean isFeatured;
    private Long categoryId;
    @Min(value = 0, message = "Minimum stock cannot be negative")
    private Integer minStock;
}
