package com.yisus.store_backend.dashboard.service.impl;

import com.yisus.store_backend.cash.repository.CashOpeningRepository;
import com.yisus.store_backend.dashboard.dto.DashboardSummaryDTO;
import com.yisus.store_backend.dashboard.dto.LowStockAlertDTO;
import com.yisus.store_backend.dashboard.dto.RegisterSalesDTO;
import com.yisus.store_backend.dashboard.dto.SellerSalesDTO;
import com.yisus.store_backend.dashboard.service.DashboardService;
import com.yisus.store_backend.order.repository.OrderRepository;
import com.yisus.store_backend.product.model.ProductVariant;
import com.yisus.store_backend.product.repository.ProductVariantRepository;
import com.yisus.store_backend.product.repository.StockMovementRepository;
import com.yisus.store_backend.product.dto.StockMovementDTO;
import com.yisus.store_backend.product.model.StockMovement;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {


    private final OrderRepository          orderRepository;
    private final ProductVariantRepository productVariantRepository;
    private final CashOpeningRepository    cashOpeningRepository;
    private final StockMovementRepository  stockMovementRepository;

    @Override
    @Transactional(readOnly = true)
    public DashboardSummaryDTO getSummary() {
        LocalDateTime startOfDay   = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay     = LocalDate.now().atTime(23, 59, 59);
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();

        List<Object[]> todayRows = orderRepository.getTodaySummary(startOfDay, endOfDay);
        Object[] todayRow = (!todayRows.isEmpty()) ? todayRows.get(0) : new Object[]{0L, BigDecimal.ZERO};
        BigDecimal monthSales = orderRepository.getMonthSales(startOfMonth);
        long openSessions  = cashOpeningRepository.countByIsActiveTrue();
        int lowStockCount  = productVariantRepository.countLowStock();

        return DashboardSummaryDTO.builder()
                .todayOrders(todayRow[0] != null ? ((Number) todayRow[0]).intValue() : 0)
                .todaySales(todayRow[1] != null ? (BigDecimal) todayRow[1] : BigDecimal.ZERO)
                .monthSales(monthSales != null ? monthSales : BigDecimal.ZERO)
                .openSessions(openSessions)
                .lowStockCount(lowStockCount)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SellerSalesDTO> getSalesBySeller() {
        return orderRepository.findSalesBySeller().stream()
                .map(row -> SellerSalesDTO.builder()
                        .sellerName((String) row[0])
                        .orderCount(((Number) row[1]).intValue())
                        .totalAmount((BigDecimal) row[2])
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RegisterSalesDTO> getSalesByRegister() {
        return orderRepository.findSalesByRegister().stream()
                .map(row -> RegisterSalesDTO.builder()
                        .registerName((String) row[0])
                        .orderCount(((Number) row[1]).intValue())
                        .totalAmount((BigDecimal) row[2])
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LowStockAlertDTO> getLowStockAlerts() {
        return productVariantRepository.findLowStockWithDetails().stream()
                .map(pv -> {
                    List<String> parts = new ArrayList<>();
                    if (pv.getColor() != null) parts.add(pv.getColor().getName());
                    if (pv.getSize()  != null) parts.add(pv.getSize().getName());
                    String variantDesc = parts.isEmpty() ? "—" : String.join(" / ", parts);

                    return LowStockAlertDTO.builder()
                            .variantId(pv.getId())
                            .productName(pv.getProduct().getName())
                            .variantDescription(variantDesc)
                            .stock(pv.getStock())
                            .minStock(pv.getMinStock())
                            .sku(pv.getSku())
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockMovementDTO> getStockInputs() {
        return stockMovementRepository.findByType(StockMovement.MovementType.INPUT).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private StockMovementDTO convertToDTO(StockMovement movement) {
        return StockMovementDTO.builder()
                .id(movement.getId())
                .quantity(movement.getQuantity())
                .type(movement.getType().name())
                .createdAt(movement.getCreatedAt())
                .build();
    }
}
