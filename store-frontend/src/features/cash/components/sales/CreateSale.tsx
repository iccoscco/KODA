"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
    FormHelperText,
    IconButton,
    InputAdornment,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import { ApiService } from "@/shared/services/api.service";
import { useAuthStore, type AuthState } from "@/store/auth.store";
import { useHasPermission } from "@/shared/hooks/usePermission";
import { PERMISSIONS } from "@/shared/config/permissions";
import { Product } from "@/features/products/types/productsTypes";
import { ProductsVariant } from "@/features/products/types/productsVariantTypes";
import type { CreateSale as CreateSalePayload, PaymentMethod } from "../../types/salesTypes";
import { useCreateSale } from "../../hooks/saleHooks";
import { CashService } from "../../services/cash.service";
import { NotificationService } from "@/features/notifications/services/notification.service";
import { useNotificationsStore } from "@/store/notifications.store";
import { effectiveVariantSalePrice, effectiveVariantPurchasePrice } from "../../utils/effectivePrice";
import { SaleVariantPicker, SaleVariantImages, variantLabel } from "./VariantCarousel";
import { ImageLightbox } from "@/features/products/components/variantImageUi";
import { getStoredCashRegisterId } from "@/shared/config/posCashRegister";
import {
    adminFormDialogActionsSx,
    adminFormDialogContentSx,
    adminFormDialogPaperSx,
    adminFormDialogTitleRowSx,
} from "@/shared/mui/adminFormDialog";
import useMediaQuery from "@mui/material/useMediaQuery";
import { NumericField } from "@/shared/components/NumericField";

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: (orderId: number) => void;
}

type FormErrors = Record<string, string>;

const PAYMENT_METHODS: PaymentMethod[] = ["YAPE", "PLIN", "CASH", "TRANSFER", "CARD"];

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
    YAPE: "Yape",
    PLIN: "Plin",
    CASH: "Efectivo",
    TRANSFER: "Transferencia",
    CARD: "Tarjeta",
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

function newLineId(): string {
    return typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `line-${Date.now()}-${Math.random()}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function parseMoney(input: string): number {
    const n = parseFloat(input.replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
}

function parseQty(input: string): number {
    const n = parseInt(input, 10);
    return Number.isFinite(n) ? n : 0;
}

interface VariantOption {
    id: string;
    product: Product;
    variant: ProductsVariant;
    variantIndex: number;
    label: string;
}

interface LineDraft {
    lineId: string;
    product: Product | null;
    variantIndex: number;
    quantity: string;
    unitPrice: string; // precio unitario final; vacío = usar precio efectivo del producto
}

interface PaymentLine {
    id: string;
    method: PaymentMethod;
    amount: string; // cadena editable; vacío solo si hay 1 línea (se usa orderTotal)
}

function activeVariants(product: Product | null): ProductsVariant[] {
    if (!product?.variants?.length) return [];
    return product.variants.filter((v) => v.isActive);
}

interface WarningLine {
    lineIndex: number;
    productName: string;
    unitPrice: number;
    purchasePrice: number;
    kind: "belowPurchase" | "free";
}

/**
 * Debe devolver un valor estable con `===` entre dos lecturas (p. ej. `null`), no `NaN`:
 * en hidratación React compara getServerSnapshot() dos veces con `===` y `NaN !== NaN`.
 */
const selectAuthUserId = (s: AuthState): number | null => {
    if (!s.user) return null;
    const n = Number(s.user.id);
    return Number.isFinite(n) ? n : null;
};

export default function CreateSale({ open, onClose, onSuccess }: Props) {
    const theme = useTheme();
    const isSmUp = useMediaQuery(theme.breakpoints.up("sm"), { defaultMatches: true });
    const { execute: createSale, loading: submitting } = useCreateSale();
    const authUserId = useAuthStore(selectAuthUserId);
    const canSellBelowSale = useHasPermission(PERMISSIONS.ORDERS.MODIFY_PRICE_BELOW_SALE);
    const canSellBelowPurchase = useHasPermission(PERMISSIONS.ORDERS.MODIFY_PRICE_BELOW_PURCHASE);
    const canNotifications = useHasPermission(PERMISSIONS.NOTIFICATIONS.READ);
    const setUnreadCount = useNotificationsStore((s) => s.setUnreadCount);
    /** Precio unitario 0: el backend exige permisos bajo PVP y bajo costo (cero queda por debajo de ambos). */
    const canSellAtZeroUnit = canSellBelowSale && canSellBelowPurchase;

    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const variantOptions = useMemo(() => {
        const list: VariantOption[] = [];
        products.forEach((p) => {
            const vars = activeVariants(p);
            vars.forEach((v, index) => {
                const parts = [];
                if (v.colorName) parts.push(v.colorName);
                if (v.sizeName) parts.push(v.sizeName);
                const variantStr = parts.join(" / ");
                const label = variantStr
                    ? `${p.name} - ${variantStr}${v.sku ? ` (SKU: ${v.sku})` : ""}`
                    : `${p.name}${v.sku ? ` (SKU: ${v.sku})` : ""}`;
                list.push({
                    id: `${p.id}-${v.id}-${index}`,
                    product: p,
                    variant: v,
                    variantIndex: index,
                    label,
                });
            });
        });
        return list;
    }, [products]);

    const [lines, setLines] = useState<LineDraft[]>(() => [
        { lineId: newLineId(), product: null, variantIndex: 0, quantity: "", unitPrice: "" },
    ]);

    const [fullName, setFullName] = useState("");

    const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([
        { id: newLineId(), method: "CASH", amount: "" },
    ]);

    const [errors, setErrors] = useState<FormErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmWarnings, setConfirmWarnings] = useState<WarningLine[]>([]);
    const payloadRef = useRef<CreateSalePayload | null>(null);
    const [imageLightbox, setImageLightbox] = useState<{ src: string; alt: string } | null>(null);

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency: "PEN",
            maximumFractionDigits: 2,
        }).format(n);

    const clampVariantIndex = (variantsCount: number, index: number) =>
        variantsCount <= 0 ? 0 : Math.min(Math.max(0, index), variantsCount - 1);

    /** Variante activa seleccionada de una línea (o null si no hay). */
    const getVariantForLine = (line: LineDraft): ProductsVariant | null => {
        if (!line.product) return null;
        const vars = activeVariants(line.product);
        if (vars.length === 0) return null;
        const vi = clampVariantIndex(vars.length, line.variantIndex);
        return vars[vi] ?? null;
    };

    const computeUnitPriceForLine = (line: LineDraft): number => {
        if (!line.product) return 0;
        const priceTrim = line.unitPrice.trim();
        if (!priceTrim) return round2(effectiveVariantSalePrice(line.product, getVariantForLine(line)));
        const p = parseMoney(priceTrim);
        if (!Number.isFinite(p) || p < 0) return 0;
        return round2(p);
    };

    useEffect(() => {
        if (!open) return;

        setLoadError(null);
        setSubmitError(null);
        setErrors({});
        payloadRef.current = null;
        setConfirmOpen(false);
        setConfirmWarnings([]);

        setLines([{ lineId: newLineId(), product: null, variantIndex: 0, quantity: "", unitPrice: "" }]);
        setFullName("");
        setPaymentLines([{ id: newLineId(), method: "CASH", amount: "" }]);

        let cancelled = false;
        (async () => {
            setLoadingProducts(true);
            try {
                // Sin paginación: backend devuelve List<ProductDTO> en vez de paginado
                const res = await ApiService.get<Product[]>("/products");
                if (cancelled) return;
                setProducts(res.data.filter((p) => p.isActive));
            } catch {
                if (!cancelled) setLoadError("No se pudieron cargar los productos.");
            } finally {
                if (!cancelled) setLoadingProducts(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open]);

    useEffect(() => {
        if (!open) setImageLightbox(null);
    }, [open]);

    const lineTotals = useMemo(() => {
        return lines.map((line) => {
            if (!line.product) return { unit: 0, line: 0 };
            const vars = activeVariants(line.product);
            if (vars.length === 0) return { unit: 0, line: 0 };

            const vi = clampVariantIndex(vars.length, line.variantIndex);
            const v = vars[vi];
            if (!v) return { unit: 0, line: 0 };

            const unit = computeUnitPriceForLine(line);
            if (!Number.isFinite(unit) || unit <= 0) return { unit: 0, line: 0 };

            const qty = parseInt(line.quantity, 10);
            if (!qty || qty < 1) return { unit, line: 0 };

            return { unit, line: round2(unit * qty) };
        });
    }, [lines]);

    const orderTotal = useMemo(
        () => round2(lineTotals.reduce((s, t) => s + t.line, 0)),
        [lineTotals],
    );

    const setLine = (lineId: string, patch: Partial<LineDraft>) => {
        setLines((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, ...patch } : l)));
    };

    /** Unidades de esta variante ya contadas en otras líneas del mismo pedido. */
    const stockReservedByOtherLines = (lineId: string, variant: ProductsVariant): number => {
        return lines.reduce((sum, line) => {
            if (line.lineId === lineId) return sum;
            const selected = getVariantForLine(line);
            if (!selected || selected.id !== variant.id) return sum;
            const qty = parseQty(line.quantity);
            return sum + (qty > 0 ? qty : 0);
        }, 0);
    };

    const availableStockForLine = (lineId: string, variant: ProductsVariant): number => {
        const reservedByOthers = stockReservedByOtherLines(lineId, variant);
        return Math.max(0, variant.stock - reservedByOthers);
    };

    const handleVariantChange = (line: LineDraft, idx: number) => {
        if (!line.product) return;
        const vars = activeVariants(line.product);
        const vi = clampVariantIndex(vars.length, idx);
        const nextVariant = vars[vi];
        if (!nextVariant) return;

        const maxAllowed = availableStockForLine(line.lineId, nextVariant);
        if (maxAllowed <= 0) {
            setErrors((prev) => ({
                ...prev,
                [`line_${lines.findIndex((l) => l.lineId === line.lineId)}_variant`]:
                    "No hay stock disponible para esta variante en esta venta.",
            }));
            return;
        }

        const currentQty = parseQty(line.quantity);
        const nextQty = currentQty > 0 ? Math.min(currentQty, maxAllowed) : 0;
        // Al cambiar de variante re-pre-cargamos el precio unitario con el precio efectivo
        // de la NUEVA variante (que puede diferir: p. ej. talla XXL cuesta más que S).
        // Si el usuario ya había editado a mano el precio, también lo sobreescribimos para
        // evitar vender la talla XXL al precio de la S por descuido.
        const nextUnitPrice = String(round2(effectiveVariantSalePrice(line.product, nextVariant)));
        setLine(line.lineId, {
            variantIndex: vi,
            quantity: nextQty > 0 ? String(nextQty) : "",
            unitPrice: nextUnitPrice,
        });
    };

    const getPriceWarning = (line: LineDraft): string | null => {
        if (!line.product) return null;
        const priceTrim = line.unitPrice.trim();
        if (!priceTrim) return null;

        const price = parseMoney(priceTrim);
        if (!Number.isFinite(price) || price < 0) return null;

        const variant = getVariantForLine(line);
        const salePrice = effectiveVariantSalePrice(line.product, variant);
        const purchasePrice = effectiveVariantPurchasePrice(line.product, variant);

        if (price === 0) {
            if (canSellAtZeroUnit) {
                return "El precio unitario es cero: este ítem se registra como venta gratuita.";
            }
            return null;
        }

        if (price < purchasePrice) {
            if (canSellBelowPurchase) {
                return `El precio ${formatCurrency(price)} está por debajo del costo (${formatCurrency(purchasePrice)}): la venta generará pérdidas en esta línea.`;
            }
            return null;
        }

        if (price < salePrice) {
            return `Precio unitario ${formatCurrency(price)} (rango permitido: ${formatCurrency(purchasePrice)} – ${formatCurrency(salePrice)}).`;
        }
        return null;
    };

    const getPriceErrorRealtime = (line: LineDraft): string | null => {
        if (!line.product) return null;
        const priceTrim = line.unitPrice.trim();
        if (!priceTrim) return null;

        const price = parseMoney(priceTrim);
        if (!Number.isFinite(price) || price < 0) return "Precio inválido";

        const variant = getVariantForLine(line);
        const salePrice = effectiveVariantSalePrice(line.product, variant);
        const purchasePrice = effectiveVariantPurchasePrice(line.product, variant);

        if (price === 0) {
            if (!canSellAtZeroUnit) {
                return "No tienes permiso para establecer el precio en cero (venta gratuita). Requiere permisos de venta bajo PVP y bajo costo.";
            }
            return null;
        }

        if (price < purchasePrice) {
            if (!canSellBelowPurchase) {
                return "No tienes permiso para vender por debajo del costo de compra.";
            }
            return null;
        }

        if (price < salePrice && !canSellBelowSale) {
            return `No tienes permiso para vender por debajo del precio de venta (${formatCurrency(salePrice)}).`;
        }

        return null;
    };

    const addLine = () => {
        setLines((prev) => [
            ...prev,
            { lineId: newLineId(), product: null, variantIndex: 0, quantity: "", unitPrice: "" },
        ]);
    };

    const removeLine = (lineId: string) => {
        setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.lineId !== lineId)));
    };

    // ── Helpers de líneas de pago ─────────────────────────────────────────────
    const updatePaymentLine = (id: string, patch: Partial<PaymentLine>) =>
        setPaymentLines((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

    const addPaymentLine = () =>
        setPaymentLines((prev) => [...prev, { id: newLineId(), method: "CASH", amount: "" }]);

    const removePaymentLine = (id: string) =>
        setPaymentLines((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.id !== id)));

    /** Suma de montos ingresados (para múltiples líneas). */
    const distributedTotal = round2(
        paymentLines.reduce((s, p) => s + (parseMoney(p.amount) || 0), 0),
    );
    const pendingAmount = round2(orderTotal - distributedTotal);

    /**
     * Máximo que puede tener una línea de pago = total de orden − suma del resto de líneas.
     * Garantiza que ninguna línea pueda superar lo que queda disponible.
     */
    const maxForPaymentLine = (id: string): number => {
        const otherSum = round2(
            paymentLines
                .filter((p) => p.id !== id)
                .reduce((s, p) => s + (parseMoney(p.amount) || 0), 0),
        );
        return Math.max(0, round2(orderTotal - otherSum));
    };

    const handlePaymentAmountChange = (id: string, rawValue: string) => {
        if (rawValue === "") {
            updatePaymentLine(id, { amount: "" });
            return;
        }
        const parsed = parseMoney(rawValue);
        if (!Number.isFinite(parsed) || parsed < 0) return;
        const max = maxForPaymentLine(id);
        const clamped = round2(Math.min(parsed, max));
        updatePaymentLine(id, { amount: String(clamped) });
    };

    const validate = (): boolean => {
        const errs: FormErrors = {};

        if (authUserId == null || !Number.isFinite(authUserId)) {
            errs.session = "Sesión no válida. Inicia sesión para vender.";
        }

        lines.forEach((line, i) => {
            const prefix = `line_${i}`;

            if (!line.product) {
                errs[`${prefix}_product`] = "Selecciona un producto";
                return;
            }

            const vars = activeVariants(line.product);
            if (vars.length === 0) {
                errs[`${prefix}_variant`] = "Este producto no tiene variantes disponibles";
                return;
            }

            const vi = clampVariantIndex(vars.length, line.variantIndex);
            const v = vars[vi];
            if (!v) {
                errs[`${prefix}_variant`] = "Variante inválida";
                return;
            }

            const qty = parseInt(line.quantity, 10);
            if (!qty || qty < 1) {
                errs[`${prefix}_qty`] = "Cantidad mínima 1";
                return;
            }
            const maxForThisLine = availableStockForLine(line.lineId, v);
            if (qty > maxForThisLine) {
                errs[`${prefix}_qty`] = `Stock disponible para este ítem: ${maxForThisLine}`;
                return;
            }

            const priceTrim = line.unitPrice.trim();
            if (priceTrim) {
                const price = parseMoney(priceTrim);
                if (!Number.isFinite(price) || price < 0) {
                    errs[`${prefix}_unitPrice`] = "Precio inválido";
                    return;
                }
                const variant = getVariantForLine(line);
                const salePrice = effectiveVariantSalePrice(line.product, variant);
                const purchasePrice = effectiveVariantPurchasePrice(line.product, variant);
                if (price === 0) {
                    if (!canSellAtZeroUnit) {
                        errs[`${prefix}_unitPrice`] =
                            "No tienes permiso para establecer el precio en cero (venta gratuita).";
                    }
                    return;
                }
                if (price < purchasePrice && !canSellBelowPurchase) {
                    errs[`${prefix}_unitPrice`] =
                        "No tienes permiso para vender por debajo del costo de compra.";
                    return;
                }
                if (price < salePrice && !canSellBelowSale) {
                    errs[`${prefix}_unitPrice`] =
                        `No tienes permiso para vender por debajo del precio de venta (${formatCurrency(salePrice)}).`;
                }
            }
        });

        if (orderTotal < 0) {
            errs.total = "El total no puede ser negativo";
        } else if (orderTotal === 0) {
            if (!canSellAtZeroUnit) {
                errs.total = "El total debe ser mayor a cero, o necesitas permisos para ventas con ítems a precio cero.";
            }
        }

        // Validar líneas de pago (cuando hay más de 1 línea los montos son manuales)
        if (paymentLines.length > 1) {
            paymentLines.forEach((p, i) => {
                const a = parseMoney(p.amount);
                if (!Number.isFinite(a) || a <= 0) {
                    errs[`payment_${i}`] = "Monto inválido";
                }
            });
            const sum = round2(paymentLines.reduce((s, p) => s + (parseMoney(p.amount) || 0), 0));
            if (Math.abs(sum - orderTotal) > 0.01) {
                errs.payment = `La suma de pagos (${formatCurrency(sum)}) debe ser igual al total (${formatCurrency(orderTotal)})`;
            }
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const buildPayload = () => {
        const userId = authUserId!;

        const warnings: WarningLine[] = [];
        const orderItems = lines.map((line, i) => {
            const product = line.product!;
            const vars = activeVariants(product);
            const vi = clampVariantIndex(vars.length, line.variantIndex);
            const v = vars[vi]!;

            const qty = parseInt(line.quantity, 10);

            const base = effectiveVariantSalePrice(product, v);
            const effectivePurchase = effectiveVariantPurchasePrice(product, v);
            const priceTrim = line.unitPrice.trim();
            const enteredPrice = priceTrim ? parseMoney(priceTrim) : null;
            const customUnitPrice =
                enteredPrice != null && Number.isFinite(enteredPrice) && round2(enteredPrice) !== round2(base)
                    ? round2(enteredPrice)
                    : undefined;

            const actualUnitPrice = customUnitPrice ?? round2(base);
            if (actualUnitPrice === 0) {
                warnings.push({
                    lineIndex: i,
                    productName: product.name,
                    unitPrice: 0,
                    purchasePrice: effectivePurchase,
                    kind: "free",
                });
            } else if (actualUnitPrice < effectivePurchase) {
                warnings.push({
                    lineIndex: i,
                    productName: product.name,
                    unitPrice: actualUnitPrice,
                    purchasePrice: effectivePurchase,
                    kind: "belowPurchase",
                });
            }

            return {
                productVariantId: v.id,
                quantity: qty,
                ...(customUnitPrice != null ? { customUnitPrice } : {}),
            };
        });

        const cashRegisterId = getStoredCashRegisterId();
        const payments =
            paymentLines.length === 1
                ? [{ method: paymentLines[0].method, amount: orderTotal }]
                : paymentLines.map((p) => ({
                    method: p.method,
                    amount: round2(parseMoney(p.amount)),
                }));

        const payload: CreateSalePayload = {
            userId,
            orderItems,
            shippingAddress: { fullName: fullName.trim() || "Público General" },
            payments,
            ...(cashRegisterId != null ? { cashRegisterId } : {}),
        };

        return { payload, warnings };
    };

    const doCreateSale = async (payload: CreateSalePayload) => {
        setSubmitError(null);
        const result = await createSale(payload);
        if (result) {
            if (canNotifications) {
                void NotificationService.getUnreadCount()
                    .then(setUnreadCount)
                    .catch(() => { });
            }
            onSuccess(result.id);
            onClose();
        } else {
            setSubmitError("No se pudo registrar la venta. Verifica permisos, stock y totales.");
        }
    };

    const handleSubmit = () => {
        if (!validate()) return;

        const { payload, warnings } = buildPayload();

        if (warnings.length > 0) {
            payloadRef.current = payload;
            setConfirmWarnings(warnings);
            setConfirmOpen(true);
            return;
        }

        void doCreateSale(payload);
    };

    const handleConfirm = () => {
        if (!payloadRef.current) return;
        const payload = payloadRef.current;
        payloadRef.current = null;
        setConfirmOpen(false);
        void doCreateSale(payload);
    };

    const handleClose = () => {
        (document.activeElement as HTMLElement)?.blur();
        onClose();
    };

    const variantCardBg =
        theme.palette.mode === "dark"
            ? alpha(theme.palette.common.white, 0.04)
            : alpha(theme.palette.common.black, 0.03);
    const summaryHighlightBg =
        theme.palette.mode === "dark"
            ? alpha(theme.palette.primary.main, 0.14)
            : alpha(theme.palette.primary.main, 0.07);

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="md"
                fullWidth
                closeAfterTransition={false}
                disableRestoreFocus
                scroll="paper"
                slotProps={{
                    paper: {
                        sx: {
                            ...adminFormDialogPaperSx,
                            maxWidth: { xs: "100%", sm: 820 },
                        },
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        ...adminFormDialogTitleRowSx,
                        alignItems: { xs: "flex-start", sm: "center" },
                        borderBottom: 1,
                        borderColor: "divider",
                    }}
                >
                    <Box sx={{ minWidth: 0, pr: 1 }}>
                        <Typography
                            component="span"
                            variant="h6"
                            fontWeight={800}
                            letterSpacing="0.06em"
                            sx={{ color: "primary.main", fontSize: { xs: "1rem", sm: "1.25rem" }, display: "block" }}
                        >
                            Nueva venta
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.5, fontWeight: 400, letterSpacing: 0, lineHeight: 1.4 }}
                        >
                            Añade productos, indica el cliente y el pago. El total se calcula solo.
                        </Typography>
                    </Box>
                    <IconButton size="small" onClick={handleClose} disabled={submitting} aria-label="Cerrar" sx={{ flexShrink: 0 }}>
                        <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent
                    dividers
                    sx={{
                        ...adminFormDialogContentSx,
                        display: "flex",
                        flexDirection: "column",
                        gap: 0,
                        pt: 2.5,
                    }}
                >
                    <Stack spacing={2} sx={{ mb: 2.5 }}>
                        {loadError && <Alert severity="warning">{loadError}</Alert>}
                        {submitError && <Alert severity="error">{submitError}</Alert>}
                        {errors.session && <Alert severity="error">{errors.session}</Alert>}
                        {getStoredCashRegisterId() == null && (
                            <Alert severity="info">
                                Si hay varias cajas abiertas, elige la tuya en <strong>Caja</strong> para imputar la venta al turno correcto.
                            </Alert>
                        )}
                    </Stack>

                    {loadingProducts && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                            <CircularProgress size={22} />
                            <Typography variant="body2" color="text.secondary">
                                Cargando catálogo de productos…
                            </Typography>
                        </Box>
                    )}

                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: { xs: "column", sm: "row" },
                            alignItems: { xs: "stretch", sm: "flex-start" },
                            justifyContent: "space-between",
                            gap: 1.5,
                            mb: 1.5,
                        }}
                    >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <SectionTitle sx={{ mb: 0.5 }}>Productos en esta venta</SectionTitle>
                            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
                                Busca el producto, elige color o talla si aplica, cantidad y —solo si hace falta— un precio distinto al de etiqueta.
                            </Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AddRoundedIcon />}
                            onClick={addLine}
                            disabled={submitting || loadingProducts}
                            fullWidth={!isSmUp}
                            sx={{
                                flexShrink: 0,
                                borderColor: "primary.main",
                                color: "primary.main",
                                fontWeight: 700,
                                alignSelf: { xs: "stretch", sm: "center" },
                            }}
                        >
                            Agregar producto
                        </Button>
                    </Box>

                    {lines.map((line, i) => {
                        const errKey = `line_${i}`;
                        const vars = activeVariants(line.product);
                        const variantCount = vars.length;
                        const variantIdx = clampVariantIndex(variantCount, line.variantIndex);
                        const priceError = getPriceErrorRealtime(line);
                        const priceWarning = getPriceWarning(line);

                        return (
                            <Box
                                key={line.lineId}
                                sx={{
                                    mb: 2.5,
                                    p: { xs: 1.5, sm: 2.5 },
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 2,
                                    bgcolor: variantCardBg,
                                }}
                            >
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        Línea {i + 1}
                                    </Typography>
                                    {lines.length > 1 && (
                                        <IconButton size="small" onClick={() => removeLine(line.lineId)} aria-label="Quitar línea">
                                            <DeleteOutlineRoundedIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </Box>

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(300px, 340px)" },
                                        gap: { xs: 2.5, md: 3 },
                                        alignItems: "start",
                                    }}
                                >
                                    <Stack spacing={2} sx={{ minWidth: 0, order: { xs: 2, md: 1 } }}>
                                        <Autocomplete
                                            options={variantOptions}
                                            value={(() => {
                                                if (!line.product) return null;
                                                const vars = activeVariants(line.product);
                                                const vi = clampVariantIndex(vars.length, line.variantIndex);
                                                const activeV = vars[vi];
                                                if (!activeV) return null;
                                                return variantOptions.find((o) => o.product.id === line.product?.id && o.variant.id === activeV.id) ?? null;
                                            })()}
                                            onChange={(_, opt) => {
                                                if (!opt) {
                                                    setLine(line.lineId, {
                                                        product: null,
                                                        variantIndex: 0,
                                                        unitPrice: "",
                                                    });
                                                    return;
                                                }
                                                setLine(line.lineId, {
                                                    product: opt.product,
                                                    variantIndex: opt.variantIndex,
                                                    unitPrice: String(round2(effectiveVariantSalePrice(opt.product, opt.variant))),
                                                });
                                            }}
                                            getOptionLabel={(opt) => opt.label}
                                            filterOptions={(options, state) => {
                                                const query = state.inputValue.trim().toLowerCase();
                                                return options.filter((o) => o.label.toLowerCase().includes(query));
                                            }}
                                            loading={loadingProducts}
                                            disabled={submitting}
                                            fullWidth
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Buscar variante o SKU"
                                                    placeholder="Escribe producto, talla, color o SKU…"
                                                    size="small"
                                                    error={!!errors[`${errKey}_product`]}
                                                    helperText={errors[`${errKey}_product`]}
                                                />
                                            )}
                                        />

                                        {line.product && (
                                            <>
                                                {variantCount > 1 && (
                                                    <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                                                        Variante{" "}
                                                        <Typography component="span" variant="caption" fontWeight={400}>
                                                            (color · talla)
                                                        </Typography>
                                                    </Typography>
                                                )}
                                                <SaleVariantPicker
                                                    product={line.product}
                                                    variants={vars}
                                                    activeIndex={variantIdx}
                                                    onIndexChange={(idx) => handleVariantChange(line, idx)}
                                                    formatCurrency={formatCurrency}
                                                    unitPriceOverride={lineTotals[i]?.unit}
                                                />

                                                {errors[`${errKey}_variant`] && (
                                                    <FormHelperText error sx={{ mt: 0 }}>
                                                        {errors[`${errKey}_variant`]}
                                                    </FormHelperText>
                                                )}

                                                <Stack spacing={2} sx={{ width: "100%" }}>
                                                    <Box sx={{ width: "100%" }}>
                                                        <NumericField
                                                            label="Cantidad"
                                                            size="small"
                                                            fullWidth
                                                            allowDecimals={false}
                                                            value={line.quantity}
                                                            onChange={(e) => {
                                                                const raw = e.target.value;
                                                                if (raw === "") {
                                                                    setLine(line.lineId, { quantity: "" });
                                                                    return;
                                                                }
                                                                if (!/^\d+$/.test(raw)) return;

                                                                const selectedVariant = vars[variantIdx];
                                                                const maxAllowed = selectedVariant
                                                                    ? availableStockForLine(line.lineId, selectedVariant)
                                                                    : 0;
                                                                const parsed = parseInt(raw, 10);
                                                                const safe = Math.max(0, parsed);
                                                                const capped = maxAllowed > 0 ? Math.min(safe, maxAllowed) : 0;
                                                                setLine(line.lineId, { quantity: capped > 0 ? String(capped) : "" });
                                                            }}
                                                            error={!!errors[`${errKey}_qty`]}
                                                            helperText={errors[`${errKey}_qty`]}
                                                            slotProps={{ htmlInput: { min: 0, step: 1 } }}
                                                            disabled={submitting}
                                                        />
                                                        {(() => {
                                                            const selectedVariant = vars[variantIdx];
                                                            if (!selectedVariant) return null;
                                                            const reservedElsewhere = stockReservedByOtherLines(
                                                                line.lineId,
                                                                selectedVariant,
                                                            );
                                                            const maxHere = availableStockForLine(line.lineId, selectedVariant);
                                                            const total = selectedVariant.stock;

                                                            let hint: string;
                                                            const stockBlockedElsewhere =
                                                                total > 0 && maxHere <= 0 && reservedElsewhere > 0;
                                                            if (total <= 0) {
                                                                hint = "Sin stock en almacén para esta variante.";
                                                            } else if (stockBlockedElsewhere) {
                                                                hint = `Las ${total} u. disponibles ya están repartidas en otra(s) línea(s) de esta venta (${reservedElsewhere} u.). No puedes sumar más aquí.`;
                                                            } else if (reservedElsewhere > 0) {
                                                                hint = `En otras líneas llevas ${reservedElsewhere} u. de esta variante; en esta línea puedes indicar hasta ${maxHere} (stock en almacén: ${total}).`;
                                                            } else {
                                                                hint = `Máximo en esta línea: ${maxHere} u. (stock en almacén: ${total}).`;
                                                            }

                                                            return (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                    sx={{
                                                                        display: "block",
                                                                        mt: 0.75,
                                                                        lineHeight: 1.4,
                                                                        ...(stockBlockedElsewhere ? { color: "warning.main" } : {}),
                                                                    }}
                                                                >
                                                                    {hint}
                                                                </Typography>
                                                            );
                                                        })()}
                                                    </Box>

                                                    <NumericField
                                                        label="Precio unitario"
                                                        size="small"
                                                        fullWidth
                                                        allowDecimals={true}
                                                        value={line.unitPrice}
                                                        onChange={(e) => {
                                                            const raw = e.target.value;
                                                            if (raw === "") {
                                                                setLine(line.lineId, { unitPrice: "" });
                                                                return;
                                                            }
                                                            const parsed = parseMoney(raw);
                                                            if (!Number.isFinite(parsed) || parsed < 0) return;
                                                            setLine(line.lineId, { unitPrice: raw });
                                                        }}
                                                        sx={{ minWidth: 0 }}
                                                        error={!!errors[`${errKey}_unitPrice`] || !!priceError}
                                                        helperText={
                                                            errors[`${errKey}_unitPrice`] || priceError || undefined
                                                        }
                                                        slotProps={{
                                                            input: {
                                                                startAdornment: <InputAdornment position="start">S/</InputAdornment>,
                                                            },
                                                            htmlInput: { min: 0, step: "0.01" },
                                                        }}
                                                        disabled={submitting}
                                                    />
                                                    {!(errors[`${errKey}_unitPrice`] || priceError) && (
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            component="div"
                                                            sx={{ lineHeight: 1.45, maxWidth: "100%", mt: -0.5 }}
                                                        >
                                                            Por defecto: precio de venta. Solo cámbialo si el cobro es distinto (oferta o acordado).
                                                        </Typography>
                                                    )}
                                                </Stack>
                                                {!errors[`${errKey}_unitPrice`] && !priceError && priceWarning && (
                                                    <FormHelperText sx={{ color: "warning.main", mt: 0 }}>
                                                        {priceWarning}
                                                    </FormHelperText>
                                                )}

                                                <Box
                                                    sx={{
                                                        py: 1,
                                                        px: 1.5,
                                                        borderRadius: 1,
                                                        bgcolor: alpha(theme.palette.divider, theme.palette.mode === "dark" ? 0.25 : 0.15),
                                                    }}
                                                >
                                                    <Typography variant="body2" fontWeight={700} color="text.primary">
                                                        Subtotal línea: {formatCurrency(lineTotals[i]?.line ?? 0)}
                                                    </Typography>
                                                </Box>
                                            </>
                                        )}
                                    </Stack>

                                    <Box
                                        sx={{
                                            order: { xs: 1, md: 2 },
                                            position: { md: "sticky" },
                                            top: { md: 8 },
                                            alignSelf: "start",
                                            width: "100%",
                                            p: { xs: 1.25, md: 1.75 },
                                            borderRadius: 2,
                                            border: "1px solid",
                                            borderColor: "divider",
                                            bgcolor: "action.hover",
                                        }}
                                    >
                                        <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mb: 0.5 }}>
                                            Foto del producto
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                                            {line.product
                                                ? "Vista grande de la variante elegida. Lupa para pantalla completa."
                                                : "Aparece al elegir un producto."}
                                        </Typography>
                                        {line.product ? (
                                            <SaleVariantImages
                                                images={vars[variantIdx]?.images}
                                                productName={line.product.name}
                                                variantDescription={
                                                    vars[variantIdx] ? variantLabel(vars[variantIdx]) : ""
                                                }
                                                onExpand={(src, alt) => setImageLightbox({ src, alt })}
                                            />
                                        ) : (
                                            <Box
                                                sx={{
                                                    minHeight: 220,
                                                    borderRadius: 2,
                                                    border: "1px dashed",
                                                    borderColor: "divider",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    px: 2,
                                                    bgcolor: alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.12 : 0.04),
                                                }}
                                            >
                                                <Typography variant="body2" color="text.disabled" textAlign="center">
                                                    Selecciona un producto para ver la foto aquí.
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })}

                    <Box
                        sx={{
                            p: { xs: 1.5, sm: 2.5 },
                            borderRadius: 2,
                            mb: 3,
                            border: "1px solid",
                            borderColor: "primary.main",
                            bgcolor: summaryHighlightBg,
                        }}
                    >
                        <Typography variant="overline" color="primary" fontWeight={700} letterSpacing="0.12em" sx={{ display: "block", mb: 0.5 }}>
                            Total a cobrar
                        </Typography>
                        <Typography variant="h5" fontWeight={800} sx={{ color: "primary.main", letterSpacing: "0.02em" }}>
                            {formatCurrency(orderTotal)}
                        </Typography>
                        {errors.total && (
                            <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
                                {errors.total}
                            </Typography>
                        )}
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    <Stack spacing={3}>
                        <Box>
                            <SectionTitle>Cliente</SectionTitle>
                            <TextField
                                label="Nombre completo (Opcional)"
                                placeholder="Público General"
                                size="small"
                                fullWidth
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                helperText={errors.fullName ?? "Aparece en el comprobante. Dejar en blanco para registrar como 'Público General'."}
                                disabled={submitting}
                            />
                        </Box>

                        <Box>
                            <SectionTitle>Cobro</SectionTitle>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, maxWidth: 720 }}>
                                {paymentLines.length === 1 ? (
                                    <>
                                        Se registrará el cobro de <strong>{formatCurrency(orderTotal)}</strong> con el método elegido.
                                        Usa <strong>Agregar método de pago</strong> si el cliente paga en partes (por ejemplo Yape + efectivo).
                                    </>
                                ) : (
                                    <>Reparte el total entre métodos; la suma debe coincidir exactamente con {formatCurrency(orderTotal)}.</>
                                )}
                            </Typography>

                            {paymentLines.length > 1 && (
                                <Alert
                                    severity={
                                        Math.abs(pendingAmount) < 0.01
                                            ? "success"
                                            : pendingAmount > 0
                                                ? "warning"
                                                : "error"
                                    }
                                    sx={{ mb: 2 }}
                                >
                                    {Math.abs(pendingAmount) < 0.01
                                        ? `Listo: ${formatCurrency(orderTotal)} cubierto entre los métodos.`
                                        : pendingAmount > 0
                                            ? `Asignado ${formatCurrency(distributedTotal)} · Falta ${formatCurrency(pendingAmount)}`
                                            : `Te pasaste ${formatCurrency(-pendingAmount)} respecto al total ${formatCurrency(orderTotal)}`}
                                </Alert>
                            )}

                            <Stack spacing={1.5}>
                                {paymentLines.map((pl, i) => (
                                    <Box
                                        key={pl.id}
                                        sx={{
                                            display: "flex",
                                            flexDirection: { xs: "column", sm: "row" },
                                            gap: 1.5,
                                            alignItems: { xs: "stretch", sm: "flex-start" },
                                            flexWrap: "wrap",
                                            p: { xs: 1.25, sm: 1.5 },
                                            borderRadius: 2,
                                            border: "1px solid",
                                            borderColor: "divider",
                                            bgcolor: variantCardBg,
                                        }}
                                    >
                                        <TextField
                                            select
                                            label="Método de pago"
                                            size="small"
                                            value={pl.method}
                                            onChange={(e) => updatePaymentLine(pl.id, { method: e.target.value as PaymentMethod })}
                                            fullWidth
                                            sx={{ minWidth: 0, flex: { sm: "0 0 200px" } }}
                                            disabled={submitting}
                                        >
                                            {PAYMENT_METHODS.map((m) => (
                                                <MenuItem key={m} value={m}>{PAYMENT_LABELS[m]}</MenuItem>
                                            ))}
                                        </TextField>

                                        {paymentLines.length > 1 && (
                                            <>
                                                <NumericField
                                                    label="Monto"
                                                    size="small"
                                                    allowDecimals={true}
                                                    value={pl.amount}
                                                    onChange={(e) => handlePaymentAmountChange(pl.id, e.target.value)}
                                                    fullWidth
                                                    sx={{ width: { xs: "100%", sm: 160 }, flexShrink: 0 }}
                                                    error={!!errors[`payment_${i}`]}
                                                    helperText={
                                                        errors[`payment_${i}`] ??
                                                        `Máximo ${formatCurrency(maxForPaymentLine(pl.id))} en esta línea`
                                                    }
                                                    disabled={submitting}
                                                    slotProps={{
                                                        input: {
                                                            startAdornment: <InputAdornment position="start">S/</InputAdornment>,
                                                        },
                                                        htmlInput: {
                                                            min: 0.01,
                                                            step: "0.01",
                                                            max: maxForPaymentLine(pl.id),
                                                        },
                                                    }}
                                                />
                                                <IconButton
                                                    size="small"
                                                    onClick={() => removePaymentLine(pl.id)}
                                                    sx={{ mt: { xs: 0, sm: 0.5 }, alignSelf: { xs: "flex-end", sm: "flex-start" } }}
                                                    aria-label="Quitar método de pago"
                                                    disabled={submitting}
                                                >
                                                    <DeleteOutlineRoundedIcon fontSize="small" />
                                                </IconButton>
                                            </>
                                        )}
                                    </Box>
                                ))}
                            </Stack>

                            {errors.payment && (
                                <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
                                    {errors.payment}
                                </Typography>
                            )}

                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<AddRoundedIcon />}
                                onClick={addPaymentLine}
                                disabled={submitting}
                                fullWidth={!isSmUp}
                                sx={{ mt: 1.5, borderColor: "primary.main", color: "primary.main", fontWeight: 700 }}
                            >
                                Agregar método de pago
                            </Button>
                        </Box>
                    </Stack>
                </DialogContent>

                <DialogActions
                    sx={{
                        ...adminFormDialogActionsSx,
                        borderTop: 1,
                        borderColor: "divider",
                        flexDirection: { xs: "column-reverse", sm: "row" },
                        "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
                    }}
                >
                    <Button variant="outlined" onClick={handleClose} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        loading={submitting}
                        disabled={submitting || loadingProducts || !!errors.session}
                        startIcon={<PointOfSaleRoundedIcon />}
                    >
                        Registrar venta
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                maxWidth="sm"
                fullWidth
                closeAfterTransition={false}
                disableRestoreFocus
                scroll="paper"
                slotProps={{ paper: { sx: adminFormDialogPaperSx } }}
            >
                <DialogTitle sx={{ ...adminFormDialogTitleRowSx, alignItems: "flex-start" }}>
                    <Typography component="span" fontWeight={800} sx={{ fontSize: { xs: "0.95rem", sm: "1.1rem" }, pr: 1, lineHeight: 1.35 }}>
                        {confirmWarnings.some((w) => w.kind === "free") && confirmWarnings.some((w) => w.kind === "belowPurchase")
                            ? "Confirmar precios especiales"
                            : confirmWarnings.some((w) => w.kind === "free")
                                ? "Confirmar venta con ítems gratuitos"
                                : "Confirmar precio por debajo del costo"}
                    </Typography>
                    <IconButton size="small" onClick={() => setConfirmOpen(false)} disabled={submitting} aria-label="Cerrar" sx={{ flexShrink: 0 }}>
                        <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={adminFormDialogContentSx}>
                    {confirmWarnings.some((w) => w.kind === "belowPurchase") && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            Hay ítems con precio unitario por debajo del precio de compra. Revisa la pérdida antes de continuar.
                        </Alert>
                    )}
                    {confirmWarnings.some((w) => w.kind === "free") && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Hay ítems con precio unitario en cero (venta gratuita para ese ítem).
                        </Alert>
                    )}
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {confirmWarnings.map((w) => (
                            <Typography key={`${w.lineIndex}-${w.productName}-${w.kind}`} variant="body2">
                                {w.kind === "free" ? (
                                    <>
                                        Ítem {w.lineIndex + 1} ({w.productName}): precio unitario{" "}
                                        <strong>{formatCurrency(0)}</strong> — venta gratuita (costo referencia:{" "}
                                        {formatCurrency(w.purchasePrice)})
                                    </>
                                ) : (
                                    <>
                                        Ítem {w.lineIndex + 1}: <strong>{formatCurrency(w.unitPrice)}</strong> (compra:{" "}
                                        {formatCurrency(w.purchasePrice)})
                                    </>
                                )}
                            </Typography>
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions
                    sx={{
                        ...adminFormDialogActionsSx,
                        borderTop: 1,
                        borderColor: "divider",
                        flexDirection: { xs: "column-reverse", sm: "row" },
                        "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
                    }}
                >
                    <Button variant="outlined" onClick={() => setConfirmOpen(false)} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm} variant="contained" loading={submitting} disabled={submitting} startIcon={<PointOfSaleRoundedIcon />}>
                        Confirmar venta
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

