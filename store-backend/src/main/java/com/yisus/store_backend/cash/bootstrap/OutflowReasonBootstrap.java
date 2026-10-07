package com.yisus.store_backend.cash.bootstrap;

import com.yisus.store_backend.cash.OutflowReasonConstants;
import com.yisus.store_backend.cash.model.OutflowReason;
import com.yisus.store_backend.cash.repository.OutflowReasonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Motivos de egreso por defecto en español para el desplegable de caja.
 * También renombra el motivo legado en inglés usado por reembolsos automáticos.
 */
@Component
@Order(15)
@RequiredArgsConstructor
@Slf4j
public class OutflowReasonBootstrap implements ApplicationRunner {

    private final OutflowReasonRepository outflowReasonRepository;

    private record Seed(String name, String description, boolean active) {}

    private static final Seed[] DEFAULT_REASONS = {
            new Seed("Retiro de efectivo", "Efectivo retirado de caja (banco, reserva, etc.)", true),
            new Seed("Pago a proveedor", "Compra de mercadería o servicios a proveedores", true),
            new Seed("Gastos operativos", "Gastos corrientes del local", true),
            new Seed("Servicios (luz, agua, alquiler)", "Servicios públicos, alquiler u otros fijos", true),
            new Seed("Transporte y envíos", "Movilidad, courier o fletes", true),
            new Seed("Depósito bancario", "Ingreso de efectivo a cuenta bancaria", true),
            new Seed("Otros", "Otros egresos (detallar en descripción)", true),
            new Seed(
                    OutflowReasonConstants.AUTO_REFUND,
                    "Generado al cancelar un pedido ya pagado (uso del sistema)",
                    false),
    };

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        renameLegacyAutoRefund();
        for (Seed s : DEFAULT_REASONS) {
            if (!outflowReasonRepository.existsByName(s.name)) {
                outflowReasonRepository.save(OutflowReason.builder()
                        .name(s.name)
                        .description(s.description)
                        .isActive(s.active)
                        .build());
                log.info("Motivo de egreso inicial creado: {}", s.name);
            }
        }
    }

    private void renameLegacyAutoRefund() {
        if (!outflowReasonRepository.existsByName(OutflowReasonConstants.LEGACY_AUTO_REFUND_EN)) {
            return;
        }
        if (outflowReasonRepository.existsByName(OutflowReasonConstants.AUTO_REFUND)) {
            log.warn(
                    "Existen filas '{}' y '{}'; no se renombra automáticamente.",
                    OutflowReasonConstants.LEGACY_AUTO_REFUND_EN,
                    OutflowReasonConstants.AUTO_REFUND);
            return;
        }
        outflowReasonRepository.findByName(OutflowReasonConstants.LEGACY_AUTO_REFUND_EN).ifPresent(r -> {
            r.setName(OutflowReasonConstants.AUTO_REFUND);
            r.setDescription("Generado al cancelar un pedido ya pagado (uso del sistema)");
            r.setIsActive(false);
            outflowReasonRepository.save(r);
            log.info("Motivo legado '{}' renombrado a '{}'", OutflowReasonConstants.LEGACY_AUTO_REFUND_EN,
                    OutflowReasonConstants.AUTO_REFUND);
        });
    }
}
