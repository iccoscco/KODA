package com.yisus.store_backend.order.repository;

import com.yisus.store_backend.order.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    @Query("SELECT oi FROM OrderItem oi " +
           "JOIN FETCH oi.productVariant pv " +
           "JOIN FETCH pv.product " +
           "WHERE oi.purchasePrice IS NULL")
    List<OrderItem> findAllWithoutPurchasePrice();
}
