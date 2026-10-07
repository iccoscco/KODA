package com.yisus.store_backend.user.dto;

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
@Schema(description = "User status update request")
public class UserStatusDTO {
    @Schema(description = "User status", example = "true", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "Status is required")
    private Boolean isActive;
}
