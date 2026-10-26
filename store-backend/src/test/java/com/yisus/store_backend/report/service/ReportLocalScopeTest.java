package com.yisus.store_backend.report.service;

import com.yisus.store_backend.cash.repository.CashOpeningRepository;
import com.yisus.store_backend.cash.repository.CashOutflowRepository;
import com.yisus.store_backend.local.service.LocalScope;
import com.yisus.store_backend.order.repository.OrderRepository;
import com.yisus.store_backend.product.repository.ProductRepository;
import com.yisus.store_backend.product.repository.ProductVariantRepository;
import com.yisus.store_backend.report.service.impl.ReportServiceImpl;
import com.yisus.store_backend.storeconfig.service.StoreConfigService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReportLocalScopeTest {
    private final CashOpeningRepository openings = mock(CashOpeningRepository.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final LocalScope localScope = mock(LocalScope.class);
    private final ReportServiceImpl service = new ReportServiceImpl(
            openings,
            mock(CashOutflowRepository.class),
            mock(OrderRepository.class),
            products,
            mock(ProductVariantRepository.class),
            mock(StoreConfigService.class),
            localScope);

    @Test
    void productReportUsesEffectiveLocal() {
        when(localScope.id()).thenReturn(8L);
        when(products.findForReport(8L, null)).thenReturn(List.of());

        assertTrue(service.getProductsList(null, null, null).isEmpty());

        verify(products).findForReport(8L, null);
    }

    @Test
    void cashReportUsesEffectiveLocalBeforeApplyingFilters() {
        when(localScope.id()).thenReturn(8L);
        when(openings.findForReport(8L, null)).thenReturn(List.of());

        assertTrue(service.getCashSessionsList(null, null, null, null).isEmpty());

        verify(openings).findForReport(8L, null);
    }
}
