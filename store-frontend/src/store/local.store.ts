import { create } from "zustand";

export interface LocalContext { id: number; code: string; name: string; canSwitch: boolean }

interface LocalState {
    current: LocalContext | null;
    ready: boolean;
    generation: number;
    setContext: (current: LocalContext | null, ready?: boolean) => void;
}

export const useLocalStore = create<LocalState>((set) => ({
    current: null, ready: false, generation: 0,
    setContext: (current, ready = false) => set((s) => ({ current, ready, generation: s.generation + 1 })),
}));

export const localSelectionKey = (userId: string) => `koda-local:${userId}`;
