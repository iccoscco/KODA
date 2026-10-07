package com.yisus.store_backend.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshTokenRequest {
    /** Opcional si el refresh va en cookie httpOnly. */
    private String refreshToken;
}
