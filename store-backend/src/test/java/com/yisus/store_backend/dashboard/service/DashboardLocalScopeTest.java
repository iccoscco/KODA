package com.yisus.store_backend.dashboard.service;

import com.yisus.store_backend.cash.repository.CashOpeningRepository;
import com.yisus.store_backend.dashboard.service.impl.DashboardServiceImpl;
import com.yisus.store_backend.local.service.LocalScope;
import com.yisus.store_backend.order.repository.OrderRepository;
import com.yisus.store_backend.product.repository.ProductVariantRepository;
import com.yisus.store_backend.product.repository.StockMovementRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DashboardLocalScopeTest {
    private final OrderRepository orders = mock(OrderRepository.class);
    private final ProductVariantRepository variants = mock(ProductVariantRepository.class);
    private final CashOpeningRepository openings = mock(CashOpeningRepository.class);
    private final StockMovementRepository movements = mock(StockMovementRepository.class);
    private final LocalScope localScope = mock(LocalScope.class);
    private final DashboardServiceImpl service =
            new DashboardServiceImpl(orders, variants, openings, movements, localScope);

    @Test
    void dashboardSummaryPassesEffectiveLocalToEveryAggregate() {
        when(localScope.id()).thenReturn(4L);
        when(orders.getTodaySummary(eq(4L), any(), any()))
                .thenReturn(Collections.singletonList(new Object[]{0L, BigDecimal.ZERO}));
        when(orders.getMonthSales(eq(4L), any())).thenReturn(BigDecimal.ZERO);

        service.getSummary();

        verify(orders).getTodaySummary(eq(4L), any(), any());
        verify(orders).getMonthSales(eq(4L), any());
        verify(openings).countByIsActiveTrueAndCashRegister_Local_Id(4L);
        verify(variants).countLowStock(4L);
    }

    @Test
    void stockEndpointsPassEffectiveLocal() {
        when(localScope.id()).thenReturn(4L);

        service.getSalesBySeller();
        service.getSalesByRegister();
        service.getLowStockAlerts();
        service.getStockInputs();

        verify(orders).findSalesBySeller(4L);
        verify(orders).findSalesByRegister(4L);
        verify(variants).findLowStockWithDetails(4L);
        verify(movements).findByTypeAndProductVariant_Product_Local_IdOrderByCreatedAtDesc(
                com.yisus.store_backend.product.model.StockMovement.MovementType.INPUT, 4L);
    }
}
