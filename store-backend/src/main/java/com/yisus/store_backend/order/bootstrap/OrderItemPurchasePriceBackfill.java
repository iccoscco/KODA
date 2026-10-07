package com.yisus.store_backend.order.bootstrap;

import com.yisus.store_backend.order.model.OrderItem;
import com.yisus.store_backend.order.repository.OrderItemRepository;
import com.yisus.store_backend.product.model.Product;
import com.yisus.store_backend.product.model.ProductVariant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Rellena purchase_price en ítems históricos usando el costo actual del catálogo.
 * Se marca purchase_price_estimated=true para distinguirlos de ventas nuevas.
 */
@Component
@Order(20)
@RequiredArgsConstructor
@Slf4j
public class OrderItemPurchasePriceBackfill implements ApplicationRunner {

    private final OrderItemRepository orderItemRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<OrderItem> items = orderItemRepository.findAllWithoutPurchasePrice();
        if (items.isEmpty()) {
            return;
        }

        int updated = 0;
        for (OrderItem item : items) {
            ProductVariant variant = item.getProductVariant();
            if (variant == null) {
                continue;
            }
            BigDecimal purchasePrice = resolveEffectivePurchasePrice(variant);
            if (purchasePrice == null) {
                continue;
            }
            item.setPurchasePrice(purchasePrice);
            item.setPurchasePriceEstimated(Boolean.TRUE);
            orderItemRepository.save(item);
            updated++;
        }

        if (updated > 0) {
            log.info("Backfill de costo en order_items: {} línea(s) actualizada(s) (estimado)", updated);
        }
    }

    private BigDecimal resolveEffectivePurchasePrice(ProductVariant variant) {
        if (variant.getPurchasePrice() != null) {
            return variant.getPurchasePrice();
        }
        Product product = variant.getProduct();
        return product != null ? product.getPurchasePrice() : null;
    }
}
