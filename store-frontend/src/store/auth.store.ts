import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User } from "@/features/users/types/usersTypes";
import { Permission } from "@/shared/config/permissions";
import { useLocalStore, localSelectionKey } from "./local.store";
import { useNotificationsStore } from "./notifications.store";
import { useStoreConfigStore } from "./storeConfig.store";

export interface AuthState {
    user: User | null;
    _hasHydrated: boolean;

    setHasHydrated: (value: boolean) => void;
    setSession: (user: User) => void;
    clearSession: () => void;

    hasPermission: (permission: Permission) => boolean;
    hasAnyPermission: (permissions: Permission[]) => boolean;
    hasAllPermissions: (permissions: Permission[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            _hasHydrated: false,

            setHasHydrated: (value) => set({ _hasHydrated: value }),

            setSession: (user) => {
                set({ user });
            },

            clearSession: () => {
                const user = get().user;
                if (typeof window !== "undefined" && user) sessionStorage.removeItem(localSelectionKey(user.id));
                useLocalStore.getState().setContext(null);
                useNotificationsStore.setState({ unreadCount: 0, recent: [] });
                useStoreConfigStore.getState().setStoreConfig({ storeName: "", logoUrl: null });
                set({ user: null });
            },

            hasPermission: (permission) =>
                get().user?.permissions.includes(permission) ?? false,

            hasAnyPermission: (permissions) =>
                permissions.some((p) => get().user?.permissions.includes(p) ?? false),

            hasAllPermissions: (permissions) =>
                permissions.every((p) => get().user?.permissions.includes(p) ?? false),
        }),
        {
            name: "auth-cookie",
            storage: createJSONStorage(() => localStorage),
            /** Evita leer localStorage en SSR y estabiliza getServerSnapshot (React 19). */
            skipHydration: true,
            partialize: (state) => ({
                user: state.user,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
