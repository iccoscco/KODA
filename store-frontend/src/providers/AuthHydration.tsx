"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";

/**
 * React 19 + Zustand persist: evita bucles con useSyncExternalStore en SSR.
 * La persistencia solo se lee en el cliente tras el primer mount.
 */
export default function AuthHydration() {
    useEffect(() => {
        void useAuthStore.persist.rehydrate();
    }, []);
    return null;
}
