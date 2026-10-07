package com.yisus.store_backend.config.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yisus.store_backend.auth.cookie.AuthCookieNames;
import com.yisus.store_backend.auth.service.JwtService;
import com.yisus.store_backend.auth.service.TokenBlacklistService;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NullMarked;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final TokenBlacklistService tokenBlacklistService;

    /**
     * Excluir rutas de /auth/** del filtro JWT.
     * Aunque SecurityConfig marca /auth/** como permitAll(), el filtro se ejecuta
     * antes y puede bloquear (con 401) una solicitud a /auth/refresh-token cuando
     * el access_token en cookie está adulterado, impidiendo que el refresh funcione.
     */
    /** Rutas de /auth que NO necesitan que el filtro JWT procese el token. */
    private static final java.util.Set<String> JWT_SKIP_PATHS = java.util.Set.of(
            "/auth/login",
            "/auth/register",
            "/auth/logout",
            "/auth/refresh-token"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return JWT_SKIP_PATHS.contains(request.getServletPath());
    }

    @Override
    @NullMarked
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        final String jwt = resolveJwt(request);

        if (jwt == null || jwt.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        final String userEmail;

        try {
            try {
                if (tokenBlacklistService.isTokenBlacklisted(jwt)) {
                    handleJwtException(response, "Invalid token", "This token has been revoked and is no longer valid");
                    return;
                }
            } catch (Exception redisException) {
                System.err.println("Redis blacklist check failed: " + redisException.getMessage());
            }

            userEmail = jwtService.extractUsername(jwt);

            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    if (!userDetails.isEnabled()) {
                        handleJwtException(response, "Account disabled", "Your account has been deactivated");
                        return;
                    }
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                    );
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
            filterChain.doFilter(request, response);
        } catch (ExpiredJwtException e) {
            handleJwtException(response, "Token expired", "The JWT token has expired");
        } catch (SignatureException e) {
            handleJwtException(response, "Invalid token", "The JWT token signature is invalid.");
        } catch (MalformedJwtException e) {
            handleJwtException(response, "Malformed token", "The JWT token format is invalid");
        } catch (Exception e) {
            handleJwtException(response, "Authentication error", "The JWT token could not be processed");
        }
    }

    private static String resolveJwt(HttpServletRequest request) {
        final String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return readCookie(request, AuthCookieNames.ACCESS_TOKEN);
    }

    private static String readCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie c : cookies) {
            if (name.equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }

    private void handleJwtException(HttpServletResponse response, String error, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("timestamp", LocalDateTime.now().toString());
        errorResponse.put("status", 401);
        errorResponse.put("error", error);
        errorResponse.put("message", message);

        ObjectMapper mapper = new ObjectMapper();
        response.getWriter().write(mapper.writeValueAsString(errorResponse));
    }
}
