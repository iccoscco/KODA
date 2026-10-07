package com.yisus.store_backend.cash.service.Impl;

import com.yisus.store_backend.cash.OutflowReasonConstants;
import com.yisus.store_backend.cash.dto.*;
import com.yisus.store_backend.cash.model.*;
import com.yisus.store_backend.cash.repository.*;
import com.yisus.store_backend.cash.service.CashService;
import com.yisus.store_backend.order.model.Order;
import com.yisus.store_backend.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CashServiceImpl implements CashService {
    
    private final CashRegisterRepository cashRegisterRepository;
    private final CashInflowRepository cashInflowRepository;
    private final CashOutflowRepository cashOutflowRepository;
    private final OutflowReasonRepository outflowReasonRepository;
    private final OrderRepository orderRepository;
    private final CashOpeningRepository cashOpeningRepository;

    @Override
    @Transactional(readOnly = true)
    public CashRegisterDTO getCurrentBalance(Long registerId) {
        CashRegister cashRegister = cashRegisterRepository.findById(registerId)
                .orElseThrow(() -> new RuntimeException("Caja no encontrada"));
        return convertToDTO(cashRegister);
    }

    @Override
    @Transactional
    public CashRegisterDTO adjustBalance(Long registerId, BigDecimal adjustment, boolean isInflow) {
        if (adjustment.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Adjustment amount must be positive");
        }
        updateCashRegisterBalance(registerId, adjustment, isInflow);
        CashRegister cashRegister = cashRegisterRepository.findById(registerId)
                .orElseThrow(() -> new RuntimeException("Caja no encontrada"));
        return convertToDTO(cashRegister);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<CashInflowDTO> getAllInflows() {
        List<CashInflow> inflows = cashInflowRepository.findAll();
        return inflows.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(readOnly = true)
    public Page<CashInflowDTO> getAllInflowsPaginated(Pageable pageable) {
        return cashInflowRepository.findAll(pageable)
                .map(this::convertToDTO);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<CashInflowDTO> getInflowsByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        List<CashInflow> inflows = cashInflowRepository.findByDateRange(startDate, endDate);
        return inflows.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional
    public CashInflowDTO createInflowFromOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        
        // Verificar que la orden esté pagada
        if (order.getStatus() != Order.OrderStatus.PAID && 
            order.getStatus() != Order.OrderStatus.SHIPPED && 
            order.getStatus() != Order.OrderStatus.DELIVERED) {
            throw new RuntimeException("Order must be paid to create cash inflow");
        }
        
        // Verificar que no exista ya un inflow para esta orden
        List<CashInflow> existingInflows = cashInflowRepository.findByOrder(order);
        if (!existingInflows.isEmpty()) {
            throw new RuntimeException("Cash inflow already exists for this order");
        }
        
        CashRegister reg = order.getCashRegister();
        if (reg == null) {
            reg = cashRegisterRepository.findCurrentRegister()
                    .orElseThrow(() -> new RuntimeException("No hay caja asociada a la venta ni caja por defecto"));
        }
        Long registerId = reg.getId();
        CashOpening session = cashOpeningRepository.findByCashRegisterIdAndIsActiveTrue(registerId).orElse(null);

        CashInflow inflow = CashInflow.builder()
                .order(order)
                .amount(order.getTotal())
                .description("Sale order #" + order.getId())
                .cashOpening(session)
                .build();

        CashInflow savedInflow = cashInflowRepository.save(inflow);
        cashInflowRepository.flush();

        updateCashRegisterBalance(registerId, savedInflow.getAmount(), true);
        
        return convertToDTO(savedInflow);
    }
    
    @Override
    @Transactional
    public OutflowReasonDTO createOutflowReason(OutflowReasonCreateDTO dto) {
        // Si ya existe un motivo con ese nombre, decidir según su estado:
        // - Activo   -> duplicado real, rechazar.
        // - Inactivo (soft-deleted) -> reactivar con los nuevos datos para
        //   evitar chocar con la restricción UNIQUE en la columna name.
        var existingOpt = outflowReasonRepository.findByName(dto.getName());
        if (existingOpt.isPresent()) {
            OutflowReason existing = existingOpt.get();
            if (Boolean.TRUE.equals(existing.getIsActive())) {
                throw new DuplicateKeyException("Outflow reason already exists");
            }
            existing.setDescription(dto.getDescription());
            existing.setIsActive(true);
            OutflowReason reactivated = outflowReasonRepository.save(existing);
            outflowReasonRepository.flush();
            return convertToDTO(reactivated);
        }

        OutflowReason reason = OutflowReason.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .build();

        OutflowReason saved = outflowReasonRepository.save(reason);
        outflowReasonRepository.flush();
        return convertToDTO(saved);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<OutflowReasonDTO> getAllOutflowReasons() {
        List<OutflowReason> reasons = outflowReasonRepository.findAllByIsActiveTrue();
        return reasons.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional
    public void deleteOutflowReason(Long id) {
        OutflowReason reason = outflowReasonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Outflow reason not found"));
        reason.setIsActive(false);
        outflowReasonRepository.save(reason);
    }
    
    @Override
    @Transactional
    public CashOutflowDTO createOutflow(CashOutflowCreateDTO dto) {
        Long registerId = dto.getCashRegisterId();
        CashRegister register = cashRegisterRepository.findById(registerId)
                .orElseThrow(() -> new RuntimeException("Caja no encontrada"));
        BigDecimal currentBalance = register.getBalance();
        if (currentBalance.compareTo(dto.getAmount()) < 0) {
            throw new RuntimeException("Insufficient cash balance");
        }

        OutflowReason reason = outflowReasonRepository.findById(dto.getReasonId())
                .orElseThrow(() -> new RuntimeException("Outflow reason not found"));

        Order order = null;
        if (dto.getOrderId() != null) {
            order = orderRepository.findById(dto.getOrderId())
                    .orElseThrow(() -> new RuntimeException("Order not found"));
        }

        CashOpening session = cashOpeningRepository.findByCashRegisterIdAndIsActiveTrue(registerId).orElse(null);

        CashOutflow outflow = CashOutflow.builder()
                .order(order)
                .reason(reason)
                .amount(dto.getAmount())
                .description(dto.getDescription())
                .cashOpening(session)
                .build();

        CashOutflow savedOutflow = cashOutflowRepository.save(outflow);
        cashOutflowRepository.flush();

        updateCashRegisterBalance(registerId, savedOutflow.getAmount(), false);

        return convertToDTO(savedOutflow);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<CashOutflowDTO> getAllOutflows() {
        List<CashOutflow> outflows = cashOutflowRepository.findAll();
        return outflows.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(readOnly = true)
    public Page<CashOutflowDTO> getAllOutflowsPaginated(Pageable pageable) {
        return cashOutflowRepository.findAll(pageable)
                .map(this::convertToDTO);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<CashOutflowDTO> getOutflowsByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        List<CashOutflow> outflows = cashOutflowRepository.findByDateRange(startDate, endDate);
        return outflows.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CashOutflowDTO> getOutflowsBySession(Long sessionId) {
        return cashOutflowRepository.findBySessionId(sessionId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional
    public void deleteOutflow(Long id) {
        CashOutflow outflow = cashOutflowRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cash outflow not found"));
        
        Long registerId = resolveRegisterIdForOutflow(outflow);
        updateCashRegisterBalance(registerId, outflow.getAmount(), true);

        cashOutflowRepository.deleteById(id);
    }
    
    @Override
    @Transactional
    public void createRefundFromOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        
        OutflowReason refundReason = outflowReasonRepository.findByName(OutflowReasonConstants.AUTO_REFUND)
                .or(() -> outflowReasonRepository.findByName(OutflowReasonConstants.LEGACY_AUTO_REFUND_EN))
                .orElseGet(() -> outflowReasonRepository.save(OutflowReason.builder()
                        .name(OutflowReasonConstants.AUTO_REFUND)
                        .description("Generado al cancelar un pedido ya pagado (uso del sistema)")
                        .isActive(false)
                        .build()));
        
        CashRegister reg = order.getCashRegister();
        if (reg == null) {
            reg = cashRegisterRepository.findCurrentRegister()
                    .orElseThrow(() -> new RuntimeException("No hay caja asociada al pedido para reembolsar"));
        }
        Long registerId = reg.getId();
        CashRegister currentRegister = cashRegisterRepository.findById(registerId)
                .orElseThrow(() -> new RuntimeException("Caja no encontrada"));

        if (currentRegister.getBalance().compareTo(order.getTotal()) < 0) {
            throw new RuntimeException("Insufficient cash balance to process refund");
        }

        CashOpening session = cashOpeningRepository.findByCashRegisterIdAndIsActiveTrue(registerId).orElse(null);

        CashOutflow outflow = CashOutflow.builder()
                .order(order)
                .reason(refundReason)
                .amount(order.getTotal())
                .description("Reembolso por cancelación del pedido #" + order.getId())
                .cashOpening(session)
                .build();

        cashOutflowRepository.save(outflow);

        updateCashRegisterBalance(registerId, order.getTotal(), false);
        log.info("Automatic refund processed for order: {}", orderId);
    }
    
    @Override
    @Transactional(readOnly = true)
    public BigDecimal getTotalInflows(LocalDateTime startDate, LocalDateTime endDate) {
        Double total = cashInflowRepository.sumAmountByDateRange(startDate, endDate);
        return total != null ? BigDecimal.valueOf(total) : BigDecimal.ZERO;
    }
    
    @Override
    @Transactional(readOnly = true)
    public BigDecimal getTotalOutflows(LocalDateTime startDate, LocalDateTime endDate) {
        Double total = cashOutflowRepository.sumAmountByDateRange(startDate, endDate);
        return total != null ? BigDecimal.valueOf(total) : BigDecimal.ZERO;
    }
    
    private CashRegister createInitialCashRegister() {
        CashRegister cashRegister = CashRegister.builder()
                .name("Caja principal")
                .balance(BigDecimal.ZERO)
                .build();
        return cashRegisterRepository.save(cashRegister);
    }

    private void updateCashRegisterBalance(Long registerId, BigDecimal amount, boolean isInflow) {
        CashRegister cashRegister = cashRegisterRepository.findById(registerId)
                .orElseThrow(() -> new RuntimeException("Caja no encontrada"));

        BigDecimal newBalance = isInflow
                ? cashRegister.getBalance().add(amount)
                : cashRegister.getBalance().subtract(amount);

        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Insufficient cash balance");
        }

        cashRegister.setBalance(newBalance);
        cashRegisterRepository.save(cashRegister);
        cashRegisterRepository.flush();
    }

    private Long resolveRegisterIdForOutflow(CashOutflow outflow) {
        if (outflow.getCashOpening() != null && outflow.getCashOpening().getCashRegister() != null) {
            return outflow.getCashOpening().getCashRegister().getId();
        }
        return cashRegisterRepository.findCurrentRegister()
                .map(CashRegister::getId)
                .orElseThrow(() -> new RuntimeException("No se pudo determinar la caja del egreso"));
    }
    
    private CashRegisterDTO convertToDTO(CashRegister cashRegister) {
        String name = cashRegister.getName() != null && !cashRegister.getName().isBlank()
                ? cashRegister.getName()
                : ("Caja " + cashRegister.getId());
        return CashRegisterDTO.builder()
                .id(cashRegister.getId())
                .name(name)
                .balance(cashRegister.getBalance())
                .updatedAt(cashRegister.getUpdatedAt())
                .build();
    }
    
    private CashInflowDTO convertToDTO(CashInflow inflow) {
        return CashInflowDTO.builder()
                .id(inflow.getId())
                .orderId(inflow.getOrder().getId())
                .orderDescription("Order #" + inflow.getOrder().getId())
                .amount(inflow.getAmount())
                .description(inflow.getDescription())
                .createdAt(inflow.getCreatedAt())
                .build();
    }
    
    private OutflowReasonDTO convertToDTO(OutflowReason reason) {
        return OutflowReasonDTO.builder()
                .id(reason.getId())
                .name(reason.getName())
                .description(reason.getDescription())
                .isActive(reason.getIsActive())
                .createdAt(reason.getCreatedAt())
                .updatedAt(reason.getUpdatedAt())
                .build();
    }
    
    private CashOutflowDTO convertToDTO(CashOutflow outflow) {
        return CashOutflowDTO.builder()
                .id(outflow.getId())
                .orderId(outflow.getOrder() != null ? outflow.getOrder().getId() : null)
                .reasonId(outflow.getReason().getId())
                .reasonName(outflow.getReason().getName())
                .amount(outflow.getAmount())
                .description(outflow.getDescription())
                .createdAt(outflow.getCreatedAt())
                .build();
    }
}
