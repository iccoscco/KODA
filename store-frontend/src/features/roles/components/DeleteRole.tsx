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
import { useDeleteRole } from "../hooks/rolesHooks";
import { Role } from "../types/rolesTypes";

interface DeleteRoleProps {
    open: boolean;
    role: Role | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DeleteRole({ open, role, onClose, onSuccess }: DeleteRoleProps) {
    const { execute: deleteRole, loading, error, reset } = useDeleteRole();

    // Limpiar el error cada vez que se abre el dialog o cambia el rol
    useEffect(() => {
        if (open) reset();
    }, [open, role?.id, reset]);

    const handleClose = () => { (document.activeElement as HTMLElement)?.blur(); onClose(); };

    const handleConfirm = async () => {
        if (!role) return;
        const ok = await deleteRole(role.id);
        if (ok) { onSuccess(); handleClose(); }
    };

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
                    Eliminar rol
                </Typography>
                <IconButton size="small" onClick={handleClose} disabled={loading} aria-label="Cerrar">
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 2, pb: 1 }}>
                {error ? (
                    <Alert severity="error" sx={{ fontSize: "0.8rem" }}>
                        {error}
                    </Alert>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        ¿Estás seguro de que deseas eliminar el rol{" "}
                        <Typography component="span" fontWeight={700} color="text.primary">
                            {role?.name}
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
