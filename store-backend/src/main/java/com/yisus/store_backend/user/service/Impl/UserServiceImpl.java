package com.yisus.store_backend.user.service.Impl;

import com.yisus.store_backend.role.model.Role;
import com.yisus.store_backend.role.model.Permission;
import com.yisus.store_backend.role.repository.RoleRepository;
import com.yisus.store_backend.user.dto.ChangePasswordDTO;
import com.yisus.store_backend.user.dto.CreateUserDTO;
import com.yisus.store_backend.user.dto.UpdateProfileDTO;
import com.yisus.store_backend.user.dto.UpdateUserDTO;
import com.yisus.store_backend.user.dto.UserDTO;
import com.yisus.store_backend.user.model.User;
import com.yisus.store_backend.user.repository.UserRepository;
import com.yisus.store_backend.user.service.UserService;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService{
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public UserDTO getUserProfile(String email) {
        Optional<User> user = userRepository.findByEmail(email);
        if (user.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        return mapToDTO(user.get());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserDTO> getAllUsers(String search) {
        if (search == null || search.trim().isEmpty()) {
            return userRepository.findAllWithoutSuperAdmin().stream()
                    .map(this::mapToDTO)
                    .collect(Collectors.toList());
        } else {
            return userRepository.findBySearchWithoutSuperAdmin(search).stream()
                    .map(this::mapToDTO)
                    .collect(Collectors.toList());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return mapToDTO(user);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserDTO> getAllUsersPaginated(String search, Pageable pageable) {
        if (search == null || search.trim().isEmpty()) {
            return userRepository.findAllWithoutSuperAdmin(pageable).map(this::mapToDTO);
        } else {
            return userRepository.findBySearchWithoutSuperAdmin(search, pageable).map(this::mapToDTO);
        }
    }

    @Override
    @Transactional
    public UserDTO createUser(CreateUserDTO request){
        Role role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found"));

        // Si ya existe un usuario con ese email, decidir según su estado:
        // - Activo   -> duplicado real, rechazar.
        // - Inactivo (soft-deleted) -> reactivar con los nuevos datos (nombre,
        //   password, rol) para evitar chocar con la restricción UNIQUE en la
        //   columna email. Se invalidan tokens previos aumentando tokenVersion.
        var existingOpt = userRepository.findByEmail(request.getEmail());
        if (existingOpt.isPresent()) {
            User existing = existingOpt.get();
            if (Boolean.TRUE.equals(existing.getIsActive())) {
                throw new RuntimeException("User already exists");
            }
            existing.setName(request.getName());
            existing.setPassword(passwordEncoder.encode(request.getPassword()));
            existing.setRole(role);
            existing.setIsActive(true);
            existing.setTokenVersion((existing.getTokenVersion() == null ? 0L : existing.getTokenVersion()) + 1L);
            User reactivated = userRepository.save(existing);
            userRepository.flush();
            log.info("User reactivated: {}", reactivated.getEmail());
            return mapToDTO(reactivated);
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .isActive(true)
                .build();
        userRepository.save(user);
        userRepository.flush();
        return mapToDTO(user);
    }

    @Override
    @Transactional
    public UserDTO updateUser(Long id, UpdateUserDTO request){
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getName() != null) {
            user.setName(request.getName());
        }

        // Validar unicidad de email si se cambia
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            userRepository.findByEmail(request.getEmail()).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new RuntimeException("Email already in use by another user");
                }
            });
            user.setEmail(request.getEmail());
        }

        if (request.getRoleId() != null) {
            Role role = roleRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new RuntimeException("Role not found"));
            user.setRole(role);
        }

        userRepository.save(user);
        userRepository.flush();
        User refreshed = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return mapToDTO(refreshed);
    }

    @Override
    @Transactional
    public void deleteUser(Long id){
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsActive(false);
        
        userRepository.save(user);
        log.info("User deactivated: {}", user.getEmail());
    }

    @Override
    @Transactional
    public void updateUserStatus(Long id, Boolean isActive){
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // No permitir cambiar el status si el usuario tiene rol SUPERADMIN
        if(user.getRole() != null && "SUPERADMIN".equals(user.getRole().getName())){
            throw new RuntimeException("SUPERADMIN user status cannot be modified");
        }
        
        user.setIsActive(isActive);
        
        userRepository.save(user);
        log.info("User status updated: {} - isActive: {}", user.getEmail(), isActive);
    }

    @Override
    @Transactional
    public UserDTO updateProfile(Long userId, UpdateProfileDTO dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setName(dto.getName());

        if (!dto.getEmail().equals(user.getEmail())) {
            userRepository.findByEmail(dto.getEmail()).ifPresent(existing -> {
                if (!existing.getId().equals(userId)) {
                    throw new RuntimeException("Email already in use by another user");
                }
            });
            user.setEmail(dto.getEmail());
        }

        userRepository.save(user);
        log.info("Profile updated for user id: {}", userId);
        return mapToDTO(user);
    }

    @Override
    @Transactional
    public UserDTO uploadAvatar(Long userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException("Only image files are allowed");
        }

        try {
            Path uploadDir = Paths.get("uploads", "avatars").toAbsolutePath().normalize();
            Files.createDirectories(uploadDir);

            // Delete old avatar if stored locally
            if (user.getAvatarUrl() != null && user.getAvatarUrl().startsWith("/uploads/avatars/")) {
                Path oldFile = Paths.get(user.getAvatarUrl().substring(1)).toAbsolutePath().normalize();
                Files.deleteIfExists(oldFile);
            }

            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "avatar";
            String extension = originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                    : ".jpg";
            String fileName = "avatar_" + userId + "_" + System.currentTimeMillis() + extension;
            Path filePath = uploadDir.resolve(fileName).normalize();

            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            user.setAvatarUrl("/uploads/avatars/" + fileName);
            userRepository.save(user);
            log.info("Avatar uploaded for user id: {}", userId);
            return mapToDTO(user);
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload avatar: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public UserDTO deleteAvatar(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getAvatarUrl() != null && user.getAvatarUrl().startsWith("/uploads/avatars/")) {
            try {
                Path oldFile = Paths.get(user.getAvatarUrl().substring(1)).toAbsolutePath().normalize();
                Files.deleteIfExists(oldFile);
            } catch (IOException e) {
                log.warn("Could not delete avatar file for user {}: {}", userId, e.getMessage());
            }
        }

        user.setAvatarUrl(null);
        userRepository.save(user);
        log.info("Avatar deleted for user id: {}", userId);
        return mapToDTO(user);
    }

    @Override
    @Transactional
    public User changePassword(Long userId, ChangePasswordDTO dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        if (!dto.getNewPassword().equals(dto.getConfirmPassword())) {
            throw new RuntimeException("New password and confirmation do not match");
        }

        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        user.setTokenVersion((user.getTokenVersion() == null ? 0L : user.getTokenVersion()) + 1L);
        User saved = userRepository.save(user);
        log.info("Password changed for user id: {} (tokenVersion -> {})", userId, saved.getTokenVersion());
        return saved;
    }

    @Override
    @Transactional
    public void adminChangePassword(Long userId, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setTokenVersion((user.getTokenVersion() == null ? 0L : user.getTokenVersion()) + 1L);
        userRepository.save(user);
        log.info("Password reset by admin for user: {} (tokenVersion -> {})", user.getEmail(), user.getTokenVersion());
    }

    public UserDTO mapToDTO(User user){
        List<String> permissions = user.getRole() != null
                ? user.getRole().getPermissions().stream()
                .map(Permission::getName)
                .sorted()
                .toList()
                :List.of();

        return UserDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole() != null ? user.getRole().getName() : null)
                .permissions(permissions)
                .permissionsCount(permissions.size())
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
