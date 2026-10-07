package com.yisus.store_backend.role.service.Impl;

import com.yisus.store_backend.role.dto.RoleDTO;
import com.yisus.store_backend.role.dto.PermissionDTO;
import com.yisus.store_backend.role.dto.RoleCreateUpdateDTO;
import com.yisus.store_backend.role.i18n.PermissionI18nEs;
import com.yisus.store_backend.role.service.RoleService;
import com.yisus.store_backend.role.model.Role;
import com.yisus.store_backend.role.model.Permission;
import com.yisus.store_backend.role.repository.RoleRepository;
import com.yisus.store_backend.role.repository.PermissionRepository;
import com.yisus.store_backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoleServiceImpl implements RoleService {
    /** Legacy module removed from the product; kept only to filter DB/API until purged. */
    private static final String OBSOLETE_SUPPLIERS_MODULE = "suppliers";

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public RoleDTO createRole(RoleCreateUpdateDTO roleDTO) {
        Set<Permission> permissions = (roleDTO.getPermissionIds() != null && !roleDTO.getPermissionIds().isEmpty())
                ? permissionRepository.findByIdIn(roleDTO.getPermissionIds()).stream()
                        .filter(p -> !OBSOLETE_SUPPLIERS_MODULE.equals(p.getModule()))
                        .collect(Collectors.toCollection(HashSet::new))
                : new HashSet<>();

        // Si ya existe un rol con ese nombre, decidir según su estado:
        // - Activo   -> duplicado real, rechazar.
        // - Inactivo (soft-deleted) -> reactivar con los nuevos datos para
        //   evitar chocar con la restricción UNIQUE en la columna name.
        var existingOpt = roleRepository.findByName(roleDTO.getName());
        if (existingOpt.isPresent()) {
            Role existing = existingOpt.get();
            if (Boolean.TRUE.equals(existing.getIsActive())) {
                throw new IllegalArgumentException("Role name already exists");
            }
            existing.setDescription(roleDTO.getDescription());
            existing.setPermissions(permissions);
            existing.setIsActive(true);
            Role reactivated = roleRepository.save(existing);
            roleRepository.flush();
            log.info("Role reactivated: {}", reactivated.getName());
            return mapToDTO(reactivated);
        }

        Role role = Role.builder()
                .name(roleDTO.getName())
                .description(roleDTO.getDescription())
                .build();
        role.setPermissions(permissions);

        Role savedRole = roleRepository.save(role);
        roleRepository.flush();
        log.info("Role created: {}", savedRole.getName());
        return mapToDTO(savedRole);
    }

    @Override
    @Transactional
    public RoleDTO updateRole(Long id, RoleCreateUpdateDTO roleDTO) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Role not found with id: " + id));

        if("SUPERADMIN".equals(role.getName())){
            throw new IllegalArgumentException("The SUPERADMIN role cannot be modified");
        }

        if(!role.getName().equals(roleDTO.getName())){
            if(roleRepository.findByName(roleDTO.getName()).isPresent()){
                throw new IllegalArgumentException("Role name already exists");
            }
        }
        role.setName(roleDTO.getName());
        role.setDescription(roleDTO.getDescription());

        Set<Permission> permissions = (roleDTO.getPermissionIds() != null && !roleDTO.getPermissionIds().isEmpty())
                ? permissionRepository.findByIdIn(roleDTO.getPermissionIds()).stream()
                        .filter(p -> !OBSOLETE_SUPPLIERS_MODULE.equals(p.getModule()))
                        .collect(Collectors.toCollection(HashSet::new))
                : new HashSet<>();
        role.setPermissions(permissions);

        roleRepository.save(role);
        roleRepository.flush();

        Role savedRole = roleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Role not found with id: " + id));

        log.info("Role updated: {}", savedRole.getName());
        return mapToDTO(savedRole);
    }

    @Override
    @Transactional
    public void deleteRole(Long id){
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Role not found with id: " + id));

        if("SUPERADMIN".equals(role.getName())){
            throw new IllegalArgumentException("The SUPERADMIN role cannot be deleted");
        }

        long activeUsers = userRepository.countByRole_IdAndIsActiveTrue(id);
        if (activeUsers > 0) {
            throw new IllegalStateException(
                "No se puede eliminar el rol '" + role.getName() + "' porque tiene " +
                activeUsers + " usuario(s) activo(s) asignado(s). Reasigna o desactiva los usuarios primero."
            );
        }

        role.setIsActive(false);
        
        roleRepository.save(role);
        log.info("Role deactivated: {}", role.getName());
    }

    @Override
    @Transactional
    public void updateRoleStatus(Long id, Boolean isActive){
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Role not found with id: " + id));

        if("SUPERADMIN".equals(role.getName())){
            throw new IllegalArgumentException("The SUPERADMIN role status cannot be modified");
        }

        role.setIsActive(isActive);

        roleRepository.save(role);
        log.info("Role status updated: {} - isActive: {}", role.getName(), isActive);
    }

    @Override
    @Transactional(readOnly = true)
    public RoleDTO getRoleById(Long id){
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Role not found with id: " + id));
        return mapToDTO(role);
    }

    private boolean isSearchEmpty(String search) {
        return search == null || search.trim().isEmpty();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoleDTO> getAllRoles(String search) {
        if (isSearchEmpty(search)) {
            List<Role> roles = roleRepository.findByNameNot("SUPERADMIN");
            return roles.stream().map(this::mapToDTO).collect(Collectors.toList());
        } else {
            List<Role> roles = roleRepository.findBySearch(search);
            return roles.stream().map(this::mapToDTO).collect(Collectors.toList());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RoleDTO> getAllRolesPaginated(String search, Pageable pageable){
        if (isSearchEmpty(search)) {
            return roleRepository.findByNameNot("SUPERADMIN", pageable)
                    .map(this::mapToDTO);
        } else {
            return roleRepository.findBySearch(search, pageable)
                    .map(this::mapToDTO);
        }
    }

    @Override
    @Transactional
    public void assignAllPermissionsToSuperAdmin(){
        Role superAdminRole = roleRepository.findByName("SUPERADMIN")
                .orElseThrow(() -> new IllegalArgumentException("SUPERADMIN role does not exist"));
        List<Permission> allPermissions = permissionRepository.findByModuleNotOrderByIdAsc(OBSOLETE_SUPPLIERS_MODULE);
        superAdminRole.setPermissions(new HashSet<>(allPermissions));
        roleRepository.save(superAdminRole);
        log.info("All permissions assigned to SUPERADMIN: {} permissions", allPermissions.size());
    }

    @Override
    @Transactional
    public void purgeObsoleteSuppliersPermissions() {
        int unlinked = permissionRepository.deleteRolePermissionLinksForModule(OBSOLETE_SUPPLIERS_MODULE);
        int deleted = permissionRepository.deletePermissionsByModule(OBSOLETE_SUPPLIERS_MODULE);
        if (deleted > 0 || unlinked > 0) {
            log.info("Removed obsolete suppliers permissions: {} permission rows, {} role links", deleted, unlinked);
        }
    }

    @Override
    @Transactional
    public void initializeDefaultRoles(){
        log.info("Initializing default roles");

        if(roleRepository.findByName("SUPERADMIN").isEmpty()){
            Role superAdminRole = Role.builder()
                    .name("SUPERADMIN")
                    .description("Super Administrator with full access")
                    .build();
            roleRepository.save(superAdminRole);
            log.info("SUPERADMIN role initialized");
        } else {
            log.info("SUPERADMIN role already exists");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<PermissionDTO> getAllPermissions(String search){
        if (isSearchEmpty(search)) {
            List<Permission> permissions = permissionRepository.findByModuleNotOrderByIdAsc(OBSOLETE_SUPPLIERS_MODULE);
            return permissions.stream()
                    .map(this::mapPermissionToDTO)
                    .collect(Collectors.toList());
        }
        return permissionRepository.findByModuleNotOrderByIdAsc(OBSOLETE_SUPPLIERS_MODULE).stream()
                .filter(p -> PermissionI18nEs.matchesSearch(p, search))
                .map(this::mapPermissionToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PermissionDTO> getAllPermissionsPaginated(String search, Pageable pageable){
        if (isSearchEmpty(search)) {
            return permissionRepository.findByModuleNotOrderByIdAsc(OBSOLETE_SUPPLIERS_MODULE, pageable)
                    .map(this::mapPermissionToDTO);
        }
        List<Permission> filtered = permissionRepository.findByModuleNotOrderByIdAsc(OBSOLETE_SUPPLIERS_MODULE).stream()
                .filter(p -> PermissionI18nEs.matchesSearch(p, search))
                .collect(Collectors.toList());
        int total = filtered.size();
        long offset = pageable.getOffset();
        int pageSize = pageable.getPageSize();
        if (offset >= total) {
            return new PageImpl<>(List.of(), pageable, total);
        }
        int from = (int) offset;
        int to = Math.min(from + pageSize, total);
        List<PermissionDTO> slice = filtered.subList(from, to).stream()
                .map(this::mapPermissionToDTO)
                .collect(Collectors.toList());
        return new PageImpl<>(slice, pageable, total);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PermissionDTO> getPermissionsByModule(String module){
        if (OBSOLETE_SUPPLIERS_MODULE.equalsIgnoreCase(module)) {
            return List.of();
        }
        List<Permission> permissions = permissionRepository.findByModule(module);
        return permissions.stream()
                .map(this::mapPermissionToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, List<PermissionDTO>> getPermissionsGroupedByModule(){
        List<Permission> permissions = permissionRepository.findByModuleNotOrderByIdAsc(OBSOLETE_SUPPLIERS_MODULE);
        return permissions.stream()
                .collect(Collectors.groupingBy(Permission::getModule,
                        Collectors.mapping(this::mapPermissionToDTO, Collectors.toList())));
    }

    @Override
    @Transactional
    public void initializeDefaultPermissions(){
        log.info("Initializing default permissions");

        Map<String, List<String>> moduleActions = new LinkedHashMap<>();
        moduleActions.put("users",      Arrays.asList("create", "read", "update", "delete", "change_password"));
        moduleActions.put("roles",      Arrays.asList("create", "read", "update", "delete"));
        moduleActions.put("categories", Arrays.asList("create", "read", "update", "delete"));
        moduleActions.put("products",   Arrays.asList("create", "read", "update", "delete"));
        moduleActions.put("orders",     Arrays.asList("create", "read", "update", "delete", "modify_price_below_sale", "modify_price_below_purchase"));
        moduleActions.put("cash",       Arrays.asList("create", "read", "update", "delete", "create_register"));
        moduleActions.put("settings",   Arrays.asList("read", "update"));
        moduleActions.put("dashboard",  List.of("read"));
        moduleActions.put("notifications", List.of("read"));

        // Trae todos los nombres existentes en una sola query
        Set<String> existingNames = permissionRepository.findByModuleNotOrderByIdAsc(OBSOLETE_SUPPLIERS_MODULE).stream()
                .map(Permission::getName)
                .collect(Collectors.toSet());

        // Construye solo los que no existen
        List<Permission> toSave = moduleActions.entrySet().stream()
                .flatMap(entry -> entry.getValue().stream()
                        .map(action -> entry.getKey() + "." + action)
                        .filter(name -> !existingNames.contains(name))
                        .map(name -> {
                            String[] parts = name.split("\\.");
                            return Permission.builder()
                                    .name(name)
                                    .module(parts[0])
                                    .action(parts[1])
                                    .description(getPermissionDescription(parts[0], parts[1]))
                                    .build();
                        })
                )
                .collect(Collectors.toList());

        if(!toSave.isEmpty()){
            permissionRepository.saveAll(toSave);
            log.info("{} permissions initialized", toSave.size());
        } else {
            log.info("All permissions already exist");
        }
    }

    private String getPermissionDescription(String module, String action){
        Map<String, String> moduleNames = Map.ofEntries(
                Map.entry("users", "Users"),
                Map.entry("roles", "Roles and Permissions"),
                Map.entry("categories", "Categories"),
                Map.entry("products", "Products"),
                Map.entry("orders", "Orders"),
                Map.entry("cash", "Cash Register"),
                Map.entry("settings", "Settings"),
                Map.entry("dashboard", "Dashboard"),
                Map.entry("notifications", "Notifications")
        );

        Map<String, String> actionNames = Map.of(
                "create", "Create",
                "read", "View/List",
                "update", "Update",
                "delete", "Delete",
                "export", "Export",
                "print", "Print",
                "modify_price_below_sale", "Modify Price Below Sale",
                "modify_price_below_purchase", "Modify Price Below Purchase",
                "create_register", "Create Cash Register",
                "change_password", "Change Password"
        );

        String moduleName = moduleNames.getOrDefault(module, module);
        String actionName = actionNames.getOrDefault(action, action);

        return actionName + " " + moduleName;
    }

    private RoleDTO mapToDTO(Role role){
        Set<PermissionDTO> permissionDTOS = role.getPermissions().stream()
                .map(this::mapPermissionToDTO)
                .collect(Collectors.toSet());

        return RoleDTO.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .isActive(role.getIsActive())
                .permissions(permissionDTOS)
                .permissionsCount(permissionDTOS.size())
                .createdAt(role.getCreatedAt())
                .updatedAt(role.getUpdatedAt())
                .build();
    }

    private PermissionDTO mapPermissionToDTO(Permission permission){
        String name = permission.getName();
        String fallbackDesc = permission.getDescription() != null ? permission.getDescription() : "";
        return PermissionDTO.builder()
                .id(permission.getId())
                .name(name)
                .module(permission.getModule())
                .action(permission.getAction())
                .description(permission.getDescription())
                .labelEs(PermissionI18nEs.getLabelEs(name))
                .descriptionEs(PermissionI18nEs.getDescriptionEs(name, fallbackDesc))
                .createdAt(permission.getCreatedAt())
                .updatedAt(permission.getUpdatedAt())
                .build();
    }
}
