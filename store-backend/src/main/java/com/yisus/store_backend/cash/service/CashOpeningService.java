package com.yisus.store_backend.cash.service;

import com.yisus.store_backend.cash.dto.CashCloseRequestDTO;
import com.yisus.store_backend.cash.dto.CashCloseResponseDTO;
import com.yisus.store_backend.cash.dto.CashOpenRequestDTO;
import com.yisus.store_backend.cash.dto.CashSessionHistoryDTO;
import com.yisus.store_backend.cash.dto.CashStatusResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface CashOpeningService {

    CashStatusResponseDTO openCashRegister(CashOpenRequestDTO dto);

    CashStatusResponseDTO getCurrentCashStatus(Long cashRegisterId);

    CashCloseResponseDTO closeCashRegister(CashCloseRequestDTO dto);

    /** {@code cashRegisterId} null = todas las cajas. */
    List<CashSessionHistoryDTO> getSessionHistory(Long cashRegisterId);

    /**
     * Historial paginado. {@code cashRegisterId} null = todas las cajas.
     * Filtros opcionales:
     * <ul>
     *   <li>{@code sessionId}</li>
     *   <li>{@code openedFrom} — instante UTC <em>inclusivo</em> (ej. inicio del día en zona del cliente).</li>
     *   <li>{@code openedTo} — instante UTC <em>exclusivo</em> (ej. medianoche del día siguiente en zona del cliente).</li>
     *   <li>{@code customer} / {@code seller} — texto en las ventas de la sesión.</li>
     * </ul>
     */
    Page<CashSessionHistoryDTO> getSessionHistoryPaginated(
            Long cashRegisterId,
            Long sessionId,
            LocalDateTime openedFrom,
            LocalDateTime openedTo,
            String customer,
            String seller,
            Pageable pageable);
}
