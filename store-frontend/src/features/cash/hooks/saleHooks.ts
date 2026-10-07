import { useState, useCallback } from "react";
import { SaleService } from "../services/sale.service";
import type { CreateSale, Sale } from "../types/salesTypes";

export function useCreateSale() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const execute = useCallback(async (payload: CreateSale): Promise<Sale | null> => {
        setLoading(true);
        setError(null);
        try {
            return await SaleService.createSale(payload);
        } catch (err) {
            console.error("[useCreateSale]", err);
            setError("Error al crear la venta.");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error };
}

export function useCancelSale() {
    const [loading, setLoading] = useState(false);

    const execute = useCallback(async (id: number): Promise<boolean> => {
        setLoading(true);
        try {
            await SaleService.cancelSale(id);
            return true;
        } catch (err) {
            console.error("[useCancelSale]", err);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading };
}
