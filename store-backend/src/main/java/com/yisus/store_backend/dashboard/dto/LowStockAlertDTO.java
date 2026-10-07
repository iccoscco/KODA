package com.yisus.store_backend.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LowStockAlertDTO {
    private Long variantId;
    private String productName;
    private String variantDescription;
    private int stock;
    private int minStock;
    private String sku;
}
