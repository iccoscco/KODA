package com.yisus.store_backend.role.repository;

import com.yisus.store_backend.role.model.Permission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {
    Optional<Permission> findByName(String name);

    List<Permission> findByModule(String module);

    List<Permission> findByModuleNotOrderByIdAsc(String module);

    Page<Permission> findByModuleNotOrderByIdAsc(String module, Pageable pageable);

    boolean existsByName(String name);

    Set<Permission> findByIdIn(Set<Long> ids);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE module = :module)", nativeQuery = true)
    int deleteRolePermissionLinksForModule(@Param("module") String module);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "DELETE FROM permissions WHERE module = :module", nativeQuery = true)
    int deletePermissionsByModule(@Param("module") String module);
}
