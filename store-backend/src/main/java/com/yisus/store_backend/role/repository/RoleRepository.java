package com.yisus.store_backend.role.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.yisus.store_backend.role.model.Role;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(String name);

    @Query("SELECT r FROM Role r WHERE r.name != 'SUPERADMIN' AND r.isActive = true")
    List<Role> findByNameNot(String name);

    @Query("SELECT r FROM Role r WHERE r.name != 'SUPERADMIN' AND r.isActive = true")
    Page<Role> findByNameNot(String name, Pageable pageable);

    @Query("SELECT r FROM Role r WHERE " +
            "r.name != 'SUPERADMIN' AND r.isActive = true AND " +
            "LOWER(r.name) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<Role> findBySearch(@Param("search") String search);

    @Query("SELECT r FROM Role r WHERE " +
            "r.name != 'SUPERADMIN' AND r.isActive = true AND " +
            "LOWER(r.name) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Role> findBySearch(@Param("search") String search, Pageable pageable);
}
