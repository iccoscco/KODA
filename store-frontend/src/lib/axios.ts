import axios, { AxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth.store";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "/api",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

/** Rutas que no deben disparar el flujo de refresh/logout. */
const AUTH_PATHS: readonly string[] = [
    "/auth/login",
    "/auth/register",
    "/auth/logout",
    "/auth/refresh-token",
];

function isAuthPath(url: string | undefined): boolean {
    if (!url) return false;
    return AUTH_PATHS.some((p) => url.includes(p));
}

// ─── Refresh token queue ──────────────────────────────────────────────────────
// Si llegan múltiples peticiones con 401 mientras se está refrescando, se encolan
// y se reintentan todas una vez que el refresh termina.

type QueueEntry = { resolve: () => void; reject: (err: unknown) => void };

let isRefreshing = false;
let failedQueue: QueueEntry[] = [];

function processQueue(error: unknown): void {
    failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve()));
    failedQueue = [];
}

async function doLogout(): Promise<void> {
    try {
        await api.post("/auth/logout");
    } catch {
        /* ignorar: sin cookies o sesión ya inválida */
    }
    useAuthStore.getState().clearSession();
    if (typeof window !== "undefined") {
        window.location.href = "/login";
    }
}

// ─── Response interceptor ─────────────────────────────────────────────────────

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
        const status = error.response?.status;
        const url    = originalRequest?.url ?? "";

        // Solo manejar 401 en rutas protegidas y solo una vez por petición
        if (status !== 401 || isAuthPath(url) || originalRequest._retry) {
            return Promise.reject(error);
        }

        // Si ya hay un refresh en curso → encolar y esperar
        if (isRefreshing) {
            return new Promise<void>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then(() => {
                    // Marcar como reintento para que un posible 401 aquí
                    // no dispare un segundo ciclo de refresh
                    originalRequest._retry = true;
                    return api(originalRequest);
                })
                .catch((err) => Promise.reject(err));
        }

        // Primer 401: intentar refrescar
        originalRequest._retry = true;
        isRefreshing = true;

        try {
            await api.post("/auth/refresh-token");
            // Refresh exitoso → desencolar peticiones y reintentar la original
            processQueue(null);
            return api(originalRequest);
        } catch (refreshError) {
            // Refresh falló → desencolar con error y hacer logout
            processQueue(refreshError);
            await doLogout();
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default api;
