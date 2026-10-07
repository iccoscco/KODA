const KEY = "pos-cash-register-id";

export function getStoredCashRegisterId(): number | null {
    if (typeof window === "undefined") return null;
    const v = localStorage.getItem(KEY);
    if (!v) return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
}

export function setStoredCashRegisterId(id: number): void {
    localStorage.setItem(KEY, String(id));
}
