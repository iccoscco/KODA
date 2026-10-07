"use client";

import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAuthStore, type AuthState } from "@/store/auth.store";
import { Permission } from "@/shared/config/permissions";

// Selector definido fuera del hook para mantener referencia estable entre renders.
// Si se define inline, useShallow recibe una función nueva cada vez, lo que
// provoca que useSyncExternalStore llame getServerSnapshot con referencias
// distintas y React 19 lo detecta como un bucle infinito.
const selectPermissionFns = (s: AuthState) => ({
    hasPermission: s.hasPermission,
    hasAnyPermission: s.hasAnyPermission,
    hasAllPermissions: s.hasAllPermissions,
    can: s.hasPermission,
});

export function usePermission() {
    return useAuthStore(useShallow(selectPermissionFns));
}

export function useHasPermission(permission: Permission): boolean {
    const selector = useCallback(
        (s: AuthState) => s.hasPermission(permission),
        [permission]
    );
    return useAuthStore(selector);
}
