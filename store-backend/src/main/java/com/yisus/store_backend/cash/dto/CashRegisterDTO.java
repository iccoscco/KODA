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
public class CashRegisterDTO {
    private Long id;
    private String name;
    private BigDecimal balance;
    private LocalDateTime updatedAt;
}
