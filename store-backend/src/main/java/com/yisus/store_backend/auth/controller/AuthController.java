package com.yisus.store_backend.auth.controller;

import com.yisus.store_backend.auth.cookie.AuthCookieNames;
import com.yisus.store_backend.auth.cookie.AuthCookieService;
import com.yisus.store_backend.auth.dto.*;
import com.yisus.store_backend.auth.service.AuthService;
import com.yisus.store_backend.user.dto.UserDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Authentication endpoints")
public class AuthController {
    private final AuthService authService;
    private final AuthCookieService authCookieService;

    @Operation(
            summary = "Register a new user",
            description = "Register a new user in the system"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User registered successfully", content = @Content(schema = @Schema(implementation = LoginResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request", content = @Content)
    })
    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(
            @Valid @RequestBody RegisterRequest registerRequest,
            HttpServletResponse response
    ) {
        AuthSessionResult result = authService.register(registerRequest);
        authCookieService.addAuthCookies(response, result.accessToken(), result.refreshToken());
        return ResponseEntity.ok(LoginResponse.builder().user(result.user()).build());
    }

    @Operation(
            summary = "Login a user",
            description = "Login with email and password; JWTs se envían en cookies httpOnly"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Login successful", content = @Content(schema = @Schema(implementation = LoginResponse.class))),
            @ApiResponse(responseCode = "401", description = "Invalid credentials", content = @Content)
    })
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest loginRequest,
            HttpServletResponse response
    ) {
        AuthSessionResult result = authService.login(loginRequest);
        authCookieService.addAuthCookies(response, result.accessToken(), result.refreshToken());
        return ResponseEntity.ok(LoginResponse.builder().user(result.user()).build());
    }

    @Operation(
            summary = "Renew tokens",
            description = "Renueva access/refresh usando la cookie refresh_token o el body (opcional)"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Tokens renewed successfully", content = @Content(schema = @Schema(implementation = LoginResponse.class))),
            @ApiResponse(responseCode = "401", description = "Invalid refresh token", content = @Content)
    })
    @PostMapping("/refresh-token")
    public ResponseEntity<LoginResponse> refreshToken(
            @RequestBody(required = false) RefreshTokenRequest refreshTokenRequest,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String refresh = resolveRefreshToken(refreshTokenRequest, request);
        if (refresh == null || refresh.isBlank()) {
            throw new BadCredentialsException("Refresh token is required");
        }
        String oldAccess = readCookie(request, AuthCookieNames.ACCESS_TOKEN);
        AuthSessionResult result = authService.refreshToken(refresh, oldAccess);
        authCookieService.addAuthCookies(response, result.accessToken(), result.refreshToken());
        return ResponseEntity.ok(LoginResponse.builder().user(result.user()).build());
    }

    @Operation(
            summary = "Log out",
            description = "Invalida tokens (blacklist) y borra cookies de sesión"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Logout successful", content = @Content),
            @ApiResponse(responseCode = "400", description = "Invalid refresh token", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthenticated", content = @Content)
    })
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @RequestBody(required = false) LogoutRequest logoutRequest,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String access = firstNonBlank(
                logoutRequest != null ? logoutRequest.getAccessToken() : null,
                readCookie(request, AuthCookieNames.ACCESS_TOKEN)
        );
        String refresh = firstNonBlank(
                logoutRequest != null ? logoutRequest.getRefreshToken() : null,
                readCookie(request, AuthCookieNames.REFRESH_TOKEN)
        );
        authService.logout(access != null ? access : "", refresh != null ? refresh : "");
        authCookieService.clearAuthCookies(response);
        return ResponseEntity.ok(Map.of("message", "Session successfully closed"));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user profile", description = "Perfil del usuario autenticado (cookie access_token o Bearer)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Profile retrieved successfully", content = @Content(schema = @Schema(implementation = UserDTO.class))),
            @ApiResponse(responseCode = "401", description = "Unauthenticated", content = @Content)
    })
    public ResponseEntity<UserDTO> getCurrentUser() {
        return ResponseEntity.ok(authService.getCurrentUser());
    }

    private static String resolveRefreshToken(RefreshTokenRequest body, HttpServletRequest request) {
        if (body != null && body.getRefreshToken() != null && !body.getRefreshToken().isBlank()) {
            return body.getRefreshToken();
        }
        return readCookie(request, AuthCookieNames.REFRESH_TOKEN);
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

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) {
            return a;
        }
        if (b != null && !b.isBlank()) {
            return b;
        }
        return null;
    }
}
