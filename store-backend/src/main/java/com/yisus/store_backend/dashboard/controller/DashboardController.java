package com.yisus.store_backend.dashboard.controller;

import com.yisus.store_backend.dashboard.dto.DashboardSummaryDTO;
import com.yisus.store_backend.dashboard.dto.LowStockAlertDTO;
import com.yisus.store_backend.dashboard.dto.RegisterSalesDTO;
import com.yisus.store_backend.dashboard.dto.SellerSalesDTO;
import com.yisus.store_backend.dashboard.service.DashboardService;
import com.yisus.store_backend.product.dto.StockMovementDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Métricas y resumen del panel principal")
@SecurityRequirement(name = "Bearer Authentication")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('dashboard.read')")
    @Operation(summary = "Resumen general: ventas hoy/mes, órdenes, sesiones y alertas de stock")
    public ResponseEntity<DashboardSummaryDTO> getSummary() {
        return ResponseEntity.ok(dashboardService.getSummary());
    }

    @GetMapping("/sales-by-seller")
    @PreAuthorize("hasAuthority('dashboard.read')")
    @Operation(summary = "Ventas totales agrupadas por vendedor")
    public ResponseEntity<List<SellerSalesDTO>> getSalesBySeller() {
        return ResponseEntity.ok(dashboardService.getSalesBySeller());
    }

    @GetMapping("/sales-by-register")
    @PreAuthorize("hasAuthority('dashboard.read')")
    @Operation(summary = "Ventas totales agrupadas por caja")
    public ResponseEntity<List<RegisterSalesDTO>> getSalesByRegister() {
        return ResponseEntity.ok(dashboardService.getSalesByRegister());
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasAuthority('dashboard.read')")
    @Operation(summary = "Variantes con stock igual o menor a 5 unidades")
    public ResponseEntity<List<LowStockAlertDTO>> getLowStock() {
        return ResponseEntity.ok(dashboardService.getLowStockAlerts());
    }

    @GetMapping("/stock-inputs")
    @PreAuthorize("hasAuthority('dashboard.read')")
    @Operation(summary = "Todos los ingresos de productos al almacén")
    public ResponseEntity<List<StockMovementDTO>> getStockInputs() {
        return ResponseEntity.ok(dashboardService.getStockInputs());
    }
}
