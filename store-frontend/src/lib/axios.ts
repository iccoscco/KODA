import axios, { AxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth.store";
import { useLocalStore } from "@/store/local.store";

declare module "axios" {
    interface AxiosRequestConfig { localGeneration?: number }
}

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "/api",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

api.interceptors.request.use((config) => {
    const context = useLocalStore.getState();
    if (!context.ready && !/^\/(auth|locals)(\/|$)/.test(config.url ?? "")) {
        throw new axios.CanceledError("Selecciona y valida un local antes de operar");
    }
    if (config.localGeneration !== undefined && config.localGeneration !== context.generation) {
        throw new axios.CanceledError("La solicitud pertenece al local anterior");
    }
    config.localGeneration = context.generation;
    config.headers.delete("X-Local-Id");
    if (useAuthStore.getState().user?.canSwitchLocal && context.current) {
        config.headers.set("X-Local-Id", String(context.current.id));
    }
    return config;
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
    (response) => {
        if (response.config.localGeneration !== useLocalStore.getState().generation) {
            throw new axios.CanceledError("Respuesta del local anterior descartada");
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
        const status = error.response?.status;
        const url    = originalRequest?.url ?? "";
        if (originalRequest?.localGeneration !== undefined && originalRequest.localGeneration !== useLocalStore.getState().generation) {
            return Promise.reject(new axios.CanceledError("Respuesta del local anterior descartada"));
        }
        const message = error.response?.data?.message ?? "";
        if (typeof window !== "undefined" && (status === 403 || status === 404)) {
            window.dispatchEvent(new CustomEvent("workspace-request-error", { detail: status === 403
                ? "No tienes permiso para esta operación en el local activo."
                : "El recurso no está disponible en el local activo. Actualiza la lista antes de continuar." }));
        }
        if (typeof window !== "undefined" && typeof message === "string" &&
            /LOCAL_REQUIRED|Local inactivo|Local inexistente|Usuario sin local asignado/.test(message)) {
            window.dispatchEvent(new CustomEvent("local-context-invalid", { detail: message }));
        }

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
            if (originalRequest.localGeneration !== useLocalStore.getState().generation) {
                const canceled = new axios.CanceledError("El contexto cambió durante la renovación de sesión");
                processQueue(canceled);
                return Promise.reject(canceled);
            }
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
