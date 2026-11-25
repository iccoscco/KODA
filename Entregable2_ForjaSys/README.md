# Segundo avance de Calidad de Software

**Corte:** 24-11-2026. **Estado:** avance, no entrega final. El primer entregable define ForjaSys; el código recibido se llama KODA. El cambio de producto no cuenta aún con aprobación docente, así que el paquete presenta el alcance inicial y marca por separado las funciones existentes y las pendientes. Véase el [informe general](00_Informe_Segundo_Avance.pdf) o su [versión editable](00_Informe_Segundo_Avance.docx).

| Guía | Entrega de este corte | Estado |
|---|---|---|
| G01 | [ERS propuesta](G01_Requerimientos/ERS_ForjaSys_v0_2_propuesta.pdf), [Word](G01_Requerimientos/ERS_ForjaSys_v0_2_propuesta.docx), [instrumentos pendientes](G01_Requerimientos/elicitation_y_revision_pendiente.md) | En proceso |
| G02 | [Informe](G02_Proceso_Req/Informe_G02_Proceso_Requerimientos.pdf), [Word](G02_Proceso_Req/Informe_G02_Proceso_Requerimientos.docx), historial y dos CC | En proceso; PR sin integrar |
| G03 | [SDD de avance](G03_Analisis/SDD_avance.md), tres fuentes PlantUML y sus PNG | En proceso |
| G04 | [Libro con fórmulas](G04_Dimensionamiento/estimacion_ForjaSys.xlsx), [memoria](G04_Dimensionamiento/memoria_calculo.md) | Estimación provisional |
| G05 | Sin historial SVN ni etiqueta | Pendiente |
| G06 | [Matriz preliminar](G06_Riesgos/avance_riesgos.md) | Parcial; no equivale a MAGERIT completo |
| G07 | Dos pruebas de CC-01 en el código de esta rama | Parcial |
| G08 | Sin prueba JMeter ejecutada | Pendiente |
| G09 | Sin suite Selenium ejecutada | Pendiente |

El cambio CC-01 y sus pruebas están en el [PR #8](https://github.com/iccoscco/KODA/pull/8), abierto como borrador. El [Project de requisitos](https://github.com/users/DanLAQP/projects/4) es un tablero de seguimiento diferente: **no se cambiaron sus estados a Done** porque las verificaciones de aceptación aún no están completas.

Para reproducir las figuras G03 con PlantUML: `java -jar plantuml.jar -tpng G03_Analisis/*.puml` desde esta carpeta. La exportación PDF se hizo desde los Word y las figuras PNG desde sus fuentes editables. Los cálculos de G04 se pueden modificar en la hoja Parametros. Ningún valor de esfuerzo o costo representa horas reales del equipo.
