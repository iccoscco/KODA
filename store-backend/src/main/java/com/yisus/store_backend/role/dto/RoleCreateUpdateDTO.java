package com.yisus.store_backend.role.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "DTO to create or update a role")
public class RoleCreateUpdateDTO {
    @Schema(description = "Role name", example = "ADMIN")
    @NotBlank(message = "Role name cannot be null")
    @Size(min = 3, max = 50, message = "Role name must have between 3 and 50 characters")
    private String name;

    @Size(max = 255, message = "Role description must be under 255 characters")
    @Schema(description = "Role description", example = "Administrator")
    private String description;

    @Schema(description = "Role permissions")
    private Set<Long> permissionIds;
}
