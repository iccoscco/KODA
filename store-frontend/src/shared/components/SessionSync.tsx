'use client';

import { useEffect } from "react";
import { AuthService } from "@/shared/services/auth.service";
import { useAuthStore } from "@/store/auth.store";

/**
 * Tras hidratar el store, sincroniza el usuario con /auth/me (cookies httpOnly).
 * Si no hay sesión válida, el interceptor de axios redirige a login.
 */
export default function SessionSync() {
    const _hasHydrated = useAuthStore((s) => s._hasHydrated);

    useEffect(() => {
        if (!_hasHydrated) return;
        AuthService.verifyToken().catch(() => {
            // 401: interceptor limpia y redirige
        });
    }, [_hasHydrated]);

    return null;
}
