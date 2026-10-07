import { useState, useEffect, useCallback } from "react";
import { ProductService } from "../services/products.service";
import { Product, PaginatedResponse, Params, CreateProduct, UpdateProduct } from "../types/productsTypes";
import { ColorService } from "../services/colors.service";
import { SizeService } from "../services/sizes.service";
import { Color, CreateColor } from "../types/colorsTypes";
import { Size, CreateSize } from "../types/sizesTypes";
import { ProductsVariantService } from "../services/productsVariant.service";
import { ProductsVariantImageService } from "../services/productsVariantImage.service";
import { CreateProductsVariant, ProductsVariant, UpdateProductsVariant } from "../types/productsVariantTypes";
import { CategoryService } from "@/features/categories/services/categories.service";
import { Category } from "@/features/categories/types/categoriesTypes";

// ─── useProducts ───────────────────────────────────────────────────────────────

export function useProducts({ limit, offset, search }: Params = {}) {
    const [data, setData]       = useState<PaginatedResponse<Product> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await ProductService.getProducts({ limit, offset, search });
            setData(result);
        } catch (err) {
            console.error("[useProducts]", err);
            setError("Error al cargar los productos.");
        } finally {
            setLoading(false);
        }
    }, [limit, offset, search]);

    const updateRow = useCallback((id: number, changes: Partial<Product>) => {
        setData((prev) => {
            if (!prev) return prev;
            return { ...prev, results: prev.results.map((p) => p.id === id ? { ...p, ...changes } : p) };
        });
    }, []);

    useEffect(() => { load(); }, [load]);

    return { data, loading, error, refetch: load, updateRow };
}

// ─── useCreateProduct ──────────────────────────────────────────────────────────

export function useCreateProduct() {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const execute = useCallback(async (payload: CreateProduct): Promise<Product | null> => {
        setLoading(true);
        setError(null);
        try {
            return await ProductService.createProduct(payload);
        } catch (err) {
            console.error("[useCreateProduct]", err);
            setError("Error al crear el producto.");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error };
}

// ─── useUpdateProduct ──────────────────────────────────────────────────────────

export function useUpdateProduct() {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const execute = useCallback(async (id: number, payload: UpdateProduct): Promise<Product | null> => {
        setLoading(true);
        setError(null);
        try {
            return await ProductService.updateProduct(id, payload);
        } catch (err) {
            console.error("[useUpdateProduct]", err);
            setError("Error al actualizar el producto.");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error };
}

// ─── useStatusProduct ──────────────────────────────────────────────────────────

export function useStatusProduct() {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const execute = useCallback(async (id: number, isActive: boolean): Promise<Product | null> => {
        setLoading(true);
        setError(null);
        try {
            return await ProductService.statusProduct(id, isActive);
        } catch (err) {
            console.error("[useStatusProduct]", err);
            setError("Error al cambiar el estado del producto.");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error };
}

// ─── useDeleteProduct ──────────────────────────────────────────────────────────

export function useDeleteProduct() {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const execute = useCallback(async (id: number): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            await ProductService.deleteProduct(id);
            return true;
        } catch (err) {
            console.error("[useDeleteProduct]", err);
            setError("Error al eliminar el producto.");
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error };
}

// ─── useAllColors ──────────────────────────────────────────────────────────────

export function useAllColors(enabled: boolean) {
    const [data, setData]       = useState<Color[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled) return;
        setLoading(true);
        ColorService.getColors()
            .then(setData)
            .catch((err) => console.error("[useAllColors]", err))
            .finally(() => setLoading(false));
    }, [enabled]);

    return { data, loading };
}

// ─── useCreateColor ────────────────────────────────────────────────────────────

export function useCreateColor() {
    const execute = useCallback(async (payload: CreateColor): Promise<Color | null> => {
        try {
            return await ColorService.createColor(payload);
        } catch (err) {
            console.error("[useCreateColor]", err);
            return null;
        }
    }, []);
    return { execute };
}

// ─── useAllSizes ───────────────────────────────────────────────────────────────

export function useAllSizes(enabled: boolean) {
    const [data, setData]       = useState<Size[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled) return;
        setLoading(true);
        SizeService.getSizes()
            .then(setData)
            .catch((err) => console.error("[useAllSizes]", err))
            .finally(() => setLoading(false));
    }, [enabled]);

    return { data, loading };
}

// ─── useCreateSize ─────────────────────────────────────────────────────────────

export function useCreateSize() {
    const execute = useCallback(async (payload: CreateSize): Promise<Size | null> => {
        try {
            return await SizeService.createSize(payload);
        } catch (err) {
            console.error("[useCreateSize]", err);
            return null;
        }
    }, []);
    return { execute };
}

// ─── useAllCategoriesSelect ────────────────────────────────────────────────────

export function useAllCategoriesSelect(enabled: boolean) {
    const [data, setData]       = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled) return;
        setLoading(true);
        CategoryService.getAllCategories()
            .then(setData)
            .catch((err) => console.error("[useAllCategoriesSelect]", err))
            .finally(() => setLoading(false));
    }, [enabled]);

    return { data, loading };
}

// ─── useCreateProductVariant ───────────────────────────────────────────────────

export function useCreateProductVariant() {
    const execute = useCallback(async (payload: CreateProductsVariant): Promise<ProductsVariant | null> => {
        return await ProductsVariantService.createProductsVariant(payload);
    }, []);
    return { execute };
}

// ─── useUpdateProductVariant ───────────────────────────────────────────────────

export function useUpdateProductVariant() {
    const execute = useCallback(async (id: number, payload: UpdateProductsVariant): Promise<ProductsVariant | null> => {
        try {
            return await ProductsVariantService.updateProductsVariant(id, payload);
        } catch (err) {
            console.error("[useUpdateProductVariant]", err);
            return null;
        }
    }, []);
    return { execute };
}

// ─── useDeleteProductVariant ───────────────────────────────────────────────────

export function useDeleteProductVariant() {
    const execute = useCallback(async (id: number): Promise<boolean> => {
        try {
            await ProductsVariantService.deleteProductsVariant(id);
            return true;
        } catch (err) {
            console.error("[useDeleteProductVariant]", err);
            return false;
        }
    }, []);
    return { execute };
}

// ─── useCreateProductVariantImage ─────────────────────────────────────────────

export function useCreateProductVariantImage() {
    const execute = useCallback(async (variantId: number, files: File[]): Promise<boolean> => {
        try {
            await ProductsVariantImageService.createProductsVariantImage(variantId, files);
            return true;
        } catch (err) {
            console.error("[useCreateProductVariantImage]", err);
            return false;
        }
    }, []);
    return { execute };
}

// ─── useDeleteProductVariantImage ─────────────────────────────────────────────

export function useDeleteProductVariantImage() {
    const [loading, setLoading] = useState(false);

    const execute = useCallback(async (imageId: number): Promise<boolean> => {
        setLoading(true);
        try {
            await ProductsVariantImageService.deleteProductsVariantImage(imageId);
            return true;
        } catch (err) {
            console.error("[useDeleteProductVariantImage]", err);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading };
}

// ─── useSetMainProductVariantImage ─────────────────────────────────────────────

export function useSetMainProductVariantImage() {
    const [loading, setLoading] = useState(false);

    const execute = useCallback(async (imageId: number): Promise<boolean> => {
        setLoading(true);
        try {
            await ProductsVariantImageService.setMainProductVariantImage(imageId);
            return true;
        } catch (err) {
            console.error("[useSetMainProductVariantImage]", err);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading };
}
