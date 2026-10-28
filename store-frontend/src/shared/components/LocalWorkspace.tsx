"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Snackbar, TextField, Typography } from "@mui/material";
import { AuthService } from "@/shared/services/auth.service";
import { LocalService } from "@/shared/services/local.service";
import { useAuthStore } from "@/store/auth.store";
import { LocalContext, localSelectionKey, useLocalStore } from "@/store/local.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { useStoreConfigStore } from "@/store/storeConfig.store";
import DashboardLayout from "./layout/dashboardLayout";

const Selection = createContext<{ locals: LocalContext[]; choose: (id: number) => void }>({ locals: [], choose: () => {} });

export function LocalSelector() {
    const { locals, choose } = useContext(Selection);
    const user = useAuthStore((s) => s.user);
    const current = useLocalStore((s) => s.current);
    if (!user?.canSwitchLocal) return <Typography variant="body2" noWrap title={current?.name}>Local: {current?.name ?? "Sin local"}</Typography>;
    return <TextField select size="small" label="Local activo" value={current?.id ?? ""}
        onChange={(e) => choose(Number(e.target.value))} sx={{ minWidth: 150, maxWidth: 270, flex: 1 }}>
        <MenuItem value="" disabled>Selecciona un local</MenuItem>
        {locals.map((local) => <MenuItem key={local.id} value={local.id}>{local.name} · {local.code}</MenuItem>)}
    </TextField>;
}

function clearLocalData() {
    useNotificationsStore.setState({ unreadCount: 0, recent: [] });
    useStoreConfigStore.getState().setStoreConfig({ storeName: "", logoUrl: null });
}

export default function LocalWorkspace({ children }: { children: React.ReactNode }) {
    const hydrated = useAuthStore((s) => s._hasHydrated);
    const current = useLocalStore((s) => s.current);
    const ready = useLocalStore((s) => s.ready);
    const [locals, setLocals] = useState<LocalContext[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [notice, setNotice] = useState("");
    const [pendingId, setPendingId] = useState<number | null>(null);

    useEffect(() => {
        const report = (event: Event) => setNotice((event as CustomEvent<string>).detail);
        const syncSession = (event: StorageEvent) => {
            if (event.key === "auth-cookie") {
                try {
                    const before = JSON.parse(event.oldValue ?? "null")?.state?.user;
                    const after = JSON.parse(event.newValue ?? "null")?.state?.user;
                    if (before?.id === after?.id && before?.role === after?.role && before?.localId === after?.localId) return;
                } catch { /* Una persistencia inválida exige validar de nuevo la sesión. */ }
                useLocalStore.getState().setContext(null); clearLocalData();
                setAttempt((value) => value + 1);
            }
        };
        window.addEventListener("workspace-request-error", report);
        window.addEventListener("storage", syncSession);
        return () => { window.removeEventListener("workspace-request-error", report); window.removeEventListener("storage", syncSession); };
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        let active = true;
        const init = async () => {
            setLoading(true); setError(""); clearLocalData();
            useLocalStore.getState().setContext(null);
            try {
                const user = await AuthService.verifyToken();
                if (!active) return;
                if (user.canSwitchLocal) {
                    const available = await LocalService.list();
                    if (!active) return;
                    setLocals(available);
                    const saved = Number(sessionStorage.getItem(localSelectionKey(user.id)));
                    const selected = available.find((l) => l.id === saved);
                    if (selected) {
                        useLocalStore.getState().setContext(selected);
                        const verified = await LocalService.current();
                        if (active) useLocalStore.getState().setContext(verified, true);
                    } else if (!available.length) setError("No hay locales activos disponibles. Contacta al administrador.");
                } else {
                    const assigned = await LocalService.current();
                    if (active) useLocalStore.getState().setContext(assigned, true);
                }
            } catch {
                if (active) setError("No se pudo validar tu local o tu sesión. Reintenta; si el local está inactivo o no tienes uno asignado, contacta al administrador.");
            } finally { if (active) setLoading(false); }
        };
        void init();
        const invalid = () => {
            clearLocalData(); useLocalStore.getState().setContext(null);
            setError("El local ya no está disponible. Selecciona otro o solicita acceso al administrador.");
        };
        window.addEventListener("local-context-invalid", invalid);
        return () => { active = false; window.removeEventListener("local-context-invalid", invalid); };
    }, [hydrated, attempt]);

    const applyChoice = async (id: number) => {
        if (current?.id === id) return;
        const next = locals.find((l) => l.id === id);
        if (!next || loading) return;
        setLoading(true); setError(""); setNotice(""); clearLocalData();
        useLocalStore.getState().setContext(next);
        try {
            const verified = await LocalService.current();
            const user = useAuthStore.getState().user;
            if (user) sessionStorage.setItem(localSelectionKey(user.id), String(verified.id));
            useLocalStore.getState().setContext(verified, true);
        } catch {
            useLocalStore.getState().setContext(null);
            setError("No se pudo abrir ese local. Puede estar inactivo o no estar autorizado.");
        } finally { setLoading(false); }
    };

    const choose = (id: number) => {
        if (current?.id === id) return;
        if (ready) setPendingId(id);
        else void applyChoice(id);
    };
    return <Selection.Provider value={{ locals, choose }}>
        <Dialog open={pendingId !== null} onClose={() => setPendingId(null)} maxWidth="xs" fullWidth>
            <DialogTitle>Cambiar de local</DialogTitle>
            <DialogContent>Se cerrarán los formularios y se descartarán las ventas sin guardar. Las operaciones ya enviadas pueden finalizar en el local anterior.</DialogContent>
            <DialogActions>
                <Button onClick={() => setPendingId(null)}>Conservar local</Button>
                <Button variant="contained" onClick={() => { const id = pendingId; setPendingId(null); if (id !== null) void applyChoice(id); }}>Cambiar local</Button>
            </DialogActions>
        </Dialog>
        <Snackbar open={!!notice && ready} autoHideDuration={7000} onClose={() => setNotice("")}>
            <Alert severity="warning" onClose={() => setNotice("")}>{notice}</Alert>
        </Snackbar>
        {ready && current ? <DashboardLayout key={`${useAuthStore.getState().user?.id}:${current.id}`}>{children}</DashboardLayout> :
            <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
                <Paper sx={{ p: { xs: 3, sm: 5 }, width: "100%", maxWidth: 520 }}>
                    <Typography variant="h5" fontWeight={700} gutterBottom>Tu espacio de trabajo</Typography>
                    {loading ? <Box role="status" sx={{ display: "flex", gap: 2, alignItems: "center" }}><CircularProgress size={24} />Validando sesión y local…</Box> : <>
                        <Typography sx={{ mb: 3 }}>Selecciona el local donde vas a trabajar. Los datos y operaciones corresponden a ese local.</Typography>
                        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
                        <LocalSelector />
                        <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
                            <Button onClick={() => setAttempt((a) => a + 1)}>Reintentar</Button>
                            <Button onClick={async () => { await AuthService.logout(); window.location.assign("/login"); }}>Cerrar sesión</Button>
                        </Box>
                    </>}
                </Paper>
            </Box>}
    </Selection.Provider>;
}
