package com.yisus.store_backend.user.model;

import com.yisus.store_backend.role.model.Role;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.jspecify.annotations.NullMarked;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column
    private String password;

    @Column(name = "google_id", unique = true)
    private String googleId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id")
    private Role role;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    /**
     * Versión del token. Se incrementa cuando se cambia la contraseña para
     * invalidar los JWT emitidos previamente (todas las sesiones abiertas).
     * Los tokens llevan un claim {@code tv} que debe coincidir con este valor.
     */
    @Column(name = "token_version", nullable = false, columnDefinition = "BIGINT NOT NULL DEFAULT 0")
    @Builder.Default
    private Long tokenVersion = 0L;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Override
    @NullMarked
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (role == null) return List.of();

        List<GrantedAuthority> authorities = new ArrayList<>();

        // El rol
        authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getName()));

        // Los permisos
        role.getPermissions().forEach(permission ->
                authorities.add(new SimpleGrantedAuthority(permission.getName()))
        );

        return authorities;
    }

    @Override
    @NullMarked
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return isActive != null && isActive;
    }
}
