'use client';

import { Box, Typography } from "@mui/material";
import { useStoreConfigStore } from "@/store/storeConfig.store";

export default function Footer() {
    const storeName = useStoreConfigStore((s) => s.storeName);

    return (
        <Box
            component="footer"
            sx={{
                py: 1.5,
                px: 3,
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1,
            }}
        >
            <Typography variant="caption" color="text.secondary">
                Qp Secure Solutions S.A.C
                {storeName ? ` – ${storeName}` : ""}
                {" · "}
                {new Date().getFullYear()}
            </Typography>

            <Typography variant="caption" color="text.secondary">
                Versión 01
            </Typography>
        </Box>
    );
}
