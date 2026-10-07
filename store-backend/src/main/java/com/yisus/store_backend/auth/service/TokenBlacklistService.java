package com.yisus.store_backend.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenBlacklistService {
    private final StringRedisTemplate redisTemplate;
    private final JwtService jwtService;

    public void blacklistToken(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        try {
            long expiration = jwtService.getExpirationTime(token);
            if (expiration > 0) {
                redisTemplate.opsForValue().set(
                        "blacklist:" + token,
                        "true",
                        expiration,
                        TimeUnit.MILLISECONDS
                );
                log.debug("Token blacklisted with TTL: {}ms", expiration);
            }
            // Token ya expirado: no es necesario blacklistearlo
        } catch (Exception e) {
            // Redis caído, JWT inválido u otro error: el cliente igual limpia sesión;
            // sin Redis no hay blacklist posible; no bloqueamos el logout.
            log.warn("Could not blacklist token (session still cleared on client): {}", e.toString());
        }
    }

    public boolean isTokenBlacklisted(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey("blacklist:" + token));
        } catch (Exception e) {
            log.warn("Redis unavailable while checking blacklist: {}", e.toString());
            return false;
        }
    }
}