'use client';

import { useState, useMemo, Fragment } from "react";
import {
    Box,
    Checkbox,
    CircularProgress,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useAllPermissions } from "../hooks/rolesHooks";
import { Permission } from "../types/rolesTypes";
import {
    getModuleLabelEs,
    getPermissionDescriptionEs,
    getPermissionLabelEs,
} from "@/shared/config/permissionLabels.es";
import { useDebounce } from "@/shared/hooks/useDebounce";

interface PermissionsTableProps {
    /** true cuando el dialog que lo contiene está abierto */
    enabled: boolean;
    selectedIds: number[];
    onChange: (ids: number[]) => void;
}

function groupByModule(permissions: Permission[]): Record<string, Permission[]> {
    return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
        acc[p.module] = [...(acc[p.module] ?? []), p];
        return acc;
    }, {});
}

export default function PermissionsTable({ enabled, selectedIds, onChange }: PermissionsTableProps) {
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 350);

    const { data: permissions, loading } = useAllPermissions(enabled, debouncedSearch);

    const groupedPerms = useMemo(() => groupByModule(permissions), [permissions]);

    const togglePermission = (id: number) => {
        onChange(selectedIds.includes(id)
            ? selectedIds.filter((i) => i !== id)
            : [...selectedIds, id]);
    };

    const toggleModule = (module: string) => {
        const ids = groupedPerms[module].map((p) => p.id);
        const allSelected = ids.every((id) => selectedIds.includes(id));
        onChange(allSelected
            ? selectedIds.filter((id) => !ids.includes(id))
            : [...new Set([...selectedIds, ...ids])]);
    };

    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, gap: 2, flexWrap: "wrap" }}>
                <Typography variant="subtitle2" fontWeight={600}>
                    Permisos ({selectedIds.length} seleccionados)
                </Typography>
                <TextField
                    size="small"
                    placeholder="Buscar permiso…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ width: { xs: "100%", sm: 220 } }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRoundedIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        },
                    }}
                />
            </Box>

            <TableContainer
                sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    maxHeight: 300,
                    overflow: "auto",
                }}
            >
                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                        <CircularProgress size={22} />
                    </Box>
                ) : Object.keys(groupedPerms).length === 0 ? (
                    <Box sx={{ py: 3, textAlign: "center" }}>
                        <Typography variant="body2" color="text.secondary">
                            No se encontraron permisos{debouncedSearch ? ` para "${debouncedSearch}"` : ""}.
                        </Typography>
                    </Box>
                ) : (
                    <Table size="small" stickyHeader>
                        <TableBody>
                            {Object.entries(groupedPerms).map(([module, perms]) => {
                                const ids          = perms.map((p) => p.id);
                                const allSelected  = ids.every((id) => selectedIds.includes(id));
                                const someSelected = ids.some((id) => selectedIds.includes(id));
                                return (
                                    <Fragment key={module}>
                                        <TableRow>
                                            <TableCell sx={{ py: 0.5 }} colSpan={2}>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                    <Checkbox
                                                        size="small"
                                                        checked={allSelected}
                                                        indeterminate={someSelected && !allSelected}
                                                        onChange={() => toggleModule(module)}
                                                        sx={{ p: 0.5 }}
                                                    />
                                                    <Typography variant="body2" fontWeight={700}>
                                                        {getModuleLabelEs(module)}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                        {perms.map((p) => {
                                            const desc = getPermissionDescriptionEs(p.name, p.description ?? "");
                                            return (
                                                <TableRow
                                                    key={p.id}
                                                    hover
                                                    onClick={() => togglePermission(p.id)}
                                                    sx={{ cursor: "pointer" }}
                                                >
                                                    <TableCell sx={{ pl: 4, py: 0.75, width: "100%" }}>
                                                        <Typography variant="body2" component="div">
                                                            {getPermissionLabelEs(p.name)}
                                                        </Typography>
                                                        {desc ? (
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                                component="div"
                                                                sx={{ display: "block", mt: 0.25, lineHeight: 1.35 }}
                                                            >
                                                                {desc}
                                                            </Typography>
                                                        ) : null}
                                                    </TableCell>
                                                    <TableCell padding="checkbox">
                                                        <Checkbox
                                                            size="small"
                                                            checked={selectedIds.includes(p.id)}
                                                            onChange={() => togglePermission(p.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </TableContainer>
        </Box>
    );
}
