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
public class DashboardSummaryDTO {
    private BigDecimal todaySales;
    private BigDecimal monthSales;
    private int todayOrders;
    private long openSessions;
    private int lowStockCount;
}
