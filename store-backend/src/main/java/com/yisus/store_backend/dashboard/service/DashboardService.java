package com.yisus.store_backend.dashboard.service;

import com.yisus.store_backend.dashboard.dto.DashboardSummaryDTO;
import com.yisus.store_backend.dashboard.dto.LowStockAlertDTO;
import com.yisus.store_backend.dashboard.dto.RegisterSalesDTO;
import com.yisus.store_backend.dashboard.dto.SellerSalesDTO;
import com.yisus.store_backend.product.dto.StockMovementDTO;

import java.util.List;

public interface DashboardService {
    DashboardSummaryDTO getSummary();
    List<SellerSalesDTO> getSalesBySeller();
    List<RegisterSalesDTO> getSalesByRegister();
    List<LowStockAlertDTO> getLowStockAlerts();
    List<StockMovementDTO> getStockInputs();
}
