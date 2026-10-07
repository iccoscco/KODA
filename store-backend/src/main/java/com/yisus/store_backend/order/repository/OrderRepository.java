package com.yisus.store_backend.order.repository;

import com.yisus.store_backend.order.model.Order;
import com.yisus.store_backend.user.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    
    List<Order> findByUser(User user);
    
    List<Order> findByStatus(Order.OrderStatus status);
    
    @Query("SELECT o FROM Order o WHERE LOWER(o.user.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(o.user.email) LIKE LOWER(CONCAT('%', :search, '%')) OR CAST(o.id AS string) LIKE CONCAT('%', :search, '%')")
    List<Order> findBySearch(@Param("search") String search);
    
    @Query("SELECT o FROM Order o WHERE LOWER(o.user.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(o.user.email) LIKE LOWER(CONCAT('%', :search, '%')) OR CAST(o.id AS string) LIKE CONCAT('%', :search, '%')")
    Page<Order> findBySearch(@Param("search") String search, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.id IN (SELECT ci.order.id FROM CashInflow ci WHERE ci.cashOpening.id = :sessionId) ORDER BY o.createdAt DESC")
    List<Order> findBySessionId(@Param("sessionId") Long sessionId);

    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.user " +
           "LEFT JOIN FETCH o.payments " +
           "LEFT JOIN FETCH o.shippingAddress " +
           "WHERE o.id IN (SELECT ci.order.id FROM CashInflow ci WHERE ci.cashOpening.id = :sessionId) " +
           "ORDER BY o.createdAt ASC")
    List<Order> findBySessionIdWithDetails(@Param("sessionId") Long sessionId);

    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.user " +
           "LEFT JOIN FETCH o.orderItems oi " +
           "LEFT JOIN FETCH oi.productVariant pv " +
           "LEFT JOIN FETCH pv.product")
    List<Order> findAllWithItems();

    // ── Dashboard ─────────────────────────────────────────────────────────────

    @Query("SELECT COUNT(o), COALESCE(SUM(o.total), 0) FROM Order o " +
           "WHERE o.status != 'CANCELLED' AND o.createdAt >= :start AND o.createdAt <= :end")
    List<Object[]> getTodaySummary(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o " +
           "WHERE o.status != 'CANCELLED' AND o.createdAt >= :startOfMonth")
    BigDecimal getMonthSales(@Param("startOfMonth") LocalDateTime startOfMonth);

    @Query("SELECT o.user.name, COUNT(o), COALESCE(SUM(o.total), 0) FROM Order o " +
           "WHERE o.status != 'CANCELLED' " +
           "GROUP BY o.user.id, o.user.name ORDER BY COALESCE(SUM(o.total), 0) DESC")
    List<Object[]> findSalesBySeller();

    @Query("SELECT o.cashRegister.name, COUNT(o), COALESCE(SUM(o.total), 0) FROM Order o " +
           "WHERE o.status != 'CANCELLED' AND o.cashRegister IS NOT NULL " +
           "GROUP BY o.cashRegister.id, o.cashRegister.name ORDER BY COALESCE(SUM(o.total), 0) DESC")
    List<Object[]> findSalesByRegister();
}
