# G01 · Elicitación y revisión pendiente

**Corte:** 24-11-2026. El primer entregable cita una entrevista FUE-001, pero no se entregó transcripción, instrumento ni autorización de participantes. No se atribuyen respuestas a personas reales. La definición de alcance y el código KODA son fuentes secundarias para este avance.

## Instrumento 1 · Entrevista semiestructurada por aplicar

**Participantes previstos:** responsable del negocio, cajero, almacenero. **Registro requerido:** fecha, cargo, consentimiento, respuesta literal, decisión y requisito vinculado. Preguntas: (1) ¿Cómo se identifica actualmente al cliente y qué dato debe validarse? (2) ¿Quién puede corregir stock y con qué motivo? (3) ¿Cuál es el flujo real de venta, pago y devolución? (4) ¿Qué comprobante se entrega y quién asume la emisión fiscal? (5) ¿Qué ocurre cuando SUNAT no responde? (6) ¿Qué reporte usa gerencia para conciliar ventas e inventario? **Estado:** no ejecutada; plantilla sin respuestas.

## Instrumento 2 · Observación de tarea por aplicar

Observar una venta y un ajuste de inventario con usuario representativo. Registrar tiempo total, cantidad de clics, pasos, errores, permisos y datos manejados; no copiar datos personales reales. Probar también la respuesta ante stock insuficiente y stock en mínimo. **Estado:** no ejecutada; no hay tiempos, capturas ni hallazgos observados.

## Roles propuestos

| Rol del trabajo | Responsabilidad | Designación |
|---|---|---|
| Responsable de alcance | confirmar producto y priorizar RF | Pendiente de asignación formal |
| Analista de requisitos | instrumentos, ERS, conflictos | Pendiente |
| Desarrollo | API, UI y persistencia | Pendiente |
| Calidad | casos, ejecución y trazabilidad | Pendiente |

Los nombres de los cuatro integrantes constan en la ERS; no se asignan funciones individuales sin acuerdo del equipo.

## Cronograma de validación propuesto

| Hito | Evidencia de salida | Dependencia |
|---|---|---|
| Confirmar ForjaSys o cambio a KODA | decisión registrada por equipo/docente | primer entregable y repo |
| Ejecutar entrevista y observación | instrumentos con respuestas y fechas | acceso a usuarios |
| Revisar y aprobar ERS | acta y versión de línea base | elicitation |
| Revisar diseño y conteo | SDD y G04 actualizados | ERS aprobada |
| Ejecutar pruebas y cerrar cambios | reportes vinculados a commit | ambiente reproducible |

## Lista de revisión al corte

| Criterio | Estado |
|---|---|
| 12 RF y 6 RNF con ID, fuente y aceptación en ERS | Documentado, aprobación pendiente |
| Dos técnicas con instrumento y resultados | No cumplido; instrumentos propuestos |
| Conflicto de alcance ForjaSys/KODA registrado | Sí, sin resolución |
| Trazabilidad a pruebas de los RF críticos | Parcial; CC-01 tiene dos pruebas unitarias |
| Indicadores medidos en ambiente del producto | Pendiente |
