package com.yisus.store_backend.cash.model;

import com.yisus.store_backend.order.model.Order;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cash_outflows")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CashOutflow {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cash_session_id", nullable = true)
    private CashOpening cashOpening;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reason_id", nullable = false)
    private OutflowReason reason;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
