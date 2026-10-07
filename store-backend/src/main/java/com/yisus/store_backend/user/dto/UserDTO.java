package com.yisus.store_backend.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "User information")
public class UserDTO {
    @Schema(description = "User ID", example = "1")
    private Long id;
    
    @Schema(description = "User name", example = "John Doe")
    private String name;
    
    @Schema(description = "User email", example = "john@example.com")
    private String email;
    
    @Schema(description = "User role", example = "USER")
    private String role;
    
    @Schema(description = "User permissions")
    private List<String> permissions;
    
    @Schema(description = "Number of permissions", example = "5")
    private Integer permissionsCount;
    
    @Schema(description = "Avatar URL", example = "/uploads/avatars/avatar_1.jpg")
    private String avatarUrl;

    @Schema(description = "User active status", example = "true")
    private Boolean isActive;
    
    @Schema(description = "Creation date")
    private LocalDateTime createdAt;
    
    @Schema(description = "Last update date")
    private LocalDateTime updatedAt;
}
