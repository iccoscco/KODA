package com.yisus.store_backend.auth.service;

import com.yisus.store_backend.auth.dto.AuthSessionResult;
import com.yisus.store_backend.auth.dto.LoginRequest;
import com.yisus.store_backend.auth.dto.RegisterRequest;
import com.yisus.store_backend.role.model.Role;
import com.yisus.store_backend.role.repository.RoleRepository;
import com.yisus.store_backend.user.dto.UserDTO;
import com.yisus.store_backend.user.model.User;
import com.yisus.store_backend.user.repository.UserRepository;
import com.yisus.store_backend.user.service.UserService;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final TokenBlacklistService tokenBlacklistService;

    @Transactional
    public AuthSessionResult register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        Role userRole = roleRepository.findByName("USER")
                .orElseThrow(() -> new RuntimeException("USER role not found. System may not be properly initialized."));

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(userRole)
                .isActive(true)
                .build();

        userRepository.save(user);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        UserDTO userDTO = userService.mapToDTO(user);

        return new AuthSessionResult(userDTO, accessToken, refreshToken);
    }

    public AuthSessionResult login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        UserDTO userDTO = userService.mapToDTO(user);

        return new AuthSessionResult(userDTO, accessToken, refreshToken);
    }

    public AuthSessionResult refreshToken(String refreshToken) {
        return refreshToken(refreshToken, null);
    }

    /**
     * Rotación de tokens: valida el refresh token, emite un nuevo par
     * (access + refresh) y añade ambos tokens anteriores a la blacklist para
     * que no puedan volver a usarse aunque aún no hayan expirado.
     */
    public AuthSessionResult refreshToken(String refreshToken, String oldAccessToken) {
        if (tokenBlacklistService.isTokenBlacklisted(refreshToken)) {
            throw new BadCredentialsException("Refresh token has been revoked");
        }

        String userEmail = jwtService.extractUsername(refreshToken);

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!jwtService.isTokenValid(refreshToken, user)) {
            throw new RuntimeException("Invalid refresh token");
        }

        // Invalidar el par anterior (refresh + access) para evitar reuso.
        tokenBlacklistService.blacklistToken(refreshToken);
        if (oldAccessToken != null && !oldAccessToken.isBlank()) {
            tokenBlacklistService.blacklistToken(oldAccessToken);
        }

        String newAccessToken = jwtService.generateAccessToken(user);
        String newRefreshToken = jwtService.generateRefreshToken(user);

        UserDTO userDTO = userService.mapToDTO(user);

        return new AuthSessionResult(userDTO, newAccessToken, newRefreshToken);
    }

    public void logout(String accessToken, String refreshToken) {
        if (accessToken != null && !accessToken.isBlank()) {
            tokenBlacklistService.blacklistToken(accessToken);
        }
        if (refreshToken != null && !refreshToken.isBlank()) {
            tokenBlacklistService.blacklistToken(refreshToken);
        }
    }

    public UserDTO getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return userService.mapToDTO(user);
    }
}
