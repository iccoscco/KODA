package com.yisus.store_backend.role.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotNull;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Role status update request")
public class RoleStatusDTO {
    @Schema(description = "Role status", example = "true", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "Status is required")
    private Boolean isActive;
}
