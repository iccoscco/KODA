package com.yisus.store_backend.product.dto;

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
public class StockMovementDTO {
    private Long id;
    private Long productVariantId;
    private String variantLabel;
    private Integer quantity;
    private String type; // INPUT, OUTPUT
    private String reason; // SALE, CANCELLED_SALE, MANUAL_ADD, MANUAL_SUBTRACT, STOCK_UPDATE
    private String userName;
    private BigDecimal unitCost;
    private BigDecimal total;
    private LocalDateTime createdAt;
}
