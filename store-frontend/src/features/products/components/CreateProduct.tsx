'use client';

import { useState, useEffect, Fragment } from "react";
import axios from "axios";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
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
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import {
    useAllColors, useCreateColor,
    useAllSizes, useCreateSize,
    useAllCategoriesSelect,
    useCreateProductVariant, useCreateProductVariantImage,
} from "../hooks/productsHooks";
import { ProductService } from "../services/products.service";
import { CreateProductsVariant } from "../types/productsVariantTypes";
import { Color } from "../types/colorsTypes";
import { Size } from "../types/sizesTypes";
import {
    ImageLightbox,
    VariantAddMoreImagesButton,
    VariantImageThumb,
    VariantPrimaryImageDropSlot,
    VARIANT_PRIMARY_IMAGE_SIZE,
} from "./variantImageUi";
import { NumericField } from "@/shared/components/NumericField";

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type FormErrors = Record<string, string>;

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

function newRowId(): string {
    return typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random()}`;
}

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
    /** Vacío = hereda del producto; con número = override específico de la variante. */
    salePrice: string;
    /** Vacío = hereda del producto; con número = override específico de la variante. */
    purchasePrice: string;
    imageFiles: File[];
    imagePreviews: { url: string; name: string }[];
}

function emptyVariant(): VariantDraft {
    return {
        rowId: newRowId(),
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

export default function CreateProduct({ open, onClose, onSuccess }: Props) {

    const [name, setName] = useState("");
    const [purchasePrice, setPurchasePrice] = useState("");
    const [salePrice, setSalePrice] = useState("");
    const [minStock, setMinStock] = useState("");
    const [categoryId, setCategoryId] = useState<number | "">("");

    const [variants, setVariants] = useState<VariantDraft[]>(() => [emptyVariant()]);
    const [activeImageEdit, setActiveImageEdit] = useState<{ rowId: string } | null>(null);

    const [errors, setErrors] = useState<FormErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [imageLightbox, setImageLightbox] = useState<{ src: string; alt: string } | null>(null);

    const { data: colors, loading: colorsLoading } = useAllColors(open);
    const { data: sizes, loading: sizesLoading } = useAllSizes(open);
    const { data: categories, loading: catsLoading } = useAllCategoriesSelect(open);

    const { execute: createColor } = useCreateColor();
    const { execute: createSize } = useCreateSize();
    const { execute: createVariant } = useCreateProductVariant();
    const { execute: uploadImage } = useCreateProductVariantImage();

    useEffect(() => {
        if (!open) return;
        setName(""); setPurchasePrice(""); setSalePrice("");
        setMinStock("");
        setCategoryId("");
        setVariants([emptyVariant()]);
        setActiveImageEdit(null);
        setErrors({}); setSubmitError(null);
    }, [open]);

    const handleClose = () => {
        (document.activeElement as HTMLElement)?.blur();
        setActiveImageEdit(null);
        queueMicrotask(() => {
            onClose();
        });
    };

    const setV = (rowId: string, patch: Partial<VariantDraft>) => {
        setVariants((prev) => prev.map((v) => (v.rowId === rowId ? { ...v, ...patch } : v)));
    };

    const addVariantRow = () => {
        setVariants((prev) => [...prev, emptyVariant()]);
        setErrors((prev) => {
            const copy = { ...prev };
            delete copy.variants;
            return copy;
        });
    };
    const removeVariantRow = (rowId: string) =>
        setVariants((prev) => prev.filter((v) => v.rowId !== rowId));

    const addVariantImages = (rowId: string, files: File[]) => {
        const imageFiles = files.filter((f) => f.type.startsWith("image/"));
        if (!imageFiles.length) return;
        const previews = imageFiles.map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
        setVariants((prev) => prev.map((v) => {
            if (v.rowId !== rowId) return v;
            return {
                ...v,
                imageFiles: [...v.imageFiles, ...imageFiles],
                imagePreviews: [...v.imagePreviews, ...previews],
            };
        }));
    };

    const handleImageChange = (rowId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        addVariantImages(rowId, files);
        e.target.value = "";
    };

    const removeImageAt = (rowId: string, index: number) => {
        setVariants((prev) => prev.map((v) => {
            if (v.rowId !== rowId) return v;
            return {
                ...v,
                imageFiles: v.imageFiles.filter((_, i) => i !== index),
                imagePreviews: v.imagePreviews.filter((_, i) => i !== index),
            };
        }));
    };

    const makeVariantImageMain = (rowId: string, index: number) => {
        if (index === 0) return;
        setVariants((prev) => prev.map((v) => {
            if (v.rowId !== rowId) return v;
            const files = [...v.imageFiles];
            const previews = [...v.imagePreviews];
            [files[0], files[index]] = [files[index], files[0]];
            [previews[0], previews[index]] = [previews[index], previews[0]];
            return { ...v, imageFiles: files, imagePreviews: previews };
        }));
    };

    const getDraftMainImage = (vd: VariantDraft) => {
        if (vd.imagePreviews.length > 0) return vd.imagePreviews[0].url;
        return null;
    };

    const validate = (): boolean => {
        const errs: FormErrors = {};
        if (!name.trim()) errs.name = "Requerido";
        if (!purchasePrice || Number(purchasePrice) <= 0) errs.purchasePrice = "Ingresa un precio válido";
        if (!salePrice || Number(salePrice) <= 0) errs.salePrice = "Ingresa un precio válido";
        if (!minStock || Number(minStock) < 0) errs.minStock = "Requerido";
        if (!categoryId) errs.categoryId = "Requerido";

        if (variants.length === 0) {
            errs.variants = "Es necesario tener al menos una variante al crear un producto.";
        }

        variants.forEach((vd, i) => {
            const p = `v${i}`;
            let currentStock = vd.stock.trim();
            if (currentStock === "") {
                currentStock = "0";
                setV(vd.rowId, { stock: "0" });
            }
            if (vd.showNewColor && !vd.newColorName.trim()) errs[`${p}_newColorName`] = "Ingresa el nombre del color";
            if (vd.showNewSize && !vd.newSizeName.trim()) errs[`${p}_newSizeName`] = "Ingresa el nombre de la talla";
            if (Number(currentStock) < 0) errs[`${p}_stock`] = "Requerido";
            if (vd.salePrice.trim() !== "" && (Number.isNaN(Number(vd.salePrice)) || Number(vd.salePrice) < 0))
                errs[`${p}_salePrice`] = "Precio inválido";
            if (vd.purchasePrice.trim() !== "" && (Number.isNaN(Number(vd.purchasePrice)) || Number(vd.purchasePrice) < 0))
                errs[`${p}_purchasePrice`] = "Precio inválido";
        });

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const resolveColorId = async (vd: VariantDraft): Promise<number | undefined> => {
        if (vd.showNewColor) {
            if (!vd.newColorName.trim()) return undefined;
            const color = await createColor({ name: vd.newColorName.trim(), hexCode: vd.newColorHex });
            if (!color) throw new Error("color");
            return color.id;
        }
        if (vd.selectedColor) return vd.selectedColor.id;
        return undefined;
    };

    const resolveSizeId = async (vd: VariantDraft): Promise<number | undefined> => {
        if (vd.showNewSize) {
            if (!vd.newSizeName.trim()) return undefined;
            const size = await createSize({ name: vd.newSizeName.trim() });
            if (!size) throw new Error("size");
            return size.id;
        }
        if (vd.selectedSize) return vd.selectedSize.id;
        return undefined;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            const product = await ProductService.createProduct({
                name: name.trim(),
                purchasePrice: parseFloat(purchasePrice),
                salePrice: parseFloat(salePrice),
                categoryId: categoryId as number,
                minStock: parseInt(minStock, 10),
            });

            for (const vd of variants) {
                const colorId = await resolveColorId(vd);
                const sizeId = await resolveSizeId(vd);

                const payload: CreateProductsVariant = {
                    productId: product.id,
                    stock: parseInt(vd.stock, 10),
                    minStock: vd.minStock.trim() !== "" ? parseInt(vd.minStock, 10) : 0,
                };
                const skuValue = vd.sku.trim();
                if (skuValue !== "") payload.sku = skuValue;
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

                const variant = await createVariant(payload);
                if (!variant) throw new Error("variant");

                if (vd.imageFiles.length > 0) {
                    await uploadImage(variant.id, vd.imageFiles);
                }
            }

            onSuccess();
            handleClose();
        } catch (err) {
            console.error("[CreateProduct]", err);
            if (axios.isAxiosError(err) && err.response?.status === 409) {
                setSubmitError(
                    err.response.data?.message ??
                    "Ya existe una variante activa con esa combinación de color y talla."
                );
            } else {
                setSubmitError("Ocurrió un error al crear el producto. Verifica los datos e intenta de nuevo.");
            }
        } finally {
            setSubmitting(false);
        }
    };

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
                            /** Márgenes en móvil: modal flotante, no tapa todo el viewport */
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
                        Nuevo producto
                    </Typography>
                    <IconButton size="small" onClick={handleClose} disabled={submitting} aria-label="Cerrar">
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
                    {errors.variants && <Alert severity="error" sx={{ mb: 2.5 }}>{errors.variants}</Alert>}

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
                                    Completa el nombre y el stock mínimo global del producto; el detalle por color/talla va en variantes.
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
                                Cada variante se guarda al crear el producto. Color, talla, SKU y precio son opcionales (el stock inicial por defecto es 0). Puedes añadir varias antes de guardar.
                            </Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AddRoundedIcon />}
                            onClick={addVariantRow}
                            disabled={submitting}
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
                                {variants.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 4, color: "text.secondary" }}>
                                            No hay variantes agregadas. Haz clic en "Agregar variante" para añadir al menos una.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    variants.map((vd, vi) => {
                                        const ep = `v${vi}`;
                                        const fileInputId = `file-${vd.rowId}`;
                                        const mainImgSrc = getDraftMainImage(vd);
                                        const totalCount = vd.imagePreviews.length;

                                        return (
                                            <Fragment key={vd.rowId}>
                                                <TableRow hover>
                                                    {/* Cell: Thumbnail */}
                                                    <TableCell>
                                                        <Tooltip title="Gestionar imágenes">
                                                            <Box
                                                                onClick={() => setActiveImageEdit({ rowId: vd.rowId })}
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
                                                                {totalCount > 0 && (
                                                                    <Box sx={{
                                                                        position: "absolute", bottom: -2, right: -2,
                                                                        bgcolor: "primary.main", color: "primary.contrastText",
                                                                        borderRadius: "50%", width: 16, height: 16,
                                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                                        fontSize: 10, fontWeight: "bold"
                                                                    }}>
                                                                        {totalCount}
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                        </Tooltip>
                                                        <input
                                                            id={fileInputId}
                                                            type="file"
                                                            accept="image/*"
                                                            multiple
                                                            hidden
                                                            onChange={(e) => handleImageChange(vd.rowId, e)}
                                                        />
                                                    </TableCell>

                                                    {/* Cell: Color */}
                                                    <TableCell>
                                                        {!vd.showNewColor ? (
                                                            <FormControl size="small" fullWidth sx={{ minWidth: 120 }}>
                                                                <Select
                                                                    value={vd.selectedColor?.id ?? ""}
                                                                    displayEmpty
                                                                    onChange={(e) => {
                                                                        const val = e.target.value as unknown;
                                                                        if (val === "new") {
                                                                            setV(vd.rowId, { showNewColor: true, selectedColor: null });
                                                                        } else {
                                                                            const chosen = colors.find((c) => c.id === Number(val)) || null;
                                                                            setV(vd.rowId, { selectedColor: chosen });
                                                                        }
                                                                    }}
                                                                    sx={{ height: 40 }}
                                                                    disabled={submitting}
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
                                                                    onChange={(e) => setV(vd.rowId, { newColorName: e.target.value })}
                                                                    sx={{ flex: 1 }}
                                                                    error={!!errors[`${ep}_newColorName`]}
                                                                    helperText={errors[`${ep}_newColorName`]}
                                                                    disabled={submitting}
                                                                />
                                                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                                    <Box
                                                                        component="input"
                                                                        type="color"
                                                                        value={vd.newColorHex}
                                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setV(vd.rowId, { newColorHex: e.target.value })}
                                                                        sx={{ width: 28, height: 28, p: 0, border: "1px solid", borderColor: "divider", borderRadius: "50%", cursor: "pointer", bgcolor: "transparent" }}
                                                                        disabled={submitting}
                                                                    />
                                                                    <IconButton
                                                                        size="small"
                                                                        color="error"
                                                                        onClick={() => setV(vd.rowId, { showNewColor: false, newColorName: "", selectedColor: null })}
                                                                        disabled={submitting}
                                                                    >
                                                                        <CloseRoundedIcon sx={{ fontSize: 16 }} />
                                                                    </IconButton>
                                                                </Box>
                                                            </Box>
                                                        )}
                                                    </TableCell>

                                                    {/* Cell: Talla */}
                                                    <TableCell>
                                                        {!vd.showNewSize ? (
                                                            <FormControl size="small" fullWidth sx={{ minWidth: 100 }}>
                                                                <Select
                                                                    value={vd.selectedSize?.id ?? ""}
                                                                    displayEmpty
                                                                    onChange={(e) => {
                                                                        const val = e.target.value as unknown;
                                                                        if (val === "new") {
                                                                            setV(vd.rowId, { showNewSize: true, selectedSize: null });
                                                                        } else {
                                                                            const chosen = sizes.find((s) => s.id === Number(val)) || null;
                                                                            setV(vd.rowId, { selectedSize: chosen });
                                                                        }
                                                                    }}
                                                                    sx={{ height: 40 }}
                                                                    disabled={submitting}
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
                                                                    onChange={(e) => setV(vd.rowId, { newSizeName: e.target.value })}
                                                                    sx={{ flex: 1 }}
                                                                    error={!!errors[`${ep}_newSizeName`]}
                                                                    helperText={errors[`${ep}_newSizeName`]}
                                                                    disabled={submitting}
                                                                />
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={() => setV(vd.rowId, { showNewSize: false, newSizeName: "", selectedSize: null })}
                                                                    disabled={submitting}
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
                                                            value={vd.sku}
                                                            onChange={(e) => setV(vd.rowId, { sku: e.target.value })}
                                                            sx={{ width: 110 }}
                                                            disabled={submitting}
                                                        />
                                                    </TableCell>

                                                    {/* Cell: Stock */}
                                                    <TableCell>
                                                        <NumericField
                                                            size="small"
                                                            value={vd.stock}
                                                            onChange={(e) => setV(vd.rowId, { stock: e.target.value })}
                                                            onBlur={(e) => {
                                                                if (!e.target.value.trim()) {
                                                                    setV(vd.rowId, { stock: "0" });
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
                                                            disabled={submitting}
                                                        />
                                                    </TableCell>

                                                    {/* Cell: Stock Mínimo */}
                                                    <TableCell>
                                                        <NumericField
                                                            size="small"
                                                            value={vd.minStock}
                                                            onChange={(e) => setV(vd.rowId, { minStock: e.target.value })}
                                                            onBlur={(e) => {
                                                                if (!e.target.value.trim()) {
                                                                    setV(vd.rowId, { minStock: "0" });
                                                                }
                                                            }}
                                                            allowDecimals={false}
                                                            sx={{ width: 70 }}
                                                            slotProps={{ htmlInput: { min: 0 } }}
                                                            disabled={submitting}
                                                        />
                                                    </TableCell>

                                                    {/* Cell: Precio Compra */}
                                                    <TableCell>
                                                        <NumericField
                                                            size="small"
                                                            value={vd.purchasePrice}
                                                            onChange={(e) => setV(vd.rowId, { purchasePrice: e.target.value })}
                                                            allowDecimals={true}
                                                            sx={{ width: 95 }}
                                                            placeholder={purchasePrice || "—"}
                                                            disabled={submitting}
                                                            error={!!errors[`${ep}_purchasePrice`]}
                                                            helperText={errors[`${ep}_purchasePrice`]}
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
                                                            value={vd.salePrice}
                                                            onChange={(e) => setV(vd.rowId, { salePrice: e.target.value })}
                                                            allowDecimals={true}
                                                            sx={{ width: 95 }}
                                                            placeholder={salePrice || "—"}
                                                            disabled={submitting}
                                                            error={!!errors[`${ep}_salePrice`]}
                                                            helperText={errors[`${ep}_salePrice`]}
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
                                                                onClick={() => removeVariantRow(vd.rowId)}
                                                                disabled={submitting}
                                                            >
                                                                <DeleteOutlineRoundedIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>

                                                {/* Error Row */}
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
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Mobile Cards View */}
                    <Box sx={{ display: { xs: "flex", md: "none" }, flexDirection: "column", gap: 2, mb: 3 }}>
                        {variants.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                                No hay variantes agregadas. Haz clic en "Agregar variante" para añadir al menos una.
                            </Typography>
                        ) : (
                            variants.map((vd, vi) => {
                                const ep = `v${vi}`;
                                const mainImgSrc = getDraftMainImage(vd);
                                const totalCount = vd.imagePreviews.length;

                                return (
                                    <Paper
                                        key={vd.rowId}
                                        variant="outlined"
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            position: "relative",
                                            bgcolor: (t) => t.palette.mode === "dark" ? alpha(t.palette.common.white, 0.01) : alpha(t.palette.common.black, 0.01),
                                            border: "1px solid",
                                            borderColor: errors[`${ep}_combination`] ? "error.main" : "divider",
                                        }}
                                    >
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                            <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                                                Variante #{vi + 1}
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => removeVariantRow(vd.rowId)}
                                                disabled={submitting}
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
                                                            onClick={() => setActiveImageEdit({ rowId: vd.rowId })}
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
                                                            {totalCount > 0 && (
                                                                <Box sx={{
                                                                    position: "absolute", bottom: -2, right: -2,
                                                                    bgcolor: "primary.main", color: "primary.contrastText",
                                                                    borderRadius: "50%", width: 18, height: 18,
                                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                                    fontSize: 10, fontWeight: "bold"
                                                                }}>
                                                                    {totalCount}
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
                                                        onChange={(e) => setV(vd.rowId, { sku: e.target.value })}
                                                        disabled={submitting}
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
                                                                    setV(vd.rowId, { showNewColor: true, selectedColor: null });
                                                                } else {
                                                                    const chosen = colors.find((c) => c.id === Number(val)) || null;
                                                                    setV(vd.rowId, { selectedColor: chosen });
                                                                }
                                                            }}
                                                            sx={{ height: 40 }}
                                                            disabled={submitting}
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
                                                            onChange={(e) => setV(vd.rowId, { newColorName: e.target.value })}
                                                            sx={{ flex: 1 }}
                                                            error={!!errors[`${ep}_newColorName`]}
                                                            helperText={errors[`${ep}_newColorName`]}
                                                            disabled={submitting}
                                                        />
                                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                            <Box
                                                                component="input"
                                                                type="color"
                                                                value={vd.newColorHex}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setV(vd.rowId, { newColorHex: e.target.value })}
                                                                sx={{ width: 28, height: 28, p: 0, border: "1px solid", borderColor: "divider", borderRadius: "50%", cursor: "pointer", bgcolor: "transparent" }}
                                                                disabled={submitting}
                                                            />
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => setV(vd.rowId, { showNewColor: false, newColorName: "", selectedColor: null })}
                                                                disabled={submitting}
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
                                                                    setV(vd.rowId, { showNewSize: true, selectedSize: null });
                                                                } else {
                                                                    const chosen = sizes.find((s) => s.id === Number(val)) || null;
                                                                    setV(vd.rowId, { selectedSize: chosen });
                                                                }
                                                            }}
                                                            sx={{ height: 40 }}
                                                            disabled={submitting}
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
                                                            onChange={(e) => setV(vd.rowId, { newSizeName: e.target.value })}
                                                            sx={{ flex: 1 }}
                                                            error={!!errors[`${ep}_newSizeName`]}
                                                            helperText={errors[`${ep}_newSizeName`]}
                                                            disabled={submitting}
                                                        />
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => setV(vd.rowId, { showNewSize: false, newSizeName: "", selectedSize: null })}
                                                            disabled={submitting}
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
                                                        onChange={(e) => setV(vd.rowId, { stock: e.target.value })}
                                                        onBlur={(e) => {
                                                            if (!e.target.value.trim()) {
                                                                setV(vd.rowId, { stock: "0" });
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
                                                        disabled={submitting}
                                                    />
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" fontWeight={700} sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>Stock Mínimo</Typography>
                                                    <NumericField
                                                        size="small"
                                                        fullWidth
                                                        value={vd.minStock}
                                                        onChange={(e) => setV(vd.rowId, { minStock: e.target.value })}
                                                        onBlur={(e) => {
                                                            if (!e.target.value.trim()) {
                                                                setV(vd.rowId, { minStock: "0" });
                                                            }
                                                        }}
                                                        allowDecimals={false}
                                                        slotProps={{ htmlInput: { min: 0 } }}
                                                        disabled={submitting}
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
                                                        onChange={(e) => setV(vd.rowId, { purchasePrice: e.target.value })}
                                                        allowDecimals={true}
                                                        placeholder={purchasePrice || "—"}
                                                        disabled={submitting}
                                                        error={!!errors[`${ep}_purchasePrice`]}
                                                        helperText={errors[`${ep}_purchasePrice`]}
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
                                                        onChange={(e) => setV(vd.rowId, { salePrice: e.target.value })}
                                                        allowDecimals={true}
                                                        placeholder={salePrice || "—"}
                                                        disabled={submitting}
                                                        error={!!errors[`${ep}_salePrice`]}
                                                        helperText={errors[`${ep}_salePrice`]}
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
                            })
                        )}
                    </Box>
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
                    <Button variant="outlined" onClick={handleClose} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
                    >
                        {submitting ? "Guardando..." : "Crear producto"}
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
                            {(() => {
                                const vd = variants.find((draft) => draft.rowId === activeImageEdit.rowId);
                                if (!vd) return <Typography>Borrador no encontrado</Typography>;

                                const draftFileId = `file-${vd.rowId}`;
                                const draftFirst = vd.imagePreviews[0];
                                const draftRest = vd.imagePreviews.slice(1);

                                return (
                                    <Box>
                                        <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1.5, p: 2, bgcolor: "action.hover", borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
                                            <Box sx={{ width: 16, height: 16, borderRadius: "50%", bgcolor: (vd.selectedColor?.hexCode ?? vd.newColorName) || "action.disabledBackground", border: "1px solid", borderColor: "divider" }} />
                                            <Typography variant="subtitle1" fontWeight={700}>
                                                Variante: {(vd.selectedColor?.name ?? vd.newColorName) || "Sin color"} / {(vd.selectedSize?.name ?? vd.newSizeName) || "Sin talla"}
                                            </Typography>
                                        </Box>

                                        <Typography variant="body2" color="text.secondary" sx={{ display: "block", mb: 3 }}>
                                            La primera foto de la lista será la principal al guardar. Usa la estrella vacía en otra miniatura para colocarla primero.
                                        </Typography>

                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.5, alignItems: "flex-start" }}>
                                            {!draftFirst ? (
                                                <VariantPrimaryImageDropSlot
                                                    inputId={draftFileId}
                                                    onDropFiles={(files) => addVariantImages(vd.rowId, files)}
                                                    disabled={submitting}
                                                />
                                            ) : (
                                                <VariantImageThumb
                                                    size={VARIANT_PRIMARY_IMAGE_SIZE}
                                                    src={draftFirst.url}
                                                    alt={draftFirst.name}
                                                    isMain
                                                    onExpand={() => setImageLightbox({ src: draftFirst.url, alt: draftFirst.name })}
                                                    onRemove={() => removeImageAt(vd.rowId, 0)}
                                                />
                                            )}
                                            {draftRest.map((p, i) => (
                                                <VariantImageThumb
                                                    key={`${p.name}-${i + 1}`}
                                                    src={p.url}
                                                    alt={p.name}
                                                    onExpand={() => setImageLightbox({ src: p.url, alt: p.name })}
                                                    onRemove={() => removeImageAt(vd.rowId, i + 1)}
                                                    onSetAsMain={() => makeVariantImageMain(vd.rowId, i + 1)}
                                                    setAsMainDisabled={submitting}
                                                />
                                            ))}
                                            {draftFirst ? (
                                                <VariantAddMoreImagesButton inputId={draftFileId} disabled={submitting} />
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
