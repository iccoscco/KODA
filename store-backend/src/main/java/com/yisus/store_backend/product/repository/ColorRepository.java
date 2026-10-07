package com.yisus.store_backend.product.repository;

import com.yisus.store_backend.product.model.Color;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ColorRepository extends JpaRepository<Color, Long> {
    Optional<Color> findByName(String name);
    boolean existsByName(String name);
    List<Color> findAllByIsActiveTrue();
}
