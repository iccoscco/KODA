package com.yisus.store_backend.category.repository;

import com.yisus.store_backend.category.model.Category;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findByName(String name);

    List<Category> findAllByIsActiveTrue();

    Page<Category> findAllByIsActiveTrue(Pageable pageable);

    @Query("SELECT c FROM Category c WHERE c.isActive = true AND " +
            "LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<Category> findBySearch(@Param("search") String search);

    @Query("SELECT c FROM Category c WHERE c.isActive = true AND " +
            "LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Category> findBySearch(@Param("search") String search, Pageable pageable);
}