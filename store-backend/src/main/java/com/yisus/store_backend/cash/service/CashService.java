package com.yisus.store_backend.cash.service;

import com.yisus.store_backend.cash.dto.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;

public interface CashService {
    // Cash Register (por caja física)
    CashRegisterDTO getCurrentBalance(Long registerId);
    CashRegisterDTO adjustBalance(Long registerId, BigDecimal adjustment, boolean isInflow);

    
    // Cash Inflows
    List<CashInflowDTO> getAllInflows();
    Page<CashInflowDTO> getAllInflowsPaginated(Pageable pageable);
    List<CashInflowDTO> getInflowsByDateRange(java.time.LocalDateTime startDate, java.time.LocalDateTime endDate);
    CashInflowDTO createInflowFromOrder(Long orderId);
    
    // Outflow Reasons
    OutflowReasonDTO createOutflowReason(OutflowReasonCreateDTO dto);
    List<OutflowReasonDTO> getAllOutflowReasons();
    void deleteOutflowReason(Long id);
    
    // Cash Outflows
    CashOutflowDTO createOutflow(CashOutflowCreateDTO dto);
    void createRefundFromOrder(Long orderId);
    List<CashOutflowDTO> getAllOutflows();
    Page<CashOutflowDTO> getAllOutflowsPaginated(Pageable pageable);
    List<CashOutflowDTO> getOutflowsByDateRange(java.time.LocalDateTime startDate, java.time.LocalDateTime endDate);
    List<CashOutflowDTO> getOutflowsBySession(Long sessionId);
    void deleteOutflow(Long id);
    
    // Reports
    BigDecimal getTotalInflows(java.time.LocalDateTime startDate, java.time.LocalDateTime endDate);
    BigDecimal getTotalOutflows(java.time.LocalDateTime startDate, java.time.LocalDateTime endDate);
}
