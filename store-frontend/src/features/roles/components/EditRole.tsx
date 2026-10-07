'use client';

import { useState, useEffect } from "react";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
    Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useUpdateRole, useGetRoleById } from "../hooks/rolesHooks";
import { Role } from "../types/rolesTypes";
import {
    adminFormDialogActionsSx,
    adminFormDialogContentSx,
    adminFormDialogPaperSx,
    adminFormDialogTitleRowSx,
} from "@/shared/mui/adminFormDialog";
import InlineLoading from "@/shared/components/InlineLoading";
import PermissionsTable from "./PermissionsTable";

interface EditRoleProps {
    open: boolean;
    role: Role | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditRole({ open, role, onClose, onSuccess }: EditRoleProps) {
    const { execute: updateRole, loading, error } = useUpdateRole();
    const { data: freshRole, loading: loadingFresh, error: errorFetch } = useGetRoleById(role?.id, open);

    const handleClose = () => { (document.activeElement as HTMLElement)?.blur(); onClose(); };

    const [name, setName]               = useState("");
    const [description, setDescription] = useState("");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Poblar formulario con datos frescos del servidor
    useEffect(() => {
        if (!open) return;
        const source = freshRole ?? role;
        if (!source) return;
        setName(source.name);
        setDescription(source.description);
        setSelectedIds(source.permissions.map((p) => p.id));
    }, [open, freshRole, role]);

    const handleSubmit = async () => {
        if (!role || !name.trim()) return;
        const result = await updateRole(role.id, {
            name: name.trim(),
            description: description.trim(),
            permissionIds: selectedIds,
        });
        if (result) { onSuccess(); handleClose(); }
    };

    const isLoading = loadingFresh;

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
                    Editar rol
                </Typography>
                <IconButton size="small" onClick={handleClose} disabled={loading} aria-label="Cerrar">
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={adminFormDialogContentSx}>
                {isLoading ? (
                    <InlineLoading />
                ) : errorFetch ? (
                    <Alert severity="error">{errorFetch}</Alert>
                ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                        {error && <Alert severity="error">{error}</Alert>}

                        <TextField
                            label="Nombre"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            fullWidth
                            required
                            size="small"
                        />

                        <TextField
                            label="Descripción"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            fullWidth
                            multiline
                            rows={3}
                            size="small"
                        />

                        <PermissionsTable
                            enabled={open}
                            selectedIds={selectedIds}
                            onChange={setSelectedIds}
                        />
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={adminFormDialogActionsSx}>
                <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    loading={loading}
                    disabled={!name.trim() || isLoading}
                >
                    Guardar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
