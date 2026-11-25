# G02 · Proceso de requerimientos

**Corte:** 24-11-2026. Este directorio documenta cinco requisitos y dos solicitudes de cambio en [iccoscco/KODA](https://github.com/iccoscco/KODA/issues), vinculados al alcance inicial ForjaSys. El código recibido se llama KODA y la decisión sobre el cambio de producto aún requiere validación docente.

## Evidencias disponibles

| Archivo | Contenido |
|---|---|
| `Informe_G02_Proceso_Requerimientos.docx` | Resultados comprobados, límites y pendientes |
| `recorrido.md`, `export_issues.csv`, `export_issues.json` | Historial de transiciones y exportación al corte |
| `flujo_requerimientos.puml`, `flujo.png` | Flujo editable y exportado |
| `CC-01.docx`, `CC-02.docx` | Solicitudes con análisis de impacto y decisiones |
| `CC-01_trazabilidad.md` | Código, contrato, dos pruebas unitarias y verificación pendiente |
| `issues/*.md` | Descripciones base de los cinco RF y dos cambios |
| `scripts/*.ps1` | Automatización usada para etiquetas, transiciones y exportación |

Los issues #1–#6 permanecen abiertos; #7 (CC-02) se rechazó y cerró. La implementación de CC-01 está en la rama de integración del [PR #8](https://github.com/iccoscco/KODA/pull/8), que sigue **en borrador y sin fusionar**. Se aprobaron dos pruebas unitarias específicas de CC-01 con Java 21. La inspección visual y la prueba contra API real todavía faltan. La ERS y el SDD de este avance son propuestas, no línea base aprobada. No hay revisión SVN acreditada.

**No volver a ejecutar `02_crear_issues.ps1`**, porque duplicaría los siete issues existentes. Antes de cerrar G02: confirmar alcance, actualizar el historial con la versión final, verificar CC-01 en interfaz y API, vincular SVN y repetir la exportación de GitHub.
