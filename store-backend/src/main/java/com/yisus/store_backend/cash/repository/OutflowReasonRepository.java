package com.yisus.store_backend.cash.repository;

import com.yisus.store_backend.cash.model.OutflowReason;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OutflowReasonRepository extends JpaRepository<OutflowReason, Long> {
    
    Optional<OutflowReason> findByName(String name);

    boolean existsByName(String name);

    List<OutflowReason> findAllByIsActiveTrue();
}
