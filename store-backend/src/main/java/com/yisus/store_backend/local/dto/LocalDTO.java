package com.yisus.store_backend.local.dto;

import com.yisus.store_backend.local.model.Local;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Local disponible en el contexto actual")
public record LocalDTO(
        @Schema(example = "1") Long id,
        @Schema(example = "LOCAL-001") String code,
        @Schema(example = "Local inicial") String name,
        @Schema(example = "true") boolean canSwitch
) {
    public static LocalDTO from(Local local, boolean canSwitch) {
        return new LocalDTO(local.getId(), local.getCode(), local.getName(), canSwitch);
    }
}
