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
public class CashCloseRequestDTO {

    @NotNull(message = "La caja es requerida")
    private Long cashRegisterId;

    @NotNull(message = "El monto de cierre es requerido")
    @DecimalMin(value = "0.00", inclusive = true, message = "El monto de cierre no puede ser negativo")
    private BigDecimal closingAmount;
}
