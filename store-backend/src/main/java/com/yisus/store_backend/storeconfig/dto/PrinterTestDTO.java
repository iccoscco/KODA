package com.yisus.store_backend.storeconfig.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PrinterTestDTO {

    @NotBlank(message = "La IP de la impresora es obligatoria")
    private String printerIp;

    @NotNull(message = "El puerto de la impresora es obligatorio")
    private Integer printerPort;
}
