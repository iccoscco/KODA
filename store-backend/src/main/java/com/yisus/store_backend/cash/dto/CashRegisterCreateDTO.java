package com.yisus.store_backend.cash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CashRegisterCreateDTO {

    @NotBlank(message = "El nombre de la caja es obligatorio")
    @Size(max = 120)
    private String name;
}
