package com.yisus.store_backend.role.service;

import com.yisus.store_backend.role.dto.PermissionDTO;
import com.yisus.store_backend.role.dto.RoleCreateUpdateDTO;
import com.yisus.store_backend.role.dto.RoleDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Map;

public interface RoleService {
    RoleDTO createRole(RoleCreateUpdateDTO roleCreateUpdateDTO);
    RoleDTO updateRole(Long id, RoleCreateUpdateDTO roleCreateUpdateDTO);
    void deleteRole(Long id);
    void updateRoleStatus(Long id, Boolean isActive);
    RoleDTO getRoleById(Long id);
    List<RoleDTO> getAllRoles(String search);
    Page<RoleDTO> getAllRolesPaginated(String search, Pageable pageable);
    void assignAllPermissionsToSuperAdmin();
    void purgeObsoleteSuppliersPermissions();
    void initializeDefaultRoles();
    List<PermissionDTO> getAllPermissions(String search);
    Page<PermissionDTO> getAllPermissionsPaginated(String search, Pageable pageable);
    List<PermissionDTO> getPermissionsByModule(String module);
    Map<String, List<PermissionDTO>> getPermissionsGroupedByModule();
    void initializeDefaultPermissions();
}
