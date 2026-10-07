import { useState, useEffect, useCallback } from "react";
import { UserService } from "../services/users.service";
import { User, PaginatedResponse, Params, UserCreate, UserUpdate } from "../types/usersTypes";

export function useUsers({ limit, offset, search }: Params = {}) {
    const [data, setData]       = useState<PaginatedResponse<User> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await UserService.getUsers({ limit, offset, search });
            setData(result);
        } catch (err) {
            console.error("[useUsers]", err);
            setError("Error al cargar los usuarios.");
        } finally {
            setLoading(false);
        }
    }, [limit, offset, search]);

    const updateRow = useCallback((id: string, changes: Partial<User>) => {
        setData((prev) => {
            if (!prev) return prev;
            return { ...prev, results: prev.results.map((u) => u.id === id ? { ...u, ...changes } : u) };
        });
    }, []);

    useEffect(() => { load(); }, [load]);

    return { data, loading, error, refetch: load, updateRow };
}

export function useUser(id: number) {
    const [data, setData]       = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    const load = useCallback(async () => {
        if (id <= 0) return;
        setLoading(true);
        setError(null);
        try {
            const result = await UserService.getUser(id);
            setData(result);
        } catch (err) {
            console.error("[useUser]", err);
            setError("Error al cargar el usuario.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    return { data, loading, error, refetch: load };
}

// Hook para obtener un usuario por ID de forma condicional (para dialogs de edición)
export function useGetUserById(id: number | null | undefined, enabled: boolean) {
    const [data, setData]       = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    useEffect(() => {
        if (!enabled || !id) { setData(null); setError(null); return; }
        setLoading(true);
        setError(null);
        UserService.getUser(id)
            .then(setData)
            .catch(() => setError("Error al cargar el usuario."))
            .finally(() => setLoading(false));
    }, [id, enabled]);

    return { data, loading, error };
}

export function useCreateUser() {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const execute = useCallback(async (payload: UserCreate): Promise<User | null> => {
        setLoading(true);
        setError(null);
        try {
            return await UserService.createUser(payload);
        } catch (err) {
            console.error("[useCreateUser]", err);
            setError("Error al crear el usuario.");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error };
}

export function useUpdateUser() {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);
    const execute = useCallback(async (id: number, payload: UserUpdate): Promise<User | null> => {
        setLoading(true);
        setError(null);
        try {
            return await UserService.updateUser(id, payload);
        } catch (err) {
            console.error("[useUpdateUser]", err);
            setError("Error al actualizar el usuario.");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error };
}

export function useStatusUser() {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const execute = useCallback(async (id: number, isActive: boolean): Promise<User | null> => {
        setLoading(true);
        setError(null);
        try {
            return await UserService.statusUser(id, isActive);
        } catch (err) {
            console.error("[useStatusUser]", err);
            setError("Error al cambiar el estado del usuario.");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error };
}

export function useDeleteUser() {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const execute = useCallback(async (id: number): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            await UserService.deleteUser(id);
            return true;
        } catch (err) {
            console.error("[useDeleteUser]", err);
            setError("Error al eliminar el usuario.");
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error };
}

export function useAdminChangePassword() {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const execute = useCallback(async (id: number, newPassword: string): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            await UserService.adminChangePassword(id, newPassword);
            return true;
        } catch (err) {
            console.error("[useAdminChangePassword]", err);
            setError("Error al cambiar la contraseña.");
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error };
}