'use client';

import { useState, useEffect } from "react";
import {
    Box,
    Button,
    InputAdornment,
    Tab,
    Tabs,
    TextField,
    Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RoleTab from "./components/RoleTab";
import PermissionTab from "./components/PermissionTab";
import { useHasPermission } from "@/shared/hooks/usePermission";
import { PERMISSIONS } from "@/shared/config/permissions";

export default function Roles() {
    const [activeTab, setActiveTab]       = useState(0);
    const [searchInput, setSearchInput]   = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [createOpen, setCreateOpen]     = useState(false);

    const theme = useTheme();
    const isIconOnlyCreate = useMediaQuery(theme.breakpoints.down("sm"));

    const hasPerm   = useHasPermission(PERMISSIONS.ROLES.CREATE);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const canCreate = mounted && hasPerm;

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchInput), 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
        setSearchInput("");
    };

    return (
        <Box>
            {/* Título */}
            <Typography variant="h5" fontWeight={700} mb={3}>
                Roles y Permisos
            </Typography>

            {/* Barra de búsqueda + botón crear */}
            <Box
                sx={{
                    display: "flex",
                    gap: 1.5,
                    mb: 3,
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "nowrap",
                }}
            >
                <TextField
                    placeholder={activeTab === 0 ? "Buscar rol..." : "Buscar permiso..."}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    size="small"
                    sx={{ flex: 1, minWidth: 0, maxWidth: { sm: 400 } }}
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

                {canCreate && activeTab === 0 && (
                    <Button
                        variant="contained"
                        startIcon={isIconOnlyCreate ? undefined : <AddRoundedIcon />}
                        onClick={() => setCreateOpen(true)}
                        aria-label="Crear rol"
                        sx={{
                            flexShrink: 0,
                            minWidth: isIconOnlyCreate ? 44 : undefined,
                            px: isIconOnlyCreate ? 1 : undefined,
                        }}
                    >
                        {isIconOnlyCreate ? <AddRoundedIcon /> : "Crear rol"}
                    </Button>
                )}
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: "1px solid", borderColor: "divider", mb: 3, maxWidth: "100%" }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{ minHeight: 48 }}
                >
                    <Tab label="Roles" />
                    <Tab label="Permisos" />
                </Tabs>
            </Box>

            {/* Contenido del tab activo */}
            {activeTab === 0 && (
                <RoleTab
                    search={debouncedSearch}
                    createOpen={createOpen}
                    onCreateClose={() => setCreateOpen(false)}
                />
            )}
            {activeTab === 1 && <PermissionTab search={debouncedSearch} />}
        </Box>
    );
}
