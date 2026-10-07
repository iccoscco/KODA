package com.yisus.store_backend.order.service;

import com.yisus.store_backend.order.dto.OrderDTO;
import com.yisus.store_backend.order.dto.OrderItemDTO;
import com.yisus.store_backend.order.dto.PaymentDTO;
import com.yisus.store_backend.order.dto.ShippingAddressDTO;
import com.yisus.store_backend.storeconfig.model.StoreConfig;
import com.yisus.store_backend.storeconfig.service.StoreConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EscPosPrintService {

    private final StoreConfigService storeConfigService;

    private static final DateTimeFormatter FMT_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public void printOrderDirect(OrderDTO order) {
        StoreConfig cfg = storeConfigService.getRawConfig();

        if (cfg.getPrinterType() == null || !cfg.getPrinterType().equals("ESC_POS_TCP")) {
            throw new RuntimeException("La impresión directa ESC/POS no está configurada o está desactivada.");
        }

        String ip = cfg.getPrinterIp();
        Integer port = cfg.getPrinterPort();

        if (ip == null || ip.isBlank() || port == null) {
            throw new RuntimeException("La IP o el puerto de la impresora no están configurados.");
        }

        byte[] payload = generateEscPosPayload(order, cfg);

        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(ip, port), 4000); // 4 segundos de timeout
            try (OutputStream out = socket.getOutputStream()) {
                out.write(payload);
                out.flush();
            }
            log.info("Impresión directa ESC/POS enviada a {}:{} con éxito para orden {}", ip, port, order.getId());
        } catch (Exception e) {
            log.warn("Error enviando impresión directa ESC/POS a {}:{}: {}", ip, port, e.getMessage());
            throw new RuntimeException("Error al conectar con la ticketera en " + ip + ":" + port + ". Detalle: " + e.getMessage(), e);
        }
    }

    private byte[] generateEscPosPayload(OrderDTO order, StoreConfig cfg) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            // Inicializar impresora
            out.write(new byte[]{0x1B, 0x40});

            // Configurar juego de caracteres de la ticketera a español/latinoamericano
            // ESC t n (n = 2 suele ser multilingüe / PC850 o similar)
            out.write(new byte[]{0x1B, 0x74, 0x02});

            // 1. Cabecera (Nombre de tienda - Centrado, Negrita, Grande)
            out.write(new byte[]{0x1B, 0x61, 0x01}); // Centrado
            out.write(new byte[]{0x1B, 0x45, 0x01}); // Negrita ON
            out.write(new byte[]{0x1D, 0x21, 0x11}); // Doble ancho y alto

            String storeName = (cfg.getStoreName() != null && !cfg.getStoreName().isBlank())
                    ? cfg.getStoreName().trim()
                    : "Mi Tienda";
            out.write((storeName + "\n").getBytes("CP850"));

            // Restablecer tamaño normal
            out.write(new byte[]{0x1D, 0x21, 0x00});

            // Dirección
            if (cfg.getStoreAddress() != null && !cfg.getStoreAddress().isBlank()) {
                out.write(new byte[]{0x1B, 0x45, 0x00}); // Negrita OFF
                for (String line : cfg.getStoreAddress().split("\\R")) {
                    String trimmed = line.trim();
                    if (!trimmed.isEmpty()) {
                        out.write((trimmed + "\n").getBytes("CP850"));
                    }
                }
            }

            // RUC
            if (cfg.getStoreRuc() != null && !cfg.getStoreRuc().isBlank()) {
                out.write(("RUC: " + cfg.getStoreRuc().trim() + "\n").getBytes("CP850"));
            }

            // Separador
            out.write(new byte[]{0x1B, 0x61, 0x00}); // Alinear Izquierda
            out.write((getSeparator() + "\n").getBytes("CP850"));

            // Título Nota de Venta
            out.write(new byte[]{0x1B, 0x61, 0x01}); // Centrado
            out.write(new byte[]{0x1B, 0x45, 0x01}); // Negrita ON
            out.write(new byte[]{0x1D, 0x21, 0x01}); // Doble alto
            out.write("NOTA DE VENTA\n".getBytes("CP850"));
            out.write(String.format("Nº %06d\n", order.getId()).getBytes("CP850"));

            // Restablecer
            out.write(new byte[]{0x1B, 0x45, 0x00}); // Negrita OFF
            out.write(new byte[]{0x1D, 0x21, 0x00}); // Tamaño normal

            // Fecha Emisión
            out.write(new byte[]{0x1B, 0x61, 0x00}); // Izquierda
            if (order.getCreatedAt() != null) {
                out.write(("Fecha de emisión: " + order.getCreatedAt().format(FMT_FECHA) + "\n").getBytes("CP850"));
            }

            // Destino
            ShippingAddressDTO ship = order.getShippingAddress();
            if (ship != null) {
                String dest = buildDestinoLine(ship);
                if (dest != null) {
                    out.write(("Destino: " + dest + "\n").getBytes("CP850"));
                }
            }

            out.write((getSeparator() + "\n").getBytes("CP850"));

            // 2. Datos del Comprador
            out.write(new byte[]{0x1B, 0x45, 0x01}); // Negrita ON
            out.write("CLIENTE / DATOS DEL COMPRADOR\n".getBytes("CP850"));
            out.write(new byte[]{0x1B, 0x45, 0x00}); // Negrita OFF

            if (ship != null) {
                if (ship.getFullName() != null && !ship.getFullName().isBlank()) {
                    out.write(("Nombre: " + ship.getFullName().trim() + "\n").getBytes("CP850"));
                }
                if (ship.getPhone() != null && !ship.getPhone().isBlank()) {
                    out.write(("Tel.: " + ship.getPhone().trim() + "\n").getBytes("CP850"));
                }
                if (ship.getAddress() != null && !ship.getAddress().isBlank()) {
                    out.write(("Dirección: " + ship.getAddress().trim() + "\n").getBytes("CP850"));
                }
                if (ship.getCity() != null && !ship.getCity().isBlank()) {
                    out.write(("Ciudad: " + ship.getCity().trim() + "\n").getBytes("CP850"));
                }
            } else {
                out.write("Nombre: —\n".getBytes("CP850"));
            }

            out.write((getSeparator() + "\n").getBytes("CP850"));

            // 3. Tabla de Items
            // CANT(5) | DESCRIPCIÓN(23) | P. UNIT(10) | TOTAL(10) -> Total 48 columnas
            out.write(new byte[]{0x1B, 0x45, 0x01}); // Negrita ON
            out.write((padRight("CANT", 5) + padRight("DESCRIPCIÓN", 23) + padLeft("P. UNIT", 10) + padLeft("TOTAL", 10) + "\n").getBytes("CP850"));
            out.write(new byte[]{0x1B, 0x45, 0x00}); // Negrita OFF

            if (order.getOrderItems() != null) {
                for (OrderItemDTO item : order.getOrderItems()) {
                    String desc = item.getProductName() != null ? item.getProductName() : "—";
                    if (item.getColorName() != null && !item.getColorName().isBlank()) {
                        desc += " - " + item.getColorName();
                    }
                    if (item.getSizeName() != null && !item.getSizeName().isBlank()) {
                        desc += " T:" + item.getSizeName();
                    }

                    List<String> rows = formatItemRow(
                            String.valueOf(item.getQuantity()),
                            desc,
                            amountPlain(item.getUnitPrice()),
                            amountPlain(item.getTotalPrice())
                    );
                    for (String row : rows) {
                        out.write((row + "\n").getBytes("CP850"));
                    }
                }
            }

            out.write((getSeparator() + "\n").getBytes("CP850"));

            // 4. Total Documento (Negrita, Grande)
            out.write(new byte[]{0x1B, 0x61, 0x02}); // Alinear Derecha
            out.write(new byte[]{0x1B, 0x45, 0x01}); // Negrita ON
            out.write(new byte[]{0x1D, 0x21, 0x01}); // Doble alto
            String totalStr = "TOTAL (S/): " + amountPlain(order.getTotal());
            out.write((totalStr + "\n").getBytes("CP850"));

            // Restablecer
            out.write(new byte[]{0x1B, 0x45, 0x00});
            out.write(new byte[]{0x1D, 0x21, 0x00});
            out.write(new byte[]{0x1B, 0x61, 0x00}); // Izquierda

            // 5. Formas de Pago
            out.write("\n".getBytes("CP850"));
            out.write(new byte[]{0x1B, 0x45, 0x01}); // Negrita ON
            out.write("FORMAS DE PAGO\n".getBytes("CP850"));
            out.write(new byte[]{0x1B, 0x45, 0x00}); // Negrita OFF
            
            out.write((padRight("TIPO", 24) + padLeft("MONTO", 24) + "\n").getBytes("CP850"));
            if (order.getPayments() != null && !order.getPayments().isEmpty()) {
                for (PaymentDTO payment : order.getPayments()) {
                    String method = translateMethod(payment.getMethod().name());
                    String amount = amountPlain(payment.getAmount());
                    out.write((padRight(method, 24) + padLeft(amount, 24) + "\n").getBytes("CP850"));
                }
            } else {
                out.write((padRight("—", 24) + padLeft("—", 24) + "\n").getBytes("CP850"));
            }

            out.write((getSeparator() + "\n").getBytes("CP850"));

            // 6. Metadata
            String registrar = (order.getUserName() != null && !order.getUserName().isBlank())
                    ? order.getUserName().trim()
                    : "—";
            ZonedDateTime impresoEn = ZonedDateTime.now(java.time.ZoneId.of("America/Lima"));
            String fFecha = impresoEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            String fHora = impresoEn.format(DateTimeFormatter.ofPattern("HH:mm:ss"));

            out.write(("Usu. reg.: " + registrar + "\n").getBytes("CP850"));
            out.write(("Fec. imp.: " + fFecha + "\n").getBytes("CP850"));
            out.write(("Hor. imp.: " + fHora + "\n").getBytes("CP850"));

            out.write((getSeparator() + "\n").getBytes("CP850"));

            // 7. Footer (Centrado, Salto de líneas, apertura de cajón y corte)
            out.write(new byte[]{0x1B, 0x61, 0x01}); // Centrado
            out.write("Gracias por su preferencia\n\n\n\n\n".getBytes("CP850"));

            // Apertura de cajón monedero (Drawer kick-out)
            out.write(new byte[]{0x1B, 0x70, 0x00, 0x19, (byte) 0xFA});

            // Corte de papel completo (Paper Cut)
            out.write(new byte[]{0x1D, 0x56, 0x42, 0x00});

            out.flush();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error generando payload ESC/POS: {}", e.getMessage());
            throw new RuntimeException("No se pudo construir la trama ESC/POS de la venta.", e);
        }
    }

    private String getSeparator() {
        return "-".repeat(48);
    }

    private String buildDestinoLine(ShippingAddressDTO ship) {
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

    private List<String> formatItemRow(String cant, String desc, String pUnit, String total) {
        int cantWidth = 5;
        int descWidth = 23;
        int pUnitWidth = 10;
        int totalWidth = 10;

        List<String> descLines = wrapText(desc, descWidth);
        List<String> rows = new ArrayList<>();

        String cantPart = padRight(cant, cantWidth);
        String descPart = padRight(descLines.isEmpty() ? "" : descLines.get(0), descWidth);
        String pUnitPart = padLeft(pUnit, pUnitWidth);
        String totalPart = padLeft(total, totalWidth);
        rows.add(cantPart + descPart + pUnitPart + totalPart);

        for (int i = 1; i < descLines.size(); i++) {
            String emptyCant = " ".repeat(cantWidth);
            String emptyPrices = " ".repeat(pUnitWidth + totalWidth);
            rows.add(emptyCant + padRight(descLines.get(i), descWidth) + emptyPrices);
        }

        return rows;
    }

    private List<String> wrapText(String text, int width) {
        List<String> lines = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            lines.add("");
            return lines;
        }

        int index = 0;
        while (index < text.length()) {
            int end = Math.min(index + width, text.length());
            lines.add(text.substring(index, end));
            index = end;
        }
        return lines;
    }

    private String padRight(String text, int width) {
        if (text == null) text = "";
        if (text.length() >= width) {
            return text.substring(0, width);
        }
        return text + " ".repeat(width - text.length());
    }

    private String padLeft(String text, int width) {
        if (text == null) text = "";
        if (text.length() >= width) {
            return text.substring(0, width);
        }
        return " ".repeat(width - text.length()) + text;
    }

    private String amountPlain(BigDecimal value) {
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
}
