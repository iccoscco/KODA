package com.yisus.store_backend.order.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.yisus.store_backend.order.dto.OrderDTO;
import com.yisus.store_backend.order.dto.OrderItemDTO;
import com.yisus.store_backend.order.dto.PaymentDTO;
import com.yisus.store_backend.order.dto.ShippingAddressDTO;
import com.yisus.store_backend.storeconfig.model.StoreConfig;
import com.yisus.store_backend.storeconfig.service.StoreConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class SaleReceiptService {

    /** 88 mm en puntos: 88 × 72 / 25.4 ≈ 249.45 pt */
    private static final float PAGE_WIDTH = 88f * 72f / 25.4f;
    private static final float MARGIN_H   = 8f;
    private static final float MARGIN_V   = 10f;

    /** Logo arriba del recibo: ancho/alto máx. en pt (ticket 88 mm; mantiene proporción). */
    private static final float LOGO_MAX_W_PT = 200f;
    private static final float LOGO_MAX_H_PT   = 72f;

    private static final DateTimeFormatter FMT_EMISION = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter FMT_IMP_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter FMT_IMP_HORA  = DateTimeFormatter.ofPattern("HH:mm:ss");

    /** Zona horaria para fecha/hora de impresión del recibo (Perú). */
    private static final ZoneId ZONE_IMPRESION = ZoneId.of("America/Lima");

    /** Raíz de subidas (misma propiedad que al guardar el logo en {@code StoreConfigServiceImpl}). */
    @Value("${file.upload-dir:uploads}")
    private String fileUploadDir;

    private final StoreConfigService storeConfigService;

    public byte[] generateReceipt(OrderDTO order) {
        StoreConfig cfg = storeConfigService.getRawConfig();
        ZonedDateTime impresoEn = ZonedDateTime.now(ZONE_IMPRESION);

        int itemCount    = order.getOrderItems() != null ? order.getOrderItems().size() : 0;
        int paymentCount = order.getPayments()   != null ? order.getPayments().size()   : 0;

        // Dirección: solo se parte por salto de línea (Enter en config), no por comas.
        // Estimación de líneas visuales (ticket ~32 caracteres por línea a ~8.5 pt) para la altura de página.
        int addressVisualLines = countStoreAddressVisualLines(cfg.getStoreAddress());
        ShippingAddressDTO shipForHeight = order.getShippingAddress();
        int buyerLines = 1;
        if (shipForHeight != null) {
            buyerLines = 0;
            if (shipForHeight.getFullName() != null && !shipForHeight.getFullName().isBlank()) {
                buyerLines++;
            }
            if (shipForHeight.getPhone() != null && !shipForHeight.getPhone().isBlank()) {
                buyerLines++;
            }
            if (shipForHeight.getAddress() != null && !shipForHeight.getAddress().isBlank()) {
                buyerLines++;
            }
            if (shipForHeight.getCity() != null && !shipForHeight.getCity().isBlank()) {
                buyerLines++;
            }
            if (buyerLines == 0) {
                buyerLines = 1;
            }
        }
        Image logoImage = tryLoadStoreLogo(cfg.getLogoUrl());
        float logoExtra = logoImage != null ? LOGO_MAX_H_PT + 18f : 0f;

        // Una sola página: altura ≥ contenido (fuentes más grandes → más alto por fila).
        float pageHeight = 440f + addressVisualLines * 15f + buyerLines * 14f
                + (itemCount * 48f) + Math.max(paymentCount, 1) * 32f + 175f + logoExtra;

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Rectangle pageSize = new Rectangle(PAGE_WIDTH, pageHeight);
            Document  document = new Document(pageSize, MARGIN_H, MARGIN_H, MARGIN_V, MARGIN_V);
            PdfWriter.getInstance(document, baos);
            document.open();

            float cw = PAGE_WIDTH - (2 * MARGIN_H);

            // Ticket88 mm: NOTA DE VENTA + dirección tienda comparten fDocType (negrita, tamaño intermedio-alto).
            Font fStoreLegal = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   11f);
            Font fDocType    = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   10.5f);
            Font fDocNum     = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   12f);
            Font fBold       = FontFactory.getFont(FontFactory.HELVETICA_BOLD,    10.2f);
            Font fNormal     = FontFactory.getFont(FontFactory.HELVETICA,        9.8f);
            Font fSmall      = FontFactory.getFont(FontFactory.HELVETICA,        9.4f);
            Font fItalic     = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 9.6f);
            Font fTotal      = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   10.5f);

            // ── Cabecera: logo (si existe) + nombre de la empresa ───────────
            String storeName = (cfg.getStoreName() != null && !cfg.getStoreName().isBlank())
                    ? cfg.getStoreName().trim()
                    : "Mi tienda";
            if (logoImage != null) {
                logoImage.scaleToFit(LOGO_MAX_W_PT, LOGO_MAX_H_PT);
                logoImage.setAlignment(Element.ALIGN_CENTER);
                document.add(logoImage);
                addSpacer(document, fSmall);
            }
            addCentered(document, storeName, fStoreLegal, 2f);

            if (cfg.getStoreAddress() != null && !cfg.getStoreAddress().isBlank()) {
                for (String line : cfg.getStoreAddress().split("\\R")) {
                    String trimmed = line.trim();
                    if (!trimmed.isEmpty()) {
                        // Misma fuente que "NOTA DE VENTA" (negrita 10.5 pt).
                        addCentered(document, trimmed, fDocType, 1f);
                    }
                }
            }

            if (cfg.getStoreRuc() != null && !cfg.getStoreRuc().isBlank()) {
                addCentered(document, "RUC: " + cfg.getStoreRuc().trim(), fNormal, 4f);
            }

            addLine(document, cw);
            addSpacer(document, fSmall);

            addCentered(document, "NOTA DE VENTA", fDocType, 2f);
            addCentered(document, String.format("Nº %06d", order.getId()), fDocNum, 3f);

            if (order.getCreatedAt() != null) {
                addCentered(document, "Fecha de emisión: " + order.getCreatedAt().format(FMT_EMISION), fSmall, 3f);
            }

            ShippingAddressDTO ship = order.getShippingAddress();
            if (ship != null) {
                String dest = buildDestinoLine(ship);
                if (dest != null) {
                    Paragraph d = new Paragraph("Destino: " + dest, fSmall);
                    d.setAlignment(Element.ALIGN_LEFT);
                    d.setSpacingAfter(2f);
                    document.add(d);
                }
            }

            addLine(document, cw);
            addSpacer(document, fSmall);

            // ── Cliente ───────────────────────────────────────────────────────
            document.add(new Paragraph("CLIENTE / DATOS DEL COMPRADOR", fBold));
            addSpacer(document, fSmall);
            if (ship != null) {
                if (ship.getFullName() != null && !ship.getFullName().isBlank()) {
                    document.add(new Paragraph("Nombre: " + ship.getFullName().trim(), fNormal));
                }
                if (ship.getPhone() != null && !ship.getPhone().isBlank()) {
                    document.add(new Paragraph("Tel.: " + ship.getPhone().trim(), fNormal));
                }
                if (ship.getAddress() != null && !ship.getAddress().isBlank()) {
                    document.add(new Paragraph("Dirección: " + ship.getAddress().trim(), fNormal));
                }
                if (ship.getCity() != null && !ship.getCity().isBlank()) {
                    document.add(new Paragraph("Ciudad: " + ship.getCity().trim(), fNormal));
                }
            } else {
                document.add(new Paragraph("Nombre: —", fNormal));
            }

            addSpacer(document, fSmall);
            addLine(document, cw);
            addSpacer(document, fSmall);

            // Ítems: columna central ancha para "DESCRIPCIÓN" en una línea; CANT/P.UNIT/TOTAL algo más estrechas.
            // Valores sin "S/." en celdas; el pie aclara TOTAL (S/).
            PdfPTable itemTable = new PdfPTable(new float[]{0.92f, 2.28f, 1.02f, 1.02f});
            itemTable.setTotalWidth(cw);
            itemTable.setLockedWidth(true);

            float cellPad = 2.5f;
            addCell(itemTable, "CANT",        fBold, Element.ALIGN_CENTER, new Color(235, 235, 235), cellPad);
            addCell(itemTable, "DESCRIPCIÓN", fBold, Element.ALIGN_CENTER, new Color(235, 235, 235), cellPad);
            addCell(itemTable, "P. UNIT",     fBold, Element.ALIGN_CENTER, new Color(235, 235, 235), cellPad);
            addCell(itemTable, "TOTAL",       fBold, Element.ALIGN_CENTER, new Color(235, 235, 235), cellPad);

            if (order.getOrderItems() != null) {
                for (OrderItemDTO item : order.getOrderItems()) {
                    String desc = item.getProductName() != null ? item.getProductName() : "—";
                    if (item.getColorName() != null && !item.getColorName().isBlank()) {
                        desc += " - " + item.getColorName();
                    }
                    if (item.getSizeName() != null && !item.getSizeName().isBlank()) {
                        desc += " T:" + item.getSizeName();
                    }

                    addCell(itemTable, String.valueOf(item.getQuantity()), fNormal, Element.ALIGN_CENTER, null, cellPad);
                    addCell(itemTable, desc, fNormal, Element.ALIGN_LEFT, null, cellPad);
                    addCell(itemTable, amountPlain(item.getUnitPrice()), fNormal, Element.ALIGN_RIGHT, null, cellPad);
                    addCell(itemTable, amountPlain(item.getTotalPrice()), fNormal, Element.ALIGN_RIGHT, null, cellPad);
                }
            }
            document.add(itemTable);

            addSpacer(document, fSmall);
            addLine(document, cw);
            addSpacer(document, fSmall);

            // ── Total documento ─────────────────────────────────────────────
            Paragraph totalP = new Paragraph();
            totalP.setAlignment(Element.ALIGN_RIGHT);
            totalP.add(new Chunk("TOTAL (S/): ", fBold));
            totalP.add(new Chunk(totalStr(order.getTotal()), fTotal));
            totalP.setSpacingAfter(6f);
            document.add(totalP);

            // ── Pagos (híbridos: una fila por método) ───────────────────────
            document.add(new Paragraph("FORMAS DE PAGO", fBold));
            addSpacer(document, fSmall);

            PdfPTable payTable = new PdfPTable(new float[]{2.0f, 1.5f});
            payTable.setTotalWidth(cw);
            payTable.setLockedWidth(true);

            float payPad = 2.5f;
            addCell(payTable, "TIPO",  fBold, Element.ALIGN_CENTER, new Color(235, 235, 235), payPad);
            addCell(payTable, "MONTO", fBold, Element.ALIGN_CENTER, new Color(235, 235, 235), payPad);

            if (order.getPayments() != null && !order.getPayments().isEmpty()) {
                for (PaymentDTO payment : order.getPayments()) {
                    addCell(payTable, translateMethod(payment.getMethod().name()), fNormal, Element.ALIGN_LEFT, null, payPad);
                    addCell(payTable, amountPlain(payment.getAmount()), fNormal, Element.ALIGN_RIGHT, null, payPad);
                }
            } else {
                addCell(payTable, "—", fNormal, Element.ALIGN_LEFT, null, payPad);
                addCell(payTable, "—", fNormal, Element.ALIGN_RIGHT, null, payPad);
            }
            document.add(payTable);

            addSpacer(document, fSmall);
            addLine(document, cw);
            addSpacer(document, fSmall);

            // Usu. reg. | fechas: Phrase en ambas (Paragraph desalineaba la 1ª línea) + paddingTop fino en izquierda
            String registrar = (order.getUserName() != null && !order.getUserName().isBlank())
                    ? order.getUserName().trim()
                    : "—";
            String fecHor = "Fec. imp.: " + impresoEn.format(FMT_IMP_FECHA)
                    + "\nHor. imp.: " + impresoEn.format(FMT_IMP_HORA);

            PdfPTable metaBlock = new PdfPTable(new float[]{1.15f, 1f});
            metaBlock.setTotalWidth(cw);
            metaBlock.setLockedWidth(true);
            metaBlock.setSpacingBefore(0f);
            metaBlock.setSpacingAfter(0f);

            Phrase leftPh = new Phrase("Usu. reg.: " + registrar, fNormal);
            PdfPCell userCell = new PdfPCell(leftPh);
            userCell.setBorder(Rectangle.NO_BORDER);
            userCell.setPaddingTop(2.35f);
            userCell.setPaddingBottom(1.5f);
            userCell.setPaddingLeft(0f);
            userCell.setPaddingRight(4f);
            userCell.setHorizontalAlignment(Element.ALIGN_LEFT);
            userCell.setVerticalAlignment(Element.ALIGN_TOP);
            metaBlock.addCell(userCell);

            Phrase rightPh = new Phrase(fecHor, fNormal);
            PdfPCell fechaHoraCell = new PdfPCell(rightPh);
            fechaHoraCell.setBorder(Rectangle.NO_BORDER);
            fechaHoraCell.setPaddingTop(1.5f);
            fechaHoraCell.setPaddingBottom(1.5f);
            fechaHoraCell.setPaddingLeft(0f);
            fechaHoraCell.setPaddingRight(0f);
            fechaHoraCell.setHorizontalAlignment(Element.ALIGN_LEFT);
            fechaHoraCell.setVerticalAlignment(Element.ALIGN_TOP);
            metaBlock.addCell(fechaHoraCell);

            document.add(metaBlock);

            addSpacer(document, fSmall);
            addLine(document, cw);
            addSpacer(document, fSmall);

            Paragraph thanks = new Paragraph("Gracias por su preferencia", fItalic);
            thanks.setAlignment(Element.ALIGN_CENTER);
            thanks.setSpacingAfter(2f);
            document.add(thanks);

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Error generando el recibo PDF", e);
        }
    }

    /** ~Caracteres por línea en dirección (ticket 88 mm, fuente ~10.5 pt negrita). */
    private static final int STORE_ADDRESS_CHARS_PER_LINE = 27;

    /**
     * Cuenta líneas lógicas de la dirección de tienda para reservar altura en el PDF.
     * Solo separadores {@code \n} / {@code \r\n}; las comas no cortan. Cada bloque puede ocupar varias líneas al ajustar texto.
     */
    private static int countStoreAddressVisualLines(String storeAddress) {
        if (storeAddress == null || storeAddress.isBlank()) {
            return 0;
        }
        int total = 0;
        for (String line : storeAddress.split("\\R")) {
            String t = line.trim();
            if (t.isEmpty()) {
                continue;
            }
            total += Math.max(1, (int) Math.ceil(t.length() / (double) STORE_ADDRESS_CHARS_PER_LINE));
        }
        return total;
    }

    private static String buildDestinoLine(ShippingAddressDTO ship) {
        String city = ship.getCity() != null ? ship.getCity().trim() : "";
        String addr = ship.getAddress() != null ? ship.getAddress().trim() : "";
        if (city.isEmpty() && addr.isEmpty()) {
            return null;
        }
        if (!city.isEmpty() && !addr.isEmpty()) {
            return city + " — " + addr;
        }
        return city.isEmpty() ? addr : city;
    }

    private void addCentered(Document doc, String text, Font font, float spacingAfter) throws DocumentException {
        Paragraph p = new Paragraph(text, font);
        p.setAlignment(Element.ALIGN_CENTER);
        p.setSpacingAfter(spacingAfter);
        doc.add(p);
    }

    private void addSpacer(Document doc, Font font) throws DocumentException {
        Paragraph p = new Paragraph(" ", font);
        p.setSpacingBefore(0f);
        p.setSpacingAfter(0f);
        doc.add(p);
    }

    /**
     * Línea horizontal con el mismo ancho útil que las tablas ({@code cw}), para que no quede más corta que el contenido.
     * {@link LineSeparator} con % no coincide siempre con {@link PdfPTable#setTotalWidth(float)}.
     */
    private void addLine(Document doc, float cw) throws DocumentException {
        PdfPTable lineTable = new PdfPTable(1);
        lineTable.setTotalWidth(cw);
        lineTable.setLockedWidth(true);
        lineTable.setHorizontalAlignment(Element.ALIGN_LEFT);
        PdfPCell cell = new PdfPCell(new Phrase(""));
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderWidthBottom(0.5f);
        cell.setBorderColorBottom(Color.GRAY);
        cell.setBorderWidthTop(0f);
        cell.setBorderWidthLeft(0f);
        cell.setBorderWidthRight(0f);
        cell.setPadding(0f);
        cell.setFixedHeight(5f);
        lineTable.addCell(cell);
        doc.add(lineTable);
    }

    private void addCell(PdfPTable table, String text, Font font, int hAlign, Color bg, float padding) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(hAlign);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(padding);
        cell.setBorderColor(new Color(160, 160, 160));
        cell.setBorderWidth(0.35f);
        if (bg != null) {
            cell.setBackgroundColor(bg);
        }
        table.addCell(cell);
    }

    /** Monto sin prefijo (columnas P. UNIT, TOTAL ítems, MONTO pagos); el documento indica soles en TOTAL (S/). */
    private String amountPlain(BigDecimal value) {
        if (value == null) {
            return "—";
        }
        return String.format("%.2f", value);
    }

    private String totalStr(BigDecimal value) {
        if (value == null) {
            return "0.00";
        }
        return String.format("%.2f", value);
    }

    private String translateMethod(String method) {
        return switch (method) {
            case "CASH"     -> "Efectivo";
            case "YAPE"     -> "Yape";
            case "PLIN"     -> "Plin";
            case "TRANSFER" -> "Transferencia";
            case "CARD"     -> "Tarjeta";
            default         -> method;
        };
    }

    /**
     * Logo desde disco. Solo rutas bajo {@code /uploads/...} relativas a {@link #fileUploadDir}.
     * SVG u otros no soportados por iText/OpenPDF se omiten.
     * <p>Impresoras térmicas son monocromo: logos muy claros (dorado, líneas finas) pueden verse en
     * pantalla pero salir en blanco al imprimir; conviene PNG negro sobre fondo blanco o alto contraste.
     */
    private Image tryLoadStoreLogo(String logoUrl) {
        if (logoUrl == null || logoUrl.isBlank()) {
            return null;
        }
        String trimmed = logoUrl.trim();
        if (!trimmed.startsWith("/uploads/")) {
            return null;
        }
        try {
            String insideUploads = trimmed.substring("/uploads/".length());
            Path uploadRoot = Paths.get(fileUploadDir).toAbsolutePath().normalize();
            Path path = uploadRoot.resolve(insideUploads).normalize();
            if (!path.startsWith(uploadRoot)) {
                log.warn("Ruta de logo fuera del directorio de uploads: {}", path);
                return null;
            }
            if (!Files.exists(path) || !Files.isRegularFile(path)) {
                log.warn(
                        "Logo no encontrado para recibo: {} (upload-dir={}, user.dir={})",
                        path,
                        uploadRoot,
                        System.getProperty("user.dir")
                );
                return null;
            }
            byte[] data = Files.readAllBytes(path);
            return Image.getInstance(data);
        } catch (Exception e) {
            log.warn("No se pudo cargar el logo en el recibo: {}", e.getMessage());
            return null;
        }
    }
}
