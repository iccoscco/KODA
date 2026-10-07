package com.yisus.store_backend.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SellerSalesDTO {
    private String sellerName;
    private int orderCount;
    private BigDecimal totalAmount;
}
