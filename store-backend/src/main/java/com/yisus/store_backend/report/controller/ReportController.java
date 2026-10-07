package com.yisus.store_backend.report.controller;

import com.yisus.store_backend.cash.dto.CashSessionHistoryDTO;
import com.yisus.store_backend.common.dto.PaginatedResponse;
import com.yisus.store_backend.common.util.PaginationValidator;
import com.yisus.store_backend.report.dto.ProductReportRowDTO;
import com.yisus.store_backend.report.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "Generación de reportes y exportación PDF")
@SecurityRequirement(name = "Bearer Authentication")
public class ReportController {

    private final ReportService reportService;

    // ── Historial de caja ─────────────────────────────────────────────────────

    @GetMapping("/cash-sessions")
    @PreAuthorize("hasAuthority('cash.read')")
    @Operation(summary = "Lista de sesiones de caja para reporte",
               description = "startDate/endDate opcionales como instantes ISO-8601 UTC: startDate inclusivo, "
                       + "endDate exclusivo (p.ej. inicio del día local del cliente y medianoche del día "
                       + "siguiente local, ambos convertidos a UTC).")
    public ResponseEntity<?> getCashSessions(
            @RequestParam(required = false) Long   cashRegisterId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer offset,
            HttpServletRequest request) {
        List<CashSessionHistoryDTO> all =
                reportService.getCashSessionsList(cashRegisterId, startDate, endDate, status);
        if (limit != null && offset != null) {
            PaginationValidator.validatePaginationParams(limit, offset);
            return ResponseEntity.ok(buildPage(all, limit, offset, request));
        }
        return ResponseEntity.ok(all);
    }

    @GetMapping("/cash-sessions/pdf")
    @PreAuthorize("hasAuthority('cash.read')")
    @Operation(summary = "Exportar historial de caja en PDF (A4)")
    public ResponseEntity<byte[]> getCashSessionsPdf(
            @RequestParam(required = false) Long   cashRegisterId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) String status) {
        byte[] pdf = reportService.generateCashSessionsPdf(cashRegisterId, startDate, endDate, status);
        return pdfResponse(pdf, "reporte-caja.pdf");
    }

    // ── Productos ─────────────────────────────────────────────────────────────

    @GetMapping("/products")
    @PreAuthorize("hasAuthority('products.read')")
    @Operation(summary = "Lista de productos con stock para reporte")
    public ResponseEntity<?> getProducts(
            @RequestParam(required = false) Long   categoryId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String stockFilter,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer offset,
            HttpServletRequest request) {
        List<ProductReportRowDTO> all =
                reportService.getProductsList(categoryId, status, stockFilter);
        if (limit != null && offset != null) {
            PaginationValidator.validatePaginationParams(limit, offset);
            return ResponseEntity.ok(buildPage(all, limit, offset, request));
        }
        return ResponseEntity.ok(all);
    }

    @GetMapping("/products/pdf")
    @PreAuthorize("hasAuthority('products.read')")
    @Operation(summary = "Exportar productos y stock en PDF (A4)")
    public ResponseEntity<byte[]> getProductsPdf(
            @RequestParam(required = false) Long   categoryId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String stockFilter) {
        byte[] pdf = reportService.generateProductsPdf(categoryId, status, stockFilter);
        return pdfResponse(pdf, "reporte-productos.pdf");
    }

    // ── Utilidades ────────────────────────────────────────────────────────────

    private <T> PaginatedResponse<T> buildPage(List<T> all, int limit, int offset, HttpServletRequest request) {
        int total = all.size();
        int from  = Math.min(offset, total);
        int to    = Math.min(offset + limit, total);
        List<T> slice = all.subList(from, to);
        String cleanUrl = request.getRequestURI();
        String qs       = request.getQueryString();
        String next = (offset + limit < total)
                ? PaginationValidator.buildPaginationUrl(cleanUrl, limit, offset + limit, qs) : null;
        String prev = (offset > 0)
                ? PaginationValidator.buildPaginationUrl(cleanUrl, limit, Math.max(0, offset - limit), qs) : null;
        return PaginatedResponse.<T>builder()
                .count((long) total)
                .next(next)
                .previous(prev)
                .results(slice)
                .build();
    }

    private ResponseEntity<byte[]> pdfResponse(byte[] pdf, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"");
        return ResponseEntity.ok().headers(headers).body(pdf);
    }
}
