package com.yisus.store_backend.role.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "PermissionDTO")
public class PermissionDTO {
    @Schema(description = "Permission ID")
    private Long id;

    @Schema(description = "Permission name")
    private String name;

    @Schema(description = "Permission module")
    private String module;

    @Schema(description = "Permission action")
    private String action;

    @Schema(description = "Permission description")
    private String description;

    @Schema(description = "Etiqueta en español para la UI (derivada del código)")
    private String labelEs;

    @Schema(description = "Descripción en español para la UI")
    private String descriptionEs;

    @Schema(description = "Permission creation date")
    private LocalDateTime createdAt;

    @Schema(description = "Permission update date")
    private LocalDateTime updatedAt;
}
