package com.yisus.store_backend.cash.controller;

import com.yisus.store_backend.cash.dto.CashCloseRequestDTO;
import com.yisus.store_backend.cash.dto.CashCloseResponseDTO;
import com.yisus.store_backend.cash.dto.CashOpenRequestDTO;
import com.yisus.store_backend.cash.dto.CashSessionHistoryDTO;
import com.yisus.store_backend.cash.dto.CashStatusResponseDTO;
import com.yisus.store_backend.cash.service.CashOpeningService;
import com.yisus.store_backend.common.dto.PaginatedResponse;
import com.yisus.store_backend.common.util.PaginationValidator;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.format.annotation.DateTimeFormat;

@RestController
@RequestMapping("/cash/opening")
@RequiredArgsConstructor
@Tag(name = "Cash Opening", description = "Cash register opening/closing endpoints")
@SecurityRequirement(name = "Bearer Authentication")
public class CashOpeningController {

    private final CashOpeningService cashOpeningService;

    @PostMapping("/open")
    @PreAuthorize("hasAuthority('cash.create')")
    @Operation(summary = "Open cash register",
               description = "Opens a new cash register session with an initial amount. Fails if one is already open.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Cash register opened",
            content = @Content(schema = @Schema(implementation = CashStatusResponseDTO.class))),
        @ApiResponse(responseCode = "400", description = "A cash register is already open or invalid input"),
    })
    public ResponseEntity<CashStatusResponseDTO> open(@Valid @RequestBody CashOpenRequestDTO body) {
        CashStatusResponseDTO status = cashOpeningService.openCashRegister(body);
        return ResponseEntity.status(HttpStatus.CREATED).body(status);
    }

    @GetMapping("/status")
    @PreAuthorize("hasAuthority('cash.read')")
    @Operation(summary = "Estado de sesión por caja",
               description = "Sesión activa de la caja indicada (cashRegisterId).")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Status retrieved",
            content = @Content(schema = @Schema(implementation = CashStatusResponseDTO.class))),
        @ApiResponse(responseCode = "400", description = "No active cash register"),
    })
    public ResponseEntity<CashStatusResponseDTO> status(@RequestParam Long cashRegisterId) {
        CashStatusResponseDTO status = cashOpeningService.getCurrentCashStatus(cashRegisterId);
        return ResponseEntity.ok(status);
    }

    @PostMapping("/close")
    @PreAuthorize("hasAuthority('cash.update')")
    @Operation(summary = "Close cash register",
               description = "Closes the active session. Receives the real counted amount and returns the difference vs the system balance.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Cash register closed",
            content = @Content(schema = @Schema(implementation = CashCloseResponseDTO.class))),
        @ApiResponse(responseCode = "400", description = "No active cash register or invalid input"),
    })
    public ResponseEntity<CashCloseResponseDTO> close(@Valid @RequestBody CashCloseRequestDTO body) {
        CashCloseResponseDTO result = cashOpeningService.closeCashRegister(body);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/history")
    @PreAuthorize("hasAuthority('cash.read')")
    @Operation(summary = "Historial de sesiones",
               description = "Lista completa, o paginada con limit/offset. " +
                       "cashRegisterId opcional filtra por caja física. " +
                       "Filtros opcionales: sessionId, openedFrom/openedTo (instantes ISO-8601 UTC: "
                       + "openedFrom inclusivo, openedTo exclusivo — típicamente inicio del día local "
                       + "y medianoche del día siguiente local), customer y seller "
                       + "(coinciden con ventas de la sesión).")
    @ApiResponse(responseCode = "200", description = "History retrieved")
    public ResponseEntity<?> history(
            @RequestParam(required = false) Long cashRegisterId,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer offset,
            @RequestParam(required = false) Long sessionId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime openedFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime openedTo,
            @RequestParam(required = false) String customer,
            @RequestParam(required = false) String seller,
            HttpServletRequest request) {
        if (limit != null && offset != null) {
            PaginationValidator.validatePaginationParams(limit, offset);
            int page = (offset + limit - 1) / limit;
            Pageable pageable = PageRequest.of(page, limit, Sort.by("openedAt").descending());
            Page<CashSessionHistoryDTO> historyPage =
                    cashOpeningService.getSessionHistoryPaginated(
                            cashRegisterId, sessionId, openedFrom, openedTo, customer, seller, pageable);
            PaginatedResponse<CashSessionHistoryDTO> response = PaginationValidator.buildPaginatedResponse(
                    historyPage, limit, offset, request.getRequestURI(), request.getQueryString());
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.ok(cashOpeningService.getSessionHistory(cashRegisterId));
    }
}
