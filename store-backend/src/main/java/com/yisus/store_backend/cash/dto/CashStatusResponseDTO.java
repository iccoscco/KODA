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
public class CashStatusResponseDTO {

    private Long cashRegisterId;
    private String cashRegisterName;

    private Long id;
    private BigDecimal initialAmount;
    private LocalDateTime openedAt;
    private BigDecimal totalSales;
    private BigDecimal totalOutflows;
    private BigDecimal systemBalance;
}
