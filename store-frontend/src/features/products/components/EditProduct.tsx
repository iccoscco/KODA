'use client';

import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormHelperText,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import {
    useUpdateProduct,
    useAllCategoriesSelect,
    useAllColors, useCreateColor,
    useAllSizes, useCreateSize,
    useUpdateProductVariant,
    useCreateProductVariant,
    useCreateProductVariantImage,
    useDeleteProductVariant,
    useSetMainProductVariantImage,
} from "../hooks/productsHooks";
import { ProductService } from "../services/products.service";
import { ProductsVariantImageService } from "../services/productsVariantImage.service";
import { Product } from "../types/productsTypes";
import { CreateProductsVariant, UpdateProductsVariant } from "../types/productsVariantTypes";
import { Color } from "../types/colorsTypes";
import { Size } from "../types/sizesTypes";
import { toMediaUrl } from "@/shared/utils/mediaUrl";
import {
    ImageLightbox,
    VariantAddMoreImagesButton,
    VariantImageThumb,
    VariantPrimaryImageDropSlot,
    VARIANT_PRIMARY_IMAGE_SIZE,
} from "./variantImageUi";
import { NumericField } from "@/shared/components/NumericField";

// ─── Image URL helper ──────────────────────────────────────────────────────────
const imgUrl = (path: string) => toMediaUrl(path);

// ─── Per-variant edit state ────────────────────────────────────────────────────
interface VariantEdit {
    selectedColorId: number | null;
    showNewColor: boolean;
    newColorName: string;
    newColorHex: string;
    selectedSizeId: number | null;
    showNewSize: boolean;
    newSizeName: string;
    stock: string;
    minStock: string;
    sku: string;
    /** Vacío = hereda del producto; con número = override específico de la variante. */
    salePrice: string;
    /** Vacío = hereda del producto; con número = override específico de la variante. */
    purchasePrice: string;
}

interface Props {
    open: boolean;
    product: Product | null;
    onClose: () => void;
    onSuccess: () => void;
}

type FormErrors = Record<string, string>;

/** Bloquea teclas que permiten valores negativos o notación científica en inputs numéricos */
const blockNegativeKeys = (e: React.KeyboardEvent) => {
    if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault();
};
/** Igual que blockNegativeKeys pero también bloquea el punto (para campos enteros) */
const blockNonIntegerKeys = (e: React.KeyboardEvent) => {
    if (["-", "e", "E", "+", "."].includes(e.key)) e.preventDefault();
};

function SectionTitle({ children, sx }: { children: React.ReactNode; sx?: object }) {
    return (
        <Typography
            variant="overline"
            sx={{
                color: "primary.main",
                fontWeight: 700,
                letterSpacing: "0.14em",
                display: "block",
                mb: 1.25,
                lineHeight: 1.4,
                ...sx,
            }}
        >
            {children}
        </Typography>
    );
}

function newDraftRowId(): string {
    return typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `nd-${Date.now()}-${Math.random()}`;
}

/** Borradores de variantes nuevas (se persisten al pulsar Guardar cambios). */
interface VariantDraft {
    rowId: string;
    selectedColor: Color | null;
    showNewColor: boolean;
    newColorName: string;
    newColorHex: string;
    selectedSize: Size | null;
    showNewSize: boolean;
    newSizeName: string;
    stock: string;
    minStock: string;
    sku: string;
    /** Vacío = hereda del producto. */
    salePrice: string;
    /** Vacío = hereda del producto. */
    purchasePrice: string;
    imageFiles: File[];
    imagePreviews: { url: string; name: string }[];
}

function emptyVariantDraft(): VariantDraft {
    return {
        rowId: newDraftRowId(),
        selectedColor: null,
        showNewColor: false,
        newColorName: "",
        newColorHex: "#3b82f6",
        selectedSize: null,
        showNewSize: false,
        newSizeName: "",
        stock: "0",
        minStock: "0",
        sku: "",
        salePrice: "",
        purchasePrice: "",
        imageFiles: [],
        imagePreviews: [],
    };
}

function isSkippableVariantDraft(vd: VariantDraft): boolean {
    return (
        !vd.sku.trim() &&
        vd.stock.trim() === "" &&
        vd.imageFiles.length === 0 &&
        !vd.selectedColor &&
        !vd.selectedSize &&
        !vd.showNewColor &&
        !vd.showNewSize
    );
}



export default function EditProduct({ open, product, onClose, onSuccess }: Props) {
    const theme = useTheme();

    // ── Hooks ──────────────────────────────────────────────────────────────────
    const { execute: updateProduct } = useUpdateProduct();
    const { execute: updateVariant } = useUpdateProductVariant();
    const { execute: deleteVariantById } = useDeleteProductVariant();
    const { execute: createVariant } = useCreateProductVariant();
    const { execute: uploadImages } = useCreateProductVariantImage();
    const { execute: setMainVariantImage, loading: settingMainImage } = useSetMainProductVariantImage();
    const { execute: createColor } = useCreateColor();
    const { execute: createSize } = useCreateSize();

    const { data: categories, loading: catsLoading } = useAllCategoriesSelect(open);
    const { data: colors, loading: colorsLoading } = useAllColors(open);
    const { data: sizes, loading: sizesLoading } = useAllSizes(open);

    // ── Fresh product state ────────────────────────────────────────────────────
    const [productDetail, setProductDetail] = useState<Product | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // ── Product fields ─────────────────────────────────────────────────────────
    const [name, setName] = useState("");
    const [purchasePrice, setPurchasePrice] = useState("");
    const [salePrice, setSalePrice] = useState("");
    const [minStock, setMinStock] = useState("");
    const [categoryId, setCategoryId] = useState<number | "">("");
    const [errors, setErrors] = useState<FormErrors>({});

    // ── Variant edits (per variantId) ──────────────────────────────────────────
    const [variantEdits, setVariantEdits] = useState<Record<number, VariantEdit>>({});

    // ── Image management ───────────────────────────────────────────────────────
    const [pendingDeleteImageIds, setPendingDeleteImageIds] = useState<number[]>([]);
    /** Archivos nuevos por variante (se suben al guardar). */
    const [pendingUploadsByVariant, setPendingUploadsByVariant] = useState<
        Record<number, { files: File[]; previews: { url: string; name: string }[] }>
    >({});
    const variantImagePickerRef = useRef<HTMLInputElement>(null);
    const pendingPickerVariantIdRef = useRef<number | null>(null);

    const [activeImageEdit, setActiveImageEdit] = useState<{
        type: "existing" | "draft";
        id?: number;
        rowId?: string;
    } | null>(null);

    const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>([]);
    /** Confirmación antes de desactivar una variante (DELETE API). */
    const [variantIdPendingDelete, setVariantIdPendingDelete] = useState<number | null>(null);
    const [deletingVariant, setDeletingVariant] = useState(false);

    // ── Submit state ───────────────────────────────────────────────────────────
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [imageLightbox, setImageLightbox] = useState<{ src: string; alt: string } | null>(null);



    // ── Fetch product by ID ────────────────────────────────────────────────────
    const loadProduct = async (id: number) => {
        setLoadingDetail(true);
        try {
            const fresh = await ProductService.getProduct(id);
            setProductDetail(fresh);
            setPendingUploadsByVariant({});

            // Pre-fill product fields
            setName(fresh.name);
            setPurchasePrice(String(fresh.purchasePrice));
            setSalePrice(String(fresh.salePrice));
            setMinStock(String(fresh.minStock));
            setCategoryId(fresh.categoryId);

            // Init variant edit states (solo variantes activas en la UI)
            const edits: Record<number, VariantEdit> = {};
            fresh.variants.filter((v) => v.isActive !== false).forEach((v) => {
                edits[v.id] = {
                    selectedColorId: v.colorId ?? null,
                    showNewColor: false,
                    newColorName: "",
                    newColorHex: "#3b82f6",
                    selectedSizeId: v.sizeId ?? null,
                    showNewSize: false,
                    newSizeName: "",
                    stock: String(v.stock),
                    minStock: v.minStock != null ? String(v.minStock) : "0",
                    sku: v.sku ?? "",
                    salePrice: v.salePrice != null ? String(v.salePrice) : "",
                    purchasePrice: v.purchasePrice != null ? String(v.purchasePrice) : "",
                };
            });
            setVariantEdits(edits);

            setVariantDrafts([]);
        } catch (err) {
            console.error("[EditProduct] load", err);
        } finally {
            setLoadingDetail(false);
        }
    };

    useEffect(() => {
        if (!open || !product?.id) return;
        setErrors({});
        setSubmitError(null);
        setPendingDeleteImageIds([]);
        setPendingUploadsByVariant({});
        setActiveImageEdit(null);
        loadProduct(product.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, product?.id]);

    const handleClose = () => {
        (document.activeElement as HTMLElement)?.blur();
        setActiveImageEdit(null);
        queueMicrotask(() => {
            onClose();
        });
    };

    // ── Variant edit helper ────────────────────────────────────────────────────
    const setVEdit = (variantId: number, changes: Partial<VariantEdit>) =>
        setVariantEdits((prev) => ({ ...prev, [variantId]: { ...prev[variantId], ...changes } }));

    // ── Deferred image deletion ────────────────────────────────────────────────
    const markForDeletion = (imageId: number) =>
        setPendingDeleteImageIds((prev) => [...prev, imageId]);

    const appendPendingVariantImages = (variantId: number, files: File[]) => {
        const imageFiles = files.filter((f) => f.type.startsWith("image/"));
        if (!imageFiles.length) return;
        setPendingUploadsByVariant((prev) => {
            const cur = prev[variantId] ?? { files: [], previews: [] };
            const addPreviews = imageFiles.map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
            return {
                ...prev,
                [variantId]: {
                    files: [...cur.files, ...imageFiles],
                    previews: [...cur.previews, ...addPreviews],
                },
            };
        });
    };

    const handleVariantImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const variantId = pendingPickerVariantIdRef.current;
        pendingPickerVariantIdRef.current = null;
        const files = Array.from(e.target.files ?? []);
        if (variantImagePickerRef.current) variantImagePickerRef.current.value = "";
        if (variantId == null || !files.length) return;
        appendPendingVariantImages(variantId, files);
    };

    const makePendingImageMain = (variantId: number, index: number) => {
        if (index === 0) return;
        setPendingUploadsByVariant((prev) => {
            const cur = prev[variantId];
            if (!cur) return prev;
            const files = [...cur.files];
            const previews = [...cur.previews];
            [files[0], files[index]] = [files[index], files[0]];
            [previews[0], previews[index]] = [previews[index], previews[0]];
            return { ...prev, [variantId]: { files, previews } };
        });
    };

    const removePendingVariantImageAt = (variantId: number, index: number) => {
        setPendingUploadsByVariant((prev) => {
            const cur = prev[variantId];
            if (!cur) return prev;
            const removed = cur.previews[index];
            if (removed?.url?.startsWith("blob:")) URL.revokeObjectURL(removed.url);
            const nextFiles = cur.files.filter((_, i) => i !== index);
            const nextPreviews = cur.previews.filter((_, i) => i !== index);
            const next = { ...prev };
            if (nextFiles.length === 0) delete next[variantId];
            else next[variantId] = { files: nextFiles, previews: nextPreviews };
            return next;
        });
    };

    const setDraft = (rowId: string, patch: Partial<VariantDraft>) => {
        setVariantDrafts((prev) => prev.map((v) => (v.rowId === rowId ? { ...v, ...patch } : v)));
    };

    const addVariantDraftRow = () => setVariantDrafts((prev) => [...prev, emptyVariantDraft()]);

    const removeVariantDraftRow = (rowId: string) => {
        setVariantDrafts((prev) => {
            const row = prev.find((v) => v.rowId === rowId);
            row?.imagePreviews.forEach((p) => {
                if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
            });
            return prev.filter((v) => v.rowId !== rowId);
        });
    };

    const appendDraftImages = (rowId: string, files: File[]) => {
        const imageFiles = files.filter((f) => f.type.startsWith("image/"));
        if (!imageFiles.length) return;
        const previews = imageFiles.map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
        setVariantDrafts((prev) => prev.map((v) => {
            if (v.rowId !== rowId) return v;
            return {
                ...v,
                imageFiles: [...v.imageFiles, ...imageFiles],
                imagePreviews: [...v.imagePreviews, ...previews],
            };
        }));
    };

    const handleDraftImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target;
        const prefix = "draft-file-";
        const rowId = input.id.startsWith(prefix) ? input.id.slice(prefix.length) : null;
        const files = Array.from(input.files ?? []);
        input.value = "";
        if (!rowId || !files.length) return;
        appendDraftImages(rowId, files);
    };

    const removeDraftImageAt = (rowId: string, index: number) => {
        setVariantDrafts((prev) => prev.map((v) => {
            if (v.rowId !== rowId) return v;
            const removed = v.imagePreviews[index];
            if (removed?.url.startsWith("blob:")) URL.revokeObjectURL(removed.url);
            return {
                ...v,
                imageFiles: v.imageFiles.filter((_, i) => i !== index),
                imagePreviews: v.imagePreviews.filter((_, i) => i !== index),
            };
        }));
    };

    const makeDraftImageMain = (rowId: string, index: number) => {
        if (index === 0) return;
        setVariantDrafts((prev) => prev.map((v) => {
            if (v.rowId !== rowId) return v;
            const files = [...v.imageFiles];
            const previews = [...v.imagePreviews];
            [files[0], files[index]] = [files[index], files[0]];
            [previews[0], previews[index]] = [previews[index], previews[0]];
            return { ...v, imageFiles: files, imagePreviews: previews };
        }));
    };

    const handleServerImageSetMain = async (imageId: number) => {
        const ok = await setMainVariantImage(imageId);
        if (!ok) return;
        setProductDetail((prev) => {
            if (!prev) return prev;
            let targetVariantId: number | null = null;
            for (const vv of prev.variants) {
                if (vv.images.some((im) => im.id === imageId)) {
                    targetVariantId = vv.id;
                    break;
                }
            }
            if (targetVariantId == null) return prev;
            return {
                ...prev,
                variants: prev.variants.map((vv) => {
                    if (vv.id !== targetVariantId) return vv;
                    const nextImages = vv.images
                        .map((im) => ({ ...im, isMain: im.id === imageId }))
                        .sort((a, b) => {
                            if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
                            return a.id - b.id;
                        });
                    return { ...vv, images: nextImages };
                }),
            };
        });
    };

    const resolveDraftColorId = async (vd: VariantDraft): Promise<number | undefined> => {
        if (vd.showNewColor) {
            if (!vd.newColorName.trim()) return undefined;
            const color = await createColor({ name: vd.newColorName.trim(), hexCode: vd.newColorHex });
            if (!color) throw new Error("color");
            return color.id;
        }
        if (vd.selectedColor) return vd.selectedColor.id;
        return undefined;
    };

    const resolveDraftSizeId = async (vd: VariantDraft): Promise<number | undefined> => {
        if (vd.showNewSize) {
            if (!vd.newSizeName.trim()) return undefined;
            const size = await createSize({ name: vd.newSizeName.trim() });
            if (!size) throw new Error("size");
            return size.id;
        }
        if (vd.selectedSize) return vd.selectedSize.id;
        return undefined;
    };

    const activeVariants = useMemo(
        () => (productDetail?.variants ?? []).filter((v) => v.isActive !== false),
        [productDetail],
    );

    const getVariantMainImage = (vId: number) => {
        const v = activeVariants.find((vv) => vv.id === vId);
        if (!v) return null;
        const visible = v.images.filter((img) => !pendingDeleteImageIds.includes(img.id));
        const serverHero = visible.find((img) => img.isMain) || visible[0];
        if (serverHero) return imgUrl(serverHero.url);
        const pending = pendingUploadsByVariant[vId];
        if (pending?.previews?.length) return pending.previews[0].url;
        return null;
    };

    const getDraftMainImage = (vd: VariantDraft) => {
        if (vd.imagePreviews.length > 0) return vd.imagePreviews[0].url;
        return null;
    };

    const handleConfirmDeleteVariant = async () => {
        if (variantIdPendingDelete == null || !product?.id || !productDetail) return;
        const vid = variantIdPendingDelete;
        const removed = productDetail.variants.find((v) => v.id === vid);
        const imageIdsFromVariant = removed?.images.map((img) => img.id) ?? [];
        setDeletingVariant(true);
        setSubmitError(null);
        try {
            const ok = await deleteVariantById(vid);
            if (!ok) {
                setSubmitError("No se pudo eliminar la variante.");
                return;
            }
            setVariantIdPendingDelete(null);
            setPendingDeleteImageIds((prev) => prev.filter((id) => !imageIdsFromVariant.includes(id)));
            setPendingUploadsByVariant((prev) => {
                const next = { ...prev };
                delete next[vid];
                return next;
            });
            await loadProduct(product.id);
        } finally {
            setDeletingVariant(false);
        }
    };

    // ── Validation ─────────────────────────────────────────────────────────────
    const validate = (): boolean => {
        const errs: FormErrors = {};
        if (!name.trim()) errs.name = "Requerido";
        if (!purchasePrice || Number(purchasePrice) <= 0) errs.purchasePrice = "Ingresa un precio válido";
        if (!salePrice || Number(salePrice) <= 0) errs.salePrice = "Ingresa un precio válido";
        if (!minStock || Number(minStock) < 0) errs.minStock = "Requerido";
        if (!categoryId) errs.categoryId = "Requerido";

        // Unicidad de combinaciones
        const combinations = new Set<string>();

        // 1. Agregar y validar variantes existentes activas
        activeVariants.forEach((v) => {
            const edit = variantEdits[v.id];
            if (!edit) return;

            let currentStock = edit.stock.trim();
            if (currentStock === "") {
                currentStock = "0";
                setVEdit(v.id, { stock: "0" });
            }

            const colorKey = edit.showNewColor
                ? `newcolor:${edit.newColorName.trim().toLowerCase()}`
                : (edit.selectedColorId ? String(edit.selectedColorId) : "null");

            const sizeKey = edit.showNewSize
                ? `newsize:${edit.newSizeName.trim().toLowerCase()}`
                : (edit.selectedSizeId ? String(edit.selectedSizeId) : "null");

            const sig = `${colorKey}_${sizeKey}`;
            if (combinations.has(sig)) {
                errs[`v_${v.id}_combination`] = "Esta combinación de color y talla ya existe en este producto.";
            } else {
                combinations.add(sig);
            }
        });

        // 2. Agregar y validar variantes borrador
        variantDrafts.forEach((vd, i) => {
            if (isSkippableVariantDraft(vd)) return;
            const p = `nd${i}`;
            let currentStock = vd.stock.trim();
            if (currentStock === "") {
                currentStock = "0";
                setDraft(vd.rowId, { stock: "0" });
            }
            if (vd.showNewColor && !vd.newColorName.trim()) errs[`${p}_newColorName`] = "Ingresa el nombre del color";
            if (vd.showNewSize && !vd.newSizeName.trim()) errs[`${p}_newSizeName`] = "Ingresa el nombre de la talla";
            if (Number(currentStock) < 0) errs[`${p}_stock`] = "Requerido";

            const colorKey = vd.showNewColor
                ? `newcolor:${vd.newColorName.trim().toLowerCase()}`
                : (vd.selectedColor ? String(vd.selectedColor.id) : "null");

            const sizeKey = vd.showNewSize
                ? `newsize:${vd.newSizeName.trim().toLowerCase()}`
                : (vd.selectedSize ? String(vd.selectedSize.id) : "null");

            const sig = `${colorKey}_${sizeKey}`;
            if (combinations.has(sig)) {
                errs[`${p}_combination`] = "Esta combinación de color y talla ya existe (o está repetida).";
            } else {
                combinations.add(sig);
            }
        });

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!product || !productDetail || !validate()) return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            // 1 ─ Update product fields
            await updateProduct(product.id, {
                name: name.trim(),
                purchasePrice: parseFloat(purchasePrice),
                salePrice: parseFloat(salePrice),
                isFeatured: productDetail.isFeatured,
                categoryId: categoryId as number,
                minStock: parseInt(minStock, 10),
            });

            // 2 ─ Update each variant if color / size / stock / sku changed
            for (const v of activeVariants) {
                const edit = variantEdits[v.id];
                if (!edit) continue;

                let resolvedColorId: number | undefined;
                if (edit.showNewColor && edit.newColorName.trim()) {
                    const c = await createColor({ name: edit.newColorName.trim(), hexCode: edit.newColorHex });
                    if (!c) throw new Error("Error al crear el color");
                    resolvedColorId = c.id;
                } else if (edit.selectedColorId != null) {
                    resolvedColorId = edit.selectedColorId;
                }

                let resolvedSizeId: number | undefined;
                if (edit.showNewSize && edit.newSizeName.trim()) {
                    const s = await createSize({ name: edit.newSizeName.trim() });
                    if (!s) throw new Error("Error al crear la talla");
                    resolvedSizeId = s.id;
                } else if (edit.selectedSizeId != null) {
                    resolvedSizeId = edit.selectedSizeId;
                }

                const stockVal = parseInt(edit.stock, 10) || 0;
                const skuVal = edit.sku.trim();
                const prevSku = (v.sku ?? "").trim();
                const prevColor = v.colorId ?? null;
                const prevSize = v.sizeId ?? null;
                const nextColor = resolvedColorId ?? null;
                const nextSize = resolvedSizeId ?? null;

                const salePriceVal: number | null = edit.salePrice.trim() !== ""
                    ? (Number.isFinite(Number(edit.salePrice)) ? Number(edit.salePrice) : null)
                    : null;
                const purchasePriceVal: number | null = edit.purchasePrice.trim() !== ""
                    ? (Number.isFinite(Number(edit.purchasePrice)) ? Number(edit.purchasePrice) : null)
                    : null;
                const prevSalePrice: number | null = v.salePrice != null ? Number(v.salePrice) : null;
                const prevPurchasePrice: number | null = v.purchasePrice != null ? Number(v.purchasePrice) : null;

                const changed =
                    nextColor !== prevColor ||
                    nextSize !== prevSize ||
                    stockVal !== v.stock ||
                    skuVal !== prevSku ||
                    salePriceVal !== prevSalePrice ||
                    purchasePriceVal !== prevPurchasePrice;

                const minStockVal = edit.minStock.trim() !== "" ? parseInt(edit.minStock, 10) : 0;
                if (changed || minStockVal !== (v.minStock ?? 0)) {
                    const updatePayload: UpdateProductsVariant = {
                        stock: stockVal,
                        minStock: minStockVal,
                        salePrice: salePriceVal,
                        purchasePrice: purchasePriceVal,
                        colorId: resolvedColorId !== undefined ? resolvedColorId : (edit.selectedColorId ?? null),
                        sizeId: resolvedSizeId !== undefined ? resolvedSizeId : (edit.selectedSizeId ?? null),
                    };
                    if (skuVal !== "") updatePayload.sku = skuVal;
                    await updateVariant(v.id, updatePayload);
                }
            }

            // 3 ─ Delete pending images
            for (const imgId of pendingDeleteImageIds) {
                await ProductsVariantImageService.deleteProductsVariantImage(imgId);
            }

            // 4 ─ Upload new images (cada variante su propia lista)
            for (const v of activeVariants) {
                const pending = pendingUploadsByVariant[v.id];
                if (pending?.files.length) {
                    await uploadImages(v.id, pending.files);
                }
            }

            // 5 ─ Crear variantes nuevas desde borradores (solo las completas; vacías se omiten)
            for (const vd of variantDrafts) {
                if (isSkippableVariantDraft(vd)) continue;
                const colorId = await resolveDraftColorId(vd);
                const sizeId = await resolveDraftSizeId(vd);
                const payload: CreateProductsVariant = {
                    productId: productDetail.id,
                    stock: parseInt(vd.stock, 10),
                    minStock: vd.minStock.trim() !== "" ? parseInt(vd.minStock, 10) : 0,
                };
                const draftSku = vd.sku.trim();
                if (draftSku !== "") payload.sku = draftSku;
                if (colorId !== undefined) payload.colorId = colorId;
                if (sizeId !== undefined) payload.sizeId = sizeId;
                if (vd.salePrice.trim() !== "") {
                    const sp = parseFloat(vd.salePrice);
                    if (Number.isFinite(sp) && sp >= 0) payload.salePrice = sp;
                }
                if (vd.purchasePrice.trim() !== "") {
                    const pp = parseFloat(vd.purchasePrice);
                    if (Number.isFinite(pp) && pp >= 0) payload.purchasePrice = pp;
                }
                const created = await createVariant(payload);
                if (!created) throw new Error("variant");
                if (vd.imageFiles.length > 0) {
                    await uploadImages(created.id, vd.imageFiles);
                }
            }

            setVariantDrafts([]);
            onSuccess();
            handleClose();
        } catch (err: any) {
            console.error("[EditProduct] submit", err);
            const msg = err?.response?.data?.message || err?.message || "";
            if (msg.includes("Ya existe una variante activa")) {
                setSubmitError("Ya existe una variante activa con esa combinación de color y talla en este producto.");
            } else {
                setSubmitError("Ocurrió un error al guardar. Verifica los datos e intenta de nuevo.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const isBusy = submitting || loadingDetail || deletingVariant;
    const imageThumbMainBusy = isBusy || settingMainImage;

    const variantCardBg =
        theme.palette.mode === "dark"
            ? alpha(theme.palette.common.white, 0.04)
            : alpha(theme.palette.common.black, 0.03);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="lg"
                fullWidth
                closeAfterTransition={false}
                disableRestoreFocus
                slotProps={{
                    paper: {
                        sx: {
                            m: { xs: 2, sm: 3 },
                            maxHeight: { xs: "calc(100vh - 32px)", sm: "calc(100vh - 48px)" },
                            display: "flex",
                            flexDirection: "column",
                            borderRadius: 2,
                        },
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        pr: 1,
                        py: 2,
                        px: { xs: 1.5, sm: 3 },
                        borderBottom: 1,
                        borderColor: "divider",
                        flexShrink: 0,
                    }}
                >
                    <Typography
                        component="span"
                        variant="h6"
                        fontWeight={800}
                        letterSpacing="0.06em"
                        sx={{ color: "primary.main", fontSize: { xs: "1rem", sm: "1.25rem" }, pr: 1 }}
                    >
                        Editar producto
                    </Typography>
                    <IconButton size="small" onClick={handleClose} disabled={isBusy} aria-label="Cerrar">
                        <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent
                    dividers
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0,
                        pt: 2.5,
                        px: { xs: 1.5, sm: 3 },
                        overflowX: "hidden",
                        flex: 1,
                        minHeight: 0,
                    }}
                >
                    {submitError && <Alert severity="error" sx={{ mb: 2.5 }}>{submitError}</Alert>}

                    {loadingDetail ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                                    gap: { xs: 2.5, md: 4 },
                                    alignItems: "start",
                                    mb: 1,
                                }}
                            >
                                <Stack spacing={2}>
                                    <Box>
                                        <SectionTitle>Información básica</SectionTitle>
                                        <TextField
                                            label="Nombre del producto"
                                            placeholder="Ej. Polera básica algodón"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            fullWidth
                                            size="small"
                                            required
                                            error={!!errors.name}
                                            helperText={errors.name}
                                        />
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                                            Los cambios del producto y de cada variante se aplican al pulsar «Guardar cambios».
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <SectionTitle>Stock mínimo (producto)</SectionTitle>
                                        <NumericField
                                            label="Stock mínimo"
                                            value={minStock}
                                            onChange={(e) => setMinStock(e.target.value)}
                                            size="small"
                                            required
                                            allowDecimals={false}
                                            sx={{ width: "100%", maxWidth: { sm: 280 } }}
                                            error={!!errors.minStock}
                                            helperText={errors.minStock ?? "Alerta cuando el inventario total del producto esté bajo este umbral."}
                                            slotProps={{
                                                htmlInput: { min: 0 },
                                            }}
                                        />
                                    </Box>
                                </Stack>

                                <Stack spacing={2}>
                                    <Box>
                                        <SectionTitle>Categoría</SectionTitle>
                                        <FormControl fullWidth size="small" required error={!!errors.categoryId}>
                                            <Autocomplete
                                                value={categories.find((c) => c.id === categoryId) ?? null}
                                                options={categories}
                                                getOptionLabel={(option) => option.name}
                                                getOptionKey={(option) => option.id}
                                                renderInput={(params) => (
                                                    <TextField {...params} label="Elegir categoría" placeholder="Buscar…" />
                                                )}
                                                onChange={(_, value) => setCategoryId(value?.id ?? "")}
                                                loading={catsLoading}
                                            />
                                            {errors.categoryId && <FormHelperText>{errors.categoryId}</FormHelperText>}
                                        </FormControl>
                                    </Box>
                                    <Box>
                                        <SectionTitle>Precios</SectionTitle>
                                        <Stack spacing={2}>
                                            <NumericField
                                                label="Precio de compra"
                                                value={purchasePrice}
                                                onChange={(e) => setPurchasePrice(e.target.value)}
                                                fullWidth
                                                size="small"
                                                required
                                                allowDecimals={true}
                                                slotProps={{
                                                    input: {
                                                        startAdornment: <InputAdornment position="start">S/</InputAdornment>,
                                                    },
                                                    htmlInput: { min: 0.01, step: 0.01 },
                                                }}
                                                error={!!errors.purchasePrice}
                                                helperText={errors.purchasePrice}
                                            />
                                            <NumericField
                                                label="Precio de venta"
                                                value={salePrice}
                                                onChange={(e) => setSalePrice(e.target.value)}
                                                fullWidth
                                                size="small"
                                                required
                                                allowDecimals={true}
                                                slotProps={{
                                                    input: {
                                                        startAdornment: <InputAdornment position="start">S/</InputAdornment>,
                                                    },
                                                    htmlInput: { min: 0.01, step: 0.01 },
                                                }}
                                                error={!!errors.salePrice}
                                                helperText={errors.salePrice}
                                            />
                                        </Stack>
                                    </Box>
                                </Stack>
                            </Box>

                            <Divider sx={{ my: 3 }} />

                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    justifyContent: "space-between",
                                    gap: 2,
                                    flexWrap: "wrap",
                                    flexDirection: { xs: "column", sm: "row" },
                                    mb: 1.5,
                                }}
                            >
                                <Box sx={{ minWidth: 0, flex: { sm: 1 } }}>
                                    <SectionTitle sx={{ mb: 0.5 }}>Variantes</SectionTitle>
                                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
                                        Edita variantes existentes o añade borradores con «Agregar variante». Las filas vacías se ignoran; las que tengan{" "}
                                        <strong>stock</strong> se crean al guardar. El SKU es opcional.
                                    </Typography>
                                </Box>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AddRoundedIcon />}
                                    onClick={addVariantDraftRow}
                                    disabled={isBusy}
                                    sx={{
                                        flexShrink: 0,
                                        alignSelf: { xs: "stretch", sm: "auto" },
                                        borderColor: "primary.main",
                                        color: "primary.main",
                                        fontWeight: 700,
                                    }}
                                >
                                    Agregar variante
                                </Button>
                            </Box>

                            <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: "none", md: "block" }, mb: 3, border: "1px solid", borderColor: "divider", borderRadius: 2, overflowX: "auto" }}>
                                <Table size="small" sx={{ minWidth: 1000 }}>
                                    <TableHead sx={{ bgcolor: (t) => t.palette.mode === "dark" ? alpha(t.palette.common.white, 0.02) : alpha(t.palette.common.black, 0.015) }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700, width: 70 }}>Imagen</TableCell>
                                            <TableCell sx={{ fontWeight: 700, width: 180 }}>Color</TableCell>
                                            <TableCell sx={{ fontWeight: 700, width: 140 }}>Talla</TableCell>
                                            <TableCell sx={{ fontWeight: 700, width: 120 }}>SKU</TableCell>
                                            <TableCell sx={{ fontWeight: 700, width: 80 }}>Stock</TableCell>
                                            <TableCell sx={{ fontWeight: 700, width: 85 }}>Min. Stock</TableCell>
                                            <TableCell sx={{ fontWeight: 700, width: 120 }}>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                    P. Compra
                                                    <Tooltip title="Si se deja vacío, se utilizará el precio de compra base del producto (referencial).">
                                                        <InfoRoundedIcon sx={{ fontSize: "0.95rem", color: "text.secondary", cursor: "help" }} />
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, width: 120 }}>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                    P. Venta
                                                    <Tooltip title="Si se deja vacío, se utilizará el precio de venta base del producto (referencial).">
                                                        <InfoRoundedIcon sx={{ fontSize: "0.95rem", color: "text.secondary", cursor: "help" }} />
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, width: 60 }} align="center">Acción</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {activeVariants.length === 0 && variantDrafts.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        No hay variantes. Pulsa «Agregar variante» para comenzar.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {/* Existing Active Variants */}
                                        {activeVariants.map((v) => {
                                            const edit = variantEdits[v.id];
                                            if (!edit) return null;

                                            const visible = v.images.filter((img) => !pendingDeleteImageIds.includes(img.id));
                                            const pending = pendingUploadsByVariant[v.id];
                                            const totalImgCount = visible.length + (pending?.files?.length ?? 0);
                                            const mainImgSrc = getVariantMainImage(v.id);

                                            return (
                                                <Fragment key={v.id}>
                                                    <TableRow hover>
                                                        {/* Cell: Thumbnail */}
                                                        <TableCell>
                                                            <Tooltip title="Gestionar imágenes">
                                                                <Box
                                                                    onClick={() => setActiveImageEdit({ type: "existing", id: v.id })}
                                                                    sx={{
                                                                        width: 44,
                                                                        height: 44,
                                                                        borderRadius: 1,
                                                                        border: "1px solid",
                                                                        borderColor: "divider",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                        position: "relative",
                                                                        cursor: "pointer",
                                                                        bgcolor: "action.hover",
                                                                        overflow: "hidden",
                                                                        transition: "all 0.2s",
                                                                        "&:hover": {
                                                                            borderColor: "primary.main",
                                                                            boxShadow: 2,
                                                                        }
                                                                    }}
                                                                >
                                                                    {mainImgSrc ? (
                                                                        <Box component="img" src={mainImgSrc} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                                    ) : (
                                                                        <PhotoCameraRoundedIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                                                                    )}
                                                                    {totalImgCount > 0 && (
                                                                        <Box sx={{
                                                                            position: "absolute", bottom: -2, right: -2,
                                                                            bgcolor: "text.secondary", color: "background.paper",
                                                                            borderRadius: "50%", width: 16, height: 16,
                                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                                            fontSize: 10, fontWeight: "bold"
                                                                        }}>
                                                                            {totalImgCount}
                                                                        </Box>
                                                                    )}
                                                                </Box>
                                                            </Tooltip>
                                                        </TableCell>

                                                        {/* Cell: Color */}
                                                        <TableCell>
                                                            {!edit.showNewColor ? (
                                                                <FormControl size="small" fullWidth sx={{ minWidth: 120 }}>
                                                                    <Select
                                                                        value={edit.selectedColorId ?? ""}
                                                                        displayEmpty
                                                                        onChange={(e) => {
                                                                            const val = e.target.value as unknown;
                                                                            if (val === "new") {
                                                                                setVEdit(v.id, { showNewColor: true, selectedColorId: null });
                                                                            } else {
                                                                                setVEdit(v.id, { selectedColorId: val === "" ? null : Number(val) });
                                                                            }
                                                                        }}
                                                                        sx={{ height: 40 }}
                                                                        disabled={isBusy}
                                                                    >
                                                                        <MenuItem value="">
                                                                            <Typography variant="body2" color="text.secondary">Ninguno</Typography>
                                                                        </MenuItem>
                                                                        {colors.map((c: Color) => (
                                                                            <MenuItem key={c.id} value={c.id}>
                                                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                                                    <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: c.hexCode, border: "1px solid", borderColor: "divider", flexShrink: 0 }} />
                                                                                    <Typography variant="body2">{c.name}</Typography>
                                                                                </Box>
                                                                            </MenuItem>
                                                                        ))}
                                                                        <MenuItem value="new" sx={{ borderTop: 1, borderColor: "divider", color: "primary.main", fontWeight: "bold" }}>
                                                                            + Crear nuevo...
                                                                        </MenuItem>
                                                                    </Select>
                                                                </FormControl>
                                                            ) : (
                                                                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", minWidth: 160 }}>
                                                                    <TextField
                                                                        size="small"
                                                                        placeholder="Nombre color"
                                                                        value={edit.newColorName}
                                                                        onChange={(e) => setVEdit(v.id, { newColorName: e.target.value })}
                                                                        sx={{ flex: 1 }}
                                                                        disabled={isBusy}
                                                                    />
                                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                                        <Box
                                                                            component="input"
                                                                            type="color"
                                                                            value={edit.newColorHex}
                                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVEdit(v.id, { newColorHex: e.target.value })}
                                                                            sx={{ width: 28, height: 28, p: 0, border: "1px solid", borderColor: "divider", borderRadius: "50%", cursor: "pointer", bgcolor: "transparent" }}
                                                                            disabled={isBusy}
                                                                        />
                                                                        <IconButton
                                                                            size="small"
                                                                            color="error"
                                                                            onClick={() => setVEdit(v.id, { showNewColor: false, newColorName: "", selectedColorId: v.colorId ?? null })}
                                                                            disabled={isBusy}
                                                                        >
                                                                            <CloseRoundedIcon sx={{ fontSize: 16 }} />
                                                                        </IconButton>
                                                                    </Box>
                                                                </Box>
                                                            )}
                                                        </TableCell>

                                                        {/* Cell: Talla */}
                                                        <TableCell>
                                                            {!edit.showNewSize ? (
                                                                <FormControl size="small" fullWidth sx={{ minWidth: 100 }}>
                                                                    <Select
                                                                        value={edit.selectedSizeId ?? ""}
                                                                        displayEmpty
                                                                        onChange={(e) => {
                                                                            const val = e.target.value as unknown;
                                                                            if (val === "new") {
                                                                                setVEdit(v.id, { showNewSize: true, selectedSizeId: null });
                                                                            } else {
                                                                                setVEdit(v.id, { selectedSizeId: val === "" ? null : Number(val) });
                                                                            }
                                                                        }}
                                                                        sx={{ height: 40 }}
                                                                        disabled={isBusy}
                                                                    >
                                                                        <MenuItem value="">
                                                                            <Typography variant="body2" color="text.secondary">Ninguno</Typography>
                                                                        </MenuItem>
                                                                        {sizes.map((s: Size) => (
                                                                            <MenuItem key={s.id} value={s.id}>
                                                                                <Typography variant="body2">{s.name}</Typography>
                                                                            </MenuItem>
                                                                        ))}
                                                                        <MenuItem value="new" sx={{ borderTop: 1, borderColor: "divider", color: "primary.main", fontWeight: "bold" }}>
                                                                            + Crear nueva...
                                                                        </MenuItem>
                                                                    </Select>
                                                                </FormControl>
                                                            ) : (
                                                                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", minWidth: 140 }}>
                                                                    <TextField
                                                                        size="small"
                                                                        placeholder="Nombre talla"
                                                                        value={edit.newSizeName}
                                                                        onChange={(e) => setVEdit(v.id, { newSizeName: e.target.value })}
                                                                        sx={{ flex: 1 }}
                                                                        disabled={isBusy}
                                                                    />
                                                                    <IconButton
                                                                        size="small"
                                                                        color="error"
                                                                        onClick={() => setVEdit(v.id, { showNewSize: false, newSizeName: "", selectedSizeId: v.sizeId ?? null })}
                                                                        disabled={isBusy}
                                                                    >
                                                                        <CloseRoundedIcon sx={{ fontSize: 16 }} />
                                                                    </IconButton>
                                                                </Box>
                                                            )}
                                                        </TableCell>

                                                        {/* Cell: SKU */}
                                                        <TableCell>
                                                            <TextField
                                                                size="small"
                                                                value={edit.sku}
                                                                onChange={(e) => setVEdit(v.id, { sku: e.target.value })}
                                                                sx={{ width: 110 }}
                                                                disabled={isBusy}
                                                            />
                                                        </TableCell>

                                                        {/* Cell: Stock */}
                                                        <TableCell>
                                                            <NumericField
                                                                size="small"
                                                                value={edit.stock}
                                                                onChange={(e) => setVEdit(v.id, { stock: e.target.value })}
                                                                onBlur={(e) => {
                                                                    if (!e.target.value.trim()) {
                                                                        setVEdit(v.id, { stock: "0" });
                                                                    }
                                                                }}
                                                                allowDecimals={false}
                                                                sx={{ width: 70 }}
                                                                slotProps={{ htmlInput: { min: 0 } }}
                                                                disabled={isBusy}
                                                            />
                                                        </TableCell>

                                                        {/* Cell: Stock Mínimo */}
                                                        <TableCell>
                                                            <NumericField
                                                                size="small"
                                                                value={edit.minStock}
                                                                onChange={(e) => setVEdit(v.id, { minStock: e.target.value })}
                                                                onBlur={(e) => {
                                                                    if (!e.target.value.trim()) {
                                                                        setVEdit(v.id, { minStock: "0" });
                                                                    }
                                                                }}
                                                                allowDecimals={false}
                                                                sx={{ width: 70 }}
                                                                slotProps={{ htmlInput: { min: 0 } }}
                                                                disabled={isBusy}
                                                            />
                                                        </TableCell>

                                                        {/* Cell: Precio Compra */}
                                                        <TableCell>
                                                            <NumericField
                                                                size="small"
                                                                value={edit.purchasePrice}
                                                                onChange={(e) => setVEdit(v.id, { purchasePrice: e.target.value })}
                                                                allowDecimals={true}
                                                                sx={{ width: 95 }}
                                                                placeholder={purchasePrice || "—"}
                                                                disabled={isBusy}
                                                                slotProps={{
                                                                    input: {
                                                                        startAdornment: <InputAdornment position="start" sx={{ mr: 0.25 }}><Typography variant="caption" sx={{ fontSize: "0.75rem" }}>S/</Typography></InputAdornment>,
                                                                    },
                                                                    htmlInput: { min: 0, step: "0.01" }
                                                                }}
                                                            />
                                                        </TableCell>

                                                        {/* Cell: Precio Venta */}
                                                        <TableCell>
                                                            <NumericField
                                                                size="small"
                                                                value={edit.salePrice}
                                                                onChange={(e) => setVEdit(v.id, { salePrice: e.target.value })}
                                                                allowDecimals={true}
                                                                sx={{ width: 95 }}
                                                                placeholder={salePrice || "—"}
                                                                disabled={isBusy}
                                                                slotProps={{
                                                                    input: {
                                                                        startAdornment: <InputAdornment position="start" sx={{ mr: 0.25 }}><Typography variant="caption" sx={{ fontSize: "0.75rem" }}>S/</Typography></InputAdornment>,
                                                                    },
                                                                    htmlInput: { min: 0, step: "0.01" }
                                                                }}
                                                            />
                                                        </TableCell>

                                                        {/* Cell: Acciones */}
                                                        <TableCell align="center">
                                                            <Tooltip title="Eliminar variante">
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={() => setVariantIdPendingDelete(v.id)}
                                                                    disabled={isBusy}
                                                                >
                                                                    <DeleteOutlineRoundedIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Error Row */}
                                                    {errors[`v_${v.id}_combination`] && (
                                                        <TableRow sx={{ bgcolor: (t) => alpha(t.palette.error.main, 0.04) }}>
                                                            <TableCell colSpan={9} sx={{ py: 0.5 }}>
                                                                <Typography variant="caption" color="error.main" fontWeight={650} sx={{ pl: 2 }}>
                                                                    ⚠️ {errors[`v_${v.id}_combination`]}
                                                                </Typography>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </Fragment>
                                            );
                                        })}

                                        {/* Variant Draft Rows */}
                                        {variantDrafts.map((vd, vi) => {
                                            const ep = `nd${vi}`;

                                            const draftFileId = `draft-file-${vd.rowId}`;
                                            const mainImgSrc = getDraftMainImage(vd);
                                            const totalDraftCount = vd.imagePreviews.length;

                                            return (
                                                <Fragment key={vd.rowId}>
                                                    <TableRow sx={{ bgcolor: (t) => t.palette.mode === "dark" ? alpha(t.palette.primary.main, 0.04) : alpha(t.palette.primary.main, 0.02) }}>
                                                        {/* Cell: Thumbnail (Draft) */}
                                                        <TableCell>
                                                            <Tooltip title="Gestionar imágenes (Borrador)">
                                                                <Box
                                                                    onClick={() => setActiveImageEdit({ type: "draft", rowId: vd.rowId })}
                                                                    sx={{
                                                                        width: 44,
                                                                        height: 44,
                                                                        borderRadius: 1,
                                                                        border: "1px dashed",
                                                                        borderColor: "primary.main",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                        position: "relative",
                                                                        cursor: "pointer",
                                                                        bgcolor: "action.hover",
                                                                        overflow: "hidden",
                                                                        transition: "all 0.2s",
                                                                        "&:hover": {
                                                                            borderColor: "primary.dark",
                                                                            boxShadow: 2,
                                                                        }
                                                                    }}
                                                                >
                                                                    {mainImgSrc ? (
                                                                        <Box component="img" src={mainImgSrc} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                                    ) : (
                                                                        <PhotoCameraRoundedIcon sx={{ fontSize: 20, color: "primary.main" }} />
                                                                    )}
                                                                    {totalDraftCount > 0 && (
                                                                        <Box sx={{
                                                                            position: "absolute", bottom: -2, right: -2,
                                                                            bgcolor: "primary.main", color: "primary.contrastText",
                                                                            borderRadius: "50%", width: 16, height: 16,
                                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                                            fontSize: 10, fontWeight: "bold"
                                                                        }}>
                                                                            {totalDraftCount}
                                                                        </Box>
                                                                    )}
                                                                </Box>
                                                            </Tooltip>
                                                            <input
                                                                id={draftFileId}
                                                                type="file"
                                                                accept="image/*"
                                                                multiple
                                                                hidden
                                                                onChange={handleDraftImageFileChange}
                                                            />
                                                        </TableCell>

                                                        {/* Cell: Color (Draft) */}
                                                        <TableCell>
                                                            {!vd.showNewColor ? (
                                                                <FormControl size="small" fullWidth sx={{ minWidth: 120 }}>
                                                                    <Select
                                                                        value={vd.selectedColor?.id ?? ""}
                                                                        displayEmpty
                                                                        onChange={(e) => {
                                                                            const val = e.target.value as unknown;
                                                                            if (val === "new") {
                                                                                setDraft(vd.rowId, { showNewColor: true, selectedColor: null });
                                                                            } else {
                                                                                const chosen = colors.find((c) => c.id === Number(val)) || null;
                                                                                setDraft(vd.rowId, { selectedColor: chosen });
                                                                            }
                                                                        }}
                                                                        sx={{ height: 40 }}
                                                                        disabled={isBusy}
                                                                    >
                                                                        <MenuItem value="">
                                                                            <Typography variant="body2" color="text.secondary">Ninguno</Typography>
                                                                        </MenuItem>
                                                                        {colors.map((c: Color) => (
                                                                            <MenuItem key={c.id} value={c.id}>
                                                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                                                    <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: c.hexCode, border: "1px solid", borderColor: "divider", flexShrink: 0 }} />
                                                                                    <Typography variant="body2">{c.name}</Typography>
                                                                                </Box>
                                                                            </MenuItem>
                                                                        ))}
                                                                        <MenuItem value="new" sx={{ borderTop: 1, borderColor: "divider", color: "primary.main", fontWeight: "bold" }}>
                                                                            + Crear nuevo...
                                                                        </MenuItem>
                                                                    </Select>
                                                                </FormControl>
                                                            ) : (
                                                                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", minWidth: 160 }}>
                                                                    <TextField
                                                                        size="small"
                                                                        placeholder="Nombre color"
                                                                        value={vd.newColorName}
                                                                        onChange={(e) => setDraft(vd.rowId, { newColorName: e.target.value })}
                                                                        sx={{ flex: 1 }}
                                                                        error={!!errors[`${ep}_newColorName`]}
                                                                        disabled={isBusy}
                                                                    />
                                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                                        <Box
                                                                            component="input"
                                                                            type="color"
                                                                            value={vd.newColorHex}
                                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(vd.rowId, { newColorHex: e.target.value })}
                                                                            sx={{ width: 28, height: 28, p: 0, border: "1px solid", borderColor: "divider", borderRadius: "50%", cursor: "pointer", bgcolor: "transparent" }}
                                                                            disabled={isBusy}
                                                                        />
                                                                        <IconButton
                                                                            size="small"
                                                                            color="error"
                                                                            onClick={() => setDraft(vd.rowId, { showNewColor: false, newColorName: "", selectedColor: null })}
                                                                            disabled={isBusy}
                                                                        >
                                                                            <CloseRoundedIcon sx={{ fontSize: 16 }} />
                                                                        </IconButton>
                                                                    </Box>
                                                                </Box>
                                                            )}
                                                        </TableCell>

                                                        {/* Cell: Talla (Draft) */}
                                                        <TableCell>
                                                            {!vd.showNewSize ? (
                                                                <FormControl size="small" fullWidth sx={{ minWidth: 100 }}>
                                                                    <Select
                                                                        value={vd.selectedSize?.id ?? ""}
                                                                        displayEmpty
                                                                        onChange={(e) => {
                                                                            const val = e.target.value as unknown;
                                                                            if (val === "new") {
                                                                                setDraft(vd.rowId, { showNewSize: true, selectedSize: null });
                                                                            } else {
                                                                                const chosen = sizes.find((s) => s.id === Number(val)) || null;
                                                                                setDraft(vd.rowId, { selectedSize: chosen });
                                                                            }
                                                                        }}
                                                                        sx={{ height: 40 }}
                                                                        disabled={isBusy}
                                                                    >
                                                                        <MenuItem value="">
                                                                            <Typography variant="body2" color="text.secondary">Ninguno</Typography>
                                                                        </MenuItem>
                                                                        {sizes.map((s: Size) => (
                                                                            <MenuItem key={s.id} value={s.id}>
                                                                                <Typography variant="body2">{s.name}</Typography>
                                                                            </MenuItem>
                                                                        ))}
                                                                        <MenuItem value="new" sx={{ borderTop: 1, borderColor: "divider", color: "primary.main", fontWeight: "bold" }}>
                                                                            + Crear nueva...
                                                                        </MenuItem>
                                                                    </Select>
                                                                </FormControl>
                                                            ) : (
                                                                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", minWidth: 140 }}>
                                                                    <TextField
                                                                        size="small"
                                                                        placeholder="Nombre talla"
                                                                        value={vd.newSizeName}
                                                                        onChange={(e) => setDraft(vd.rowId, { newSizeName: e.target.value })}
                                                                        sx={{ flex: 1 }}
                                                                        error={!!errors[`${ep}_newSizeName`]}
                                                                        disabled={isBusy}
                                                                    />
                                                                    <IconButton
                                                                        size="small"
                                                                        color="error"
                                                                        onClick={() => setDraft(vd.rowId, { showNewSize: false, newSizeName: "", selectedSize: null })}
                                                                        disabled={isBusy}
                                                                    >
                                                                        <CloseRoundedIcon sx={{ fontSize: 16 }} />
                                                                    </IconButton>
                                                                </Box>
                                                            )}
                                                        </TableCell>

                                                        {/* Cell: SKU (Draft) */}
                                                        <TableCell>
                                                            <TextField
                                                                size="small"
                                                                value={vd.sku}
                                                                onChange={(e) => setDraft(vd.rowId, { sku: e.target.value })}
                                                                sx={{ width: 110 }}
                                                                disabled={isBusy}
                                                            />
                                                        </TableCell>

                                                        {/* Cell: Stock (Draft) */}
                                                        <TableCell>
                                                            <NumericField
                                                                size="small"
                                                                value={vd.stock}
                                                                onChange={(e) => setDraft(vd.rowId, { stock: e.target.value })}
                                                                onBlur={(e) => {
                                                                    if (!e.target.value.trim()) {
                                                                        setDraft(vd.rowId, { stock: "0" });
                                                                        setErrors((prev) => {
                                                                            const copy = { ...prev };
                                                                            delete copy[`${ep}_stock`];
                                                                            return copy;
                                                                        });
                                                                    }
                                                                }}
                                                                allowDecimals={false}
                                                                sx={{ width: 70 }}
                                                                slotProps={{ htmlInput: { min: 0 } }}
                                                                error={!!errors[`${ep}_stock`]}
                                                                helperText={errors[`${ep}_stock`]}
                                                                disabled={isBusy}
                                                            />
                                                        </TableCell>

                                                        {/* Cell: Stock Mínimo (Draft) */}
                                                        <TableCell>
                                                            <NumericField
                                                                size="small"
                                                                value={vd.minStock}
                                                                onChange={(e) => setDraft(vd.rowId, { minStock: e.target.value })}
                                                                onBlur={(e) => {
                                                                    if (!e.target.value.trim()) {
                                                                        setDraft(vd.rowId, { minStock: "0" });
                                                                    }
                                                                }}
                                                                allowDecimals={false}
                                                                sx={{ width: 70 }}
                                                                slotProps={{ htmlInput: { min: 0 } }}
                                                                disabled={isBusy}
                                                            />
                                                        </TableCell>

                                                        {/* Cell: Precio Compra (Draft) */}
                                                        <TableCell>
                                                            <NumericField
                                                                size="small"
                                                                value={vd.purchasePrice}
                                                                onChange={(e) => setDraft(vd.rowId, { purchasePrice: e.target.value })}
                                                                allowDecimals={true}
                                                                sx={{ width: 95 }}
                                                                placeholder={purchasePrice || "—"}
                                                                disabled={isBusy}
                                                                slotProps={{
                                                                    input: {
                                                                        startAdornment: <InputAdornment position="start" sx={{ mr: 0.25 }}><Typography variant="caption" sx={{ fontSize: "0.75rem" }}>S/</Typography></InputAdornment>,
                                                                    },
                                                                    htmlInput: { min: 0, step: "0.01" }
                                                                }}
                                                            />
                                                        </TableCell>

                                                        {/* Cell: Precio Venta (Draft) */}
                                                        <TableCell>
                                                            <NumericField
                                                                size="small"
                                                                value={vd.salePrice}
                                                                onChange={(e) => setDraft(vd.rowId, { salePrice: e.target.value })}
                                                                allowDecimals={true}
                                                                sx={{ width: 95 }}
                                                                placeholder={salePrice || "—"}
                                                                disabled={isBusy}
                                                                slotProps={{
                                                                    input: {
                                                                        startAdornment: <InputAdornment position="start" sx={{ mr: 0.25 }}><Typography variant="caption" sx={{ fontSize: "0.75rem" }}>S/</Typography></InputAdornment>,
                                                                    },
                                                                    htmlInput: { min: 0, step: "0.01" }
                                                                }}
                                                            />
                                                        </TableCell>

                                                        {/* Cell: Acciones (Draft) */}
                                                        <TableCell align="center">
                                                            <Tooltip title="Quitar esta fila">
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={() => removeVariantDraftRow(vd.rowId)}
                                                                    disabled={isBusy}
                                                                >
                                                                    <DeleteOutlineRoundedIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Error Row (Draft) */}
                                                    {errors[`${ep}_combination`] && (
                                                        <TableRow sx={{ bgcolor: (t) => alpha(t.palette.error.main, 0.04) }}>
                                                            <TableCell colSpan={9} sx={{ py: 0.5 }}>
                                                                <Typography variant="caption" color="error.main" fontWeight={650} sx={{ pl: 2 }}>
                                                                    ⚠️ {errors[`${ep}_combination`]}
                                                                </Typography>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Mobile Cards View */}
                            <Box sx={{ display: { xs: "flex", md: "none" }, flexDirection: "column", gap: 2, mb: 3 }}>
                                {activeVariants.length === 0 && variantDrafts.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                                        No hay variantes. Pulsa «Agregar variante» para comenzar.
                                    </Typography>
                                ) : (
                                    <>
                                        {/* Existing Active Variants (Mobile Cards) */}
                                        {activeVariants.map((v, vi) => {
                                            const edit = variantEdits[v.id];
                                            if (!edit) return null;

                                            const visible = v.images.filter((img) => !pendingDeleteImageIds.includes(img.id));
                                            const pending = pendingUploadsByVariant[v.id];
                                            const totalImgCount = visible.length + (pending?.files?.length ?? 0);
                                            const mainImgSrc = getVariantMainImage(v.id);

                                            return (
                                                <Paper
                                                    key={v.id}
                                                    variant="outlined"
                                                    sx={{
                                                        p: 2,
                                                        borderRadius: 2,
                                                        position: "relative",
                                                        bgcolor: (t) => t.palette.mode === "dark" ? alpha(t.palette.common.white, 0.01) : alpha(t.palette.common.black, 0.01),
                                                        border: "1px solid",
                                                        borderColor: errors[`v_${v.id}_combination`] ? "error.main" : "divider",
                                                    }}
                                                >
                                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                                        <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                                                            Variante #{vi + 1} (Existente)
                                                        </Typography>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => setVariantIdPendingDelete(v.id)}
                                                            disabled={isBusy}
                                                            aria-label="Eliminar variante"
                                                        >
                                                            <DeleteOutlineRoundedIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>

                                                    <Stack spacing={2} sx={{ width: "100%", minWidth: 0 }}>
                                                        {/* Row 1: Imagen and SKU side by side */}
                                                        <Box sx={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 2, alignItems: "center" }}>
                                                            <Box>
                                                                <Typography variant="caption" fontWeight={700} sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>Imagen</Typography>
                                                                <Tooltip title="Gestionar imágenes">
                                                                    <Box
                                                                        onClick={() => setActiveImageEdit({ type: "existing", id: v.id })}
                                                                        sx={{
                                                                            width: 56,
                                                                            height: 56,
                                                                            borderRadius: 1,
                                                                            border: "1px solid",
                                                                            borderColor: "divider",
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            justifyContent: "center",
                                                                            position: "relative",
                                                                            cursor: "pointer",
                                                                            bgcolor: "action.hover",
                                                                            overflow: "hidden",
                                                                        }}
                                                                    >
                                                                        {mainImgSrc ? (
                                                                            <Box component="img" src={mainImgSrc} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                                        ) : (
                                                                            <PhotoCameraRoundedIcon sx={{ fontSize: 24, color: "text.secondary" }} />
                                                                        )}
                                                                        {totalImgCount > 0 && (
                                                                            <Box sx={{
                                                                                position: "absolute", bottom: -2, right: -2,
                                                                                bgcolor: "text.secondary", color: "background.paper",
                                                                                borderRadius: "50%", width: 18, height: 18,
                                                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                                                fontSize: 10, fontWeight: "bold"
                                                                            }}>
                                                                                {totalImgCount}
                                                                            </Box>
                                                                        )}
                                                                    </Box>
                                                                </Tooltip>
                                                            </Box>
                                                            <Box sx={{ flex: 1 }}>
                                                                <Typography variant="caption" fontWeight={700} sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>SKU</Typography>
                                                                <TextField
                                                                    size="small"
                                                                    fullWidth
                                                                    value={edit.sku}
                                                                    onChange={(e) => setVEdit(v.id, { sku: e.target.value })}
                                                                    disabled={isBusy}
                                                                />
                                                            </Box>
                                                        </Box>

                                                        {/* Row 2: Color */}
                                                        <Box sx={{ minWidth: 0 }}>
                                                            <Typography variant="caption" fontWeight={700} sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>Color</Typography>
                                                            {!edit.showNewColor ? (
                                                                <FormControl size="small" fullWidth>
                                                                    <Select
                                                                        value={edit.selectedColorId ?? ""}
                                                                        displayEmpty
                                                                        onChange={(e) => {
                                                                            const val = e.target.value as unknown;
                                                                            if (val === "new") {
                                                                                setVEdit(v.id, { showNewColor: true, selectedColorId: null });
                                                                            } else {
                                                                                setVEdit(v.id, { selectedColorId: val === "" ? null : Number(val) });
                                                                            }
                                                                        }}
                                                                        sx={{ height: 40 }}
                                                                        disabled={isBusy}
                                                                    >
                                                                        <MenuItem value="">
                                                                            <Typography variant="body2" color="text.secondary">Ninguno</Typography>
                                                                        </MenuItem>
                                                                        {colors.map((c: Color) => (
                                                                            <MenuItem key={c.id} value={c.id}>
                                                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                                                    <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: c.hexCode, border: "1px solid", borderColor: "divider", flexShrink: 0 }} />
                                                                                    <Typography variant="body2">{c.name}</Typography>
                                                                                </Box>
                                                                            </MenuItem>
                                                                        ))}
                                                                        <MenuItem value="new" sx={{ borderTop: 1, borderColor: "divider", color: "primary.main", fontWeight: "bold" }}>
                                                                            + Crear nuevo...
                                                                        </MenuItem>
                                                                    </Select>
                                                                </FormControl>
                                                            ) : (
                                                                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                                                                    <TextField
                                                                        size="small"
                                                                        placeholder="Nombre"
                                                                        value={edit.newColorName}
                                                                        onChange={(e) => setVEdit(v.id, { newColorName: e.target.value })}
                                                                        sx={{ flex: 1 }}
                                                                        disabled={isBusy}
                                                                    />
                                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                                        <Box
                                                                            component="input"
                                                                            type="color"
                                                                            value={edit.newColorHex}
                                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVEdit(v.id, { newColorHex: e.target.value })}
                                                                            sx={{ width: 28, height: 28, p: 0, border: "1px solid", borderColor: "divider", borderRadius: "50%", cursor: "pointer", bgcolor: "transparent" }}
                                                                            disabled={isBusy}
                                                                        />
                                                                        <IconButton
                                                                            size="small"
                                                                            color="error"
                                                                            onClick={() => setVEdit(v.id, { showNewColor: false, newColorName: "", selectedColorId: v.colorId ?? null })}
                                                                            disabled={isBusy}
                                                                        >
                                                                            <CloseRoundedIcon sx={{ fontSize: 16 }} />
                                                                        </IconButton>
                                                                    </Box>
                                                                </Box>
                                                            )}
                                                        </Box>

                                                        {/* Row 3: Talla */}
                                                        <Box sx={{ minWidth: 0 }}>
                                                            <Typography variant="caption" fontWeight={700} sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>Talla</Typography>
                                                            {!edit.showNewSize ? (
                                                                <FormControl size="small" fullWidth>
                                                                    <Select
                                                                        value={edit.selectedSizeId ?? ""}
                                                                        displayEmpty
                                                                        onChange={(e) => {
                                                                            const val = e.target.value as unknown;
                                                                            if (val === "new") {
                                                                                setVEdit(v.id, { showNewSize: true, selectedSizeId: null });
                                                                            } else {
                                                                                setVEdit(v.id, { selectedSizeId: val === "" ? null : Number(val) });
                                                                            }
                                                                        }}
                                                                        sx={{ height: 40 }}
                                                                        disabled={isBusy}
                                                                    >
                                                                        <MenuItem value="">
                                                                            <Typography variant="body2" color="text.secondary">Ninguno</Typography>
                                                                        </MenuItem>
                                                                        {sizes.map((s: Size) => (
                                                                            <MenuItem key={s.id} value={s.id}>
                                                                                <Typography variant="body2">{s.name}</Typography>
                                                                            </MenuItem>
                                                                        ))}
                                                                        <MenuItem value="new" sx={{ borderTop: 1, borderColor: "divider", color: "primary.main", fontWeight: "bold" }}>
                                                                            + Crear nueva...
                                                                        </MenuItem>
                                                                    </Select>
                                                                </FormControl>
                                                            ) : (
                                                                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                                                                    <TextField
                                                                        size="small"
                                                                        placeholder="Nombre"
                                                                        value={edit.newSizeName}
                                                                        onChange={(e) => setVEdit(v.id, { newSizeName: e.target.value })}
                                                                        sx={{ flex: 1 }}
                                                                        disabled={isBusy}
                                                                    />
                                                                    <IconButton
                                                                        size="small"
                                                                        color="error"
                                                                        onClick={() => setVEdit(v.id, { showNewSize: false, newSizeName: "", selectedSizeId: v.sizeId ?? null })}
                                                                        disabled={isBusy}
                                                                    >
                                                                        <CloseRoundedIcon sx={{ fontSize: 16 }} />
                                                                    </IconButton>
                                                                </Box>
                                                            )}
                                                        </Box>

                                                        {/* Row 4: Stock & Stock Mínimo */}
                                                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                                                            <Box>
                                                                <Typography variant="caption" fontWeight={700} sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>Stock</Typography>
                                                                <NumericField
                                                                    size="small"
                                                                    fullWidth
                                                                    value={edit.stock}
                                                                    onChange={(e) => setVEdit(v.id, { stock: e.target.value })}
                                                                    onBlur={(e) => {
                                                                        if (!e.target.value.trim()) {
                                                                            setVEdit(v.id, { stock: "0" });
                                                                        }
                                                                    }}
                                                                    allowDecimals={false}
                                                                    slotProps={{ htmlInput: { min: 0 } }}
                                                                    disabled={isBusy}
                                                                />
                                                            </Box>
                                                            <Box>
                                                                <Typography variant="caption" fontWeight={700} sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>Stock Mínimo</Typography>
                                                                <NumericField
                                                                    size="small"
                                                                    fullWidth
                                                                    value={edit.minStock}
                                                                    onChange={(e) => setVEdit(v.id, { minStock: e.target.value })}
                                                                    onBlur={(e) => {
                                                                        if (!e.target.value.trim()) {
                                                                            setVEdit(v.id, { minStock: "0" });
                                                                        }
                                                                    }}
                                                                    allowDecimals={false}
                                                                    slotProps={{ htmlInput: { min: 0 } }}
                                                                    disabled={isBusy}
                                                                />
                                                            </Box>
                                                        </Box>

                                                        {/* Row 5: P. Compra & P. Venta */}
                                                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                                                            <Box>
                                                                <Typography variant="caption" fontWeight={700} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mb: 0.5, color: "text.secondary" }}>
                                                                    P. Compra
                                                                    <Tooltip title="Si se deja vacío, se utilizará el precio de compra base del producto (referencial).">
                                                                        <InfoRoundedIcon sx={{ fontSize: "0.85rem", color: "text.secondary", cursor: "help" }} />
                                                                    </Tooltip>
                                                                </Typography>
                                                                <NumericField
                                                                    size="small"
                                                                    fullWidth
                                                                    value={edit.purchasePrice}
                                                                    onChange={(e) => setVEdit(v.id, { purchasePrice: e.target.value })}
                                                                    allowDecimals={true}
                                                                    placeholder={purchasePrice || "—"}
                                                                    disabled={isBusy}
                                                                    slotProps={{
                                                                        input: {
                                                                            startAdornment: <InputAdornment position="start" sx={{ mr: 0.25 }}><Typography variant="caption" sx={{ fontSize: "0.75rem" }}>S/</Typography></InputAdornment>,
                                                                        },
                                                                        htmlInput: { min: 0, step: "0.01" }
                                                                    }}
                                                                />
                                                            </Box>
                                                            <Box>
                                                                <Typography variant="caption" fontWeight={700} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mb: 0.5, color: "text.secondary" }}>
                                                                    P. Venta
                                                                    <Tooltip title="Si se deja vacío, se utilizará el precio de venta base del producto (referencial).">
                                                                        <InfoRoundedIcon sx={{ fontSize: "0.85rem", color: "text.secondary", cursor: "help" }} />
                                                                    </Tooltip>
                                                                </Typography>
                                                                <NumericField
                                                                    size="small"
                                                                    fullWidth
                                                                    value={edit.salePrice}
                                                                    onChange={(e) => setVEdit(v.id, { salePrice: e.target.value })}
                                                                    allowDecimals={true}
                                                                    placeholder={salePrice || "—"}
                                                                    disabled={isBusy}
                                                                    slotProps={{
                                                                        input: {
                                                                            startAdornment: <InputAdornment position="start" sx={{ mr: 0.25 }}><Typography variant="caption" sx={{ fontSize: "0.75rem" }}>S/</Typography></InputAdornment>,
                                                                        },
                                                                        htmlInput: { min: 0, step: "0.01" }
                                                                    }}
                                                                />
                                                            </Box>
                                                        </Box>
                                                    </Stack>

                                                    {errors[`v_${v.id}_combination`] && (
                                                        <Typography variant="caption" color="error.main" fontWeight={650} sx={{ display: "block", mt: 1.5, pl: 1 }}>
                                                            ⚠️ {errors[`v_${v.id}_combination`]}
                                                        </Typography>
                                                    )}
                                                </Paper>
                                            );
                                        })}

                                        {/* Variant Drafts (Mobile Cards) */}
                                        {variantDrafts.map((vd, vi) => {
                                            const ep = `nd${vi}`;
                                            const mainImgSrc = getDraftMainImage(vd);
                                            const totalDraftCount = vd.imagePreviews.length;

                                            return (
                                                <Paper
                                                    key={vd.rowId}
                                                    variant="outlined"
                                                    sx={{
                                                        p: 2,
                                                        borderRadius: 2,
                                                        position: "relative",
                                                        bgcolor: (t) => t.palette.mode === "dark" ? alpha(t.palette.primary.main, 0.04) : alpha(t.palette.primary.main, 0.02),
                                                        border: "1px solid",
                                                        borderColor: errors[`${ep}_combination`] ? "error.main" : "divider",
                                                    }}
                                                >
                                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                                        <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                                                            Variante #{activeVariants.length + vi + 1} (Borrador)
                                                        </Typography>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => removeVariantDraftRow(vd.rowId)}
                                                            disabled={isBusy}
                                                            aria-label="Quitar esta fila"
                                                        >
                                                            <DeleteOutlineRoundedIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>

                                                    <Stack spacing={2} sx={{ width: "100%", minWidth: 0 }}>
                                                        {/* Row 1: Imagen and SKU side by side */}
                                                        <Box sx={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 2, alignItems: "center" }}>
                                                            <Box>
                                                                <Typography variant="caption" fontWeight={700} sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>Imagen</Typography>
                                                                <Tooltip title="Gestionar imágenes (Borrador)">
                                                                    <Box
                                                                        onClick={() => setActiveImageEdit({ type: "draft", rowId: vd.rowId })}
                                                                        sx={{
                                                                            width: 56,
                                                                            height: 56,
                                                                            borderRadius: 1,
                                                                            border: "1px dashed",
                                                                            borderColor: "primary.main",
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            justifyContent: "center",
                                                                            position: "relative",
                                                                            cursor: "pointer",
                                                                            bgcolor: "action.hover",
                                                                            overflow: "hidden",
                                                                        }}
                                                                    >
                                                                        {mainImgSrc ? (
                                                                            <Box component="img" src={mainImgSrc} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                                        ) : (
                                                                            <PhotoCameraRoundedIcon sx={{ fontSize: 24, color: "primary.main" }} />
                                                                        )}
                                                                        {totalDraftCount > 0 && (
                                                                            <Box sx={{
                                                                                position: "absolute", bottom: -2, right: -2,
                                                                                bgcolor: "primary.main", color: "primary.contrastText",
                                                                                borderRadius: "50%", width: 18, height: 18,
                                                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                                                fontSize: 10, fontWeight: "bold"
                                                                            }}>
                                                                                {totalDraftCount}
                                                                            </Box>
                                                                        )}
                                                                    </Box>
                                                                </Tooltip>
                                                            </Box>
                                                            <Box sx={{ flex: 1 }}>
                                                                <Typography variant="caption" fontWeight={700} sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>SKU</Typography>
                                                                <TextField
                                                                    size="small"
                                                                    fullWidth
                                                                    value={vd.sku}
                                                                    onChange={(e) => setDraft(vd.rowId, { sku: e.target.value })}
                                                                    disabled={isBusy}
                                                                />
                                                            </Box>
                                                        </Box>

                                                        {/* Row 2: Color */}
                                                        <Box sx={{ minWidth: 0 }}>
                                                            <Typography variant="caption" fontWeight={700} sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>Color</Typography>
                                                            {!vd.showNewColor ? (
                                                                <FormControl size="small" fullWidth>
                                                                    <Select
                                                                        value={vd.selectedColor?.id ?? ""}
                                                                        displayEmpty
                                                                        onChange={(e) => {
                                                                            const val = e.target.value as unknown;
                                                                            if (val === "new") {
                                                                                setDraft(vd.rowId, { showNewColor: true, selectedColor: null });
                                                                            } else {
                                                                                const chosen = colors.find((c) => c.id === Number(val)) || null;
                                                                                setDraft(vd.rowId, { selectedColor: chosen });
                                                                            }
                                                                        }}
                                                                        sx={{ height: 40 }}
                                                                        disabled={isBusy}
                                                                    >
                                                                        <MenuItem value="">
                                                                            <Typography variant="body2" color="text.secondary">Ninguno</Typography>
                                                                        </MenuItem>
                                                                        {colors.map((c: Color) => (
                                                                            <MenuItem key={c.id} value={c.id}>
                                                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                                                    <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: c.hexCode, border: "1px solid", borderColor: "divider", flexShrink: 0 }} />
                                                                                    <Typography variant="body2">{c.name}</Typography>
                                                                                </Box>
                                                                            </MenuItem>
                                                                        ))}
                                                                        <MenuItem value="new" sx={{ borderTop: 1, borderColor: "divider", color: "primary.main", fontWeight: "bold" }}>
                                                                            + Crear nuevo...
                                                                        </MenuItem>
                                                                    </Select>
                                                                </FormControl>
                                                            ) : (
                                                                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                                                                    <TextField
                                                                        size="small"
                                                                        placeholder="Nombre"
                                                                        value={vd.newColorName}
                                                                        onChange={(e) => setDraft(vd.rowId, { newColorName: e.target.value })}
                                                                        sx={{ flex: 1 }}
                                                                        error={!!errors[`${ep}_newColorName`]}
                                                                        disabled={isBusy}
                                                                    />
                                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                                        <Box
                                                                            component="input"
                                                                            type="color"
                                                                            value={vd.newColorHex}
                                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(vd.rowId, { newColorHex: e.target.value })}
                                                                            sx={{ width: 28, height: 28, p: 0, border: "1px solid", borderColor: "divider", borderRadius: "50%", cursor: "pointer", bgcolor: "transparent" }}
                                                                            disabled={isBusy}
                                                                        />
                                                                        <IconButton
                                                                            size="small"
                                                                            color="error"
                                                                            onClick={() => setDraft(vd.rowId, { showNewColor: false, newColorName: "", selectedColor: null })}
                                                                            disabled={isBusy}
                                                                        >
                                                                            <CloseRoundedIcon sx={{ fontSize: 16 }} />
                                                                        </IconButton>
                                                                    </Box>
                                                                </Box>
                                                            )}
                                                        </Box>

                                                        {/* Row 3: Talla */}
                                                        <Box sx={{ minWidth: 0 }}>
                                                            <Typography variant="caption" fontWeight={700} sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>Talla</Typography>
                                                            {!vd.showNewSize ? (
                                                                <FormControl size="small" fullWidth>
                                                                    <Select
                                                                        value={vd.selectedSize?.id ?? ""}
                                                                        displayEmpty
                                                                        onChange={(e) => {
                                                                            const val = e.target.value as unknown;
                                                                            if (val === "new") {
                                                                                setDraft(vd.rowId, { showNewSize: true, selectedSize: null });
                                                                            } else {
                                                                                const chosen = sizes.find((s) => s.id === Number(val)) || null;
                                                                                setDraft(vd.rowId, { selectedSize: chosen });
                                                                            }
                                                                        }}
                                                                        sx={{ height: 40 }}
                                                                        disabled={isBusy}
                                                                    >
                                                                        <MenuItem value="">
                                                                            <Typography variant="body2" color="text.secondary">Ninguno</Typography>
                                                                        </MenuItem>
                                                                        {sizes.map((s: Size) => (
                                                                            <MenuItem key={s.id} value={s.id}>
                                                                                <Typography variant="body2">{s.name}</Typography>
                                                                            </MenuItem>
                                                                        ))}
                                                                        <MenuItem value="new" sx={{ borderTop: 1, borderColor: "divider", color: "primary.main", fontWeight: "bold" }}>
                                                                            + Crear nueva...
                                                                        </MenuItem>
                                                                    </Select>
                                                                </FormControl>
                                                            ) : (
                                                                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                                                                    <TextField
                                                                        size="small"
                                                                        placeholder="Nombre"
                                                                        value={vd.newSizeName}
                                                                        onChange={(e) => setDraft(vd.rowId, { newSizeName: e.target.value })}
                                                                        sx={{ flex: 1 }}
                                                                        error={!!errors[`${ep}_newSizeName`]}
                                                                        disabled={isBusy}
                                                                    />
                                                                    <IconButton
                                                                        size="small"
                                                                        color="error"
                                                                        onClick={() => setDraft(vd.rowId, { showNewSize: false, newSizeName: "", selectedSize: null })}
                                                                        disabled={isBusy}
                                                                    >
                                                                        <CloseRoundedIcon sx={{ fontSize: 16 }} />
                                                                    </IconButton>
                                                                </Box>
                                                            )}
                                                        </Box>

                                                        {/* Row 4: Stock & Stock Mínimo */}
                                                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                                                            <Box>
                                                                <Typography variant="caption" fontWeight={700} sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>Stock</Typography>
                                                                <NumericField
                                                                    size="small"
                                                                    fullWidth
                                                                    value={vd.stock}
                                                                    onChange={(e) => setDraft(vd.rowId, { stock: e.target.value })}
                                                                    onBlur={(e) => {
                                                                        if (!e.target.value.trim()) {
                                                                            setDraft(vd.rowId, { stock: "0" });
                                                                            setErrors((prev) => {
                                                                                const copy = { ...prev };
                                                                                delete copy[`${ep}_stock`];
                                                                                return copy;
                                                                            });
                                                                        }
                                                                    }}
                                                                    allowDecimals={false}
                                                                    slotProps={{ htmlInput: { min: 0 } }}
                                                                    error={!!errors[`${ep}_stock`]}
                                                                    helperText={errors[`${ep}_stock`]}
                                                                    disabled={isBusy}
                                                                />
                                                            </Box>
                                                            <Box>
                                                                <Typography variant="caption" fontWeight={700} sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>Stock Mínimo</Typography>
                                                                <NumericField
                                                                    size="small"
                                                                    fullWidth
                                                                    value={vd.minStock}
                                                                    onChange={(e) => setDraft(vd.rowId, { minStock: e.target.value })}
                                                                    onBlur={(e) => {
                                                                        if (!e.target.value.trim()) {
                                                                            setDraft(vd.rowId, { minStock: "0" });
                                                                        }
                                                                    }}
                                                                    allowDecimals={false}
                                                                    slotProps={{ htmlInput: { min: 0 } }}
                                                                    disabled={isBusy}
                                                                />
                                                            </Box>
                                                        </Box>

                                                        {/* Row 5: P. Compra & P. Venta */}
                                                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                                                            <Box>
                                                                <Typography variant="caption" fontWeight={700} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mb: 0.5, color: "text.secondary" }}>
                                                                    P. Compra
                                                                    <Tooltip title="Si se deja vacío, se utilizará el precio de compra base del producto (referencial).">
                                                                        <InfoRoundedIcon sx={{ fontSize: "0.85rem", color: "text.secondary", cursor: "help" }} />
                                                                    </Tooltip>
                                                                </Typography>
                                                                <NumericField
                                                                    size="small"
                                                                    fullWidth
                                                                    value={vd.purchasePrice}
                                                                    onChange={(e) => setDraft(vd.rowId, { purchasePrice: e.target.value })}
                                                                    allowDecimals={true}
                                                                    placeholder={purchasePrice || "—"}
                                                                    disabled={isBusy}
                                                                    slotProps={{
                                                                        input: {
                                                                            startAdornment: <InputAdornment position="start" sx={{ mr: 0.25 }}><Typography variant="caption" sx={{ fontSize: "0.75rem" }}>S/</Typography></InputAdornment>,
                                                                        },
                                                                        htmlInput: { min: 0, step: "0.01" }
                                                                    }}
                                                                />
                                                            </Box>
                                                            <Box>
                                                                <Typography variant="caption" fontWeight={700} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mb: 0.5, color: "text.secondary" }}>
                                                                    P. Venta
                                                                    <Tooltip title="Si se deja vacío, se utilizará el precio de venta base del producto (referencial).">
                                                                        <InfoRoundedIcon sx={{ fontSize: "0.85rem", color: "text.secondary", cursor: "help" }} />
                                                                    </Tooltip>
                                                                </Typography>
                                                                <NumericField
                                                                    size="small"
                                                                    fullWidth
                                                                    value={vd.salePrice}
                                                                    onChange={(e) => setDraft(vd.rowId, { salePrice: e.target.value })}
                                                                    allowDecimals={true}
                                                                    placeholder={salePrice || "—"}
                                                                    disabled={isBusy}
                                                                    slotProps={{
                                                                        input: {
                                                                            startAdornment: <InputAdornment position="start" sx={{ mr: 0.25 }}><Typography variant="caption" sx={{ fontSize: "0.75rem" }}>S/</Typography></InputAdornment>,
                                                                        },
                                                                        htmlInput: { min: 0, step: "0.01" }
                                                                    }}
                                                                />
                                                            </Box>
                                                        </Box>
                                                    </Stack>


                                                    {errors[`${ep}_combination`] && (
                                                        <Typography variant="caption" color="error.main" fontWeight={650} sx={{ display: "block", mt: 1.5, pl: 1 }}>
                                                            ⚠️ {errors[`${ep}_combination`]}
                                                        </Typography>
                                                    )}
                                                </Paper>
                                            );
                                        })}
                                    </>
                                )}
                            </Box>


                            <input
                                ref={variantImagePickerRef}
                                type="file"
                                accept="image/*"
                                multiple
                                style={{ display: "none" }}
                                onChange={handleVariantImageFileChange}
                            />
                        </>
                    )}
                </DialogContent>

                <DialogActions
                    sx={{
                        px: { xs: 1.5, sm: 3 },
                        py: 2,
                        borderTop: 1,
                        borderColor: "divider",
                        gap: 1,
                        flexShrink: 0,
                        flexDirection: { xs: "column", sm: "row" },
                        justifyContent: { xs: "stretch", sm: "flex-end" },
                        "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
                    }}
                >
                    <Button variant="outlined" onClick={handleClose} disabled={isBusy}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={isBusy}
                        startIcon={isBusy ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
                    >
                        {isBusy ? "Guardando..." : "Guardar cambios"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={variantIdPendingDelete !== null}
                onClose={() => { if (!deletingVariant) setVariantIdPendingDelete(null); }}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Eliminar variante</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        La variante dejará de mostrarse en la tienda (se desactiva). Puedes crear otra variante después con «Agregar variante».
                    </Typography>
                    {activeVariants.length === 1 && variantIdPendingDelete != null && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            Es la única variante activa de este producto.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button onClick={() => setVariantIdPendingDelete(null)} disabled={deletingVariant}>
                        Cancelar
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleConfirmDeleteVariant}
                        disabled={deletingVariant}
                        startIcon={deletingVariant ? <CircularProgress size={18} color="inherit" /> : undefined}
                    >
                        {deletingVariant ? "Eliminando…" : "Eliminar"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={activeImageEdit !== null}
                onClose={() => setActiveImageEdit(null)}
                maxWidth="md"
                fullWidth
                disableRestoreFocus
            >
                <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography component="span" variant="h6" fontWeight={800} letterSpacing="0.04em" sx={{ color: "primary.main" }}>
                        Gestionar imágenes de la variante
                    </Typography>
                    <IconButton onClick={() => setActiveImageEdit(null)} aria-label="Cerrar">
                        <CloseRoundedIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ py: 3 }}>
                    {activeImageEdit && (
                        <Box>
                            {activeImageEdit.type === "existing" ? (() => {
                                const v = activeVariants.find((vv) => vv.id === activeImageEdit.id);
                                if (!v) return <Typography>Variante no encontrada</Typography>;

                                const visible = v.images.filter((img) => !pendingDeleteImageIds.includes(img.id));
                                const toDelete = v.images.length - visible.length;
                                const pending = pendingUploadsByVariant[v.id];
                                const pendingPrev = pending?.previews ?? [];
                                const serverHero = visible[0];
                                const hasServerHero = Boolean(serverHero);
                                const hasAnyImage = visible.length > 0 || pendingPrev.length > 0;
                                const serverTail = visible.slice(1);
                                const pendingThumbs = hasServerHero
                                    ? pendingPrev.map((p, idx) => ({ p, idx }))
                                    : pendingPrev.slice(1).map((p, idx) => ({ p, idx: idx + 1 }));

                                const openVariantFilePicker = () => {
                                    pendingPickerVariantIdRef.current = v.id;
                                    variantImagePickerRef.current?.click();
                                };

                                return (
                                    <Box>
                                        <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1.5, p: 2, bgcolor: "action.hover", borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
                                            <Box sx={{ width: 16, height: 16, borderRadius: "50%", bgcolor: v.colorHexCode ?? "action.disabledBackground", border: "1px solid", borderColor: "divider" }} />
                                            <Typography variant="subtitle1" fontWeight={700}>
                                                {v.colorName ?? "Sin color"} / {v.sizeName ?? "Sin talla"}
                                            </Typography>
                                            {v.sku && (
                                                <Chip label={`SKU: ${v.sku}`} size="small" variant="outlined" />
                                            )}
                                        </Box>

                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.5, flexWrap: "wrap" }}>
                                            <Chip label={`${visible.length} en servidor`} size="small" variant="outlined" />
                                            {pendingPrev.length > 0 && (
                                                <Chip label={`+${pendingPrev.length} por subir`} size="small" color="primary" variant="outlined" />
                                            )}
                                            {toDelete > 0 && (
                                                <Chip label={`${toDelete} se eliminará al guardar`} size="small" color="error" variant="outlined" />
                                            )}
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ display: "block", mb: 3 }}>
                                            La imagen principal lleva estrella. En el servidor puedes cambiar la imagen principal haciendo clic en la estrella vacía de otra foto. Las fotos nuevas que aún no se han subido: la primera de la lista será la principal al guardar (puedes cambiar el orden con la estrella).
                                        </Typography>

                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.5, alignItems: "flex-start" }}>
                                            {!hasAnyImage ? (
                                                <VariantPrimaryImageDropSlot
                                                    onOpenPicker={openVariantFilePicker}
                                                    onDropFiles={(files) => appendPendingVariantImages(v.id, files)}
                                                    disabled={isBusy}
                                                />
                                            ) : hasServerHero && serverHero ? (
                                                <VariantImageThumb
                                                    size={VARIANT_PRIMARY_IMAGE_SIZE}
                                                    src={imgUrl(serverHero.url)}
                                                    alt=""
                                                    onExpand={() => setImageLightbox({ src: imgUrl(serverHero.url), alt: "Imagen de variante" })}
                                                    onRemove={() => markForDeletion(serverHero.id)}
                                                    removeTooltip="Marcar para eliminar al guardar"
                                                    isMain={serverHero.isMain}
                                                    onSetAsMain={
                                                        serverHero.isMain
                                                            ? undefined
                                                            : () => {
                                                                void handleServerImageSetMain(serverHero.id);
                                                            }
                                                    }
                                                    setAsMainDisabled={imageThumbMainBusy}
                                                />
                                            ) : pendingPrev[0] ? (
                                                <VariantImageThumb
                                                    size={VARIANT_PRIMARY_IMAGE_SIZE}
                                                    src={pendingPrev[0].url}
                                                    alt={pendingPrev[0].name}
                                                    emphasized
                                                    isMain
                                                    onExpand={() => setImageLightbox({ src: pendingPrev[0].url, alt: pendingPrev[0].name })}
                                                    onRemove={() => removePendingVariantImageAt(v.id, 0)}
                                                />
                                            ) : null}

                                            {serverTail.map((img) => (
                                                <VariantImageThumb
                                                    key={img.id}
                                                    src={imgUrl(img.url)}
                                                    alt=""
                                                    onExpand={() => setImageLightbox({ src: imgUrl(img.url), alt: "Imagen de variante" })}
                                                    onRemove={() => markForDeletion(img.id)}
                                                    removeTooltip="Marcar para eliminar al guardar"
                                                    isMain={img.isMain}
                                                    onSetAsMain={
                                                        img.isMain
                                                            ? undefined
                                                            : () => {
                                                                void handleServerImageSetMain(img.id);
                                                            }
                                                    }
                                                    setAsMainDisabled={imageThumbMainBusy}
                                                />
                                            ))}

                                            {pendingThumbs.map(({ p, idx }) => (
                                                <VariantImageThumb
                                                    key={`pend-${p.name}-${idx}`}
                                                    src={p.url}
                                                    alt={p.name}
                                                    emphasized
                                                    onExpand={() => setImageLightbox({ src: p.url, alt: p.name })}
                                                    onRemove={() => removePendingVariantImageAt(v.id, idx)}
                                                    onSetAsMain={
                                                        idx > 0 ? () => makePendingImageMain(v.id, idx) : undefined
                                                    }
                                                    setAsMainDisabled={imageThumbMainBusy}
                                                />
                                            ))}

                                            {hasAnyImage ? (
                                                <VariantAddMoreImagesButton onOpenPicker={openVariantFilePicker} disabled={isBusy} />
                                            ) : null}
                                        </Box>
                                    </Box>
                                );
                            })() : (() => {
                                const vd = variantDrafts.find((draft) => draft.rowId === activeImageEdit.rowId);
                                if (!vd) return <Typography>Borrador no encontrado</Typography>;

                                const draftFileId = `draft-file-${vd.rowId}`;
                                const draftFirst = vd.imagePreviews[0];
                                const draftRest = vd.imagePreviews.slice(1);

                                return (
                                    <Box>
                                        <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1.5, p: 2, bgcolor: "action.hover", borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
                                            <Box sx={{ width: 16, height: 16, borderRadius: "50%", bgcolor: (vd.selectedColor?.hexCode ?? vd.newColorName) || "action.disabledBackground", border: "1px solid", borderColor: "divider" }} />
                                            <Typography variant="subtitle1" fontWeight={700}>
                                                Nueva Variante: {(vd.selectedColor?.name ?? vd.newColorName) || "Sin color"} / {(vd.selectedSize?.name ?? vd.newSizeName) || "Sin talla"}
                                            </Typography>
                                        </Box>

                                        <Typography variant="body2" color="text.secondary" sx={{ display: "block", mb: 3 }}>
                                            La primera foto de la lista será la principal al guardar. Usa la estrella vacía en otra miniatura para colocarla primero.
                                        </Typography>

                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.5, alignItems: "flex-start" }}>
                                            {!draftFirst ? (
                                                <VariantPrimaryImageDropSlot
                                                    inputId={draftFileId}
                                                    onDropFiles={(files) => appendDraftImages(vd.rowId, files)}
                                                    disabled={isBusy}
                                                />
                                            ) : (
                                                <VariantImageThumb
                                                    size={VARIANT_PRIMARY_IMAGE_SIZE}
                                                    src={draftFirst.url}
                                                    alt={draftFirst.name}
                                                    isMain
                                                    onExpand={() => setImageLightbox({ src: draftFirst.url, alt: draftFirst.name })}
                                                    onRemove={() => removeDraftImageAt(vd.rowId, 0)}
                                                />
                                            )}
                                            {draftRest.map((p, i) => (
                                                <VariantImageThumb
                                                    key={`${p.name}-${i + 1}`}
                                                    src={p.url}
                                                    alt={p.name}
                                                    onExpand={() => setImageLightbox({ src: p.url, alt: p.name })}
                                                    onRemove={() => removeDraftImageAt(vd.rowId, i + 1)}
                                                    onSetAsMain={() => makeDraftImageMain(vd.rowId, i + 1)}
                                                    setAsMainDisabled={isBusy}
                                                />
                                            ))}
                                            {draftFirst ? (
                                                <VariantAddMoreImagesButton inputId={draftFileId} disabled={isBusy} />
                                            ) : null}
                                        </Box>
                                    </Box>
                                );
                            })()}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setActiveImageEdit(null)} variant="contained" sx={{ px: 4 }}>
                        Aceptar
                    </Button>
                </DialogActions>
            </Dialog>

            <ImageLightbox
                open={imageLightbox !== null}
                src={imageLightbox?.src ?? ""}
                alt={imageLightbox?.alt ?? ""}
                onClose={() => setImageLightbox(null)}
            />
        </>
    );
}
