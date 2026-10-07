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
public class CashSessionHistoryDTO {
    private Long cashRegisterId;
    private String cashRegisterName;

    private Long id;
    private BigDecimal initialAmount;
    private BigDecimal systemBalance;
    private BigDecimal closingAmount;
    private BigDecimal difference;
    private LocalDateTime openedAt;
    private LocalDateTime closedAt;
    private Boolean isActive;
}
