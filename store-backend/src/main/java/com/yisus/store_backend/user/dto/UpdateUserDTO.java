package com.yisus.store_backend.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "User update request")
public class UpdateUserDTO {
    @Schema(description = "User name", example = "John Doe")
    private String name;
    
    @Schema(description = "User email", example = "john@example.com")
    @Email(message = "Email should be valid")
    private String email;
    
    @Schema(description = "User role ID", example = "1")
    private Long roleId;
}
