package com.yisus.store_backend.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Update own profile request")
public class UpdateProfileDTO {

    @NotBlank(message = "Name is required")
    @Schema(description = "User name", example = "John Doe")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    @Schema(description = "User email", example = "john@example.com")
    private String email;
}
