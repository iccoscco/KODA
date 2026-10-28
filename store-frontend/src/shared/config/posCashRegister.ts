import { useLocalStore } from "@/store/local.store";
import { useAuthStore } from "@/store/auth.store";
const key = () => `pos-cash-register:${useAuthStore.getState().user?.id}:${useLocalStore.getState().current?.id}`;

export function getStoredCashRegisterId(): number | null {
    if (typeof window === "undefined") return null;
    const v = sessionStorage.getItem(key());
    if (!v) return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
}

export function setStoredCashRegisterId(id: number): void {
    sessionStorage.setItem(key(), String(id));
}
