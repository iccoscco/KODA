package com.yisus.store_backend.cash.repository;

import com.yisus.store_backend.cash.model.CashRegister;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CashRegisterRepository extends JpaRepository<CashRegister, Long> {

    List<CashRegister> findAllByOrderByIdAsc();

    /** Compatibilidad: último registro creado (antes de multi-caja). */
    @Query("SELECT cr FROM CashRegister cr WHERE cr.id = (SELECT MAX(cr2.id) FROM CashRegister cr2)")
    Optional<CashRegister> findCurrentRegister();
}
