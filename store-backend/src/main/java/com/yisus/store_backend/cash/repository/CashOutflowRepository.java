package com.yisus.store_backend.cash.repository;

import com.yisus.store_backend.cash.model.CashOutflow;
import com.yisus.store_backend.order.model.Order;
import java.math.BigDecimal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CashOutflowRepository extends JpaRepository<CashOutflow, Long> {
    
    @Query("SELECT co FROM CashOutflow co WHERE co.createdAt BETWEEN :startDate AND :endDate")
    List<CashOutflow> findByDateRange(@Param("startDate") LocalDateTime startDate, 
                                      @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT SUM(co.amount) FROM CashOutflow co WHERE co.createdAt BETWEEN :startDate AND :endDate")
    Double sumAmountByDateRange(@Param("startDate") LocalDateTime startDate, 
                               @Param("endDate") LocalDateTime endDate);

    @Query("SELECT COALESCE(SUM(co.amount), 0) FROM CashOutflow co WHERE co.cashOpening.id = :sessionId")
    BigDecimal sumAmountBySessionId(@Param("sessionId") Long sessionId);

    @Query("SELECT co FROM CashOutflow co WHERE co.cashOpening.id = :sessionId ORDER BY co.createdAt ASC")
    List<CashOutflow> findBySessionId(@Param("sessionId") Long sessionId);

    @Query("SELECT co FROM CashOutflow co LEFT JOIN FETCH co.reason WHERE co.cashOpening.id = :sessionId ORDER BY co.createdAt ASC")
    List<CashOutflow> findBySessionIdWithReason(@Param("sessionId") Long sessionId);
}
