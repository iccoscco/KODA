'use client';

import {
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
import { useDeleteProduct } from "../hooks/productsHooks";
import { Product } from "../types/productsTypes";

interface DeleteProductProps {
    open: boolean;
    product: Product | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DeleteProduct({ open, product, onClose, onSuccess }: DeleteProductProps) {
    const { execute: deleteProduct, loading } = useDeleteProduct();

    const handleClose = () => { (document.activeElement as HTMLElement)?.blur(); onClose(); };

    const handleConfirm = async () => {
        if (!product) return;
        const ok = await deleteProduct(product.id);
        if (ok) { onSuccess(); handleClose(); }
    };

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
                    Eliminar producto
                </Typography>
                <IconButton size="small" onClick={handleClose} disabled={loading} aria-label="Cerrar">
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 2, pb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                    ¿Estás seguro de que deseas eliminar el producto{" "}
                    <Typography component="span" fontWeight={700} color="text.primary">
                        {product?.name}
                    </Typography>
                    ? Esta acción no se puede deshacer.
                </Typography>
            </DialogContent>

            <DialogActions sx={adminFormDialogActionsSx}>
                <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    color="error"
                    loading={loading}
                >
                    Eliminar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
