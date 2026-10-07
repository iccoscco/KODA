package com.yisus.store_backend.role.controller;

import com.yisus.store_backend.role.dto.RoleDTO;
import com.yisus.store_backend.role.dto.RolePaginatedResponse;
import com.yisus.store_backend.role.service.RoleService;
import com.yisus.store_backend.role.dto.RoleCreateUpdateDTO;
import com.yisus.store_backend.role.dto.RoleStatusDTO;
import com.yisus.store_backend.role.dto.PermissionDTO;
import com.yisus.store_backend.role.dto.PermissionPaginatedResponse;
import com.yisus.store_backend.common.dto.MessageResponse;
import com.yisus.store_backend.common.dto.PaginatedResponse;
import com.yisus.store_backend.common.util.PaginationValidator;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/roles")
@RequiredArgsConstructor
@Tag(name = "Role", description = "Role endpoints")
@SecurityRequirement(name = "Bearer Authentication")
public class RoleController {
    private final RoleService roleService;

    @PostMapping
    @PreAuthorize("hasAuthority('roles.create')")
    @Operation(summary = "Create a new role", description = "Create a new role in the system")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Role created successfully",
                    content = @Content(schema = @Schema(implementation = RoleDTO.class))),
            @ApiResponse(responseCode = "400", description = "Bad request",
                    content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions",
                    content = @Content),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content)
    })
    public ResponseEntity<RoleDTO> createRole(@Valid @RequestBody RoleCreateUpdateDTO roleCreateUpdateDTO) {
        RoleDTO roleDTO = roleService.createRole(roleCreateUpdateDTO);
        return new ResponseEntity<>(roleDTO, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('roles.update')")
    @Operation(
            summary = "Update a role by ID",
            description = "Update a role in the system by its ID"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Role updated successfully",
                    content = @Content(schema = @Schema(implementation = RoleDTO.class))),
            @ApiResponse(responseCode = "400", description = "Bad request",
                    content = @Content),
            @ApiResponse(responseCode = "404", description = "Role not found",
                    content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions",
                    content = @Content),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content)
    })
    public ResponseEntity<RoleDTO> updateRole(@PathVariable Long id, @Valid @RequestBody RoleCreateUpdateDTO roleCreateUpdateDTO) {
        RoleDTO roleDTO = roleService.updateRole(id, roleCreateUpdateDTO);
        return ResponseEntity.ok(roleDTO);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('roles.delete')")
    @Operation(summary = "Delete a role by ID", description = "Delete a role in the system by its ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Role deleted successfully",
                    content = @Content(schema = @Schema(implementation = MessageResponse.class))),
            @ApiResponse(responseCode = "404", description = "Role not found",
                    content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions",
                    content = @Content),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content)
    })
    public ResponseEntity<MessageResponse> deleteRole(@PathVariable Long id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok(new MessageResponse("Role successfully removed"));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('roles.update')")
    @Operation(summary = "Update role status", description = "Updates the status of a role (activate/deactivate)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Role status updated successfully",
                    content = @Content(schema = @Schema(implementation = MessageResponse.class))),
            @ApiResponse(responseCode = "404", description = "Role not found", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content)
    })
    public ResponseEntity<MessageResponse> updateRoleStatus(@PathVariable Long id, @Valid @RequestBody RoleStatusDTO statusDTO) {
        roleService.updateRoleStatus(id, statusDTO.getIsActive());
        return ResponseEntity.ok(new MessageResponse("Role status updated successfully"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('roles.read')")
    @Operation(summary = "Get a role by ID", description = "Get a role in the system by its ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Role retrieved successfully",
                    content = @Content(schema = @Schema(implementation = RoleDTO.class))),
            @ApiResponse(responseCode = "404", description = "Role not found",
                    content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions",
                    content = @Content),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content)
    })
    public ResponseEntity<RoleDTO> getRoleById(@PathVariable Long id) {
        RoleDTO roleDTO = roleService.getRoleById(id);
        return ResponseEntity.ok(roleDTO);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('roles.read')")
    @Operation(
            summary = "List all roles",
            description = "List all roles in the system"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Roles retrieved successfully",
                    content = @Content(schema = @Schema(implementation = RoleDTO.class))),
            @ApiResponse(responseCode = "200", description = "Roles retrieved successfully (paginated)",
                    content = @Content(schema = @Schema(implementation = RolePaginatedResponse.class))),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions",
                    content = @Content),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content)
    })
    public ResponseEntity<?> getAllRoles(@RequestParam(required = false) Integer limit, @RequestParam(required = false) Integer offset, @RequestParam(required = false) String search, HttpServletRequest request) {
        if(limit != null && offset != null){
            PaginationValidator.validatePaginationParams(limit, offset);
            int page = (offset + limit - 1) / limit;
            Pageable pageable = PageRequest.of(page, limit, Sort.by("id").ascending());
            Page<RoleDTO> rolesPage = roleService.getAllRolesPaginated(search, pageable);
            PaginatedResponse<RoleDTO> response = PaginationValidator.buildPaginatedResponse(
                    rolesPage,
                    limit,
                    offset,
                    request.getRequestURI(),
                    request.getQueryString()
            );
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.ok(roleService.getAllRoles(search));
        }
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasAuthority('roles.read')")
    @Operation(summary = "List all permissions", description = "List all permissions in the system")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Permissions retrieved successfully",
                    content = @Content(schema = @Schema(implementation = PermissionDTO.class))),
            @ApiResponse(responseCode = "200", description = "Permissions retrieved successfully (paginated)",
                    content = @Content(schema = @Schema(implementation = PermissionPaginatedResponse.class))),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions",
                    content = @Content),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content)
    })
    public ResponseEntity<?> getAllPermissions(@RequestParam(required = false) Integer limit, @RequestParam(required = false) Integer offset, @RequestParam(required = false) String search, HttpServletRequest request) {
        if(limit != null && offset != null){
            PaginationValidator.validatePaginationParams(limit, offset);
            int page = (offset + limit - 1) / limit;
            Pageable pageable = PageRequest.of(page, limit, Sort.by("id").ascending());
            Page<PermissionDTO> permissionsPage = roleService.getAllPermissionsPaginated(search, pageable);
            PaginatedResponse<PermissionDTO> response = PaginationValidator.buildPaginatedResponse(
                    permissionsPage,
                    limit,
                    offset,
                    request.getRequestURI(),
                    request.getQueryString()
            );
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.ok(roleService.getAllPermissions(search));
        }
    }

    @GetMapping("/permissions/module/{module}")
    @PreAuthorize("hasAuthority('roles.read')")
    @Operation(summary = "List permissions by module", description = "Obtains permissions from a specific module")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Permissions retrieved successfully",
                    content = @Content(schema = @Schema(implementation = PermissionDTO.class))),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions",
                    content = @Content),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content)
    })
    public ResponseEntity<List<PermissionDTO>> getPermissionsByModule(@PathVariable String module) {
        List<PermissionDTO> permissions = roleService.getPermissionsByModule(module);
        return ResponseEntity.ok(permissions);
    }

    @GetMapping("/permissions/group")
    @PreAuthorize("hasAuthority('roles.read')")
    @Operation(summary = "List permissions grouped by module", description = "Obtains permissions grouped by module")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Permissions retrieved successfully",
                    content = @Content(schema = @Schema(implementation = Map.class))),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions",
                    content = @Content),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content)
    })
    public ResponseEntity<Map<String, List<PermissionDTO>>> getPermissionsGroupedByModule() {
        Map<String, List<PermissionDTO>> permissions = roleService.getPermissionsGroupedByModule();
        return ResponseEntity.ok(permissions);
    }
}
