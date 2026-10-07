package com.yisus.store_backend.report.service.impl;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.lowagie.text.pdf.draw.LineSeparator;
import com.yisus.store_backend.cash.dto.CashSessionHistoryDTO;
import com.yisus.store_backend.cash.model.CashOpening;
import com.yisus.store_backend.cash.model.CashOutflow;
import com.yisus.store_backend.cash.repository.CashOpeningRepository;
import com.yisus.store_backend.cash.repository.CashOutflowRepository;
import com.yisus.store_backend.order.model.Order;
import com.yisus.store_backend.order.model.Payment;
import com.yisus.store_backend.order.repository.OrderRepository;
import com.yisus.store_backend.product.model.Product;
import com.yisus.store_backend.product.model.ProductVariant;
import com.yisus.store_backend.product.repository.ProductRepository;
import com.yisus.store_backend.product.repository.ProductVariantRepository;
import com.yisus.store_backend.report.dto.ProductReportRowDTO;
import com.yisus.store_backend.report.service.ReportService;
import com.yisus.store_backend.storeconfig.service.StoreConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private static final DateTimeFormatter DT_FMT  = DateTimeFormatter.ofPattern("dd/MM/yy HH:mm");
    private static final DateTimeFormatter DAY_FMT  = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * Zona del cliente (Perú) para convertir los instantes UTC a la fecha local
     * que el usuario ve en los filtros de los PDFs. Perú no aplica DST por lo
     * que el offset es estable en -05:00; usar {@code ZoneId.of("America/Lima")}
     * sigue funcionando aunque cambiara.
     */
    private static final ZoneId CLIENT_ZONE = ZoneId.of("America/Lima");

    // Paleta global
    private static final Color HDR_BG    = new Color(45, 55, 72);
    private static final Color HDR_FG    = Color.WHITE;
    private static final Color ALT_ROW   = new Color(247, 250, 252);
    private static final Color BORDER    = new Color(203, 213, 224);
    private static final Color TOTAL_BG  = new Color(235, 248, 255);

    // Paleta ventas (verde)
    private static final Color SALES_HDR_BG  = new Color(198, 246, 213);
    private static final Color SALES_HDR_FG  = new Color(22, 101, 52);
    private static final Color SALES_HDR_BD  = new Color(154, 230, 180);
    private static final Color SALES_TOT_BG  = new Color(240, 253, 244);

    // Paleta egresos (rojo)
    private static final Color OUT_HDR_BG  = new Color(254, 215, 215);
    private static final Color OUT_HDR_FG  = new Color(153, 27, 27);
    private static final Color OUT_HDR_BD  = new Color(254, 178, 178);
    private static final Color OUT_TOT_BG  = new Color(255, 245, 245);

    private final CashOpeningRepository    cashOpeningRepository;
    private final CashOutflowRepository    cashOutflowRepository;
    private final OrderRepository          orderRepository;
    private final ProductRepository        productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final StoreConfigService       storeConfigService;

    // ── Datos JSON ────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<CashSessionHistoryDTO> getCashSessionsList(
            Long cashRegisterId, LocalDateTime startDate, LocalDateTime endDate, String status) {
        return fetchSessions(cashRegisterId, startDate, endDate, status)
                .stream().map(this::toSessionDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductReportRowDTO> getProductsList(
            Long categoryId, String status, String stockFilter) {
        return buildProductRows(categoryId, status, stockFilter);
    }

    // ── PDF Historial de Caja ─────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public byte[] generateCashSessionsPdf(
            Long cashRegisterId, LocalDateTime startDate, LocalDateTime endDate, String status) {

        List<CashOpening> sessions = fetchSessions(cashRegisterId, startDate, endDate, status);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 40, 40, 50, 40);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            float cw = PageSize.A4.getWidth() - 80f; // 515pt

            Font fTitle    = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14f);
            Font fSmall    = FontFactory.getFont(FontFactory.HELVETICA,       8f);
            Font fNormal   = FontFactory.getFont(FontFactory.HELVETICA,       8f);
            Font fTotal    = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  8f);
            Font fSessHdr  = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  9f,   Font.NORMAL, Color.WHITE);
            Font fFinHdr   = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  7.5f, Font.NORMAL, Color.WHITE);
            Font fSalesHdr = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  7.5f, Font.NORMAL, SALES_HDR_FG);
            Font fOutHdr   = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  7.5f, Font.NORMAL, OUT_HDR_FG);
            Font fSalesLbl = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  8.5f, Font.NORMAL, SALES_HDR_FG);
            Font fOutLbl   = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  8.5f, Font.NORMAL, OUT_HDR_FG);

            addDocHeader(doc, cw, fTitle, fSmall,
                    "REPORTE DE HISTORIAL DE CAJA",
                    buildCashFiltersLabel(cashRegisterId, startDate, endDate, status));

            if (sessions.isEmpty()) {
                Paragraph empty = new Paragraph(
                        "No se encontraron sesiones con los filtros aplicados.", fNormal);
                empty.setSpacingBefore(12f);
                doc.add(empty);
                doc.close();
                return baos.toByteArray();
            }

            int sessIdx = 1;
            for (CashOpening session : sessions) {
                CashSessionHistoryDTO s = toSessionDTO(session);

                // ── Banda cabecera de sesión ──────────────────────────────
                PdfPTable sessHdrTable = new PdfPTable(1);
                sessHdrTable.setTotalWidth(cw);
                sessHdrTable.setLockedWidth(true);
                sessHdrTable.setSpacingBefore(sessIdx > 1 ? 14f : 6f);
                sessHdrTable.setSpacingAfter(0f);

                String hdrText = String.format(
                        "SESIÓN #%d  —  Caja: %s  |  Apertura: %s  |  Cierre: %s  |  Estado: %s",
                        sessIdx++,
                        nvl(s.getCashRegisterName()),
                        fmtDt(s.getOpenedAt()),
                        s.getClosedAt() != null ? fmtDt(s.getClosedAt()) : "—",
                        Boolean.TRUE.equals(s.getIsActive()) ? "Abierta" : "Cerrada");

                PdfPCell hdrCell = new PdfPCell(new Phrase(hdrText, fSessHdr));
                hdrCell.setBackgroundColor(HDR_BG);
                hdrCell.setPadding(5f);
                hdrCell.setBorder(Rectangle.NO_BORDER);
                sessHdrTable.addCell(hdrCell);
                doc.add(sessHdrTable);

                // ── Mini-tabla financiera ─────────────────────────────────
                Color finHdrBg = new Color(74, 85, 104);
                PdfPTable finTable = new PdfPTable(new float[]{1f, 1f, 1f, 1f});
                finTable.setTotalWidth(cw);
                finTable.setLockedWidth(true);
                finTable.setSpacingAfter(5f);

                for (String lbl : new String[]{"M.Inicial", "M.Cierre", "Balance", "Diferencia"}) {
                    PdfPCell c = new PdfPCell(new Phrase(lbl, fFinHdr));
                    c.setBackgroundColor(finHdrBg);
                    c.setHorizontalAlignment(Element.ALIGN_CENTER);
                    c.setPadding(3f);
                    c.setBorderColor(HDR_BG);
                    c.setBorderWidth(0.5f);
                    finTable.addCell(c);
                }
                for (String val : new String[]{
                        currency(s.getInitialAmount()),
                        s.getClosingAmount() != null ? currency(s.getClosingAmount()) : "—",
                        s.getSystemBalance() != null ? currency(s.getSystemBalance()) : "—",
                        s.getDifference()    != null ? currency(s.getDifference())    : "—"}) {
                    PdfPCell c = new PdfPCell(new Phrase(val, fNormal));
                    c.setHorizontalAlignment(Element.ALIGN_CENTER);
                    c.setPadding(3f);
                    c.setBorderColor(BORDER);
                    c.setBorderWidth(0.4f);
                    finTable.addCell(c);
                }
                doc.add(finTable);

                // ── Ventas ────────────────────────────────────────────────
                List<Order> orders = orderRepository.findBySessionIdWithDetails(session.getId());

                Paragraph salesLabel = new Paragraph("VENTAS", fSalesLbl);
                salesLabel.setSpacingBefore(2f);
                salesLabel.setSpacingAfter(2f);
                doc.add(salesLabel);

                if (orders.isEmpty()) {
                    Paragraph noSales = new Paragraph(
                            "Sin ventas registradas en esta sesión.", fSmall);
                    noSales.setIndentationLeft(8f);
                    noSales.setSpacingAfter(4f);
                    doc.add(noSales);
                } else {
                    // #:18 | Cliente:90 | Vendedor:82 | Estado:55 | Pago:100 | Total:72 | Fecha:98 = 515
                    PdfPTable salesTable = new PdfPTable(
                            new float[]{18f, 90f, 82f, 55f, 100f, 72f, 98f});
                    salesTable.setTotalWidth(cw);
                    salesTable.setLockedWidth(true);
                    salesTable.setSpacingAfter(4f);

                    String[][] salesHeaders = {
                            {"#", "C"}, {"Cliente", "L"}, {"Vendedor", "L"},
                            {"Estado", "C"}, {"Pago", "L"}, {"Total", "R"}, {"Fecha", "L"}};
                    for (String[] h : salesHeaders) {
                        PdfPCell c = new PdfPCell(new Phrase(h[0], fSalesHdr));
                        c.setBackgroundColor(SALES_HDR_BG);
                        c.setHorizontalAlignment(alignOf(h[1]));
                        c.setPadding(3f);
                        c.setBorderColor(SALES_HDR_BD);
                        c.setBorderWidth(0.4f);
                        salesTable.addCell(c);
                    }

                    int sIdx = 1;
                    for (Order o : orders) {
                        Color bg = (sIdx % 2 == 0) ? ALT_ROW : null;
                        String customer = (o.getShippingAddress() != null
                                && o.getShippingAddress().getFullName() != null)
                                ? o.getShippingAddress().getFullName() : "—";
                        String seller  = o.getUser() != null ? o.getUser().getName() : "—";
                        String stat    = translateStatus(o.getStatus().name());
                        String payment = buildPaymentSummary(o.getPayments());

                        addDataCell(salesTable, String.valueOf(sIdx++),  fNormal, Element.ALIGN_CENTER, bg);
                        addDataCell(salesTable, customer,                fNormal, Element.ALIGN_LEFT,   bg);
                        addDataCell(salesTable, seller,                  fNormal, Element.ALIGN_LEFT,   bg);
                        addDataCell(salesTable, stat,                    fNormal, Element.ALIGN_CENTER, bg);
                        addDataCell(salesTable, payment,                 fNormal, Element.ALIGN_LEFT,   bg);
                        addDataCell(salesTable, currency(o.getTotal()),  fNormal, Element.ALIGN_RIGHT,  bg);
                        addDataCell(salesTable, fmtDt(o.getCreatedAt()), fNormal, Element.ALIGN_LEFT,   bg);
                    }

                    BigDecimal salesTotal = orders.stream()
                            .map(Order::getTotal).filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    addTotalCell(salesTable, "Total ventas", fTotal, Element.ALIGN_RIGHT, 5, SALES_TOT_BG);
                    addDataCell(salesTable, currency(salesTotal),          fTotal, Element.ALIGN_RIGHT, SALES_TOT_BG);
                    addDataCell(salesTable, orders.size() + " venta(s)",   fTotal, Element.ALIGN_LEFT,  SALES_TOT_BG);

                    doc.add(salesTable);
                }

                // ── Egresos ───────────────────────────────────────────────
                List<CashOutflow> outflows =
                        cashOutflowRepository.findBySessionIdWithReason(session.getId());

                Paragraph outLabel = new Paragraph("EGRESOS", fOutLbl);
                outLabel.setSpacingBefore(2f);
                outLabel.setSpacingAfter(2f);
                doc.add(outLabel);

                if (outflows.isEmpty()) {
                    Paragraph noOut = new Paragraph(
                            "Sin egresos registrados en esta sesión.", fSmall);
                    noOut.setIndentationLeft(8f);
                    doc.add(noOut);
                } else {
                    // #:18 | Motivo:125 | Descripción:185 | Monto:72 | Fecha:115 = 515
                    PdfPTable outTable = new PdfPTable(
                            new float[]{18f, 125f, 185f, 72f, 115f});
                    outTable.setTotalWidth(cw);
                    outTable.setLockedWidth(true);
                    outTable.setSpacingAfter(4f);

                    String[][] outHeaders = {
                            {"#", "C"}, {"Motivo", "L"}, {"Descripción", "L"},
                            {"Monto", "R"}, {"Fecha", "L"}};
                    for (String[] h : outHeaders) {
                        PdfPCell c = new PdfPCell(new Phrase(h[0], fOutHdr));
                        c.setBackgroundColor(OUT_HDR_BG);
                        c.setHorizontalAlignment(alignOf(h[1]));
                        c.setPadding(3f);
                        c.setBorderColor(OUT_HDR_BD);
                        c.setBorderWidth(0.4f);
                        outTable.addCell(c);
                    }

                    int oIdx = 1;
                    for (CashOutflow of : outflows) {
                        Color bg = (oIdx % 2 == 0) ? ALT_ROW : null;
                        addDataCell(outTable, String.valueOf(oIdx++),
                                fNormal, Element.ALIGN_CENTER, bg);
                        addDataCell(outTable,
                                of.getReason() != null ? of.getReason().getName() : "—",
                                fNormal, Element.ALIGN_LEFT, bg);
                        addDataCell(outTable, nvl(of.getDescription()),
                                fNormal, Element.ALIGN_LEFT, bg);
                        addDataCell(outTable, currency(of.getAmount()),
                                fNormal, Element.ALIGN_RIGHT, bg);
                        addDataCell(outTable, fmtDt(of.getCreatedAt()),
                                fNormal, Element.ALIGN_LEFT, bg);
                    }

                    BigDecimal outTotal = outflows.stream()
                            .map(CashOutflow::getAmount).filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    addTotalCell(outTable, "Total egresos", fTotal, Element.ALIGN_RIGHT, 3, OUT_TOT_BG);
                    addDataCell(outTable, currency(outTotal),              fTotal, Element.ALIGN_RIGHT, OUT_TOT_BG);
                    addDataCell(outTable, outflows.size() + " egreso(s)",  fTotal, Element.ALIGN_LEFT,  OUT_TOT_BG);

                    doc.add(outTable);
                }
            }

            addFooter(doc, fSmall, sessions.size() + " sesiones encontradas");
            doc.close();
            return baos.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Error generando PDF de caja", e);
        }
    }

    // ── PDF Productos ─────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public byte[] generateProductsPdf(Long categoryId, String status, String stockFilter) {

        List<ProductReportRowDTO> rows = buildProductRows(categoryId, status, stockFilter);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 40, 40, 50, 40);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            Font fNormal = FontFactory.getFont(FontFactory.HELVETICA,      8.5f);
            Font fSmall  = FontFactory.getFont(FontFactory.HELVETICA,       8f);
            Font fHdr    = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  8.5f, Font.NORMAL, HDR_FG);
            Font fTitle  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14f);
            Font fTot    = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  8.5f);

            float cw = PageSize.A4.getWidth() - 80f;

            addDocHeader(doc, cw, fTitle, fSmall,
                    "REPORTE DE PRODUCTOS Y STOCK",
                    buildProductFiltersLabel(categoryId, status, stockFilter));

            float[] cols = {25f, 130f, 90f, 90f, 55f, 60f, 65f};
            PdfPTable table = new PdfPTable(cols);
            table.setTotalWidth(cw);
            table.setLockedWidth(true);
            table.setSpacingBefore(6f);

            String[] headers = {"#", "Producto", "Categoría", "P. Venta", "Variantes", "Stock", "Estado"};
            int[] hAligns = {Element.ALIGN_CENTER, Element.ALIGN_LEFT, Element.ALIGN_LEFT,
                             Element.ALIGN_RIGHT, Element.ALIGN_CENTER,
                             Element.ALIGN_CENTER, Element.ALIGN_CENTER};
            for (int i = 0; i < headers.length; i++) {
                addHdrCell(table, headers[i], fHdr, hAligns[i]);
            }

            int idx = 1, totalStock = 0, active = 0;
            for (ProductReportRowDTO p : rows) {
                Color bg = (idx % 2 == 0) ? ALT_ROW : null;
                addDataCell(table, String.valueOf(idx++),               fNormal, Element.ALIGN_CENTER, bg);
                addDataCell(table, nvl(p.getName()),                    fNormal, Element.ALIGN_LEFT,   bg);
                addDataCell(table, nvl(p.getCategoryName()),            fNormal, Element.ALIGN_LEFT,   bg);
                addDataCell(table, formatPriceRange(p),                 fNormal, Element.ALIGN_RIGHT,  bg);
                addDataCell(table, String.valueOf(p.getVariantCount()), fNormal, Element.ALIGN_CENTER, bg);
                addDataCell(table, String.valueOf(p.getTotalStock()),   fNormal, Element.ALIGN_CENTER, bg);
                addDataCell(table, Boolean.TRUE.equals(p.getIsActive()) ? "Activo" : "Inactivo",
                        fNormal, Element.ALIGN_CENTER, bg);

                totalStock += p.getTotalStock();
                if (Boolean.TRUE.equals(p.getIsActive())) active++;
            }

            addTotalCell(table, "TOTALES", fTot, Element.ALIGN_LEFT, 4, TOTAL_BG);
            addDataCell(table, totalStock + " uds.", fTot, Element.ALIGN_CENTER, TOTAL_BG);
            addDataCell(table, active + " activos",  fTot, Element.ALIGN_CENTER, TOTAL_BG);

            doc.add(table);
            addFooter(doc, fSmall, rows.size() + " productos · Stock total: " + totalStock + " unidades");
            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generando PDF de productos", e);
        }
    }

    // ── Helpers de datos ──────────────────────────────────────────────────────

    /**
     * Filtra sesiones por rango {@code [startDate, endDate)}: inicio inclusivo,
     * fin exclusivo. Los instantes llegan ya en UTC como {@link LocalDateTime}
     * (la JVM corre en UTC y {@code openedAt} también está en UTC, así que la
     * comparación es directa sin conversiones de zona).
     */
    private List<CashOpening> fetchSessions(Long cashRegisterId, LocalDateTime startDate,
                                             LocalDateTime endDate, String status) {
        LocalDateTime from = startDate;
        LocalDateTime toExclusive = endDate;
        if (from != null && toExclusive != null && from.isAfter(toExclusive)) {
            LocalDateTime tmp = from;
            from = toExclusive;
            toExclusive = tmp;
        }
        final LocalDateTime fromF = from;
        final LocalDateTime toF   = toExclusive;

        Boolean onlyActive = "OPEN".equals(status) ? Boolean.TRUE
                : "CLOSED".equals(status) ? Boolean.FALSE : null;

        return cashOpeningRepository.findForReport(cashRegisterId).stream()
                .filter(o -> fromF == null || !o.getOpenedAt().isBefore(fromF))
                .filter(o -> toF   == null || o.getOpenedAt().isBefore(toF))
                .filter(o -> onlyActive == null || onlyActive.equals(o.getIsActive()))
                .collect(Collectors.toList());
    }

    private List<ProductReportRowDTO> buildProductRows(Long categoryId, String status, String stockFilter) {
        Boolean isActive = "ACTIVE".equals(status) ? Boolean.TRUE
                : "INACTIVE".equals(status) ? Boolean.FALSE : null;
        List<Product> products = productRepository.findForReport(categoryId).stream()
                .filter(p -> isActive == null || isActive.equals(p.getIsActive()))
                .collect(Collectors.toList());
        if (products.isEmpty()) return List.of();

        List<Long> ids = products.stream().map(Product::getId).toList();
        Map<Long, List<ProductVariant>> byProduct = productVariantRepository.findActiveByProductIdIn(ids)
                .stream().collect(Collectors.groupingBy(pv -> pv.getProduct().getId()));

        List<ProductReportRowDTO> rows = products.stream().map(p -> {
            List<ProductVariant> variants = byProduct.getOrDefault(p.getId(), List.of());
            int stock = variants.stream().mapToInt(ProductVariant::getStock).sum();

            // Precio efectivo por variante: override de la variante, o fallback al producto.
            List<BigDecimal> variantPrices = variants.stream()
                    .map(v -> v.getSalePrice() != null ? v.getSalePrice() : p.getSalePrice())
                    .filter(Objects::nonNull)
                    .toList();
            BigDecimal minPrice = variantPrices.stream().min(BigDecimal::compareTo).orElse(p.getSalePrice());
            BigDecimal maxPrice = variantPrices.stream().max(BigDecimal::compareTo).orElse(p.getSalePrice());

            return ProductReportRowDTO.builder()
                    .id(p.getId()).name(p.getName())
                    .categoryName(p.getCategory() != null ? p.getCategory().getName() : "—")
                    .salePrice(p.getSalePrice())
                    .minVariantPrice(minPrice)
                    .maxVariantPrice(maxPrice)
                    .variantCount(variants.size()).totalStock(stock)
                    .isActive(p.getIsActive()).build();
        }).collect(Collectors.toList());

        if ("WITH_STOCK".equals(stockFilter))
            rows = rows.stream().filter(r -> r.getTotalStock() > 0).toList();
        else if ("WITHOUT_STOCK".equals(stockFilter))
            rows = rows.stream().filter(r -> r.getTotalStock() == 0).toList();
        return rows;
    }

    private CashSessionHistoryDTO toSessionDTO(CashOpening o) {
        return CashSessionHistoryDTO.builder()
                .id(o.getId())
                .cashRegisterId(o.getCashRegister() != null ? o.getCashRegister().getId() : null)
                .cashRegisterName(o.getCashRegister() != null ? o.getCashRegister().getName() : "—")
                .initialAmount(o.getInitialAmount())
                .closingAmount(o.getClosingAmount())
                .systemBalance(o.getSystemBalance())
                .difference(o.getDifference())
                .openedAt(o.getOpenedAt())
                .closedAt(o.getClosedAt())
                .isActive(o.getIsActive())
                .build();
    }

    // ── Helpers de traducción ─────────────────────────────────────────────────

    private String translateStatus(String status) {
        return switch (status) {
            case "PENDING"   -> "Pendiente";
            case "PAID"      -> "Pagado";
            case "SHIPPED"   -> "Enviado";
            case "DELIVERED" -> "Entregado";
            case "CANCELLED" -> "Cancelado";
            default          -> status;
        };
    }

    private String buildPaymentSummary(List<Payment> payments) {
        if (payments == null || payments.isEmpty()) return "—";
        return payments.stream()
                .map(p -> translatePayment(p.getMethod().name()))
                .collect(Collectors.joining(" + "));
    }

    private String translatePayment(String method) {
        return switch (method) {
            case "CASH"     -> "Efectivo";
            case "YAPE"     -> "Yape";
            case "PLIN"     -> "Plin";
            case "TRANSFER" -> "Transf.";
            case "CARD"     -> "Tarjeta";
            default         -> method;
        };
    }

    // ── Helpers de PDF ────────────────────────────────────────────────────────

    private void addDocHeader(Document doc, float cw, Font fTitle, Font fSmall,
                               String reportTitle, String filtersLine) throws DocumentException {
        String storeName = storeConfigService.getRawConfig().getStoreName();
        String genDate   = LocalDateTime.now().format(DAY_FMT);

        PdfPTable topRow = new PdfPTable(new float[]{3f, 2f});
        topRow.setTotalWidth(cw);
        topRow.setLockedWidth(true);
        topRow.setSpacingAfter(4f);

        Font fStoreName = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12f);
        Font fGen       = FontFactory.getFont(FontFactory.HELVETICA, 8f);

        PdfPCell cStore = new PdfPCell(new Phrase(storeName, fStoreName));
        cStore.setBorder(Rectangle.NO_BORDER);
        topRow.addCell(cStore);

        Paragraph pGen = new Paragraph("Generado: " + genDate, fGen);
        pGen.setAlignment(Element.ALIGN_RIGHT);
        PdfPCell cGen = new PdfPCell();
        cGen.setBorder(Rectangle.NO_BORDER);
        cGen.addElement(pGen);
        topRow.addCell(cGen);
        doc.add(topRow);

        doc.add(new Chunk(new LineSeparator(1f, 100f, HDR_BG, Element.ALIGN_CENTER, 0)));

        Paragraph pTitle = new Paragraph(reportTitle, fTitle);
        pTitle.setSpacingBefore(6f);
        pTitle.setSpacingAfter(2f);
        doc.add(pTitle);

        Paragraph pFilters = new Paragraph("Filtros: " + filtersLine, fSmall);
        pFilters.setSpacingAfter(2f);
        doc.add(pFilters);

        doc.add(new Chunk(new LineSeparator(0.5f, 100f, BORDER, Element.ALIGN_CENTER, 0)));
    }

    private void addFooter(Document doc, Font fSmall, String text) throws DocumentException {
        Paragraph p = new Paragraph(text, fSmall);
        p.setSpacingBefore(8f);
        p.setAlignment(Element.ALIGN_RIGHT);
        doc.add(p);
    }

    private void addHdrCell(PdfPTable t, String text, Font f, int align) {
        PdfPCell c = new PdfPCell(new Phrase(text, f));
        c.setBackgroundColor(HDR_BG);
        c.setHorizontalAlignment(align);
        c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        c.setPadding(4f);
        c.setBorderColor(HDR_BG);
        t.addCell(c);
    }

    private void addDataCell(PdfPTable t, String text, Font f, int align, Color bg) {
        PdfPCell c = new PdfPCell(new Phrase(text != null ? text : "—", f));
        c.setHorizontalAlignment(align);
        c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        c.setPadding(3.5f);
        c.setBorderColor(BORDER);
        c.setBorderWidth(0.4f);
        if (bg != null) c.setBackgroundColor(bg);
        t.addCell(c);
    }

    private void addTotalCell(PdfPTable t, String text, Font f, int align, int span, Color bg) {
        PdfPCell c = new PdfPCell(new Phrase(text, f));
        c.setColspan(span);
        c.setHorizontalAlignment(align);
        c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        c.setPadding(3.5f);
        c.setBorderColor(BORDER);
        c.setBorderWidth(0.4f);
        if (bg != null) c.setBackgroundColor(bg);
        t.addCell(c);
    }

    private int alignOf(String code) {
        return switch (code) {
            case "R" -> Element.ALIGN_RIGHT;
            case "C" -> Element.ALIGN_CENTER;
            default  -> Element.ALIGN_LEFT;
        };
    }

    // ── Etiquetas de filtros para el encabezado ───────────────────────────────

    /**
     * Etiqueta "Desde … Hasta …" para el encabezado del PDF.
     * Convierte los instantes UTC a la zona del cliente ({@link #CLIENT_ZONE}) para
     * que la fecha mostrada coincida con la que el usuario eligió en el DatePicker.
     *
     * <p>Para {@code endDate} (fin exclusivo = medianoche del día siguiente local)
     * se resta 1 segundo antes de extraer la fecha, así se muestra el último día
     * del rango tal como lo seleccionó el usuario.
     */
    private String buildCashFiltersLabel(Long cashRegisterId, LocalDateTime startDate,
                                          LocalDateTime endDate, String status) {
        String hoy = LocalDate.now(CLIENT_ZONE).format(DAY_FMT);
        List<String> parts = new ArrayList<>();
        parts.add("Caja: " + (cashRegisterId != null ? "#" + cashRegisterId : "Todas"));
        parts.add("Desde: " + (startDate != null
                ? startDate.atOffset(ZoneOffset.UTC).atZoneSameInstant(CLIENT_ZONE)
                        .toLocalDate().format(DAY_FMT)
                : "Inicio de registros"));
        parts.add("Hasta: " + (endDate != null
                ? endDate.minusSeconds(1).atOffset(ZoneOffset.UTC).atZoneSameInstant(CLIENT_ZONE)
                        .toLocalDate().format(DAY_FMT)
                : "Hoy (" + hoy + ")"));
        parts.add("Estado: " + ("OPEN".equals(status)   ? "Abiertas"
                               : "CLOSED".equals(status) ? "Cerradas" : "Todas"));
        return String.join("  |  ", parts);
    }

    private String buildProductFiltersLabel(Long categoryId, String status, String stockFilter) {
        List<String> parts = new ArrayList<>();
        parts.add("Categoría: " + (categoryId != null ? "#" + categoryId : "Todas"));
        parts.add("Estado: " + ("ACTIVE".equals(status)    ? "Activos"
                               : "INACTIVE".equals(status)  ? "Inactivos" : "Todos"));
        parts.add("Stock: " + ("WITH_STOCK".equals(stockFilter)    ? "Con stock"
                              : "WITHOUT_STOCK".equals(stockFilter) ? "Sin stock" : "Todos"));
        return String.join("  |  ", parts);
    }

    // ── Utilidades ────────────────────────────────────────────────────────────

    private String fmtDt(LocalDateTime dt) {
        return dt != null ? dt.format(DT_FMT) : "—";
    }

    private String currency(BigDecimal v) {
        return v != null ? String.format("S/.%.2f", v) : "—";
    }

    /**
     * Formatea el precio de un producto para el reporte considerando overrides por variante:
     *   - Si las variantes tienen precios distintos → "S/.50.00 – S/.70.00"
     *   - Si todas comparten precio (o no hay variantes) → "S/.50.00"
     */
    private String formatPriceRange(ProductReportRowDTO p) {
        BigDecimal min = p.getMinVariantPrice();
        BigDecimal max = p.getMaxVariantPrice();
        if (min == null && max == null) return currency(p.getSalePrice());
        if (min != null && max != null && min.compareTo(max) != 0) {
            // Formato compacto: "S/.50.00 – 70.00" (sin repetir el símbolo de moneda).
            return String.format("S/.%.2f – %.2f", min, max);
        }
        return currency(min != null ? min : max);
    }

    private BigDecimal safe(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private String nvl(String s) {
        return s != null && !s.isBlank() ? s : "—";
    }
}
