package com.yisus.store_backend.cash;

/**
 * Nombres canónicos de motivos de egreso (único en BD). El reembolso por cancelación de pedido
 * usa {@link #AUTO_REFUND} y no debe mostrarse en el desplegable manual ({@code isActive = false}).
 */
public final class OutflowReasonConstants {

    public static final String AUTO_REFUND = "Reembolso automático";
    /** Fila antigua creada por versiones previas del backend (inglés). */
    public static final String LEGACY_AUTO_REFUND_EN = "Automatic Refund";

    private OutflowReasonConstants() {
    }
}
