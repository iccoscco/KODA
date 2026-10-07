package com.yisus.store_backend.order.repository;

import com.yisus.store_backend.order.model.Order;
import com.yisus.store_backend.order.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
}
