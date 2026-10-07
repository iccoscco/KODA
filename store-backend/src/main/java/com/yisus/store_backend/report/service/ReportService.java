package com.yisus.store_backend.report.service;

import com.yisus.store_backend.cash.dto.CashSessionHistoryDTO;
import com.yisus.store_backend.report.dto.ProductReportRowDTO;

import java.util.List;

public interface ReportService {

    /**
     * Datos JSON para la tabla de vista previa.
     *
     * <p>{@code startDate} y {@code endDate} llegan como {@link java.time.LocalDateTime}
     * en UTC (Spring parsea ISO-8601 conservando los campos y la JVM corre con {@code TZ=UTC}).
     * Convención: {@code startDate} es inclusivo y {@code endDate} exclusivo (típicamente
     * inicio del día del cliente y medianoche del día siguiente del cliente, convertidos a UTC).
     */
    List<CashSessionHistoryDTO> getCashSessionsList(
            Long cashRegisterId, java.time.LocalDateTime startDate, java.time.LocalDateTime endDate, String status);

    /** Datos JSON para la tabla de vista previa. */
    List<ProductReportRowDTO> getProductsList(
            Long categoryId, String status, String stockFilter);

    /** PDF A4 con el historial de sesiones de caja. Mismos criterios que {@link #getCashSessionsList}. */
    byte[] generateCashSessionsPdf(
            Long cashRegisterId, java.time.LocalDateTime startDate, java.time.LocalDateTime endDate, String status);

    /** PDF A4 con el listado de productos y stock. */
    byte[] generateProductsPdf(
            Long categoryId, String status, String stockFilter);
}
