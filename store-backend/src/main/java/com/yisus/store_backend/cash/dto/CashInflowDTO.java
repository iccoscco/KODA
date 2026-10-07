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
public class CashInflowDTO {
    private Long id;
    private Long orderId;
    private String orderDescription;
    private BigDecimal amount;
    private String description;
    private LocalDateTime createdAt;
}
