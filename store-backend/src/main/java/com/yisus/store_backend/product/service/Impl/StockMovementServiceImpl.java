package com.yisus.store_backend.product.service.Impl;

import com.yisus.store_backend.product.dto.StockMovementDTO;
import com.yisus.store_backend.product.model.ProductVariant;
import com.yisus.store_backend.product.model.StockMovement;
import com.yisus.store_backend.product.model.StockMovement.MovementType;
import com.yisus.store_backend.product.repository.StockMovementRepository;
import com.yisus.store_backend.product.service.StockMovementService;
import com.yisus.store_backend.user.model.User;
import com.yisus.store_backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockMovementServiceImpl implements StockMovementService {

    private final StockMovementRepository stockMovementRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public void registerMovement(ProductVariant variant, Integer quantity, MovementType type, String reason) {
        if (quantity == null || quantity <= 0) {
            return;
        }

        BigDecimal unitCost = BigDecimal.ZERO;
        if (type == MovementType.INPUT) {
            unitCost = variant.getPurchasePrice() != null ? variant.getPurchasePrice() :
                       (variant.getProduct() != null ? variant.getProduct().getPurchasePrice() : BigDecimal.ZERO);
        } else {
            unitCost = variant.getSalePrice() != null ? variant.getSalePrice() :
                       (variant.getProduct() != null ? variant.getProduct().getSalePrice() : BigDecimal.ZERO);
        }
        
        BigDecimal total = unitCost.multiply(BigDecimal.valueOf(quantity));

        User currentUser = getCurrentUser();
        StockMovement movement = StockMovement.builder()
                .productVariant(variant)
                .quantity(quantity)
                .type(type)
                .reason(reason)
                .user(currentUser)
                .unitCost(unitCost)
                .total(total)
                .build();
        stockMovementRepository.save(movement);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockMovementDTO> getMovementsByProductId(Long productId) {
        List<StockMovement> movements = stockMovementRepository.findByProductVariantProductIdOrderByCreatedAtDesc(productId);
        return movements.stream()
                .map(this::convertToDTO)
                .toList();
    }

    private StockMovementDTO convertToDTO(StockMovement movement) {
        ProductVariant v = movement.getProductVariant();
        String variantLabel = buildVariantLabel(v);
        return StockMovementDTO.builder()
                .id(movement.getId())
                .productVariantId(v.getId())
                .variantLabel(variantLabel)
                .quantity(movement.getQuantity())
                .type(movement.getType().name())
                .reason(movement.getReason())
                .userName(movement.getUser() != null ? movement.getUser().getName() : "Sistema")
                .unitCost(movement.getUnitCost())
                .total(movement.getTotal())
                .createdAt(movement.getCreatedAt())
                .build();
    }

    private String buildVariantLabel(ProductVariant variant) {
        StringBuilder sb = new StringBuilder();
        if (variant.getColor() != null) sb.append(variant.getColor().getName());
        if (variant.getSize() != null) {
            if (!sb.isEmpty()) sb.append(" / ");
            sb.append(variant.getSize().getName());
        }
        if (variant.getSku() != null && !variant.getSku().isBlank()) {
            if (!sb.isEmpty()) sb.append(" (");
            else sb.append("(");
            sb.append("SKU: ").append(variant.getSku()).append(")");
        }
        return sb.isEmpty() ? "Variante única" : sb.toString();
    }

    private User getCurrentUser() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
                return userRepository.findByEmail(auth.getName()).orElse(null);
            }
        } catch (Exception e) {
            // ignore
        }
        return null;
    }
}
