package com.yisus.store_backend.storeconfig.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreConfigDTO {
    private String storeName;
    private String storeRuc;
    private String storeAddress;
    private String logoUrl;
    private String printerName;
    private String printerIp;
    private Integer printerPort;
    private String printerType;
    private LocalDateTime updatedAt;
}
