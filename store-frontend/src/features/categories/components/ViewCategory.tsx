'use client';

import { useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
    adminFormDialogActionsSx,
    adminFormDialogContentSx,
    adminFormDialogPaperSx,
    adminFormDialogTitleRowSx,
} from "@/shared/mui/adminFormDialog";
import { CategoryService } from "../services/categories.service";
import type { Category } from "../types/categoriesTypes";
import { formatDateTime as fmtDateTime } from "@/shared/utils/dateFormat";

interface Props {
    open: boolean;
    categoryId: number | null;
    onClose: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={500} sx={{ textAlign: "right", wordBreak: "break-word" }}>
                {value}
            </Typography>
        </Box>
    );
}

function displayText(c: Category | null, field: keyof Pick<Category, "name" | "description">) {
    const v = c?.[field];
    if (v == null || String(v).trim() === "") return "—";
    return String(v);
}

export default function ViewCategory({ open, categoryId, onClose }: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [category, setCategory] = useState<Category | null>(null);

    useEffect(() => {
        if (!open || !categoryId) return;
        let active = true;
        setLoading(true);
        setError(null);
        CategoryService.getCategoryById(categoryId)
            .then((res) => {
                if (active) setCategory(res);
            })
            .catch(() => {
                if (active) setError("No se pudo cargar el detalle de la categoría.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [open, categoryId]);

    const handleClose = () => {
        (document.activeElement as HTMLElement)?.blur();
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            closeAfterTransition={false}
            disableRestoreFocus
            scroll="paper"
            slotProps={{ paper: { sx: adminFormDialogPaperSx } }}
        >
            <DialogTitle sx={adminFormDialogTitleRowSx}>
                <Typography component="span" fontWeight={700} sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, pr: 1 }}>
                    Detalle de categoría
                </Typography>
                <IconButton size="small" onClick={handleClose} aria-label="Cerrar">
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={adminFormDialogContentSx}>
                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                        <CircularProgress size={26} />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : category ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                        <Row label="Nombre" value={displayText(category, "name")} />
                        <Row label="Descripción" value={displayText(category, "description")} />
                        <Row label="Productos" value={String(category.productCount ?? 0)} />
                        <Row label="Variantes" value={String(category.variantCount ?? 0)} />
                        <Row label="Stock total" value={String(category.totalStock ?? 0)} />
                        <Row label="Estado" value={category.isActive ? "Activo" : "Inactivo"} />
                        <Row label="Creado" value={fmtDateTime(category.createdAt)} />
                        <Row label="Actualizado" value={fmtDateTime(category.updatedAt)} />
                    </Box>
                ) : null}
            </DialogContent>
            <DialogActions sx={adminFormDialogActionsSx}>
                <Button onClick={handleClose} variant="contained">
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
