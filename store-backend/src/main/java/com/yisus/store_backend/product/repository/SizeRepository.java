package com.yisus.store_backend.product.repository;

import com.yisus.store_backend.product.model.Size;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SizeRepository extends JpaRepository<Size, Long> {
    Optional<Size> findByName(String name);
    boolean existsByName(String name);
    List<Size> findAllByIsActiveTrue();
}
