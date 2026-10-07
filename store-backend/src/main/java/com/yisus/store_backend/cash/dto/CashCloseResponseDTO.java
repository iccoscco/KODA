package com.yisus.store_backend.cash.dto;

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
public class CashCloseResponseDTO {

    private Long id;
    private BigDecimal initialAmount;
    private LocalDateTime openedAt;
    private LocalDateTime closedAt;
    private BigDecimal totalSales;
    private BigDecimal totalOutflows;
    private BigDecimal systemBalance;
    private BigDecimal closingAmount;
    private BigDecimal difference;
}
