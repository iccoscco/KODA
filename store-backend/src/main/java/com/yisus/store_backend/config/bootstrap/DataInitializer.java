package com.yisus.store_backend.config.bootstrap;

import com.yisus.store_backend.role.model.Role;
import com.yisus.store_backend.role.service.RoleService;
import com.yisus.store_backend.role.repository.RoleRepository;
import com.yisus.store_backend.user.repository.UserRepository;
import com.yisus.store_backend.user.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NullMarked;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {
    private final RoleService roleService;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @NullMarked
    public void run(String... args) {
        log.info("Initializing data...");
        try {
            roleService.initializeDefaultPermissions();
            roleService.purgeObsoleteSuppliersPermissions();
            roleService.initializeDefaultRoles();
            roleService.assignAllPermissionsToSuperAdmin();
            initSuperAdminUser();
            log.info("Data initialized successfully");
        } catch (Exception e) {
            log.error("Failed to initialize data: {}", e.getMessage(), e);
        }
    }

    private void initSuperAdminUser() {
        String email = System.getenv("SUPERADMIN_EMAIL");
        String password = System.getenv("SUPERADMIN_PASSWORD");

        if (email == null || password == null) {
            log.warn("SUPERADMIN_EMAIL o SUPERADMIN_PASSWORD no están definidas en las variables de entorno, omitiendo creación del superadmin");
            return;
        }

        if (!userRepository.existsByEmail(email)) {
            Role superAdminRole = roleRepository.findByName("SUPERADMIN")
                    .orElseThrow(() -> new RuntimeException("SUPERADMIN role not found"));

            User superAdmin = User.builder()
                    .name("Super Admin")
                    .email(email)
                    .password(passwordEncoder.encode(password))
                    .role(superAdminRole)
                    .isActive(true)
                    .build();

            userRepository.save(superAdmin);
            log.info("SUPERADMIN user created: {}", email);
        } else {
            log.info("SUPERADMIN user already exists");
        }
    }
}
