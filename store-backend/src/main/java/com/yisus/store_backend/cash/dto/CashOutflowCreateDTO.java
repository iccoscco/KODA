package com.yisus.store_backend.cash.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CashOutflowCreateDTO {

    @NotNull(message = "La caja es requerida")
    private Long cashRegisterId;

    @NotNull(message = "Reason ID is required")
    private Long reasonId;
    
    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private BigDecimal amount;
    
    private String description;
    
    private Long orderId; // Optional
}
