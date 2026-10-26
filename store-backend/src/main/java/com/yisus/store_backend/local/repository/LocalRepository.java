package com.yisus.store_backend.local.repository;

import com.yisus.store_backend.local.model.Local;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LocalRepository extends JpaRepository<Local, Long> {
    Optional<Local> findByCode(String code);
    List<Local> findAllByActiveTrueOrderByNameAsc();
}
