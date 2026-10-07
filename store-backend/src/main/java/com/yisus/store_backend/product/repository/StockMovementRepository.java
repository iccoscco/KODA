package com.yisus.store_backend.product.repository;

import com.yisus.store_backend.product.model.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
    List<StockMovement> findByProductVariantProductIdOrderByCreatedAtDesc(Long productId);

    @org.springframework.data.jpa.repository.Query("SELECT sm FROM StockMovement sm WHERE sm.unitCost IS NULL")
    List<StockMovement> findAllWithoutUnitCost();

    List<StockMovement> findByType(StockMovement.MovementType type);
}
