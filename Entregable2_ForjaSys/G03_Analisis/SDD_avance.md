# G03 · Descripción de diseño de software (avance v0.1)

**Fecha:** 24-11-2026. **Producto objetivo:** ForjaSys, según la definición de alcance del primer entregable. **Código inspeccionado:** KODA, rama `feat/juan-forjasys-entregable2` derivada de `laguero` (`0560016`). **Estado:** diseño preliminar; requiere revisión del equipo y cliente. Se distingue el diseño objetivo de lo que ya implementa KODA.

## 1. Propósito, interesados y preocupaciones

El diseño cubre tres procesos críticos: P1 venta y comprobante, P2 inventario y P3 anulación con restitución. Interesados: cajero (registro ágil y errores comprensibles), almacenero (stock íntegro y trazable), administrador (autorización y auditoría), cliente (comprobante válido), equipo de desarrollo (contratos y pruebas), y docente (trazabilidad y evidencias).

| Vista | Pregunta que responde | Evidencia |
|---|---|---|
| Contexto/casos de uso | ¿Quién realiza cada operación? | `casos_uso.puml` |
| Lógica/clases | ¿Dónde viven los datos y reglas? | `clases_dominio.puml` |
| Comportamiento | ¿Cómo se valida una venta? | `secuencia_venta.puml` |
| Implementación | ¿Qué piezas reales existen? | `store-frontend/src`, `store-backend/src/main`, PostgreSQL |

## 2. Arquitectura y decisiones

La base existente usa interfaz Next.js/React, API Spring Boot y persistencia JPA en PostgreSQL. La UI llama controladores REST; estos delegan reglas a servicios y repositorios. KODA ya contiene autenticación, productos/variantes, órdenes, pagos, caja, movimientos de stock, reportes y recibo PDF. **El PDF de recibo actual no constituye comprobante electrónico SUNAT.** En el código inspeccionado no se halló servicio de emisión SUNAT ni nota de crédito fiscal. Las funcionalidades ForjaSys de cliente identificado por DNI/RUC, IGV explícito, XML firmado, correlativo fiscal, estado SUNAT, reenvío y nota de crédito se mantienen como diseño pendiente, sin presentarlas como implementadas.

Decisiones propuestas: (D1) mantener una transacción de base de datos para venta, detalle, pago y descuento de stock; (D2) conservar movimiento de stock con referencia de operación y usuario; (D3) separar `ComprobanteElectronico` y `EnvioSunat` del recibo PDF; (D4) bloquear anulación duplicada y emitir nota de crédito antes de reponer stock, con idempotencia; (D5) mantener estados técnicos de emisión y reintento. D3–D5 no se han implementado ni aprobado aún.

## 3. Modelo de datos y correspondencia real

| Concepto objetivo | Código KODA observado | Brecha |
|---|---|---|
| Producto y stock | `Product`, `ProductVariant`, `StockMovement` | Confirmar unidad/kardex y reglas por rol |
| Venta y detalle | `Order`, `OrderItem`, `Payment` | Confirmar IGV y cliente fiscal |
| Usuario/rol | Módulos `auth`, `user`, `role` | Probar todos los permisos de RNF-04 |
| Comprobante SUNAT | Sin entidad/servicio evidenciado | Diseñar XML, firma, serie, correlativo, CDR y reintento |
| Nota de crédito | Sin entidad/servicio evidenciado | Diseñar vínculo con comprobante y reposición única |

Cardinalidad actual relevante: una orden tiene muchos ítems y pagos; cada ítem refiere una variante; una variante pertenece a un producto. `ProductVariant` conserva `stock`, `minStock` y `version`. Para la futura integración fiscal se propone relación una orden a uno o más comprobantes, cada comprobante a cero o más intentos de envío y, cuando aplique, una nota de crédito referida al comprobante original. Estas últimas relaciones son **propuestas**, no tablas actuales.

## 4. Casos de uso principales

### CU-01 Registrar venta (RF-07, CC-01)

- **Actor:** cajero. **Precondiciones:** sesión autorizada, caja habilitada, producto activo, stock suficiente.
- **Flujo:** (1) selecciona variantes y cantidades; (2) el sistema valida precios y disponibilidad; (3) registra orden, ítems y pago; (4) descuenta existencias; (5) informa stock final y alerta cuando queda por debajo del mínimo; (6) confirma identificador de venta.
- **Alternativas:** sin stock → rechaza sin descontar; pago inválido → no confirma; stock final bajo mínimo → confirma venta y muestra alerta.
- **Excepciones:** error de persistencia → revierte transacción; concurrencia sobre variante → reintenta o presenta conflicto controlado.
- **Poscondición:** venta y movimiento asociados; stock no negativo. La alerta CC-01 tiene prueba unitaria, pero la venta completa no está validada de extremo a extremo.

### CU-02 Consultar y ajustar inventario (RF-04, RF-05)

- **Actor:** almacenero o administrador. **Precondiciones:** autenticación y permiso pertinente.
- **Flujo:** consulta producto/variante, stock y movimientos; solicita entrada, salida o ajuste con motivo; el servicio valida cantidad y actualiza el saldo; se registra movimiento auditable.
- **Alternativas:** salida que excede disponible → rechazo; ajuste sin motivo → validación pendiente de especificar.
- **Excepciones:** conflicto concurrente → no se debe sobrescribir silenciosamente el saldo.
- **Poscondición:** saldo y historial coherentes. La vista de kardex y evidencia de aceptación aún deben verificarse contra KODA.

### CU-03 Anular comprobante y reponer stock (RF-10)

- **Actor:** administrador. **Precondiciones:** comprobante fiscal aceptado y no anulado, autorización, ítems vendidos identificables.
- **Flujo objetivo:** solicita anulación con motivo; el sistema valida estado y monto; emite nota de crédito; registra respuesta fiscal; al confirmarse, repone exactamente las unidades afectadas y marca el documento anulado.
- **Alternativas:** servicio SUNAT indisponible → mantener pendiente y sin duplicar reposición; rechazo fiscal → informar y no cerrar.
- **Excepciones:** solicitud repetida → retornar el estado ya registrado, sin segunda nota ni segunda reposición.
- **Poscondición:** trazabilidad entre orden, comprobante original, nota y movimiento. **Este flujo aún no existe en KODA; es diseño objetivo.**

## 5. Mockups de contenido y navegación (preliminares)

| Pantalla | Campos/acciones mínimos | Estado |
|---|---|---|
| Venta | búsqueda de producto, cantidad, precio, cliente, método de pago, resumen e IGV, confirmar | UI KODA de venta existente; campos fiscales por revisar |
| Inventario | filtro, variante, saldo, mínimo, historial, registrar ajuste y motivo | Parcial en KODA; evidencia de flujo completo pendiente |
| Anulación | comprobante original, motivo, ítems, total, confirmación, estado fiscal | Solo propuesta; requiere mockup gráfico y validación |

Estos son **esquemas de contenido**, no se presentan como mockups gráficos terminados.

## 6. Utilidad y revisión del diseño

| Artefacto | Utilidad | Revisión / pendiente |
|---|---|---|
| Casos de uso | Delimita actores y alcance | Comprobar permisos con cliente |
| Clases | Identifica entidades existentes y propuestas | Alinear nombres finales con migraciones |
| Secuencia | Expone validaciones y transacción crítica | Verificar contratos reales y excepciones |
| SDD | Reúne vistas, decisiones y trazabilidad | Revisar consistencia al integrar SUNAT |

**Criterios de revisión:** interesados y preocupaciones descritos; vistas y decisiones trazadas; tres casos de uso especificados. Quedan pendientes aprobación del alcance, mockups gráficos, contrato fiscal, diagrama de despliegue validado y revisión formal del equipo. Por ello G03 está **en proceso**.
