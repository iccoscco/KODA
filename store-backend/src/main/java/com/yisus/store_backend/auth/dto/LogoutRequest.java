package com.yisus.store_backend.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogoutRequest {
    /** Optional: se ignora si viene vacío (p. ej. sesión ya limpia en el cliente). */
    private String refreshToken;

    private String accessToken;
}
