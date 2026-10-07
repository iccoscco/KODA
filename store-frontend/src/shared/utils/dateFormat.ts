/**
 * Utilidades de formato de fechas.
 *
 * El backend siempre emite fechas ISO-8601 en UTC con sufijo `Z` (por ejemplo
 * `"2026-04-22T21:01:58.438505Z"`). El navegador aplica automáticamente la
 * zona horaria local del usuario al formatear.
 *
 * Estas funciones son tolerantes a ISO sin sufijo de zona (datos legados
 * guardados antes del fix de UTC): si la cadena no trae `Z` ni offset
 * (`+HH:MM` / `-HH:MM`), se añade `Z` y se interpreta como UTC.
 */

const LOCALE = "es-PE";

/**
 * Normaliza una cadena ISO-8601 para que `new Date(...)` la interprete como
 * UTC cuando el backend no incluye el sufijo de zona. Devuelve `null` si la
 * entrada es inválida o vacía.
 */
export function parseBackendDate(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const trimmed = iso.trim();
    if (!trimmed) return null;

    // Si ya trae 'Z' o un offset explícito ('+HH:MM' o '-HH:MM' después de la T),
    // lo dejamos tal cual. Si no, lo tratamos como UTC agregando 'Z'.
    const hasZone = /[Zz]$/.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed);
    const normalized = hasZone ? trimmed : `${trimmed}Z`;
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** Formato "22/04/2026, 21:01" aplicando la zona horaria del navegador. */
export function formatDateTime(
    iso: string | null | undefined,
    options?: Intl.DateTimeFormatOptions
): string {
    const d = parseBackendDate(iso);
    if (!d) return "—";
    return d.toLocaleString(
        LOCALE,
        options ?? { dateStyle: "short", timeStyle: "short" }
    );
}

/** Formato solo fecha: "22/04/2026". */
export function formatDate(iso: string | null | undefined): string {
    const d = parseBackendDate(iso);
    if (!d) return "—";
    return d.toLocaleDateString(LOCALE, { dateStyle: "short" });
}

/** Formato solo hora: "21:01". */
export function formatTime(iso: string | null | undefined): string {
    const d = parseBackendDate(iso);
    if (!d) return "—";
    return d.toLocaleTimeString(LOCALE, { timeStyle: "short" });
}

/**
 * Convierte una fecha local al string ISO-8601 en UTC con sufijo `Z` que
 * espera el backend. Útil al enviar `discountStart`, `discountEnd`, filtros
 * de rango, etc.
 */
export function toBackendDateTime(d: Date | null | undefined): string | null {
    if (!d || Number.isNaN(d.getTime())) return null;
    return d.toISOString();
}
