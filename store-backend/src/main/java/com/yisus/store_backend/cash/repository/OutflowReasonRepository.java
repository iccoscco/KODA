package com.yisus.store_backend.cash.repository;

import com.yisus.store_backend.cash.model.OutflowReason;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OutflowReasonRepository extends JpaRepository<OutflowReason, Long> {
    Optional<OutflowReason> findByIdAndLocal_Id(Long id, Long localId);
    Optional<OutflowReason> findByNameAndLocal_Id(String name, Long localId);
    boolean existsByNameAndLocal_Id(String name, Long localId);
    List<OutflowReason> findAllByLocal_IdAndIsActiveTrue(Long localId);
    
    Optional<OutflowReason> findByName(String name);

    boolean existsByName(String name);

    List<OutflowReason> findAllByIsActiveTrue();
}
