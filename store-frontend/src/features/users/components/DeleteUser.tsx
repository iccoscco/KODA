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
import { useDeleteUser } from "../hooks/usersHooks";
import { User } from "../types/usersTypes";

interface DeleteUserProps {
    open: boolean;
    user: User | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DeleteUser({ open, user, onClose, onSuccess }: DeleteUserProps) {
    const { execute: deleteUser, loading } = useDeleteUser();

    const handleClose = () => { (document.activeElement as HTMLElement)?.blur(); onClose(); };

    const handleConfirm = async () => {
        if (!user) return;
        const ok = await deleteUser(Number(user.id));
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
                    Eliminar usuario
                </Typography>
                <IconButton size="small" onClick={handleClose} disabled={loading} aria-label="Cerrar">
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 2, pb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                    ¿Estás seguro de que deseas eliminar al usuario{" "}
                    <Typography component="span" fontWeight={700} color="text.primary">
                        {user?.name}
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
