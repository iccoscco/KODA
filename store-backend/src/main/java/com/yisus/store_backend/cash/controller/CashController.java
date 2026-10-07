package com.yisus.store_backend.cash.controller;

import com.yisus.store_backend.cash.dto.CashInflowDTO;
import com.yisus.store_backend.cash.dto.CashOutflowCreateDTO;
import com.yisus.store_backend.cash.dto.CashOutflowDTO;
import com.yisus.store_backend.cash.dto.CashRegisterDTO;
import com.yisus.store_backend.cash.service.CashService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import jakarta.servlet.http.HttpServletRequest;
import com.yisus.store_backend.common.dto.PaginatedResponse;
import com.yisus.store_backend.common.util.PaginationValidator;
import com.yisus.store_backend.cash.dto.CashSummaryResponseDTO;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/cash")
@RequiredArgsConstructor
@Tag(name = "Cash Management", description = "Cash management endpoints")
@SecurityRequirement(name = "Bearer Authentication")
public class CashController {
    
    private final CashService cashService;

    // Cash Register endpoints
    @GetMapping("/balance")
    @PreAuthorize("hasAuthority('cash.read')")
    @Operation(summary = "Get current balance", description = "Retrieve current cash register balance")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Balance retrieved successfully", 
            content = @Content(schema = @Schema(implementation = CashRegisterDTO.class)))
    })
    public ResponseEntity<CashRegisterDTO> getCurrentBalance(
            @Parameter(description = "ID de la caja física") @RequestParam Long cashRegisterId) {
        CashRegisterDTO balance = cashService.getCurrentBalance(cashRegisterId);
        return ResponseEntity.ok(balance);
    }

    @PutMapping("/balance")
    @PreAuthorize("hasAuthority('cash.update')")
    @Operation(summary = "Adjust balance", description = "Add or subtract from cash register balance (always creates an audit trail)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Balance adjusted successfully",
            content = @Content(schema = @Schema(implementation = CashRegisterDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid amount")
    })
    public ResponseEntity<CashRegisterDTO> adjustBalance(
            @Parameter(description = "ID de la caja") @RequestParam Long cashRegisterId,
            @Parameter(description = "Amount to add or subtract (must be positive)") @RequestParam BigDecimal amount,
            @Parameter(description = "true = inflow (add), false = outflow (subtract)") @RequestParam boolean isInflow) {
        CashRegisterDTO balance = cashService.adjustBalance(cashRegisterId, amount, isInflow);
        return ResponseEntity.ok(balance);
    }


    // Cash Inflows endpoints
    @GetMapping("/inflows")
    @PreAuthorize("hasAuthority('cash.read')")
    @Operation(summary = "Get all inflows", description = "Retrieve all cash inflows with optional pagination")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Inflows retrieved successfully", 
            content = @Content(schema = @Schema(implementation = CashInflowDTO.class))),
        @ApiResponse(responseCode = "200", description = "Inflows retrieved successfully (paginated)", 
            content = @Content(schema = @Schema(implementation = PaginatedResponse.class)))
    })
    public ResponseEntity<?> getAllInflows(@RequestParam(required = false) Integer limit,
                                           @RequestParam(required = false) Integer offset,
                                           HttpServletRequest request) {
        if(limit != null && offset != null){
            PaginationValidator.validatePaginationParams(limit, offset);
            int page = (offset + limit - 1) / limit;
            Pageable pageable = PageRequest.of(page, limit, Sort.by("id").descending());
            Page<CashInflowDTO> inflowPage = cashService.getAllInflowsPaginated(pageable);
            PaginatedResponse<CashInflowDTO> response = PaginationValidator.buildPaginatedResponse(
                    inflowPage, limit, offset, request.getRequestURI(), request.getQueryString()
            );
            return ResponseEntity.ok(response);
        }
        else {
            List<CashInflowDTO> inflows = cashService.getAllInflows();
            return ResponseEntity.ok(inflows);
        }
    }

    @GetMapping("/inflows/range")
    @PreAuthorize("hasAuthority('cash.read')")
    @Operation(summary = "Get inflows by date range", description = "Retrieve cash inflows within a date range")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Inflows retrieved successfully", 
            content = @Content(schema = @Schema(implementation = CashInflowDTO.class)))
    })
    public ResponseEntity<List<CashInflowDTO>> getInflowsByDateRange(
            @Parameter(description = "Start date") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @Parameter(description = "End date") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        List<CashInflowDTO> inflows = cashService.getInflowsByDateRange(startDate, endDate);
        return ResponseEntity.ok(inflows);
    }

    @PostMapping("/inflows/order/{orderId}")
    @PreAuthorize("hasAuthority('cash.create')")
    @Operation(summary = "Create inflow from order", description = "Create cash inflow from a paid order")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Inflow created successfully", 
            content = @Content(schema = @Schema(implementation = CashInflowDTO.class))),
        @ApiResponse(responseCode = "400", description = "Order is not paid or inflow already exists"),
        @ApiResponse(responseCode = "404", description = "Order not found")
    })
    public ResponseEntity<CashInflowDTO> createInflowFromOrder(@PathVariable Long orderId) {
        CashInflowDTO inflow = cashService.createInflowFromOrder(orderId);
        return ResponseEntity.status(HttpStatus.CREATED).body(inflow);
    }

    // Cash Outflows endpoints
    @GetMapping("/outflows")
    @PreAuthorize("hasAuthority('cash.read')")
    @Operation(summary = "Get all outflows", description = "Retrieve all cash outflows with optional pagination")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Outflows retrieved successfully", 
            content = @Content(schema = @Schema(implementation = CashOutflowDTO.class))),
        @ApiResponse(responseCode = "200", description = "Outflows retrieved successfully (paginated)", 
            content = @Content(schema = @Schema(implementation = PaginatedResponse.class)))
    })
    public ResponseEntity<?> getAllOutflows(@RequestParam(required = false) Integer limit,
                                            @RequestParam(required = false) Integer offset,
                                            HttpServletRequest request) {
        if(limit != null && offset != null){
            PaginationValidator.validatePaginationParams(limit, offset);
            int page = (offset + limit - 1) / limit;
            Pageable pageable = PageRequest.of(page, limit, Sort.by("id").descending());
            Page<CashOutflowDTO> outflowPage = cashService.getAllOutflowsPaginated(pageable);
            PaginatedResponse<CashOutflowDTO> response = PaginationValidator.buildPaginatedResponse(
                    outflowPage, limit, offset, request.getRequestURI(), request.getQueryString()
            );
            return ResponseEntity.ok(response);
        }
        else {
            List<CashOutflowDTO> outflows = cashService.getAllOutflows();
            return ResponseEntity.ok(outflows);
        }
    }

    @GetMapping("/outflows/range")
    @PreAuthorize("hasAuthority('cash.read')")
    @Operation(summary = "Get outflows by date range", description = "Retrieve cash outflows within a date range")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Outflows retrieved successfully", 
            content = @Content(schema = @Schema(implementation = CashOutflowDTO.class)))
    })
    public ResponseEntity<List<CashOutflowDTO>> getOutflowsByDateRange(
            @Parameter(description = "Start date") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @Parameter(description = "End date") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        List<CashOutflowDTO> outflows = cashService.getOutflowsByDateRange(startDate, endDate);
        return ResponseEntity.ok(outflows);
    }

    @PostMapping("/outflows")
    @PreAuthorize("hasAuthority('cash.create')")
    @Operation(summary = "Create outflow", description = "Create a new cash outflow")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Outflow created successfully", 
            content = @Content(schema = @Schema(implementation = CashOutflowDTO.class))),
        @ApiResponse(responseCode = "400", description = "Insufficient balance or invalid input"),
        @ApiResponse(responseCode = "404", description = "Outflow reason not found")
    })
    public ResponseEntity<CashOutflowDTO> createOutflow(@Valid @RequestBody CashOutflowCreateDTO request) {
        CashOutflowDTO outflow = cashService.createOutflow(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(outflow);
    }

    @GetMapping("/outflows/by-session")
    @PreAuthorize("hasAuthority('cash.read')")
    @Operation(summary = "Get outflows by session", description = "Returns outflows linked to a specific cash opening session")
    public ResponseEntity<List<CashOutflowDTO>> getOutflowsBySession(@RequestParam Long sessionId) {
        return ResponseEntity.ok(cashService.getOutflowsBySession(sessionId));
    }

    @DeleteMapping("/outflows/{id}")
    @PreAuthorize("hasAuthority('cash.delete')")
    @Operation(summary = "Delete outflow", description = "Delete a cash outflow and restore balance")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Outflow deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Outflow not found")
    })
    public ResponseEntity<Void> deleteOutflow(@PathVariable Long id) {
        cashService.deleteOutflow(id);
        return ResponseEntity.ok().build();
    }

    // Reports endpoints
    @GetMapping("/reports/summary")
    @PreAuthorize("hasAuthority('cash.read')")
    @Operation(summary = "Get cash summary", description = "Get cash flow summary for a date range")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Summary retrieved successfully")
    })
    public ResponseEntity<CashSummaryResponseDTO> getCashSummary(
            @Parameter(description = "Start date") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @Parameter(description = "End date") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        BigDecimal totalInflows = cashService.getTotalInflows(startDate, endDate);
        BigDecimal totalOutflows = cashService.getTotalOutflows(startDate, endDate);
        BigDecimal netFlow = totalInflows.subtract(totalOutflows);
        
        CashSummaryResponseDTO summary = CashSummaryResponseDTO.builder()
                .startDate(startDate)
                .endDate(endDate)
                .totalInflows(totalInflows)
                .totalOutflows(totalOutflows)
                .netFlow(netFlow)
                .build();
        
        return ResponseEntity.ok(summary);
    }
}
