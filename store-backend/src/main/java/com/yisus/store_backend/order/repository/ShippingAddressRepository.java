package com.yisus.store_backend.order.repository;

import com.yisus.store_backend.order.model.ShippingAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShippingAddressRepository extends JpaRepository<ShippingAddress, Long> {
    
    // Métodos básicos heredados de JpaRepository son suficientes
}
