package com.yisus.store_backend.cash.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cash_openings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CashOpening {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "initial_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal initialAmount;

    @Column(name = "closing_amount", precision = 10, scale = 2)
    private BigDecimal closingAmount;

    @Column(name = "system_balance", precision = 10, scale = 2)
    private BigDecimal systemBalance;

    @Column(name = "difference", precision = 10, scale = 2)
    private BigDecimal difference;

    @CreationTimestamp
    @Column(name = "opened_at", nullable = false, updatable = false)
    private LocalDateTime openedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    /** Caja física a la que pertenece esta sesión (varias cajeras = varias sesiones activas, una por caja). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cash_register_id", nullable = true)
    private CashRegister cashRegister;
}
