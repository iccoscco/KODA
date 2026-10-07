"use client";

import { useLayoutEffect, useState } from "react";
import type { Theme } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";

function mediaQueryDownMd(theme: Theme): string {
    return theme.breakpoints.down("md").replace(/^@media\s+/i, "").trim();
}

/**
 * Evita el flash tabla → tarjetas al refrescar: useMediaQuery suele ser false en el primer paint del cliente.
 * Lee matchMedia en useLayoutEffect antes del pintado del layout condicional.
 */
export function useNarrowLayoutMd() {
    const theme = useTheme();
    const [state, setState] = useState<{ ready: boolean; isNarrow: boolean }>({
        ready: false,
        isNarrow: false,
    });

    useLayoutEffect(() => {
        const query = mediaQueryDownMd(theme);
        const mql = window.matchMedia(query);
        const sync = () => setState({ ready: true, isNarrow: mql.matches });
        sync();
        mql.addEventListener("change", sync);
        return () => mql.removeEventListener("change", sync);
    }, [theme]);

    return state;
}
