package com.yisus.store_backend.storeconfig.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreConfigUpdateDTO {

    @NotBlank(message = "El nombre de la tienda es obligatorio")
    private String storeName;

    private String storeRuc;

    private String storeAddress;

    private String printerName;

    private String printerIp;

    private Integer printerPort;

    private String printerType;
}
