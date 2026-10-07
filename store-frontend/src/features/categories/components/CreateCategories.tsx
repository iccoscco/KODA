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
import {
    adminFormDialogActionsSx,
    adminFormDialogContentSx,
    adminFormDialogPaperSx,
    adminFormDialogTitleRowSx,
} from "@/shared/mui/adminFormDialog";
import { useCreateCategory } from "../hooks/categoriesHooks";

interface CreateCategoriesProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateCategories({ open, onClose, onSuccess }: CreateCategoriesProps) {
    const { execute: createCategory, loading, error } = useCreateCategory();

    const [name, setName]               = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (!open) return;
        setName("");
        setDescription("");
    }, [open]);

    const handleClose = () => { (document.activeElement as HTMLElement)?.blur(); onClose(); };

    const handleSubmit = async () => {
        if (!name.trim()) return;
        const result = await createCategory({ name: name.trim(), description: description.trim() });
        if (result) { onSuccess(); handleClose(); }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="xs"
            fullWidth
            closeAfterTransition={false}
            disableRestoreFocus
            scroll="paper"
            slotProps={{ paper: { sx: adminFormDialogPaperSx } }}
        >
            <DialogTitle sx={adminFormDialogTitleRowSx}>
                <Typography component="span" fontWeight={700} sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, pr: 1 }}>
                    Crear categoría
                </Typography>
                <IconButton size="small" onClick={handleClose} disabled={loading} aria-label="Cerrar">
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={adminFormDialogContentSx}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                    {error && <Alert severity="error">{error}</Alert>}

                    <TextField
                        label="Nombre"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth required size="small"
                    />
                    <TextField
                        label="Descripción"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        fullWidth multiline rows={3} size="small"
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={adminFormDialogActionsSx}>
                <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    loading={loading}
                    disabled={!name.trim()}
                >
                    Crear
                </Button>
            </DialogActions>
        </Dialog>
    );
}
