'use client';

import { useState, useEffect } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    InputAdornment,
    MenuItem,
    TextField,
    Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import {
    adminFormDialogActionsSx,
    adminFormDialogContentSx,
    adminFormDialogPaperSx,
    adminFormDialogTitleRowSx,
} from "@/shared/mui/adminFormDialog";
import { useUpdateUser, useAdminChangePassword, useGetUserById } from "../hooks/usersHooks";
import { User } from "../types/usersTypes";
import { RoleService } from "@/features/roles/services/roles.service";
import { Role } from "@/features/roles/types/rolesTypes";
import { useHasPermission } from "@/shared/hooks/usePermission";
import { PERMISSIONS } from "@/shared/config/permissions";
import InlineLoading from "@/shared/components/InlineLoading";

interface EditUserProps {
    open: boolean;
    user: User | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditUser({ open, user, onClose, onSuccess }: EditUserProps) {
    const { execute: updateUser,     loading: loadingUpdate, error: errorUpdate } = useUpdateUser();
    const { execute: adminChangePwd, loading: loadingPwd,    error: errorPwd    } = useAdminChangePassword();
    const { data: freshUser, loading: loadingFresh, error: errorFetch } = useGetUserById(user?.id ? Number(user.id) : null, open);
    const canChangePassword = useHasPermission(PERMISSIONS.USERS.CHANGE_PASSWORD);

    const [name, setName]               = useState("");
    const [email, setEmail]             = useState("");
    const [roleId, setRoleId]           = useState<number | "">("");
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [roles, setRoles]               = useState<Role[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(false);

    const loading = loadingUpdate || loadingPwd;
    const error   = errorUpdate || errorPwd;

    // Poblar formulario cuando llegan los datos frescos del servidor
    useEffect(() => {
        if (!open) return;
        setNewPassword("");
        setShowPassword(false);

        const source = freshUser ?? user;
        if (!source) return;

        setName(source.name ?? "");
        setEmail(source.email ?? "");

        setLoadingRoles(true);
        RoleService.getAllRoles()
            .then((res) => {
                const active = res.filter((r) => r.isActive);
                setRoles(active);
                const match = active.find((r) => r.name === source.role);
                if (match) setRoleId(match.id);
            })
            .catch(() => setRoles([]))
            .finally(() => setLoadingRoles(false));
    }, [open, freshUser, user]);

    const handleClose = () => { (document.activeElement as HTMLElement)?.blur(); onClose(); };

    const handleSubmit = async () => {
        if (!user || !name.trim() || !email.trim() || roleId === "") return;

        const updated = await updateUser(Number(user.id), { name: name.trim(), email: email.trim(), roleId: roleId as number });
        if (!updated) return;

        if (canChangePassword && newPassword.trim()) {
            const pwdOk = await adminChangePwd(Number(user.id), newPassword.trim());
            if (!pwdOk) return;
        }

        onSuccess();
        handleClose();
    };

    const isValid = name.trim() && email.trim() && roleId !== "";

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
                    Editar usuario
                </Typography>
                <IconButton size="small" onClick={handleClose} disabled={loading} aria-label="Cerrar">
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={adminFormDialogContentSx}>
                {loadingFresh ? (
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
                            fullWidth required size="small"
                        />
                        <TextField
                            label="Correo electrónico"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            fullWidth required size="small"
                        />
                        <TextField
                            select
                            label="Rol"
                            value={roleId}
                            onChange={(e) => setRoleId(Number(e.target.value))}
                            fullWidth required size="small"
                            disabled={loadingRoles}
                            InputProps={loadingRoles ? {
                                endAdornment: <CircularProgress size={16} sx={{ mr: 1 }} />,
                            } : undefined}
                        >
                            {roles.map((r) => (
                                <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                            ))}
                        </TextField>

                        {canChangePassword && (
                            <>
                                <Divider />
                                <TextField
                                    label="Nueva contraseña"
                                    placeholder="Dejar vacío para no cambiar"
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    fullWidth size="small"
                                    autoComplete="new-password"
                                    slotProps={{
                                        input: {
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        size="small"
                                                        edge="end"
                                                        onClick={() => setShowPassword((p) => !p)}
                                                    >
                                                        {showPassword
                                                            ? <VisibilityOffRoundedIcon fontSize="small" />
                                                            : <VisibilityRoundedIcon fontSize="small" />
                                                        }
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                />
                            </>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={adminFormDialogActionsSx}>
                <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    loading={loading}
                    disabled={!isValid || loadingFresh}
                >
                    Guardar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
