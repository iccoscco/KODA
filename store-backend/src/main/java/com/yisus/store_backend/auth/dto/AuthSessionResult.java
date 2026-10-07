package com.yisus.store_backend.auth.dto;

import com.yisus.store_backend.user.dto.UserDTO;

/**
 * Resultado interno de login/register/refresh: usuario + JWTs para cookies (no se serializa tal cual al cliente).
 */
public record AuthSessionResult(UserDTO user, String accessToken, String refreshToken) {}
