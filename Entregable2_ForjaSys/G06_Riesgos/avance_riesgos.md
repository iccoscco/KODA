# G06 · Inventario y matriz preliminar de riesgos

**Corte:** 24-11-2026. Análisis inicial inspirado en la identificación de activos, dependencias, amenazas y salvaguardas de MAGERIT. **No se presenta como ejecución completa de MAGERIT ni como exportación PILAR**. Falta aplicar y validar la herramienta requerida, evaluar impactos con el responsable del negocio y medir riesgo residual.

## Activos y dependencias

| Activo | Depende de | Dimensiones predominantes |
|---|---|---|
| Base de datos de órdenes, usuarios y stock | PostgreSQL, copias de seguridad | Integridad, disponibilidad, confidencialidad |
| Servicio API | servidor, base de datos, autenticación | Disponibilidad, integridad |
| Interfaz web | API, navegador, red | Disponibilidad, autenticidad |
| Credenciales y roles | almacenamiento de secretos, control de acceso | Confidencialidad, autenticidad |
| Historial de movimientos | órdenes, variantes, usuario responsable | Integridad, trazabilidad |
| Comprobantes fiscales propuestos | módulo fiscal y SUNAT | Integridad, autenticidad, disponibilidad |

## Escala de priorización de avance

Probabilidad `P`: 1 rara, 2 posible, 3 probable. Impacto `I`: 1 bajo, 2 moderado, 3 alto. `P×I` es **cribado cualitativo complementario**, no cálculo MAGERIT ni riesgo residual medido. Las puntuaciones son hipótesis del equipo pendientes de validación con evidencia operativa.

| ID | Activo / escenario | P | I | P×I | Tratamiento propuesto | Estado / evidencia |
|---|---|---:|---:|---:|---|---|
| R01 | Stock se descuenta dos veces por venta concurrente | 2 | 3 | 6 | bloqueo/versión y prueba de concurrencia | `ProductVariant.version` existe; prueba concurrente pendiente |
| R02 | Venta se confirma sin stock suficiente | 2 | 3 | 6 | validación transaccional y casos límite | código `OrderServiceImpl` inspeccionado; prueba E2E pendiente |
| R03 | Usuario accede a operación ajena a su rol | 2 | 3 | 6 | autorización en API y matriz 401/403 | permisos presentes; baseline QA reporta anomalías, no verificado |
| R04 | Pérdida de datos por fallo de base de datos | 2 | 3 | 6 | respaldo probado y restauración | sin evidencia de restauración |
| R05 | Credencial expuesta en archivo de configuración | 2 | 3 | 6 | sacar secretos del repo y rotar los reales | configuración requiere auditoría; sin rotación acreditada |
| R06 | Movimiento de inventario sin motivo/auditoría | 2 | 2 | 4 | campos obligatorios y trazabilidad de usuario | regla no verificada |
| R07 | SUNAT no responde y se duplica emisión/reenvío | 2 | 3 | 6 | cola idempotente, estados y simulador de caída | no aplica al código KODA actual; riesgo del alcance ForjaSys |
| R08 | Anulación repone stock dos veces | 2 | 3 | 6 | nota única, transacción y prueba repetida | flujo fiscal no implementado; riesgo del alcance ForjaSys |

## Plan y evidencia requerida

R01–R06 corresponden al código KODA. R07–R08 dependen de confirmar el alcance fiscal ForjaSys. Para cada tratamiento se deberán asignar responsable, fecha, esfuerzo, indicador y riesgo residual **después de probarlo**. Las dos pruebas unitarias de CC-01 verifican el aviso de stock mínimo; **no prueban por sí solas ninguno de los ocho tratamientos de seguridad o continuidad**. El requisito G06 de dos controles implantados y verificados queda pendiente. PILAR o alternativa validada, junto con la comparación RMAT/PILAR, también quedan pendientes; no se atribuye una capacidad a RMAT sin identificar la herramienta de manera inequívoca.
