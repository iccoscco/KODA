'use client';

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth.store";

/**
 * En login/registro, limpia el estado del cliente (Zustand) para no mezclar un usuario
 * persistido con una pantalla de credenciales; las cookies httpOnly las gestiona el backend.
 */
export default function AuthPublicEntryCleanup() {
    const done = useRef(false);

    useEffect(() => {
        if (done.current) return;
        done.current = true;
        useAuthStore.getState().clearSession();
    }, []);

    return null;
}
