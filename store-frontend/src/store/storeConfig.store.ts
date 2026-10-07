import { create } from "zustand";
import { persist } from "zustand/middleware";

interface StoreConfigState {
    storeName: string;
    logoUrl: string | null;
    setStoreConfig: (cfg: { storeName: string; logoUrl: string | null }) => void;
    setLogoUrl: (logoUrl: string | null) => void;
}

export const useStoreConfigStore = create<StoreConfigState>()(
    persist(
        (set) => ({
            storeName: "",
            logoUrl: null,
            setStoreConfig: (cfg) => set({ storeName: cfg.storeName, logoUrl: cfg.logoUrl }),
            setLogoUrl: (logoUrl) => set({ logoUrl }),
        }),
        { name: "store-branding" }
    )
);
