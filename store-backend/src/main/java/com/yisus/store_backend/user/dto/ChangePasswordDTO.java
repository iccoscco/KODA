package com.yisus.store_backend.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Change password request")
public class ChangePasswordDTO {

    @NotBlank(message = "Current password is required")
    @Schema(description = "Current password")
    private String currentPassword;

    @NotBlank(message = "New password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    @Schema(description = "New password")
    private String newPassword;

    @NotBlank(message = "Password confirmation is required")
    @Schema(description = "Confirm new password")
    private String confirmPassword;
}
