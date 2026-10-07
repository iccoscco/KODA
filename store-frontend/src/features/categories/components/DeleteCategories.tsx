'use client';

import { useEffect } from "react";
import {
    Alert,
    Button,
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
    adminFormDialogPaperSx,
    adminFormDialogTitleRowSx,
} from "@/shared/mui/adminFormDialog";
import { useDeleteCategory } from "../hooks/categoriesHooks";
import { Category } from "../types/categoriesTypes";

interface DeleteCategoriesProps {
    open: boolean;
    category: Category | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DeleteCategories({ open, category, onClose, onSuccess }: DeleteCategoriesProps) {
    const { execute: deleteCategory, loading, error, reset } = useDeleteCategory();

    // Limpiar el error cada vez que se abre el dialog o cambia la categoría
    useEffect(() => {
        if (open) reset();
    }, [open, category?.id, reset]);

    const handleClose = () => { (document.activeElement as HTMLElement)?.blur(); onClose(); };

    const handleConfirm = async () => {
        if (!category) return;
        const ok = await deleteCategory(category.id);
        if (ok) { onSuccess(); handleClose(); }
    };

    // Si el backend rechazó la eliminación, ya no tiene sentido mostrar el botón Eliminar
    const canDelete = !error;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="xs"
            fullWidth
            closeAfterTransition={false}
            disableRestoreFocus
            slotProps={{ paper: { sx: adminFormDialogPaperSx } }}
        >
            <DialogTitle sx={adminFormDialogTitleRowSx}>
                <Typography component="span" fontWeight={700} sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, pr: 1 }}>
                    Eliminar categoría
                </Typography>
                <IconButton size="small" onClick={handleClose} disabled={loading} aria-label="Cerrar">
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 2, pb: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
                {error ? (
                    <Alert severity="error" sx={{ fontSize: "0.8rem" }}>
                        {error}
                    </Alert>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        ¿Estás seguro de que deseas eliminar la categoría{" "}
                        <Typography component="span" fontWeight={700} color="text.primary">
                            {category?.name}
                        </Typography>
                        ? Esta acción no se puede deshacer.
                    </Typography>
                )}
            </DialogContent>

            <DialogActions sx={adminFormDialogActionsSx}>
                <Button onClick={handleClose} disabled={loading}>
                    {canDelete ? "Cancelar" : "Cerrar"}
                </Button>
                {canDelete && (
                    <Button
                        onClick={handleConfirm}
                        variant="contained"
                        color="error"
                        loading={loading}
                    >
                        Eliminar
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
