package com.yisus.store_backend.product.service;

import com.yisus.store_backend.product.dto.StockMovementDTO;
import com.yisus.store_backend.product.model.ProductVariant;
import com.yisus.store_backend.product.model.StockMovement.MovementType;

import java.util.List;

public interface StockMovementService {
    void registerMovement(ProductVariant variant, Integer quantity, MovementType type, String reason);
    List<StockMovementDTO> getMovementsByProductId(Long productId);
}
