package com.yisus.store_backend.role.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "RoleDTO")
public class RoleDTO {
    @Schema(description = "Role ID")
    private Long id;

    @Schema(description = "Role name")
    private String name;

    @Schema(description = "Role description")
    private String description;

    @Schema(description = "Role status", example = "true")
    private Boolean isActive;

    @Schema(description = "Role permissions")
    private Set<PermissionDTO> permissions;

    @Schema(description = "Number of permissions")
    private Integer permissionsCount;

    @Schema(description = "Role creation date")
    private LocalDateTime createdAt;

    @Schema(description = "Role update date")
    private LocalDateTime updatedAt;
}
