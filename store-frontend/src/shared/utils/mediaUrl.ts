const API_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "";

function getAssetsBaseUrl(): string {
    if (!API_BASE) return "";
    try {
        const parsed = new URL(API_BASE);
        // Keep the configured pathname (e.g. /api) because static uploads are served under /api/uploads.
        return parsed.toString().replace(/\/$/, "");
    } catch {
        // Fallback for non-absolute values (keep value as-is).
        return API_BASE.replace(/\/$/, "");
    }
}

export function toMediaUrl(path: string | null | undefined): string {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    const base = getAssetsBaseUrl();
    if (!base) return path;
    const finalUrl = `${base}${path.startsWith("/") ? path : `/${path}`}`;
    if (typeof window !== "undefined") {
        console.debug("[mediaUrl] resolved image URL", { inputPath: path, apiBase: base, finalUrl });
    }
    return finalUrl;
}

