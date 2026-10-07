package com.yisus.store_backend.cash.repository;

import com.yisus.store_backend.cash.model.CashInflow;
import com.yisus.store_backend.order.model.Order;
import java.math.BigDecimal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CashInflowRepository extends JpaRepository<CashInflow, Long> {
    
    List<CashInflow> findByOrder(Order order);
    
    @Query("SELECT ci FROM CashInflow ci WHERE ci.createdAt BETWEEN :startDate AND :endDate")
    List<CashInflow> findByDateRange(@Param("startDate") LocalDateTime startDate, 
                                     @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT SUM(ci.amount) FROM CashInflow ci WHERE ci.createdAt BETWEEN :startDate AND :endDate")
    Double sumAmountByDateRange(@Param("startDate") LocalDateTime startDate, 
                               @Param("endDate") LocalDateTime endDate);

    @Query("SELECT COALESCE(SUM(ci.amount), 0) FROM CashInflow ci WHERE ci.cashOpening.id = :sessionId")
    BigDecimal sumAmountBySessionId(@Param("sessionId") Long sessionId);
}
