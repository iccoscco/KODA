package com.yisus.store_backend.product.bootstrap;

import com.yisus.store_backend.product.model.Product;
import com.yisus.store_backend.product.model.ProductVariant;
import com.yisus.store_backend.product.model.StockMovement;
import com.yisus.store_backend.product.model.StockMovement.MovementType;
import com.yisus.store_backend.product.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Component
@Order(21)
@RequiredArgsConstructor
@Slf4j
public class StockMovementCostBackfill implements ApplicationRunner {

    private final StockMovementRepository stockMovementRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<StockMovement> movements = stockMovementRepository.findAllWithoutUnitCost();
        if (movements.isEmpty()) {
            return;
        }

        int updated = 0;
        for (StockMovement movement : movements) {
            ProductVariant variant = movement.getProductVariant();
            if (variant == null) {
                continue;
            }

            BigDecimal unitCost = BigDecimal.ZERO;
            if (movement.getType() == MovementType.INPUT) {
                unitCost = variant.getPurchasePrice() != null ? variant.getPurchasePrice() :
                           (variant.getProduct() != null ? variant.getProduct().getPurchasePrice() : BigDecimal.ZERO);
            } else {
                unitCost = variant.getSalePrice() != null ? variant.getSalePrice() :
                           (variant.getProduct() != null ? variant.getProduct().getSalePrice() : BigDecimal.ZERO);
            }

            movement.setUnitCost(unitCost);
            movement.setTotal(unitCost.multiply(BigDecimal.valueOf(movement.getQuantity())));
            stockMovementRepository.save(movement);
            updated++;
        }

        if (updated > 0) {
            log.info("Backfill de costos en stock_movements (Kardex): {} movimiento(s) actualizado(s) con valor histórico inicial", updated);
        }
    }
}
