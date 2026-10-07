import { useState, useEffect, useCallback } from "react";
import { CategoryService } from "../services/categories.service";
import { Category, PaginatedResponse, Params, CreateCategory, UpdateCategory } from "../types/categoriesTypes";

// ─── useCategories ─────────────────────────────────────────────────────────────

export function useCategories({ limit, offset, search }: Params = {}) {
    const [data, setData]       = useState<PaginatedResponse<Category> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await CategoryService.getCategories({ limit, offset, search });
            setData(result);
        } catch (err) {
            console.error("[useCategories]", err);
            setError("Error al cargar las categorías.");
        } finally {
            setLoading(false);
        }
    }, [limit, offset, search]);

    const updateRow = useCallback((id: number, changes: Partial<Category>) => {
        setData((prev) => {
            if (!prev) return prev;
            return { ...prev, results: prev.results.map((c) => c.id === id ? { ...c, ...changes } : c) };
        });
    }, []);

    useEffect(() => { load(); }, [load]);

    return { data, loading, error, refetch: load, updateRow };
}

// ─── useGetCategoryById ────────────────────────────────────────────────────────

export function useGetCategoryById(id: number | null | undefined, enabled: boolean) {
    const [prevId, setPrevId] = useState<number | null | undefined>(id);
    const [prevEnabled, setPrevEnabled] = useState<boolean>(enabled);
    const [data, setData]       = useState<Category | null>(null);
    const [loading, setLoading] = useState(enabled && !!id);
    const [error, setError]     = useState<string | null>(null);
    const [trigger, setTrigger] = useState(0);

    const refetch = useCallback(() => {
        setTrigger((t) => t + 1);
    }, []);

    if (id !== prevId || enabled !== prevEnabled) {
        setPrevId(id);
        setPrevEnabled(enabled);
        setLoading(enabled && !!id);
        if (!enabled || !id) {
            setData(null);
            setError(null);
        }
    }

    useEffect(() => {
        if (!enabled || !id) return;
        let active = true;
        setLoading(true);
        setError(null);
        CategoryService.getCategoryById(id)
            .then((res) => {
                if (active) setData(res);
            })
            .catch(() => {
                if (active) setError("Error al cargar la categoría.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [id, enabled, trigger]);

    return { data, loading, error, refetch };
}

// ─── useCreateCategory ─────────────────────────────────────────────────────────

export function useCreateCategory() {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const execute = useCallback(async (payload: CreateCategory): Promise<Category | null> => {
        setLoading(true);
        setError(null);
        try {
            return await CategoryService.createCategory(payload);
        } catch (err) {
            console.error("[useCreateCategory]", err);
            setError("Error al crear la categoría.");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error };
}

// ─── useUpdateCategory ─────────────────────────────────────────────────────────

export function useUpdateCategory() {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const execute = useCallback(async (id: number, payload: UpdateCategory): Promise<Category | null> => {
        setLoading(true);
        setError(null);
        try {
            return await CategoryService.updateCategory(id, payload);
        } catch (err) {
            console.error("[useUpdateCategory]", err);
            setError("Error al actualizar la categoría.");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error };
}

// ─── useDeleteCategory ────────────────────────────────────────────────────────

export function useDeleteCategory() {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const reset = useCallback(() => setError(null), []);

    const execute = useCallback(async (id: number): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            await CategoryService.deleteCategory(id);
            return true;
        } catch (err: unknown) {
            console.error("[useDeleteCategory]", err);
            // Extraer el mensaje específico del backend (ej: "tiene X productos activos")
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? "Error al eliminar la categoría.";
            setError(msg);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error, reset };
}

// ─── useStatusCategory ────────────────────────────────────────────────────────

export function useStatusCategory() {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const execute = useCallback(async (id: number, isActive: boolean): Promise<Category | null> => {
        setLoading(true);
        setError(null);
        try {
            return await CategoryService.statusCategory(id, isActive);
        } catch (err) {
            console.error("[useStatusCategory]", err);
            setError("Error al cambiar el estado de la categoría.");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error };
}
