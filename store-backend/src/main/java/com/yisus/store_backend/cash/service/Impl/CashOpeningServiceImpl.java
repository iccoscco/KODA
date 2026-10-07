package com.yisus.store_backend.cash.service.Impl;

import com.yisus.store_backend.cash.dto.CashCloseRequestDTO;
import com.yisus.store_backend.cash.dto.CashCloseResponseDTO;
import com.yisus.store_backend.cash.dto.CashOpenRequestDTO;
import com.yisus.store_backend.cash.dto.CashSessionHistoryDTO;
import com.yisus.store_backend.cash.dto.CashStatusResponseDTO;
import com.yisus.store_backend.cash.model.CashOpening;
import com.yisus.store_backend.cash.model.CashRegister;
import com.yisus.store_backend.cash.repository.CashInflowRepository;
import com.yisus.store_backend.cash.repository.CashOpeningRepository;
import com.yisus.store_backend.cash.repository.CashOutflowRepository;
import com.yisus.store_backend.cash.repository.CashRegisterRepository;
import com.yisus.store_backend.cash.service.CashOpeningService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CashOpeningServiceImpl implements CashOpeningService {

    private final CashOpeningRepository cashOpeningRepository;
    private final CashRegisterRepository cashRegisterRepository;
    private final CashInflowRepository cashInflowRepository;
    private final CashOutflowRepository cashOutflowRepository;

    @Override
    @Transactional
    public CashStatusResponseDTO openCashRegister(CashOpenRequestDTO dto) {
        CashRegister register = cashRegisterRepository.findById(dto.getCashRegisterId())
                .orElseThrow(() -> new RuntimeException("Caja no encontrada"));

        cashOpeningRepository.findByCashRegisterIdAndIsActiveTrue(register.getId()).ifPresent(o -> {
            throw new RuntimeException("Esta caja ya tiene una sesión abierta. Ciérrala antes de abrir otra.");
        });

        CashOpening opening = CashOpening.builder()
                .initialAmount(dto.getInitialAmount())
                .isActive(true)
                .cashRegister(register)
                .build();

        CashOpening saved = cashOpeningRepository.save(opening);
        cashOpeningRepository.flush();

        return buildStatus(saved, BigDecimal.ZERO, BigDecimal.ZERO, saved.getInitialAmount());
    }

    @Override
    @Transactional(readOnly = true)
    public CashStatusResponseDTO getCurrentCashStatus(Long cashRegisterId) {
        CashOpening opening = cashOpeningRepository.findByCashRegisterIdAndIsActiveTrue(cashRegisterId)
                .orElseThrow(() -> new RuntimeException("No hay sesión abierta en esta caja."));

        BigDecimal totalSales = sumInflows(opening);
        BigDecimal totalOutflows = sumOutflows(opening);
        BigDecimal systemBalance = opening.getInitialAmount()
                .add(totalSales)
                .subtract(totalOutflows);

        return buildStatus(opening, totalSales, totalOutflows, systemBalance);
    }

    @Override
    @Transactional
    public CashCloseResponseDTO closeCashRegister(CashCloseRequestDTO dto) {
        CashOpening opening = cashOpeningRepository.findByCashRegisterIdAndIsActiveTrue(dto.getCashRegisterId())
                .orElseThrow(() -> new RuntimeException("No hay sesión abierta en esta caja."));

        LocalDateTime now = LocalDateTime.now();
        BigDecimal totalSales = sumInflows(opening);
        BigDecimal totalOutflows = sumOutflows(opening);
        BigDecimal systemBalance = opening.getInitialAmount()
                .add(totalSales)
                .subtract(totalOutflows);
        BigDecimal difference = dto.getClosingAmount().subtract(systemBalance);

        opening.setClosingAmount(dto.getClosingAmount());
        opening.setSystemBalance(systemBalance);
        opening.setDifference(difference);
        opening.setClosedAt(now);
        opening.setIsActive(false);

        cashOpeningRepository.save(opening);

        return CashCloseResponseDTO.builder()
                .id(opening.getId())
                .initialAmount(opening.getInitialAmount())
                .openedAt(opening.getOpenedAt())
                .closedAt(now)
                .totalSales(totalSales)
                .totalOutflows(totalOutflows)
                .systemBalance(systemBalance)
                .closingAmount(dto.getClosingAmount())
                .difference(difference)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CashSessionHistoryDTO> getSessionHistory(Long cashRegisterId) {
        List<CashOpening> rows = cashRegisterId == null
                ? cashOpeningRepository.findAllByOrderByOpenedAtDesc()
                : cashOpeningRepository.findAllByCashRegisterIdOrderByOpenedAtDesc(cashRegisterId);
        return rows.stream().map(this::toHistoryDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CashSessionHistoryDTO> getSessionHistoryPaginated(
            Long cashRegisterId,
            Long sessionId,
            LocalDateTime openedFrom,
            LocalDateTime openedTo,
            String customer,
            String seller,
            Pageable pageable) {
        // Los instantes llegan en UTC (la JVM corre con TZ=UTC y Spring parsea ISO-8601
        // conservando los campos). Convención: openedFrom es inclusivo y openedTo
        // exclusivo. Si el cliente se equivoca en el orden, se intercambian.
        LocalDateTime from = openedFrom;
        LocalDateTime to = openedTo;
        if (from != null && to != null && from.isAfter(to)) {
            LocalDateTime tmp = from;
            from = to;
            to = tmp;
        }

        boolean filterOpenedFrom = from != null;
        LocalDateTime openedFromStart = filterOpenedFrom
                ? from
                : LocalDateTime.of(1970, 1, 1, 0, 0);

        boolean filterOpenedTo = to != null;
        LocalDateTime openedToEndExclusive = filterOpenedTo
                ? to
                : LocalDateTime.of(2100, 1, 1, 0, 0);

        String cust = sanitizeLikeFragment(customer);
        String sell = sanitizeLikeFragment(seller);
        boolean filterCustomer = !cust.isEmpty();
        boolean filterSeller = !sell.isEmpty();
        boolean applyOrderFilter = filterCustomer || filterSeller;

        int page = pageable.getPageNumber();
        int size = pageable.getPageSize();

        if (sessionId == null && !filterOpenedFrom && !filterOpenedTo && !applyOrderFilter) {
            Pageable sorted = PageRequest.of(page, size, Sort.by("openedAt").descending());
            return cashOpeningRepository.findSessionHistoryPaginatedNoSearch(cashRegisterId, sorted)
                    .map(this::toHistoryDTO);
        }

        Pageable unsorted = PageRequest.of(page, size);
        return cashOpeningRepository.findSessionHistoryPaginatedFiltered(
                cashRegisterId,
                sessionId,
                filterOpenedFrom,
                openedFromStart,
                filterOpenedTo,
                openedToEndExclusive,
                applyOrderFilter,
                filterCustomer,
                cust,
                filterSeller,
                sell,
                unsorted
        ).map(this::toHistoryDTO);
    }

    /** Evita que el usuario inyecte comodines en LIKE. */
    private static String sanitizeLikeFragment(String input) {
        if (input == null) {
            return "";
        }
        String t = input.trim();
        if (t.isEmpty()) {
            return "";
        }
        return t.replace("\\", "").replace("%", "").replace("_", "");
    }

    private BigDecimal sumInflows(CashOpening session) {
        return cashInflowRepository.sumAmountBySessionId(session.getId());
    }

    private BigDecimal sumOutflows(CashOpening session) {
        return cashOutflowRepository.sumAmountBySessionId(session.getId());
    }

    private CashSessionHistoryDTO toHistoryDTO(CashOpening session) {
        BigDecimal sysBalance = session.getSystemBalance();
        if (sysBalance == null && Boolean.TRUE.equals(session.getIsActive())) {
            BigDecimal sales = sumInflows(session);
            BigDecimal outflows = sumOutflows(session);
            sysBalance = session.getInitialAmount().add(sales).subtract(outflows);
        }
        CashRegister reg = session.getCashRegister();
        Long regId = reg != null ? reg.getId() : null;
        String regName = reg != null ? registerDisplayName(reg) : null;
        return CashSessionHistoryDTO.builder()
                .cashRegisterId(regId)
                .cashRegisterName(regName)
                .id(session.getId())
                .initialAmount(session.getInitialAmount())
                .systemBalance(sysBalance)
                .closingAmount(session.getClosingAmount())
                .difference(session.getDifference())
                .openedAt(session.getOpenedAt())
                .closedAt(session.getClosedAt())
                .isActive(session.getIsActive())
                .build();
    }

    private CashStatusResponseDTO buildStatus(CashOpening opening,
                                              BigDecimal totalSales,
                                              BigDecimal totalOutflows,
                                              BigDecimal systemBalance) {
        CashRegister reg = opening.getCashRegister();
        return CashStatusResponseDTO.builder()
                .cashRegisterId(reg != null ? reg.getId() : null)
                .cashRegisterName(reg != null ? registerDisplayName(reg) : null)
                .id(opening.getId())
                .initialAmount(opening.getInitialAmount())
                .openedAt(opening.getOpenedAt())
                .totalSales(totalSales)
                .totalOutflows(totalOutflows)
                .systemBalance(systemBalance)
                .build();
    }

    private static String registerDisplayName(CashRegister reg) {
        if (reg.getName() != null && !reg.getName().isBlank()) {
            return reg.getName();
        }
        return "Caja " + reg.getId();
    }
}
