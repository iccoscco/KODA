'use client';

import React from "react";
import { TextField, TextFieldProps } from "@mui/material";

export interface NumericFieldProps extends Omit<TextFieldProps, 'type'> {
    allowDecimals?: boolean;
}

export function NumericField({ allowDecimals = true, slotProps, ...props }: NumericFieldProps) {
    return (
        <TextField
            {...props}
            type="text"
            onKeyDown={(e) => {
                const blocked = allowDecimals
                    ? ["-", "e", "E", "+"]
                    : ["-", "e", "E", "+", "."];
                if (blocked.includes(e.key)) e.preventDefault();
                props.onKeyDown?.(e);
            }}
            onChange={(e) => {
                let val = e.target.value;
                // Si empieza con 0 seguido de otro dígito, quita el 0 inicial
                val = val.replace(/^0+(\d)/, "$1");
                
                const regex = allowDecimals ? /^(0(\.\d*)?|[1-9]\d*(\.\d*)?)$/ : /^(0|[1-9]\d*)$/;
                if (val === "" || regex.test(val)) {
                    const syntheticEvent = { ...e, target: { ...e.target, value: val } };
                    props.onChange?.(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
                }
            }}
            slotProps={{
                ...slotProps,
                htmlInput: {
                    inputMode: allowDecimals ? "decimal" : "numeric",
                    min: 0,
                    ...(slotProps?.htmlInput as object),
                },
            }}
        />
    );
}
