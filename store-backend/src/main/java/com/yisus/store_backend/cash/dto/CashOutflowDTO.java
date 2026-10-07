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
public class CashOutflowDTO {
    private Long id;
    private Long orderId;
    private Long reasonId;
    private String reasonName;
    private BigDecimal amount;
    private String description;
    private LocalDateTime createdAt;
}
