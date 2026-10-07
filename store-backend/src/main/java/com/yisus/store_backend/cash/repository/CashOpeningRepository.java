package com.yisus.store_backend.cash.repository;

import com.yisus.store_backend.cash.model.CashOpening;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CashOpeningRepository extends JpaRepository<CashOpening, Long> {

    Optional<CashOpening> findByCashRegisterIdAndIsActiveTrue(Long cashRegisterId);

    List<CashOpening> findAllByIsActiveTrue();

    List<CashOpening> findAllByOrderByOpenedAtDesc();

    List<CashOpening> findAllByCashRegisterIdOrderByOpenedAtDesc(Long cashRegisterId);

    /**
     * Historial paginado sin texto de búsqueda: no toca {@code cash_register.name} (evita {@code bytea}
     * y bugs de Hibernate con CONCAT en JPQL).
     */
    @Query("SELECT o FROM CashOpening o JOIN o.cashRegister cr WHERE " +
            "(:registerId IS NULL OR cr.id = :registerId)")
    Page<CashOpening> findSessionHistoryPaginatedNoSearch(
            @Param("registerId") Long cashRegisterId,
            Pageable pageable);

    /**
     * Historial filtrado: caja (opcional), nº de sesión, rango de fechas de apertura,
     * y/o sesiones que tengan al menos una venta cuyo cliente (nombre en envío) o vendedor coincida.
     */
    @Query(
            value = """
                    SELECT co.id, co.initial_amount, co.closing_amount, co.system_balance, co.difference,
                           co.opened_at, co.closed_at, co.is_active, co.cash_register_id
                    FROM cash_openings co
                    INNER JOIN cash_register cr ON cr.id = co.cash_register_id
                    WHERE (:registerId IS NULL OR cr.id = :registerId)
                      AND (:sessionId IS NULL OR co.id = :sessionId)
                      AND (NOT COALESCE(:filterOpenedFrom, false) OR co.opened_at >= :openedFromStart)
                      AND (NOT COALESCE(:filterOpenedTo, false) OR co.opened_at < :openedToEndExclusive)
                      AND (
                        NOT COALESCE(:applyOrderFilter, false)
                        OR EXISTS (
                          SELECT 1 FROM cash_inflows ci
                          INNER JOIN orders o ON o.id = ci.order_id
                          LEFT JOIN shipping_addresses sa ON sa.order_id = o.id
                          INNER JOIN users u ON u.id = o.user_id
                          WHERE ci.cash_session_id = co.id
                            AND (NOT COALESCE(:filterCustomer, false)
                                 OR lower(coalesce(sa.full_name, '')) LIKE lower(concat(chr(37), cast(:customerPattern as text), chr(37))))
                            AND (NOT COALESCE(:filterSeller, false)
                                 OR lower(coalesce(u.name, '')) LIKE lower(concat(chr(37), cast(:sellerPattern as text), chr(37))))
                        )
                      )
                    ORDER BY co.opened_at DESC
                    """,
            countQuery = """
                    SELECT count(co.id)
                    FROM cash_openings co
                    INNER JOIN cash_register cr ON cr.id = co.cash_register_id
                    WHERE (:registerId IS NULL OR cr.id = :registerId)
                      AND (:sessionId IS NULL OR co.id = :sessionId)
                      AND (NOT COALESCE(:filterOpenedFrom, false) OR co.opened_at >= :openedFromStart)
                      AND (NOT COALESCE(:filterOpenedTo, false) OR co.opened_at < :openedToEndExclusive)
                      AND (
                        NOT COALESCE(:applyOrderFilter, false)
                        OR EXISTS (
                          SELECT 1 FROM cash_inflows ci
                          INNER JOIN orders o ON o.id = ci.order_id
                          LEFT JOIN shipping_addresses sa ON sa.order_id = o.id
                          INNER JOIN users u ON u.id = o.user_id
                          WHERE ci.cash_session_id = co.id
                            AND (NOT COALESCE(:filterCustomer, false)
                                 OR lower(coalesce(sa.full_name, '')) LIKE lower(concat(chr(37), cast(:customerPattern as text), chr(37))))
                            AND (NOT COALESCE(:filterSeller, false)
                                 OR lower(coalesce(u.name, '')) LIKE lower(concat(chr(37), cast(:sellerPattern as text), chr(37))))
                        )
                      )
                    """,
            nativeQuery = true)
    Page<CashOpening> findSessionHistoryPaginatedFiltered(
            @Param("registerId") Long registerId,
            @Param("sessionId") Long sessionId,
            @Param("filterOpenedFrom") boolean filterOpenedFrom,
            @Param("openedFromStart") LocalDateTime openedFromStart,
            @Param("filterOpenedTo") boolean filterOpenedTo,
            @Param("openedToEndExclusive") LocalDateTime openedToEndExclusive,
            @Param("applyOrderFilter") boolean applyOrderFilter,
            @Param("filterCustomer") boolean filterCustomer,
            @Param("customerPattern") String customerPattern,
            @Param("filterSeller") boolean filterSeller,
            @Param("sellerPattern") String sellerPattern,
            Pageable pageable);

    /** Para el Dashboard: número de sesiones actualmente abiertas. */
    long countByIsActiveTrue();

    /** Para el módulo de Reportes: sesiones filtradas sin paginación. */
    @Query("SELECT o FROM CashOpening o LEFT JOIN FETCH o.cashRegister cr WHERE " +
           "(:registerId IS NULL OR cr.id = :registerId) " +
           "ORDER BY o.openedAt DESC")
    List<CashOpening> findForReport(@Param("registerId") Long registerId);
}
